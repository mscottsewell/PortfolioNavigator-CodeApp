/* ── Dataverse option set value constants ── */

export const AllocationStatus = {
  PendingReview: 100000000,
  ReviewComplete: 100000001,
  ReviewCompleteRemoved: 100000002,
} as const;

export type AllocationStatusValue =
  (typeof AllocationStatus)[keyof typeof AllocationStatus];

export const DelegationScopeType = {
  DesignatedManagerDirects: 100000000,
  M1Peers: 100000001,
  M1Cascade: 100000002,
  M2Cascade: 100000003,
  M3Cascade: 100000004,
  L1Cascade: 100000005,
  L2Cascade: 100000006,
  DesignatedManagerCascade: 100000007,
} as const;

export type DelegationScopeTypeValue =
  (typeof DelegationScopeType)[keyof typeof DelegationScopeType];

export const ManagerSummaryType = {
  Allocation: 1,
  Assignment: 2,
} as const;

export type ManagerSummaryTypeValue =
  (typeof ManagerSummaryType)[keyof typeof ManagerSummaryType];
