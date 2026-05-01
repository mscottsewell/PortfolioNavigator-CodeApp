/* ── Bulk Edit Panel ── */

import { useState, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  SpinButton,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
  Divider,
  Link,
  Avatar,
  Badge,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular, PeopleTeamRegular, Warning20Regular } from '@fluentui/react-icons';
import type { IResource, IAssignment, IServiceOrInitiative } from '../../types';
import type { ServiceHierarchyNode } from '../../hooks';
import { useToast } from '../Shared/Toast';
import { ServicePicker } from '../Shared';
import { sumPercentages, getInitials, formatPercentage, formatCount } from '../../utils';

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
    flexDirection: 'column',
    gap: '8px',
    padding: '20px 24px 16px',
  },
  content: {
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  employeeStatusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  employeeStatusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 8px',
    borderRadius: '6px',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  employeeStatusInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  assignmentChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  assignmentChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '1px 8px',
    borderRadius: '10px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  chipPct: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  employeeNameLink: {
    cursor: 'pointer',
    textDecorationLine: 'none',
    fontWeight: 600,
    fontSize: tokens.fontSizeBase300,
    '&:hover': {
      textDecorationLine: 'underline',
    },
  },
  statusBadge: {
    flexShrink: 0,
  },
  warningIcon: {
    flexShrink: 0,
  },
});

interface BulkEditPanelProps {
  selectedResources: IResource[];
  assignments: IAssignment[];
  serviceInitiatives: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  onBulkAdd: (
    resourceIds: string[],
    serviceId: string,
    percentage: number,
  ) => Promise<void>;
  onBulkRemove: (
    resourceIds: string[],
    serviceId: string,
  ) => Promise<void>;
  onSelectEmployee?: (resourceId: string) => void;
}

interface EmployeeAllocationStatus {
  resource: IResource;
  total: number;
  count: number;
  isValid: boolean;
  resourceAssignments: IAssignment[];
}

