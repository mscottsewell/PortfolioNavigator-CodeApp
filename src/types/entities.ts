/* ── Dataverse entity interfaces ── */

export interface IFunctionalTeam {
  cai_areaid: string;
  cai_areaname: string;
  cai_missionsubcategory: string;
  cai_description?: string;
  cai_mission?: string;
  cai_mode?: string;
}

export interface IResource {
  cai_resourceid: string;
  cai_displayname: string;
  cai_alias: string;
  _cai_managerresourceid_value?: string;
  _cai_managerresourceid_value_formatted?: string;
  _cai_manageruserid_value?: string;
  _cai_manageruserid_value_formatted?: string;
  _cai_userid_value?: string;
  _cai_userid_value_formatted?: string;
}

export interface IAssignment {
  cai_assignmentid: string;
  cai_assignmentname: string;
  cai_allocationpercentage: number;
  _cai_resourceid_value: string;
  _cai_resourceid_value_formatted?: string;
  _cai_serviceorinitiativeid_value: string;
  _cai_serviceorinitiativeid_value_formatted?: string;
  cai_totalallocatedperuserperperiod: number;
}

export interface IAllocation {
  cai_allocationid: string;
  cai_name: string;
  cai_allocationpercentage: number;
  _cai_allocationperiodid_value: string;
  _cai_allocationperiodid_value_formatted?: string;
  _cai_resourceid_value: string;
  _cai_resourceid_value_formatted?: string;
  _cai_serviceorinitiativeid_value: string;
  _cai_serviceorinitiativeid_value_formatted?: string;
  _cai_manager_systemuserid_value: string;
  _cai_manager_systemuserid_value_formatted?: string;
  _cai_managerreviewcompletedbyid_value?: string | null;
  _cai_managerreviewcompletedbyid_value_formatted?: string;
  cai_managerapprovalstatus: number;
  cai_managerapprovalstatus_formatted?: string;
  cai_managerreviewdate?: string | null;
  cai_employeename: string;
  cai_alias: string;
}

export interface IAllocationPeriod {
  cai_allocationperiodid: string;
  cai_periodname: string;
  cai_allocationperiod_start: string;
  cai_allocationperiod_end: string;
  cai_iscurrentperiod: boolean | null;
  cai_fiscalyear: number;
}

export interface IServiceOrInitiative {
  cai_serviceorinitiativeid: string;
  cai_name: string;
  cai_description?: string;
  _cai_area_value: string;
  _cai_area_value_formatted?: string;
  _cai_parentserviceorinitiativeid_value?: string;
  _cai_parentserviceorinitiativeid_value_formatted?: string;
  _ownerid_value?: string;
  _ownerid_value_formatted?: string;
  _cai_pmleadid_value?: string;
  _cai_pmleadid_value_formatted?: string;
  _cai_pmbusinessmanagerid_value?: string;
  _cai_pmbusinessmanagerid_value_formatted?: string;
  _cai_engleadid_value?: string;
  _cai_engleadid_value_formatted?: string;
  _cai_engbusinessmanagerid_value?: string;
  _cai_engbusinessmanagerid_value_formatted?: string;
}

export interface IDelegation {
  cai_delegationid: string;
  cai_name: string;
  cai_scopetype: number;
  _cai_delegatorresourceid_value?: string;
  _cai_delegatorresourceid_value_formatted?: string;
  _ownerid_value: string;
  _ownerid_value_formatted?: string;
}

export interface IManagerSummary {
  cai_managersummaryid: string;
  cai_name: string;
  cai_summarytype: number;
  _cai_managerresourceid_value: string;
  _cai_managerresourceid_value_formatted?: string;
  _cai_allocationperiodid_value?: string | null;
  _cai_allocationperiodid_value_formatted?: string;
  // Pipeline rollup fields (full subtree counts — pipeline is source of truth)
  cai_totalemployees: number;
  cai_alertcount: number;
  cai_pendingcount: number;
  cai_nottotalingcount: number;
  cai_norecordscount: number;
  cai_inactiveserviceemployeecount: number;
  cai_inactiveservicerecordcount: number;
  // Direct-only count fields (this manager's direct reports only)
  cai_directtotalemployees?: number | null;
  cai_directalertcount?: number | null;
  cai_directpendingcount?: number | null;
  cai_directnottotalingcount?: number | null;
  cai_directnorecordscount?: number | null;
  cai_directinactiveserviceemployeecount?: number | null;
  cai_directinactiveservicerecordcount?: number | null;
  // Parent-child tree link
  _cai_parentsummaryid_value?: string | null;
  cai_lastcalculatedon?: string | null;
}

/** Direct-report-only counts for a single manager. */
export interface DirectCounts {
  totalEmployees: number;
  alertCount: number;
  pendingCount: number;
  nottotalingCount: number;
  noRecordsCount: number;
  inactiveServiceEmployeeCount: number;
  inactiveServiceRecordCount: number;
}

/** Rolled-up counts computed from the summary tree (self + all descendants). */
export interface RollupCounts extends DirectCounts {
  /** The manager's own direct counts (before adding descendants). */
  directCounts: DirectCounts;
}

export interface IServiceInitiativeSummary {
  cai_serviceinitiativesummaryid: string;
  cai_name: string;
  cai_summarytype: number;
  _cai_managerresourceid_value: string | null;
  _cai_managerresourceid_value_formatted?: string;
  _cai_serviceorinitiativeid_value: string;
  _cai_serviceorinitiativeid_value_formatted?: string;
  _cai_allocationperiodid_value?: string | null;
  _cai_allocationperiodid_value_formatted?: string;
  cai_employeecount: number;
  cai_totalpercentage: number;
  cai_fte: number;
  cai_lastcalculatedon?: string | null;
}
