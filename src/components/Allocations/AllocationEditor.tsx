/* ── Allocation Editor (single employee, single period) ── */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Divider,
  Checkbox,
  MessageBar,
  MessageBarBody,
  SpinButton,
  Tooltip,
} from '@fluentui/react-components';
import {
  AddRegular,
  SaveRegular,
  ArrowLeftRegular,
  DeleteRegular,
  CheckmarkCircleRegular,
  EditRegular,
  DismissRegular,
  CopyArrowRightRegular,
  CameraSparklesFilled,
} from '@fluentui/react-icons';
import type { IResource, IAllocation, IServiceOrInitiative, IAllocationPeriod } from '../../types';
import { AllocationStatus } from '../../types';
import type { ServiceHierarchyNode } from '../../hooks';
import { PercentageBar, ServicePicker, ServiceTooltipContent } from '../Shared';
import { useToast } from '../Shared/Toast';
import { validatePercentages, formatPercentage, buildServiceLocationMap, trackEvent, trackException, isPlaceholderService } from '../../utils';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px 24px 16px',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  summaryBar: {
    padding: '0 24px 16px',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  content: {
    padding: '0 24px',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    padding: '8px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  readOnlyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  readOnlyServiceName: {
    flex: 1,
    minWidth: '200px',
  },
  serviceContext: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '14px',
  },
  readOnlyPercentage: {
    width: '80px',
    textAlign: 'right' as const,
  },
  picker: {
    flex: 1,
    minWidth: '200px',
  },
  spinButton: {
    width: '100px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  updateAssignmentsRow: {
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    margin: '12px 24px 0',
  },
  reopenContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '32px 24px',
  },
});

interface AllocationEditorProps {
  resource: IResource;
  allocations: IAllocation[];
  period: IAllocationPeriod;
  serviceInitiatives: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  onSave: (
    allocationChanges: AllocationChange[],
    newAllocations: NewAllocation[],
    deletedIds: string[],
    alsoUpdateAssignments: boolean,
    shouldApprove: boolean,
    onProgress?: (progress: AllocationSaveProgress) => void,
  ) => Promise<void>;
  onBack: () => void;
  onCopyAssignments?: () => void;
  readOnly?: boolean;
  placeholderServiceIds?: Set<string>;
}

export interface AllocationChange {
  allocationId: string;
  data: Partial<Pick<IAllocation, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value'>>;
}

export interface NewAllocation {
  serviceId: string;
  percentage: number;
}

export interface AllocationSaveProgress {
  current: number;
  total: number;
  message: string;
}