export function BulkEditPanel({
  selectedResources,
  assignments,
  serviceInitiatives,
  hierarchy,
  onBulkAdd,
  onBulkRemove,
  onSelectEmployee,
}: BulkEditPanelProps) {
  const styles = useStyles();
  const { showToast } = useToast();
  const [addServiceId, setAddServiceId] = useState<string>('');
  const [addPercentage, setAddPercentage] = useState(10);
  const [removeServiceId, setRemoveServiceId] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'remove' | null>(null);
  const [processing, setProcessing] = useState(false);

  const resourceIds = selectedResources.map((resource) => resource.cai_resourceid);

  // Per-employee allocation status, sorted: misallocated first
  const employeeStatuses = useMemo<EmployeeAllocationStatus[]>(() => {
    const statuses = selectedResources.map((resource) => {
      const resourceAssignments = assignments.filter(
        (a) => a._cai_resourceid_value === resource.cai_resourceid,
      );
      const total = sumPercentages(resourceAssignments);
      return {
        resource,
        total,
        count: resourceAssignments.length,
        isValid: total === 100,
        resourceAssignments,
      };
    });
    return statuses.sort((a, b) => {
      if (a.isValid === b.isValid) return 0;
      return a.isValid ? 1 : -1;
    });
  }, [selectedResources, assignments]);

  const serviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const si of serviceInitiatives) {
      map.set(si.cai_serviceorinitiativeid, si.cai_name);
    }
    return map;
  }, [serviceInitiatives]);

  const invalidCount = employeeStatuses.filter((s) => !s.isValid).length;

  const handleConfirmAction = async () => {
    setProcessing(true);
    try {
      if (pendingAction === 'add' && addServiceId) {
        await onBulkAdd(resourceIds, addServiceId, addPercentage);
        showToast('success', `Assignment added to ${selectedResources.length} employees`);
        setAddServiceId('');
        setAddPercentage(10);
      } else if (pendingAction === 'remove' && removeServiceId) {
        await onBulkRemove(resourceIds, removeServiceId);
        showToast('success', `Assignment removed from ${selectedResources.length} employees`);
        setRemoveServiceId('');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Bulk operation failed');
    } finally {
      setProcessing(false);
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  };

  const initiateAction = (action: 'add' | 'remove') => {
    setPendingAction(action);
    setConfirmDialogOpen(true);
  };

  const selectedServiceName = (id: string) =>
    serviceInitiatives.find((service) => service.cai_serviceorinitiativeid === id)?.cai_name ?? '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={500} weight="semibold">
          <PeopleTeamRegular style={{ marginRight: 8 }} />
          Bulk Edit — {formatCount(selectedResources.length)} selected
        </Text>
        {invalidCount > 0 && (
          <MessageBar intent="warning">
            <MessageBarBody>
              {formatCount(invalidCount)} employee{invalidCount !== 1 ? 's' : ''} not at 100% allocation.
              Click a name to adjust.
            </MessageBarBody>
          </MessageBar>
        )}
      </div>

      <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

      <div className={styles.content}>
        {/* Employee allocation status list */}
        <div className={styles.section}>
          <Text size={400} weight="semibold">Employee Assignment Status</Text>
          <div className={styles.employeeStatusList}>
            {employeeStatuses.map(({ resource, total, count, isValid, resourceAssignments }) => (
              <div key={resource.cai_resourceid} className={styles.employeeStatusRow}>
                {!isValid && (
                  <Warning20Regular
                    className={styles.warningIcon}
                    style={{
                      color: total > 100
                        ? tokens.colorStatusDangerForeground1
                        : tokens.colorStatusWarningForeground1,
                    }}
                  />
                )}
                <Avatar
                  name={resource.cai_displayname}
                  initials={getInitials(resource.cai_displayname)}
                  size={24}
                  color="colorful"
                />
                <div className={styles.employeeStatusInfo}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Link
                      className={styles.employeeNameLink}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectEmployee?.(resource.cai_resourceid);
                      }}
                    >
                      {resource.cai_displayname}
                    </Link>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginLeft: 8 }}>
                      {count} assignment{count !== 1 ? 's' : ''}
                    </Text>
                  </div>
                  {resourceAssignments.length > 0 && (
                    <div className={styles.assignmentChips}>
                      {resourceAssignments
                        .sort((a, b) => b.cai_allocationpercentage - a.cai_allocationpercentage)
                        .map((a) => (
                          <span key={a.cai_assignmentid} className={styles.assignmentChip}>
                            {serviceNameMap.get(a._cai_serviceorinitiativeid_value) ?? 'Unknown'}
                            <span className={styles.chipPct}>{a.cai_allocationpercentage}%</span>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div className={styles.statusBadge}>
                  <Badge
                    appearance="filled"
                    color={isValid ? 'success' : total > 100 ? 'danger' : 'warning'}
                    size="medium"
                  >
                    {formatPercentage(total)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

        <div className={styles.section}>
          <Text size={400} weight="semibold">
            Add Assignment to All
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            This will add the selected service to every selected employee.
          </Text>
          <div className={styles.formRow}>
            <div style={{ flex: 1 }}>
              <ServicePicker
                hierarchy={hierarchy}
                services={serviceInitiatives}
                selectedServiceId={addServiceId || null}
                onSelect={(id) => setAddServiceId(id)}
                placeholder="Select service"
              />
            </div>
            <SpinButton
              style={{ width: 100 }}
              value={addPercentage}
              min={0}
              max={100}
              step={5}
              onChange={(_e, data) => {
                const raw = data.value != null && !Number.isNaN(data.value)
                  ? data.value
                  : data.displayValue != null ? parseInt(data.displayValue, 10) : NaN;
                if (!Number.isNaN(raw)) {
                  const clamped = Math.max(0, Math.min(100, raw));
                  setAddPercentage(Math.round(clamped / 5) * 5);
                }
              }}
            />
            <Button
              appearance="primary"
              icon={<AddRegular />}
              disabled={!addServiceId || processing}
              onClick={() => initiateAction('add')}
            >
              Add
            </Button>
          </div>
        </div>

        <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

        <div className={styles.section}>
          <Text size={400} weight="semibold">
            Remove Assignment from All
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            This will remove the selected service from every selected employee that has it.
          </Text>
          <div className={styles.formRow}>
            <div style={{ flex: 1 }}>
              <ServicePicker
                hierarchy={hierarchy}
                services={serviceInitiatives}
                selectedServiceId={removeServiceId || null}
                onSelect={(id) => setRemoveServiceId(id)}
                placeholder="Select service to remove"
              />
            </div>
            <Button
              appearance="subtle"
              icon={<DeleteRegular />}
              disabled={!removeServiceId || processing}
              onClick={() => initiateAction('remove')}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmDialogOpen} onOpenChange={(_e, data) => setConfirmDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {pendingAction === 'add' ? 'Add Assignment' : 'Remove Assignment'}
            </DialogTitle>
            <DialogContent>
              {pendingAction === 'add' ? (
                <Text>
                  Add <strong>{selectedServiceName(addServiceId)}</strong> at{' '}
                  <strong>{addPercentage}%</strong> to{' '}
                  <strong>{selectedResources.length}</strong> employees?
                </Text>
              ) : (
                <Text>
                  Remove <strong>{selectedServiceName(removeServiceId)}</strong> from{' '}
                  <strong>{selectedResources.length}</strong> employees?
                </Text>
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" disabled={processing}>
                  Cancel
                </Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleConfirmAction} disabled={processing}>
                {processing ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
