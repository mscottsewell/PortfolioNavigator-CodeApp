/* ── Power Apps Code App: Dataverse client ── */

import { dataSourcesInfo } from '../../.power/schemas/appschemas/dataSourcesInfo';
import { delay, extractErrorMessage, getRetryDelayMs, isRetryableDataverseError } from './retryPolicy';

export const FORMATTED_SUFFIX = '@OData.Community.Display.V1.FormattedValue';
const MAX_RETRIES = 3;
const MAX_PAGE_COUNT = 20;
export const FILTER_CHUNK_SIZE = 50;

// The SDK identifies data sources by entity set name (plural), not logical name.
const ENTITY_SET_NAMES: Record<string, string> = {
  cai_allocation: 'cai_allocations',
  cai_allocationperiod: 'cai_allocationperiods',
  cai_area: 'cai_areas',
  cai_assignment: 'cai_assignments',
  cai_delegation: 'cai_delegations',
  cai_managersummary: 'cai_managersummaries',
  cai_resource: 'cai_resources',
  cai_serviceinitiativesummary: 'cai_serviceinitiativesummaries',
  cai_serviceorinitiative: 'cai_serviceorinitiatives',
  systemuser: 'systemusers',
};

function toEntitySetName(logicalName: string): string {
  return ENTITY_SET_NAMES[logicalName] ?? logicalName;
}

export interface QueryOptions {
  filter?: string;
  select?: string[];
  orderBy?: string[];
  top?: number;
}

interface IOperationResult<T> {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  } | null;
}

interface IRetrieveMultipleResult<T> extends IOperationResult<T[]> {
  skipToken?: string;
}

interface IPowerAppsDataClient {
  retrieveMultipleRecordsAsync<T>(
    tableName: string,
    options?: Record<string, unknown>,
  ): Promise<IRetrieveMultipleResult<T>>;
  createRecordAsync<TRequest extends Record<string, unknown>, TResponse>(
    tableName: string,
    record: TRequest,
  ): Promise<IOperationResult<TResponse>>;
  updateRecordAsync<TRequest extends Record<string, unknown>, TResponse>(
    tableName: string,
    id: string,
    changes: TRequest,
  ): Promise<IOperationResult<TResponse> | void>;
  deleteRecordAsync(
    tableName: string,
    id: string,
  ): Promise<IOperationResult<unknown> | void>;
}

async function getDataClient(): Promise<IPowerAppsDataClient> {
  const { getClient } = await import('@microsoft/power-apps/data');
  return getClient(dataSourcesInfo) as unknown as IPowerAppsDataClient;
}

function mapFormattedValues<T>(record: Record<string, unknown>): T {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key.endsWith(FORMATTED_SUFFIX)) {
      const baseKey = key.slice(0, -FORMATTED_SUFFIX.length);
      mapped[`${baseKey}_formatted`] = value;
    } else {
      mapped[key] = value;
    }
  }
  return mapped as T;
}

function parseOptions(options: string | QueryOptions): QueryOptions {
  if (typeof options !== 'string') {
    return options;
  }

  const trimmed = options.trim();
  const queryString = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  const params = new URLSearchParams(queryString);
  const topValue = params.get('$top');
  const top = topValue ? Number(topValue) : undefined;

  return {
    filter: params.get('$filter') ?? undefined,
    select: params.get('$select')?.split(',').map((value) => value.trim()).filter(Boolean),
    orderBy: params.get('$orderby')?.split(',').map((value) => value.trim()).filter(Boolean),
    top: typeof top === 'number' && Number.isFinite(top) ? top : undefined,
  };
}

function buildRetrieveRequest(options: QueryOptions, skipToken?: string): Record<string, unknown> {
  const request: Record<string, unknown> = {};
  if (options.filter) request.filter = options.filter;
  if (options.select && options.select.length > 0) request.select = options.select;
  if (options.orderBy && options.orderBy.length > 0) request.orderBy = options.orderBy;
  if (typeof options.top === 'number') request.top = options.top;
  if (skipToken) request.skipToken = skipToken;
  return request;
}

function ensureSucceeded(result: IOperationResult<unknown> | void, fallbackMessage: string): void {
  if (!result) {
    return;
  }
  if (result.success === false) {
    throw new Error(result.error?.message ?? fallbackMessage);
  }
}

