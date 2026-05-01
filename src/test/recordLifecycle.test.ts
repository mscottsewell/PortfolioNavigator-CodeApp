import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi } from '../api';
import { AllocationStatus } from '../types';

describe('record lifecycle behavior', () => {
  beforeEach(() => {
    mockApi.resetData();
  });

  it('reactivates an inactive assignment instead of creating a duplicate', async () => {
    const assignments = await mockApi.getAssignments();
    const original = assignments[0];

    expect(original).toBeDefined();
    if (!original) {
      return;
    }

    await mockApi.deleteAssignment(original.cai_assignmentid);

    const afterDeactivate = await mockApi.getAssignments([original._cai_resourceid_value]);
    expect(afterDeactivate.some((assignment) => assignment.cai_assignmentid === original.cai_assignmentid)).toBe(false);

    const reactivated = await mockApi.createAssignment({
      ...original,
      cai_assignmentname: original.cai_assignmentname,
      cai_allocationpercentage: 55,
      cai_totalallocatedperuserperperiod: 55,
    });

    expect(reactivated.cai_assignmentid).toBe(original.cai_assignmentid);

    const afterReactivate = await mockApi.getAssignments([original._cai_resourceid_value]);
    const matchingAssignments = afterReactivate.filter(
      (assignment) => assignment._cai_serviceorinitiativeid_value === original._cai_serviceorinitiativeid_value,
    );

    expect(matchingAssignments).toHaveLength(1);
    expect(matchingAssignments[0]?.cai_allocationpercentage).toBe(55);
  });

  it('reactivates an inactive allocation instead of creating a duplicate', async () => {
    const allocations = await mockApi.getAllocations();
    const original = allocations[0];

    expect(original).toBeDefined();
    if (!original) {
      return;
    }

    await mockApi.deleteAllocation(original.cai_allocationid);

    const afterDeactivate = await mockApi.getAllocations(
      original._cai_allocationperiodid_value,
      [original._cai_resourceid_value],
    );
    expect(afterDeactivate.some((allocation) => allocation.cai_allocationid === original.cai_allocationid)).toBe(false);

    const reactivated = await mockApi.createAllocation({
      ...original,
      cai_allocationpercentage: 65,
      cai_managerapprovalstatus: AllocationStatus.PendingReview,
      cai_managerapprovalstatus_formatted: 'Pending Review',
    });

    expect(reactivated.cai_allocationid).toBe(original.cai_allocationid);

    const afterReactivate = await mockApi.getAllocations(
      original._cai_allocationperiodid_value,
      [original._cai_resourceid_value],
    );
    const matchingAllocations = afterReactivate.filter(
      (allocation) => allocation._cai_serviceorinitiativeid_value === original._cai_serviceorinitiativeid_value,
    );

    expect(matchingAllocations).toHaveLength(1);
    expect(matchingAllocations[0]?.cai_allocationpercentage).toBe(65);
  });
});
