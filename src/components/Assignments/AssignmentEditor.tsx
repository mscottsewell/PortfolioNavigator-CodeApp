/* ── Assignment Editor (single employee) ── */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Avatar,
  Divider,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { AddRegular, SaveRegular } from '@fluentui/react-icons';
import type { IResource, IAssignment, IServiceOrInitiative } from '../../types';
import type { ServiceHierarchyNode } from '../../hooks';
import { PercentageBar } from '../Shared';
import { useToast } from '../Shared/Toast';
import { validatePercentages, getInitials, formatPercentage, trackEvent, trackException } from '../../utils';
import { AssignmentRow } from './AssignmentRow';

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
    gap: '4px',
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
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

interface AssignmentEditorProps {
  resource: IResource;
  assignments: IAssignment[];
  serviceInitiatives: IServiceOrInitiative[];
  hierarchy: ServiceHierarchyNode[];
  onSave: (changes: AssignmentChange[]) => Promise<void>;
  onAdd: (resourceId: string, serviceId: string, percentage: number) => Promise<void>;
  onDelete: (assignmentId: string) => Promise<void>;
}

export interface AssignmentChange {
  assignmentId: string;
  data: Partial<Pick<IAssignment, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value' | 'cai_totalallocatedperuserperperiod'>>;
}