function extractCreatedId(entityLogicalName: string, data: unknown): string {
  if (typeof data === 'string' && data.length > 0) {
    return data;
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const directId = record[`${entityLogicalName}id`] ?? record.id;
    if (typeof directId === 'string' && directId.length > 0) {
      return directId;
    }

    const discovered = Object.entries(record).find(
      ([key, value]) => key.toLowerCase().endsWith('id') && typeof value === 'string' && value.length > 0,
    );
    if (discovered && typeof discovered[1] === 'string') {
      return discovered[1];
    }
  }

  throw new Error(`Failed to determine created record ID for ${entityLogicalName}`);
}

export async function retrieveMultipleChunked<T>(
  entityLogicalName: string,
  ids: string[],
  buildOptions: (chunk: string[]) => string | QueryOptions,
): Promise<T[]> {
  if (ids.length === 0) return [];
  if (ids.length <= FILTER_CHUNK_SIZE) {
    return retrieveMultiple<T>(entityLogicalName, buildOptions(ids));
  }

  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += FILTER_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + FILTER_CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) => retrieveMultiple<T>(entityLogicalName, buildOptions(chunk))),
  );
  return results.flat();
}

export async function retrieveMultiple<T>(
  entityLogicalName: string,
  options: string | QueryOptions,
): Promise<T[]> {
  const client = await getDataClient();
  const normalizedOptions = parseOptions(options);
  const allRecords: T[] = [];
  let skipToken: string | undefined;
  let pageCount = 0;

  do {
    const result = await client.retrieveMultipleRecordsAsync<Record<string, unknown>>(
      toEntitySetName(entityLogicalName),
      buildRetrieveRequest(normalizedOptions, skipToken),
    );

    if (result.success === false || !Array.isArray(result.data)) {
      throw new Error(result.error?.message ?? `Failed to retrieve ${entityLogicalName}`);
    }

    allRecords.push(...result.data.map((entity) => mapFormattedValues<T>(entity)));
    skipToken = typeof result.skipToken === 'string' && result.skipToken.length > 0
      ? result.skipToken
      : undefined;
    pageCount += 1;

    if (skipToken && pageCount >= MAX_PAGE_COUNT) {
      console.warn(`[PortfolioNav] retrieveMultiple hit page limit (${MAX_PAGE_COUNT}) for ${entityLogicalName}`);
      break;
    }
  } while (skipToken);

  return allRecords;
}

export async function createRecord(
  entityLogicalName: string,
  data: Record<string, unknown>,
): Promise<string> {
  const client = await getDataClient();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await client.createRecordAsync<Record<string, unknown>, unknown>(toEntitySetName(entityLogicalName), data);
      if (result.success === false) {
        throw new Error(result.error?.message ?? `Failed to create ${entityLogicalName}`);
      }
      return extractCreatedId(entityLogicalName, result.data);
    } catch (error: unknown) {
      if (attempt < MAX_RETRIES && isRetryableDataverseError(error)) {
        await delay(getRetryDelayMs(attempt));
        continue;
      }
      console.error(`[PortfolioNav] createRecord FAILED for ${entityLogicalName}: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  throw new Error('Unreachable');
}

export async function updateRecord(
  entityLogicalName: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const client = await getDataClient();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await client.updateRecordAsync<Record<string, unknown>, unknown>(toEntitySetName(entityLogicalName), id, data);
      ensureSucceeded(result, `Failed to update ${entityLogicalName}(${id})`);
      return;
    } catch (error: unknown) {
      if (attempt < MAX_RETRIES && isRetryableDataverseError(error)) {
        await delay(getRetryDelayMs(attempt));
        continue;
      }
      console.error(`[PortfolioNav] updateRecord FAILED for ${entityLogicalName}(${id}): ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  throw new Error('Unreachable: updateRecord exhausted retries');
}

export async function deleteRecord(
  entityLogicalName: string,
  id: string,
): Promise<void> {
  const client = await getDataClient();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await client.deleteRecordAsync(toEntitySetName(entityLogicalName), id);
      ensureSucceeded(result, `Failed to delete ${entityLogicalName}(${id})`);
      return;
    } catch (error: unknown) {
      if (attempt < MAX_RETRIES && isRetryableDataverseError(error)) {
        await delay(getRetryDelayMs(attempt));
        continue;
      }
      console.error(`[PortfolioNav] deleteRecord FAILED for ${entityLogicalName}(${id}): ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  throw new Error('Unreachable: deleteRecord exhausted retries');
}