export function AllocationEditor({
  resource,
  allocations,
  period,
  serviceInitiatives,
  hierarchy,
  onSave,
  onBack,
  onCopyAssignments,
  readOnly: periodReadOnly,
  placeholderServiceIds = new Set(),
}: AllocationEditorProps) {
  const styles = useStyles();
  const { showToast } = useToast();

  // Determine if all *real* (non-placeholder) allocations are already approved.
  // Placeholder allocations are never counted as approval-valid; if only placeholders
  // exist, allApproved stays false so the editor stays open for real entries.
  const allApproved = useMemo(() => {
    const realAllocations = allocations.filter((a) =>
      !placeholderServiceIds.has(a._cai_serviceorinitiativeid_value) &&
      !isPlaceholderService(a._cai_serviceorinitiativeid_value_formatted)
    );
    return realAllocations.length > 0 && realAllocations.every((a) => a.cai_managerapprovalstatus !== AllocationStatus.PendingReview);
  }, [allocations, placeholderServiceIds]);

  const [isEditing, setIsEditing] = useState(!allApproved && !periodReadOnly);
  const [localAllocations, setLocalAllocations] = useState<IAllocation[]>(allocations);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<IAllocation>>>(new Map());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<AllocationSaveProgress | null>(null);
  const [alsoUpdateAssignments, setAlsoUpdateAssignments] = useState(false);

  useEffect(() => {
    setLocalAllocations(allocations);
    setPendingChanges(new Map());
    setDeletedIds(new Set());
    setIsEditing(!allApproved && !periodReadOnly);
    setSaveProgress(null);
  }, [allocations, resource.cai_resourceid, allApproved, periodReadOnly]);

  const hasBlankService = localAllocations.some((a) => !a._cai_serviceorinitiativeid_value);

  // Exclude placeholder allocations from validation so a 100% placeholder
  // does NOT appear as "fully allocated" or enable the approve button.
  const nonPlaceholderAllocations = useMemo(
    () => localAllocations.filter((a) =>
      !placeholderServiceIds.has(a._cai_serviceorinitiativeid_value) &&
      !isPlaceholderService(a._cai_serviceorinitiativeid_value_formatted)
    ),
    [localAllocations, placeholderServiceIds],
  );

  const validation = useMemo(() => {
    const result = validatePercentages(nonPlaceholderAllocations);
    if (result.isValid && hasBlankService) {
      return { ...result, isValid: false, message: 'All rows must have a service selected' };
    }
    return result;
  }, [nonPlaceholderAllocations, hasBlankService]);

  const usedServiceIds = useMemo(
    () => new Set(localAllocations.map((a) => a._cai_serviceorinitiativeid_value).filter(Boolean)),
    [localAllocations],
  );

  const serviceLocationMap = useMemo(
    () => buildServiceLocationMap(hierarchy),
    [hierarchy],
  );

  const segments = useMemo(
    () =>
      localAllocations.map((alloc) => ({
        percentage: alloc.cai_allocationpercentage,
        label: alloc._cai_serviceorinitiativeid_value_formatted,
      })),
    [localAllocations],
  );

  const handleUpdate = useCallback(
    (allocationId: string, data: Partial<IAllocation>) => {
      setLocalAllocations((prev) =>
        prev.map((alloc) =>
          alloc.cai_allocationid === allocationId ? { ...alloc, ...data } : alloc,
        ),
      );
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(allocationId) ?? {};
        next.set(allocationId, { ...existing, ...data });
        return next;
      });
    },
    [],
  );

  const handleAdd = () => {
    const currentNonPlaceholderTotal = nonPlaceholderAllocations.reduce((sum, a) => sum + a.cai_allocationpercentage, 0);
    const remaining = Math.max(0, 100 - currentNonPlaceholderTotal);

    const draftId = `draft-${Date.now()}`;
    const draft: IAllocation = {
      cai_allocationid: draftId,
      cai_name: '',
      _cai_resourceid_value: resource.cai_resourceid,
      _cai_resourceid_value_formatted: resource.cai_displayname,
      _cai_serviceorinitiativeid_value: '',
      _cai_serviceorinitiativeid_value_formatted: '',
      _cai_allocationperiodid_value: period.cai_allocationperiodid,
      _cai_allocationperiodid_value_formatted: period.cai_periodname,
      _cai_manager_systemuserid_value: '',
      _cai_manager_systemuserid_value_formatted: '',
      cai_managerapprovalstatus: AllocationStatus.PendingReview,
      cai_managerapprovalstatus_formatted: 'Pending Review',
      cai_allocationpercentage: remaining,
      cai_employeename: resource.cai_displayname,
      cai_alias: resource.cai_alias,
    };
    setLocalAllocations((prev) => [...prev, draft]);
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(draftId, draft);
      return next;
    });
  };

  const handleDelete = (allocationId: string) => {
    if (allocationId.startsWith('draft-')) {
      setLocalAllocations((prev) => prev.filter((a) => a.cai_allocationid !== allocationId));
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.delete(allocationId);
        return next;
      });
      return;
    }
    setLocalAllocations((prev) => prev.filter((a) => a.cai_allocationid !== allocationId));
    setDeletedIds((prev) => new Set(prev).add(allocationId));
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.delete(allocationId);
      return next;
    });
  };

  const handleSave = async (shouldApprove: boolean) => {
    if (!validation.isValid) return;
    setSaving(true);
    setSaveProgress({
      current: 0,
      total: 0,
      message: shouldApprove ? 'Preparing save and approval...' : 'Preparing save...',
    });
    try {
      const drafts: NewAllocation[] = [];
      const changes: AllocationChange[] = [];

      for (const [allocationId, data] of pendingChanges) {
        if (allocationId.startsWith('draft-')) {
          if (data._cai_serviceorinitiativeid_value) {
            drafts.push({
              serviceId: data._cai_serviceorinitiativeid_value,
              percentage: data.cai_allocationpercentage ?? 0,
            });
          }
        } else {
          const changeData: Partial<Pick<IAllocation, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value'>> = {};
          if (data.cai_allocationpercentage !== undefined) {
            changeData.cai_allocationpercentage = data.cai_allocationpercentage;
          }
          if (data._cai_serviceorinitiativeid_value !== undefined) {
            changeData._cai_serviceorinitiativeid_value = data._cai_serviceorinitiativeid_value;
          }
          changes.push({ allocationId, data: changeData });
        }
      }

      trackEvent('SnapshotSaveRequested', {
        properties: {
          action: shouldApprove ? 'saveAndApprove' : 'save',
          resourceId: resource.cai_resourceid,
          periodId: period.cai_allocationperiodid,
          alsoUpdateAssignments,
        },
        measurements: {
          changeCount: changes.length,
          draftCount: drafts.length,
          deletedCount: deletedIds.size,
        },
      });

      await onSave(changes, drafts, [...deletedIds], alsoUpdateAssignments, shouldApprove, setSaveProgress);
      setPendingChanges(new Map());
      setDeletedIds(new Set());
      trackEvent('SnapshotSaveCompleted', {
        properties: {
          action: shouldApprove ? 'saveAndApprove' : 'save',
          resourceId: resource.cai_resourceid,
          periodId: period.cai_allocationperiodid,
          alsoUpdateAssignments,
        },
        measurements: {
          changeCount: changes.length,
          draftCount: drafts.length,
          deletedCount: deletedIds.size,
        },
      });
      const action = shouldApprove ? 'saved and approved' : 'saved';
      showToast('success', `Snapshots ${action} for ${resource.cai_displayname}`);
    } catch (err) {
      trackException(err, {
        area: 'AllocationEditor',
        action: shouldApprove ? 'saveAndApprove' : 'save',
        resourceId: resource.cai_resourceid,
        periodId: period.cai_allocationperiodid,
        alsoUpdateAssignments,
      });
      showToast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaveProgress(null);
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (allApproved) {
      // Was reopened — revert to read-only
      setLocalAllocations(allocations);
      setPendingChanges(new Map());
      setDeletedIds(new Set());
      setIsEditing(false);
    } else {
      onBack();
    }
  };

  const hasChanges = pendingChanges.size > 0 || deletedIds.size > 0;
  const isPending = allocations.some((a) => a.cai_managerapprovalstatus === AllocationStatus.PendingReview);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <CameraSparklesFilled style={{ fontSize: 48, color: tokens.colorBrandForeground1, flexShrink: 0 }} />
        <div className={styles.headerInfo}>
          <Text size={500} weight="semibold">
            {resource.cai_displayname}
          </Text>
          <Text size={400} weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
            {period.cai_periodname}
          </Text>
        </div>
      </div>

      {/* Status message — only show when approved (read-only) */}
      {!isEditing && (
        <div style={{ padding: '0 24px 4px' }}>
          <MessageBar intent="success">
            <MessageBarBody>
              Allocation snapshots for <strong>{period.cai_periodname}</strong> have been approved.
            </MessageBarBody>
          </MessageBar>
        </div>
      )}

      {/* Summary */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryRow}>
          <Text
            size={300}
            weight="semibold"
            style={{ color: validation.isValid ? tokens.colorStatusSuccessForeground1 : tokens.colorStatusDangerForeground1 }}
          >
            {formatPercentage(validation.total)} allocated
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {localAllocations.length} snapshot{localAllocations.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <PercentageBar segments={segments} showOverflow />
        {!validation.isValid && isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 8 }}>
            <MessageBar intent="warning" style={{ flex: 1 }}>
              <MessageBarBody>{validation.message}</MessageBarBody>
            </MessageBar>
            {onCopyAssignments && localAllocations.length === 0 && (
              <Button
                appearance="outline"
                icon={<CopyArrowRightRegular />}
                onClick={onCopyAssignments}
                style={{ backgroundColor: '#FFF4CE', borderColor: '#EAD169', color: '#835C00', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Assignments
              </Button>
            )}
          </div>
       )}
      </div>

      {isEditing && saving && saveProgress && (
        <div style={{ padding: '0 24px 12px' }}>
          <MessageBar intent="info">
            <MessageBarBody>
              {saveProgress.message}
              {saveProgress.total > 0 ? ` (${Math.min(saveProgress.current, saveProgress.total)} of ${saveProgress.total})` : ''}
            </MessageBarBody>
          </MessageBar>
        </div>
      )}

      <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

      {/* Allocation rows */}
      <div className={styles.content}>
        {localAllocations.map((alloc) => {
          if (!isEditing) {
            // Read-only row
            return (
              <div key={alloc.cai_allocationid} className={styles.readOnlyRow}>
                <div className={styles.readOnlyServiceName}>
                  {alloc._cai_serviceorinitiativeid_value && (() => {
                    const loc = serviceLocationMap.get(alloc._cai_serviceorinitiativeid_value);
                    return loc ? (
                      <div className={styles.serviceContext}>{loc.areaName} › {loc.teamName}</div>
                    ) : null;
                  })()}
                  {(() => {
                    const service = serviceInitiatives.find((s) => s.cai_serviceorinitiativeid === alloc._cai_serviceorinitiativeid_value);
                    const tooltipContent = service ? <ServiceTooltipContent service={service} /> : null;
                    const isPlaceholder = placeholderServiceIds.has(alloc._cai_serviceorinitiativeid_value) ||
                      isPlaceholderService(alloc._cai_serviceorinitiativeid_value_formatted);
                    const nameEl = (
                      <Text size={300} style={isPlaceholder ? { color: tokens.colorPaletteRedForeground1, fontStyle: 'italic' } : undefined}>
                        {alloc._cai_serviceorinitiativeid_value_formatted || '(No service)'}
                      </Text>
                    );
                    if (!tooltipContent) return nameEl;
                    return (
                      <Tooltip content={tooltipContent} relationship="description" withArrow>
                        {nameEl}
                      </Tooltip>
                    );
                  })()}
                </div>
                <div className={styles.readOnlyPercentage}>
                  <Text size={300} weight="semibold">
                    {alloc.cai_allocationpercentage}%
                  </Text>
                </div>
              </div>
            );
          }

          // Editable row
          const disabledIds = new Set(
            [...usedServiceIds].filter((id) => id !== alloc._cai_serviceorinitiativeid_value),
          );
          return (
            <div key={alloc.cai_allocationid} className={styles.row}>
              <div className={styles.picker}>
                {alloc._cai_serviceorinitiativeid_value && (() => {
                  const loc = serviceLocationMap.get(alloc._cai_serviceorinitiativeid_value);
                  return loc ? (
                    <div className={styles.serviceContext}>{loc.areaName} › {loc.teamName}</div>
                  ) : null;
                })()}
                <ServicePicker
                  hierarchy={hierarchy}
                  services={serviceInitiatives}
                  selectedServiceId={alloc._cai_serviceorinitiativeid_value || null}
                  disabledServiceIds={disabledIds}
                  onSelect={(serviceId, serviceName) => {
                    handleUpdate(alloc.cai_allocationid, {
                      _cai_serviceorinitiativeid_value: serviceId,
                      _cai_serviceorinitiativeid_value_formatted: serviceName,
                    } as Partial<IAllocation>);
                  }}
                  disabled={saving}
                />
              </div>
              <SpinButton
                className={styles.spinButton}
                value={alloc.cai_allocationpercentage}
                min={0}
                max={100}
                step={5}
                onChange={(_e, data) => {
                  const raw = data.value != null && !Number.isNaN(data.value)
                    ? data.value
                    : data.displayValue != null ? parseInt(data.displayValue, 10) : NaN;
                  if (!Number.isNaN(raw)) {
                    const clamped = Math.max(0, Math.min(100, raw));
                    const rounded = Math.round(clamped / 5) * 5;
                    handleUpdate(alloc.cai_allocationid, { cai_allocationpercentage: rounded });
                  }
                }}
                disabled={saving}
              />
              <Button
                appearance="subtle"
                icon={<DeleteRegular />}
                onClick={() => handleDelete(alloc.cai_allocationid)}
                disabled={saving}
                aria-label="Remove snapshot"
              />
            </div>
          );
        })}
      </div>

      {/* Also update assignments checkbox (edit mode only) */}
      {isEditing && (
        <div className={styles.updateAssignmentsRow}>
          <Checkbox
            checked={alsoUpdateAssignments}
            onChange={(_e, data) => setAlsoUpdateAssignments(!!data.checked)}
            label="Also update this employee's standing assignments to match"
          />
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {isEditing ? (
            <>
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                appearance="subtle"
                icon={<AddRegular />}
                onClick={handleAdd}
                disabled={saving || usedServiceIds.size >= serviceInitiatives.length}
              >
                Add Row
              </Button>
            </>
          ) : (
            <Button
              appearance="subtle"
              icon={<ArrowLeftRegular />}
              onClick={onBack}
            >
              Back
            </Button>
          )}
        </div>
        <div className={styles.footerRight}>
          {!isEditing ? (
            periodReadOnly ? (
              <Button
                appearance="subtle"
                icon={<ArrowLeftRegular />}
                onClick={onBack}
              >
                Back
              </Button>
            ) : (
              <Button
                appearance="primary"
                icon={<EditRegular />}
                onClick={() => setIsEditing(true)}
              >
                Reopen to Edit
              </Button>
            )
          ) : isPending && !hasChanges ? (
            // Pending with no changes — Save (to sync assignments) or Approve
            <>
              <Button
                appearance="secondary"
                icon={<SaveRegular />}
                onClick={() => handleSave(false)}
                disabled={!validation.isValid || saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                appearance="primary"
                icon={<CheckmarkCircleRegular />}
                onClick={() => handleSave(true)}
                disabled={!validation.isValid || saving}
              >
                {saving ? 'Approving...' : 'Approve Snapshots'}
              </Button>
            </>
          ) : (
            // Has changes (pending or reopened) — Save Only / Save & Approve
            <>
              <Button
                appearance="secondary"
                icon={<SaveRegular />}
                onClick={() => handleSave(false)}
                disabled={!hasChanges || !validation.isValid || saving}
              >
                {saving ? 'Saving...' : 'Save Only'}
              </Button>
              <Button
                appearance="primary"
                icon={<CheckmarkCircleRegular />}
                onClick={() => handleSave(true)}
                disabled={!validation.isValid || saving}
              >
                {saving ? 'Saving...' : 'Save & Approve'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