export function AssignmentEditor({
  resource,
  assignments,
  serviceInitiatives,
  hierarchy,
  onSave,
  onAdd,
  onDelete,
}: AssignmentEditorProps) {
  const styles = useStyles();
  const { showToast } = useToast();
  const [localAssignments, setLocalAssignments] = useState<IAssignment[]>(assignments);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<IAssignment>>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalAssignments(assignments);
    setPendingChanges(new Map());
  }, [assignments, resource.cai_resourceid]);

  const hasBlankService = localAssignments.some((a) => !a._cai_serviceorinitiativeid_value);

  const validation = useMemo(() => {
    const result = validatePercentages(localAssignments);
    if (result.isValid && hasBlankService) {
      return { ...result, isValid: false, message: 'All rows must have a service selected' };
    }
    return result;
  }, [localAssignments, hasBlankService]);

  const usedServiceIds = useMemo(
    () => new Set(localAssignments.map((a) => a._cai_serviceorinitiativeid_value).filter(Boolean)),
    [localAssignments],
  );

  const segments = useMemo(
    () =>
      localAssignments.map((assignment) => ({
        percentage: assignment.cai_allocationpercentage,
        label: assignment._cai_serviceorinitiativeid_value_formatted,
      })),
    [localAssignments],
  );

  const handleUpdate = useCallback(
    (assignmentId: string, data: Partial<IAssignment>) => {
      setLocalAssignments((prev) =>
        prev.map((assignment) =>
          assignment.cai_assignmentid === assignmentId ? { ...assignment, ...data } : assignment,
        ),
      );
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(assignmentId) ?? {};
        next.set(assignmentId, { ...existing, ...data });
        return next;
      });
    },
    [],
  );

  const handleAdd = () => {
    const currentTotal = localAssignments.reduce((sum, a) => sum + a.cai_allocationpercentage, 0);
    const remaining = Math.max(0, 100 - currentTotal);

    const draftId = `draft-${Date.now()}`;
    const draft: IAssignment = {
      cai_assignmentid: draftId,
      cai_assignmentname: '',
      _cai_resourceid_value: resource.cai_resourceid,
      _cai_resourceid_value_formatted: resource.cai_displayname,
      _cai_serviceorinitiativeid_value: '',
      _cai_serviceorinitiativeid_value_formatted: '',
      cai_allocationpercentage: remaining,
      cai_totalallocatedperuserperperiod: 0,
    };
    setLocalAssignments((prev) => [...prev, draft]);
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(draftId, draft);
      return next;
    });
  };

  const handleDelete = async (assignmentId: string) => {
    // Draft rows (not yet persisted) — just remove locally
    if (assignmentId.startsWith('draft-')) {
      setLocalAssignments((prev) => prev.filter((a) => a.cai_assignmentid !== assignmentId));
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.delete(assignmentId);
        return next;
      });
      return;
    }
    try {
      await onDelete(assignmentId);
      setLocalAssignments((prev) => prev.filter((assignment) => assignment.cai_assignmentid !== assignmentId));
      setPendingChanges((prev) => {
        const next = new Map(prev);
        next.delete(assignmentId);
        return next;
      });
      showToast('success', 'Assignment removed');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  };

  const handleSave = async () => {
    if (!validation.isValid) return;
    setSaving(true);
    try {
      // Separate drafts (new rows) from updates to existing rows
      const drafts: { serviceId: string; percentage: number }[] = [];
      const changes: AssignmentChange[] = [];

      for (const [assignmentId, data] of pendingChanges) {
        if (assignmentId.startsWith('draft-')) {
          if (data._cai_serviceorinitiativeid_value) {
            drafts.push({
              serviceId: data._cai_serviceorinitiativeid_value,
              percentage: data.cai_allocationpercentage ?? 0,
            });
          }
        } else {
          const changeData: Partial<Pick<IAssignment,
            'cai_allocationpercentage'
            | '_cai_serviceorinitiativeid_value'
            | 'cai_totalallocatedperuserperperiod'
          >> = {};
          const currentAssignment = localAssignments.find((assignment) => assignment.cai_assignmentid === assignmentId);
          if (data.cai_allocationpercentage !== undefined) {
            changeData.cai_allocationpercentage = data.cai_allocationpercentage;
            changeData.cai_totalallocatedperuserperperiod = data.cai_allocationpercentage;
          }
          if (data._cai_serviceorinitiativeid_value !== undefined) {
            changeData._cai_serviceorinitiativeid_value = data._cai_serviceorinitiativeid_value;
            if (changeData.cai_totalallocatedperuserperperiod === undefined) {
              changeData.cai_totalallocatedperuserperperiod = currentAssignment?.cai_allocationpercentage;
            }
          }
          changes.push({ assignmentId, data: changeData });
        }
      }

      trackEvent('AssignmentSaveRequested', {
        properties: {
          resourceId: resource.cai_resourceid,
        },
        measurements: {
          changeCount: changes.length,
          draftCount: drafts.length,
        },
      });

      if (changes.length > 0) {
        await onSave(changes);
      }
      for (const draft of drafts) {
        await onAdd(resource.cai_resourceid, draft.serviceId, draft.percentage);
      }

      setPendingChanges(new Map());
      trackEvent('AssignmentSaveCompleted', {
        properties: {
          resourceId: resource.cai_resourceid,
        },
        measurements: {
          changeCount: changes.length,
          draftCount: drafts.length,
        },
      });
      showToast('success', `Assignments saved for ${resource.cai_displayname}`);
    } catch (err) {
      trackException(err, {
        area: 'AssignmentEditor',
        action: 'save',
        resourceId: resource.cai_resourceid,
      });
      showToast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = pendingChanges.size > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Avatar
          name={resource.cai_displayname}
          initials={getInitials(resource.cai_displayname)}
          size={36}
          color="colorful"
        />
        <div className={styles.headerInfo}>
          <Text size={500} weight="semibold">
            {resource.cai_displayname}
          </Text>
        </div>
      </div>

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
            {localAssignments.length} assignment{localAssignments.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <PercentageBar segments={segments} showOverflow />
        {!validation.isValid && (
          <MessageBar intent="warning" style={{ marginTop: 8 }}>
            <MessageBarBody>{validation.message}</MessageBarBody>
          </MessageBar>
        )}
      </div>

      <Divider style={{ flexGrow: 0, flexShrink: 0 }} />

      <div className={styles.content}>
        {localAssignments.map((assignment) => (
          <AssignmentRow
            key={assignment.cai_assignmentid}
            assignment={assignment}
            serviceInitiatives={serviceInitiatives}
            hierarchy={hierarchy}
            usedServiceIds={usedServiceIds}
            onUpdate={(data) => handleUpdate(assignment.cai_assignmentid, data)}
            onDelete={() => handleDelete(assignment.cai_assignmentid)}
            disabled={saving}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <Button
          appearance="subtle"
          icon={<AddRegular />}
          onClick={handleAdd}
          disabled={saving || usedServiceIds.size >= serviceInitiatives.length}
        >
          Add Assignment
        </Button>
        <Button
          appearance="primary"
          icon={<SaveRegular />}
          onClick={handleSave}
          disabled={!hasChanges || !validation.isValid || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
