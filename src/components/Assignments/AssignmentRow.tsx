/* ── Assignment Row ── */

import { useMemo } from 'react';
import {
  makeStyles,
  tokens,
  SpinButton,
  Button,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import type { IAssignment, IServiceOrInitiative } from '../../types';
import type { ServiceHierarchyNode } from '../../hooks';
import { ServicePicker } from '../Shared';
import { buildServiceLocationMap } from '../../utils';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    padding: '8px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  picker: {
    flex: 1,
    minWidth: '200px',
  },
  serviceContext: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '14px',
  },
  spinButton: {
    width: '100px',
  },
});

interface AssignmentRowProps {
  assignment: IAssignment;
  serviceInitiatives: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  usedServiceIds: Set<string>;
  onUpdate: (data: Partial<Pick<IAssignment, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value'>>) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function AssignmentRow({
  assignment,
  serviceInitiatives,
  hierarchy,
  usedServiceIds,
  onUpdate,
  onDelete,
  disabled,
}: AssignmentRowProps) {
  const styles = useStyles();

  const serviceLocationMap = useMemo(
    () => buildServiceLocationMap(hierarchy),
    [hierarchy],
  );

  const disabledIds = new Set(
    [...usedServiceIds].filter((id) => id !== assignment._cai_serviceorinitiativeid_value),
  );

  const loc = assignment._cai_serviceorinitiativeid_value
    ? serviceLocationMap.get(assignment._cai_serviceorinitiativeid_value)
    : null;

  return (
    <div className={styles.row}>
      <div className={styles.picker}>
        {loc && (
          <div className={styles.serviceContext}>{loc.areaName} › {loc.teamName}</div>
        )}
        <ServicePicker
          hierarchy={hierarchy}
          services={serviceInitiatives}
          selectedServiceId={assignment._cai_serviceorinitiativeid_value}
          disabledServiceIds={disabledIds}
          onSelect={(serviceId, serviceName) => {
            onUpdate({
              _cai_serviceorinitiativeid_value: serviceId,
              ...({
                _cai_serviceorinitiativeid_value_formatted: serviceName,
              } as Record<string, unknown>),
            } as Partial<Pick<IAssignment, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value'>>);
          }}
          disabled={disabled}
        />
      </div>
      <SpinButton
        className={styles.spinButton}
        value={assignment.cai_allocationpercentage}
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
            onUpdate({ cai_allocationpercentage: rounded });
          }
        }}
        disabled={disabled}
      />
      <Button
        appearance="subtle"
        icon={<DeleteRegular />}
        onClick={onDelete}
        disabled={disabled}
        aria-label="Remove assignment"
      />
    </div>
  );
}
