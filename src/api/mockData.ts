/* ── Mock data for local development ── */

import type {
  IFunctionalTeam,
  IResource,
  IAssignment,
  IAllocation,
  IAllocationPeriod,
  IServiceOrInitiative,
  IDelegation,
  IManagerSummary,
} from '../types';
import { AllocationStatus, DelegationScopeType, ManagerSummaryType } from '../types';
import { MOCK_CURRENT_USER_ID } from './identity';

export const MOCK_MANAGER_USER_ID = MOCK_CURRENT_USER_ID;
export const MOCK_MANAGER_RESOURCE_ID = '918d17ea-6612-f111-8406-6045bd05fdde';
export const MOCK_MANAGER_NAME = 'Klaus Sample';
export const MOCK_MANAGER_ALIAS = 'ksample';
const ACTIVE_STATE_CODE = 0;
const ACTIVE_STATUS_CODE = 1;
const INACTIVE_STATE_CODE = 1;
const INACTIVE_STATUS_CODE = 2;

type MockAssignment = IAssignment & {
  statecode: number;
  statuscode: number;
  modifiedon: string;
};

type MockAllocation = IAllocation & {
  statecode: number;
  statuscode: number;
  modifiedon: string;
};

let mockModifiedOnCounter = 0;

function nextModifiedOn(): string {
  const timestamp = new Date(Date.UTC(2026, 0, 1, 0, 0, mockModifiedOnCounter));
  mockModifiedOnCounter += 1;
  return timestamp.toISOString();
}

function toPublicAssignment(assignment: MockAssignment): IAssignment {
  const { statecode, statuscode, modifiedon, ...publicAssignment } = assignment;
  void statecode;
  void statuscode;
  void modifiedon;
  return { ...publicAssignment };
}

function toPublicAllocation(allocation: MockAllocation): IAllocation {
  const { statecode, statuscode, modifiedon, ...publicAllocation } = allocation;
  void statecode;
  void statuscode;
  void modifiedon;
  return { ...publicAllocation };
}

function createGuid(seed: number): string {
  const part1 = seed.toString(16).padStart(8, '0').slice(-8);
  const part5 = (0x6045bd050000 + seed).toString(16).padStart(12, '0').slice(-12);
  return `${part1}-6612-f111-8406-${part5}`;
}

function cloneItems<T>(items: T[]): T[] {
  return items.map((item) => ({ ...item }));
}

const teamDefinitions = [
  { cai_areaid: 'e9d396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: '1ES AI', cai_missionsubcategory: '1P', cai_mission: '1P' },
  { cai_areaid: 'edd396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: '1ES GitHub inside Microsoft', cai_missionsubcategory: '1P', cai_mission: '1P' },
  { cai_areaid: 'f1d396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Data Platform (Antares, Cloudmine, DevDiv)', cai_missionsubcategory: '1P', cai_mission: '1P' },
  { cai_areaid: 'efd396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Engineering Productivity', cai_missionsubcategory: '1P', cai_mission: '1P' },
  { cai_areaid: 'ebd396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Engineering System Security', cai_missionsubcategory: '1P', cai_mission: '1P' },
  { cai_areaid: 'f3d396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'EngThrive', cai_missionsubcategory: '1P', cai_mission: '1P' },
  { cai_areaid: 'c0d26848-6d13-f111-8406-002248047ac0', cai_areaname: 'Second Sample', cai_missionsubcategory: '1P' },
  { cai_areaid: '3dd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'AI Workloads', cai_missionsubcategory: 'AI Infrastructure & Platform', cai_description: 'Turning model capability and AI processing into customer-ready services and products. Engineering leader Chris Basoglu', cai_mission: 'Models and AI Infrastructure & Platform' },
  { cai_areaid: '4fd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Foundry Local & ONNX', cai_missionsubcategory: 'AI Infrastructure & Platform', cai_description: 'engineering leader Rajat Monga', cai_mission: 'Models and AI Infrastructure & Platform' },
  { cai_areaid: '3fd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Inferencing', cai_missionsubcategory: 'AI Infrastructure & Platform', cai_description: 'Delivering customer-ready services and products reliably at a global scale. Engineering leader Sid Sidhartha', cai_mission: 'Models and AI Infrastructure & Platform' },
  { cai_areaid: '41d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Infrastructure', cai_missionsubcategory: 'AI Infrastructure & Platform', cai_description: 'Providing the foundation that makes it all possible. Engineering leader Vipul Modi', cai_mission: 'Models and AI Infrastructure & Platform' },
  { cai_areaid: '45d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Training', cai_missionsubcategory: 'AI Infrastructure & Platform', cai_description: 'Enabling fast, high-quality model creation, validation, and release. Engineering leader Zoe Adams', cai_mission: 'Models and AI Infrastructure & Platform' },
  { cai_areaid: '53d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Applied Eng & Forward Deploy', cai_missionsubcategory: 'CoreAI Outbound', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '55d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Dev Rel & Community', cai_missionsubcategory: 'CoreAI Outbound', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '57d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Outbound PM/Marketing/Content', cai_missionsubcategory: 'CoreAI Outbound', cai_mission: 'Outbound & Operations' },
  { cai_areaid: 'f7d396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: '.NET', cai_missionsubcategory: 'Dev Platform & Services', cai_mission: 'Dev Platform & Services' },
  { cai_areaid: 'f9d396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Azure DevOps', cai_missionsubcategory: 'Dev Platform & Services', cai_mission: 'Dev Platform & Services' },
  { cai_areaid: 'fbd396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'C++', cai_missionsubcategory: 'Dev Platform & Services', cai_mission: 'Dev Platform & Services' },
  { cai_areaid: 'e3cf625c-6313-f111-8406-6045bd01394c', cai_areaname: 'Language & Runtimes - Cross-language', cai_missionsubcategory: 'Dev Platform & Services' },
  { cai_areaid: 'ffd396a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Language & Runtimes - Other languages', cai_missionsubcategory: 'Dev Platform & Services', cai_mission: 'Dev Platform & Services' },
  { cai_areaid: '01d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Visual Studio', cai_missionsubcategory: 'Dev Platform & Services', cai_mission: 'Dev Platform & Services' },
  { cai_areaid: '62e647f0-2e17-f111-8341-6045bd0392f4', cai_areaname: 'Experimentation', cai_missionsubcategory: 'Foundry Agent Platform', cai_description: 'Engineering leader Caleb Hug', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '4f825f31-2f17-f111-8341-6045bd0392f4', cai_areaname: 'Foundry 3P Training & Routing', cai_missionsubcategory: 'Foundry Agent Platform', cai_description: 'engineering leader Vijay Aski', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '03d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Foundry Agent Hosting & Deployment', cai_missionsubcategory: 'Foundry Agent Platform', cai_description: 'Engineering leader: Rajneesh Singh', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '05d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Foundry Developer Experience', cai_missionsubcategory: 'Foundry Agent Platform', cai_description: 'Engineering leader Sindhura Bandhakavi', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '07d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Foundry Observability', cai_missionsubcategory: 'Foundry Agent Platform', cai_description: 'Engineering leader: Sam Naghshineh', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '3fa451b0-2814-f111-8406-6045bd013b70', cai_areaname: 'Applied Science', cai_missionsubcategory: 'GitHub Copilot & Agentic DevOps' },
  { cai_areaid: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Copilot Agents', cai_missionsubcategory: 'GitHub Copilot & Agentic DevOps', cai_mission: 'GitHub Copilot & Agentic DevOps' },
  { cai_areaid: '23d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Copilot for Visual Studio & 3rd party IDEs', cai_missionsubcategory: 'GitHub Copilot & Agentic DevOps', cai_mission: 'GitHub Copilot & Agentic DevOps' },
  { cai_areaid: '25d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Copilot Intelligence Platform', cai_missionsubcategory: 'GitHub Copilot & Agentic DevOps', cai_mission: 'GitHub Copilot & Agentic DevOps' },
  { cai_areaid: '27d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'VS Code, Extensions, VS Marketplace', cai_missionsubcategory: 'GitHub Copilot & Agentic DevOps', cai_mission: 'GitHub Copilot & Agentic DevOps' },
  { cai_areaid: '29d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Core Productivity', cai_missionsubcategory: 'GitHub Foundation', cai_mission: 'GitHub Foundation' },
  { cai_areaid: 'd0d11dfd-6613-f111-8406-6045bd013b70', cai_areaname: 'Other (GitHub)', cai_missionsubcategory: 'GitHub Foundation' },
  { cai_areaid: 'b721c075-6113-f111-8406-6045bd013b70', cai_areaname: 'Platform & Enterprise', cai_missionsubcategory: 'GitHub Foundation' },
  { cai_areaid: '5ee13acf-6613-f111-8406-6045bd013b70', cai_areaname: 'Security Products', cai_missionsubcategory: 'GitHub Foundation' },
  { cai_areaid: '59d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Corporate & Digital Sales', cai_missionsubcategory: 'GitHub Revenue & Operations', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '5bd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Enterprise Sales', cai_missionsubcategory: 'GitHub Revenue & Operations', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '5dd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Field Services', cai_missionsubcategory: 'GitHub Revenue & Operations', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '50ac6cfc-4222-f111-8341-0022480a6bbb', cai_areaname: 'GitHub Customer Success', cai_missionsubcategory: 'GitHub Revenue & Operations' },
  { cai_areaid: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'IT, Security, CELA, HR, Brand & Marketing', cai_missionsubcategory: 'GitHub Revenue & Operations', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '61d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Partner Sales & Professional Services', cai_missionsubcategory: 'GitHub Revenue & Operations', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '63d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Revenue Ops & Enablement', cai_missionsubcategory: 'GitHub Revenue & Operations', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '0fd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Content Understanding & Document Intelligence', cai_missionsubcategory: 'Knowledge & Intelligence', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '0bd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Foundry IQ', cai_missionsubcategory: 'Knowledge & Intelligence', cai_description: 'Engineering leader, Pablo Casto.  Includes EKG, Agent Tools work to be accounted for in Foundry Agent.', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '09d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Language & Translation', cai_missionsubcategory: 'Knowledge & Intelligence', cai_description: 'engineering leader Li Jiang', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '0dd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Speech', cai_missionsubcategory: 'Knowledge & Intelligence', cai_description: 'engineering leader Li Jiang', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '8cffbbe6-cef7-f011-8407-002248094b57', cai_areaname: 'Air Gap Cloud', cai_missionsubcategory: 'Other', cai_mission: 'Other' },
  { cai_areaid: '58b705ed-cef7-f011-8407-002248094b57', cai_areaname: 'Customer Success', cai_missionsubcategory: 'Other', cai_mission: 'Other' },
  { cai_areaid: '65d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Exec LT', cai_missionsubcategory: 'Other', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '4b5109e6-6113-f111-8406-6045bd01394c', cai_areaname: 'Frontier Ops', cai_missionsubcategory: 'Outbound and operations' },
  { cai_areaid: '67d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Ops Leads / EA / COS / Business Managers', cai_missionsubcategory: 'Outbound and operations', cai_mission: 'Outbound & Operations' },
  { cai_areaid: '11d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'App Platform Services', cai_missionsubcategory: 'Platform as a Service', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '13d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Azure Developer Tools', cai_missionsubcategory: 'Platform as a Service', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '15d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Integration Services', cai_missionsubcategory: 'Platform as a Service', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '17d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Partner Ecosystem & SRE Agent', cai_missionsubcategory: 'Platform as a Service', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '19d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'Serverless & Supporting App Services', cai_missionsubcategory: 'Platform as a Service', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '1bd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'SFI/QEI PMs & TPMs', cai_missionsubcategory: 'Platform as a Service', cai_mission: 'Foundry & Apps' },
  { cai_areaid: '69d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: '1P RAI Products', cai_missionsubcategory: 'Security & Trust', cai_mission: 'Security & Trust' },
  { cai_areaid: '6fd496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: '3P RAI Products', cai_missionsubcategory: 'Security & Trust', cai_mission: 'Security & Trust' },
  { cai_areaid: '71d496a6-8ef5-f011-840a-000d3a5c2c86', cai_areaname: 'RAI Frontier Science Investments (SOTA)', cai_missionsubcategory: 'Security & Trust', cai_mission: 'Security & Trust' },
] satisfies IFunctionalTeam[];

export const mockFunctionalTeams: IFunctionalTeam[] = cloneItems(teamDefinitions);

const teamById = new Map(mockFunctionalTeams.map((team) => [team.cai_areaid, team]));

type ServiceDefinition = {
  id: string;
  name: string;
  areaId: string;
  parentId?: string;
  description?: string;
  ownerName?: string;
  pmLeadName?: string;
  pmBizMgrName?: string;
  engLeadName?: string;
  engBizMgrName?: string;
};

const serviceDefinitions: ServiceDefinition[] = [
  { id: 'd2efe6a6-6313-f111-8406-6045bd01394c', name: '.NET Platform', areaId: 'f7d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Ararat Sample', engBizMgrName: 'An Sample' },
  { id: '0fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '.NET Sub-agents', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Jelena Sample', pmBizMgrName: 'Yu-ri Sample', engLeadName: 'Yusuf Sample', engBizMgrName: 'An Sample' },
  { id: '7da2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '.NET Tools', areaId: 'f7d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Yusuf Sample', engBizMgrName: 'An Sample' },
  { id: 'e5a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '[DEPRECATE] Azure Tools (incl. Azure Tools for VS Code, Container tools for VS and VS Code, VS Code (Web)- Azure)', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Renata Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Aveen Sample', engBizMgrName: 'An Sample' },
  { id: '83a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '[DEPRECATE] IT Security - Governance & Trust', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '7da3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '[DEPRECATE] IT Security - Safety & Integrity', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '7ba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '[DEPRECATE] IT Security - Security Lab', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '81a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '[DEPRECATE] IT Security - Security Operations', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '7fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '[DEPRECATE] IT Security - Security Services', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '39a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '1ES AI', areaId: 'e9d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmLeadName: 'Jeremías Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Rahman Sample', engBizMgrName: 'An Sample' },
  { id: '41a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: '1P Frontier Ops', areaId: '4b5109e6-6113-f111-8406-6045bd01394c', description: 'The Frontier Ops team works across all of Microsoft to automate processes and AI.   Note: Most of this team is funded by the COO office except Evan', ownerName: 'Flip Sample', pmLeadName: 'Flip Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Flip Sample', engBizMgrName: 'Lilan Sample' },
  { id: '1ba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Actions', areaId: 'b721c075-6113-f111-8406-6045bd013b70', description: 'Dispatch, npm, Persistence, Runtime, Dev Tunnels, Images & Storage, Compute Turbine, Codespaces, Compute Engine, MacCloud', ownerName: 'Sergio Sample', pmLeadName: 'Elen Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Eitan Sample', engBizMgrName: 'Julian Sample' },
  { id: '5f1e47d1-6717-f111-8341-00224803b8ac', name: 'Adaptive Eval', areaId: '6fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Lobar Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Sylvie Sample', engBizMgrName: 'Matej Sample' },
  { id: '6ae91205-c61c-f111-8341-00224803b3f9', name: 'ADC', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Krista Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Yuki Sample', engBizMgrName: 'An Sample' },
  { id: '561fe15d-d518-f111-8341-6045bd013b70', name: 'Agent Context + Integrations', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Blackbird Code Search, 1P Agents + Agent Context', ownerName: 'Mariña Sample', pmLeadName: 'Hua Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Tenuun Sample', engBizMgrName: 'Julian Sample' },
  { id: 'eae1157a-d518-f111-8341-6045bd013b70', name: 'Agent Platform + Experiences', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'CCA Growth, Spark, Chat Experiences, Enterprise & Innovation, Client Apps Platform, Mobile, Desktop, CLI', ownerName: 'Emilia Sample', pmLeadName: 'Jacob Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Aliya Sample', engBizMgrName: 'Julian Sample' },
  { id: '9a1c9412-d518-f111-8341-6045bd013b70', name: 'Agent Runtime + CLI', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Agent Runtime + CLI', ownerName: 'Emilia Sample', pmLeadName: 'Chuan Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Nemanja Sample', engBizMgrName: 'Julian Sample' },
  { id: '2891b77d-6717-f111-8341-00224803b8ac', name: 'Agent Shield', areaId: '6fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Artak Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Sylvie Sample', engBizMgrName: 'Matej Sample' },
  { id: '9f766d60-c218-f111-8341-002248047d5e', name: 'AI Agents & Fine-tuning', areaId: '3dd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Advanced prebuilt AI agents (like ChatGPT itself) and turning them into robust Azure services that internal product groups can use. Also build fine‑tuning and custom‑model engines.', ownerName: 'Leonidas Sample', pmLeadName: 'Ramziya Sample', engLeadName: 'Tane Sample', engBizMgrName: 'Keita Sample' },
  { id: '80c09932-c218-f111-8341-002248047d5e', name: 'AI API Orchestration', areaId: '3dd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Mid layer AI Processing behand every API feature of every request globally orchestration token conversion, safety, image, text, and multi-models with minimum latency and highest reliability.', ownerName: 'Leonidas Sample', pmLeadName: 'Ujin Sample', engLeadName: 'Ricardas Sample', engBizMgrName: 'Keita Sample' },
  { id: 'ada3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'AI Development Governance (FCP + GH)', areaId: '6fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Dani Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Sylvie Sample', engBizMgrName: 'Matej Sample' },
  { id: 'eda2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'AI Gateway', areaId: '15d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmLeadName: 'Sreymom Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Theodore Sample', engBizMgrName: 'An Sample' },
  { id: '1a778a20-981c-f111-8341-00224803b3f9', name: 'AI incubation squad', areaId: '01d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sidhhartha Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Diego Sample', engBizMgrName: 'An Sample' },
  { id: 'c2439c3f-6617-f111-8341-00224803b8ac', name: 'AI Integrity', areaId: '69d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Vlatka Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Asa Sample', engBizMgrName: 'Matej Sample' },
  { id: 'e900b6ba-c218-f111-8341-002248047d5e', name: 'AI Model Catalog', areaId: '3dd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Internal platform for managing all model IP, development, benchmarking, provisioning, and deploying to prod via automation and AI.', ownerName: 'Leonidas Sample', pmLeadName: 'Ramziya Sample', engLeadName: 'Altynbek Sample', engBizMgrName: 'Keita Sample' },
  { id: '9c4b3da0-c218-f111-8341-002248047d5e', name: 'AI Model Engine & Infrastructure', areaId: '3dd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Core engines and runtime that make large‑scale model serving on Azure fast, reliable, and ready for release. They take new models and hardware, deploy and optimize them, and keep the service healthy through performance work, automation, fleet efficiency, and live‑site operations.', ownerName: 'Leonidas Sample', pmLeadName: 'Priya Sample', engLeadName: 'Rajesh Sample', engBizMgrName: 'Keita Sample' },
  { id: 'a3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'AI Platform - Eric', areaId: '65d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Ananya Sample' },
  { id: '6b6a83d3-c218-f111-8341-002248047d5e', name: 'AI Quality', areaId: '3dd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Science and systems to validate quality of every feature before release. Customer callable API.  Work with customers to extract best results. Engines and runtime for embeddings.  Ensure security and vulnerabilities are addressed.', ownerName: 'Leonidas Sample', pmLeadName: 'Damir Sample', engLeadName: 'Jacobje Sample', engBizMgrName: 'Keita Sample' },
  { id: '6b95fcbe-6717-f111-8341-00224803b8ac', name: 'AI Security', areaId: '6fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'XPIA, Spotlighting, PII', ownerName: 'Iskandar Sample', pmLeadName: 'Artak Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Sylvie Sample', engBizMgrName: 'Matej Sample' },
  { id: 'a6074901-2914-f111-8406-6045bd013b70', name: 'AI-Assisted Dev Platform', areaId: '3fa451b0-2814-f111-8406-6045bd013b70', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '6da2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Air Gap Cloud', areaId: '8cffbbe6-cef7-f011-8407-002248094b57', ownerName: 'Kawa Sample', pmBizMgrName: 'Elena Sample', engBizMgrName: 'An Sample' },
  { id: '8ba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Analyst Relations', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Yara Sample' },
  { id: '49a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Antares Data Platform', areaId: 'f1d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Victor Sample', engLeadName: 'Victor Sample', engBizMgrName: 'An Sample' },
  { id: '0ea396e3-c51c-f111-8341-00224803b3f9', name: 'AOAI Hub', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Krista Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Subhash Sample', engBizMgrName: 'An Sample' },
  { id: 'f1a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'API Hub', areaId: '15d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Milan Sample', engBizMgrName: 'An Sample' },
  { id: 'eba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'API Management', areaId: '15d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmLeadName: 'Lars Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Noam Sample', engBizMgrName: 'An Sample' },
  { id: '05a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'App Config', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample', pmLeadName: 'Erik Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Alena Sample', engBizMgrName: 'An Sample' },
  { id: '91b5802a-c61c-f111-8341-00224803b3f9', name: 'App Lens', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Krista Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Bontle Sample', engBizMgrName: 'An Sample' },
  { id: '0da3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'App Mod Sub-agents', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'App Modernization & Migration', ownerName: 'Ngo Sample', pmLeadName: 'Ngo Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Hannah Sample', engBizMgrName: 'An Sample' },
  { id: 'c9a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'App Service', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Jana Sample', pmLeadName: 'Vitalii Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Jana Sample', engBizMgrName: 'An Sample' },
  { id: '94e2001e-c61c-f111-8341-00224803b3f9', name: 'App Service Dev Experience reset', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Aditya Sample', engBizMgrName: 'An Sample' },
  { id: '73a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'App Testing', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Klaus Sample', pmLeadName: 'Klaus Sample', pmBizMgrName: 'An Sample', engLeadName: 'Mica Sample', engBizMgrName: 'An Sample' },
  { id: '6fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Applied Eng & Forward Deploy', areaId: '53d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Ana Sample', pmLeadName: 'Suman Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Isabella Sample', engBizMgrName: 'Lilan Sample' },
  { id: '81a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Arm64 (C++)', areaId: 'fbd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Nikhil Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Tilek Sample', engBizMgrName: 'An Sample' },
  { id: '83a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'ARM64EC (C++)', areaId: 'fbd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Nikhil Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Tilek Sample', engBizMgrName: 'An Sample' },
  { id: '7fa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Aspire', areaId: 'e3cf625c-6313-f111-8406-6045bd01394c', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Sunisa Sample', engLeadName: 'Anaïs Sample', engBizMgrName: 'An Sample' },
  { id: '99a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure AI Core Back Plane', areaId: '05d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Azure AI Core Back Plane (incl. Vienna-Hyena migration, excl. Air Gap Cloud)', ownerName: 'Ana Sample', pmLeadName: 'Ujin Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Mads Sample', engBizMgrName: 'Elena Sample' },
  { id: '03a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure Container Apps', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Ana Sample', pmLeadName: 'Mateja Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Umesh Sample', engBizMgrName: 'An Sample' },
  { id: '066e42e5-af1c-f111-8341-00224803b3f9', name: 'Azure Developer CLI', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Viktoria Sample', engBizMgrName: 'An Sample' },
  { id: '6fa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure DevOps - AI', areaId: 'f9d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Hakan Sample', engBizMgrName: 'An Sample' },
  { id: '71a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure DevOps - Core Platform & AI infrastructure', areaId: 'f9d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmLeadName: 'Liliya Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Hakan Sample', engBizMgrName: 'An Sample' },
  { id: 'cba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure Diagnostic Services', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Kofi Sample', engBizMgrName: 'An Sample' },
  { id: 'e8829bf1-c51c-f111-8341-00224803b3f9', name: 'Azure Legion', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Albert Sample', engBizMgrName: 'An Sample' },
  { id: '81d19e15-561c-f111-8341-6045bd013b70', name: 'Azure Machine Learning', areaId: '4f825f31-2f17-f111-8341-6045bd0392f4', ownerName: 'Ana Sample', pmLeadName: 'Shaan Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Hanna Sample', engBizMgrName: 'Elena Sample' },
  { id: 'fba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure Managed Grafana', areaId: '17d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmLeadName: 'Erik Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Rima Sample', engBizMgrName: 'An Sample' },
  { id: 'cfa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure Managed Redis', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Ana Sample', pmLeadName: 'Erik Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Danielle Sample', engBizMgrName: 'An Sample' },
  { id: 'd1a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure MCP', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Asti Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Andi Sample', engBizMgrName: 'An Sample' },
  { id: 'fda2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure Nginx Integration', areaId: '17d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Alena Sample', engBizMgrName: 'An Sample' },
  { id: 'd3a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Azure SDK Agent', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Ariane Sample', engBizMgrName: 'An Sample' },
  { id: '8f95fe2a-2f22-f111-8341-0022480a6bbb', name: 'Azure Tools for VS Code', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'An Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Benjamin Sample', engBizMgrName: 'An Sample' },
  { id: 'f5a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Biz Talk Server + HIS', areaId: '15d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Adesewa Sample', engBizMgrName: 'An Sample' },
  { id: '85a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Bond - Prague (.NET)', areaId: 'f7d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Nil Sample', engBizMgrName: 'An Sample' },
  { id: '8da3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Business Insights', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '66422634-c818-f111-8341-00224803b3f9', name: 'C++ Back-End', areaId: 'fbd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Gao Sample', engBizMgrName: 'An Sample' },
  { id: 'd9176a1f-c818-f111-8341-00224803b3f9', name: 'C++ Front-End', areaId: 'fbd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Joel Sample', engBizMgrName: 'An Sample' },
  { id: '11a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'C++ Sub-agents', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Amara Sample', engLeadName: 'Johanne Sample', engBizMgrName: 'An Sample' },
  { id: '87a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'C++ Tools', areaId: 'fbd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Amara Sample', engLeadName: 'Johanne Sample', engBizMgrName: 'An Sample' },
  { id: '9ba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'China site mgmt', areaId: '67d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Claude Sample', pmLeadName: 'Biju Sample', engLeadName: 'Claude Sample', engBizMgrName: 'An Sample' },
  { id: '4ba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Cloudmine Data Platform', areaId: 'f1d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Marjan Sample', pmLeadName: 'Irene Sample', pmBizMgrName: 'Marjan Sample', engLeadName: 'Nishtiman Sample', engBizMgrName: 'Carita Sample' },
  { id: '1a5473da-2814-f111-8406-6045bd013b70', name: 'Code Performance & Security', areaId: '3fa451b0-2814-f111-8406-6045bd013b70', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Code Scanning Engines', areaId: '5ee13acf-6613-f111-8406-6045bd013b70', ownerName: 'Yordanos Sample', pmLeadName: 'Andreea Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Code Scanning Experiences', areaId: '5ee13acf-6613-f111-8406-6045bd013b70', ownerName: 'Yordanos Sample', pmLeadName: 'Shako Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Verónica Sample', engBizMgrName: 'Julian Sample' },
  { id: '3da2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Code Security, Permissions Mgmt, Policy', areaId: 'ebd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmLeadName: 'Laura Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Raimo Sample', engBizMgrName: 'An Sample' },
  { id: '79a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Comms', areaId: '67d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Snezhana Sample', pmBizMgrName: 'Snezhana Sample' },
  { id: '1bbb4643-4222-f111-8341-0022480a6bbb', name: 'Container tools for VS and VS Code', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'An Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Benjamin Sample', engBizMgrName: 'An Sample' },
  { id: 'f6baf769-6617-f111-8341-00224803b8ac', name: 'Content Provenance', areaId: '69d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Conrad Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Tanimu Sample', engBizMgrName: 'Matej Sample' },
  { id: 'c7a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Content Understanding & Document Intelligence', areaId: '0fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sahra Sample', pmLeadName: 'Klara Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Aurora Sample', engBizMgrName: 'Elena Sample' },
  { id: 'bef7051d-2914-f111-8406-6045bd013b70', name: 'Copilot Context & Agents', areaId: '3fa451b0-2814-f111-8406-6045bd013b70', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '25a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Copilot Core Platform', areaId: '25d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Foundations, Orca, Env Infrastructure, Platform FX', ownerName: 'Tuyisenge Sample', pmLeadName: 'Tukur Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Diah Sample', engBizMgrName: 'Julian Sample' },
  { id: '7ed8b124-d618-f111-8341-6045bd013b70', name: 'Core Platform & Infrastructure', areaId: 'b721c075-6113-f111-8406-6045bd013b70', description: 'Hybrid & Physical Infra, Edge Traffic, Service Mesh, Compute Platform, Compute Foundation, Compute Foundation Delta, Edge Foundation, Git Storage, Git Protocols, Git Platform, Data Architecture, Database Infrastructure, Elasticsearch, Data Pipelines', ownerName: 'Jiya Sample', pmLeadName: 'Chen Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Dimitrios Sample', engBizMgrName: 'Julian Sample' },
  { id: '6d467b8b-a61c-f111-8341-6045bd013b70', name: 'Core UX', areaId: '29d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '4fef2950-c518-f111-8341-002248047d5e', name: 'Core: Compute, Networking, Storage', areaId: '41d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Scalable & reliable AI compute on all hardware (NVIDIA, AMD, MAIA, ..) & SKUs on all clouds (Azure, Nebius, Nscale, CoreWeave, OCI, Lambda, HPE, Lab, SAT).', ownerName: 'Leonidas Sample', pmLeadName: 'Zhou Sample', engLeadName: 'Bernadette Sample', engBizMgrName: 'Keita Sample' },
  { id: '41a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'CorePro Productivity Platform', areaId: '29d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Makhosi Sample', pmLeadName: 'Alain Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Xulio Sample', engBizMgrName: 'Julian Sample' },
  { id: '8fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Corporate & Digital Sales', areaId: '59d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Wen Sample', engBizMgrName: 'An Sample' },
  { id: '4da3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'CoS, Bus Mgr, EA', areaId: 'd0d11dfd-6613-f111-8406-6045bd013b70', description: 'Office of C suite - support team', ownerName: 'Heorhii Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '91a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Customer Success', areaId: '63d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Mariana Sample', engBizMgrName: 'An Sample' },
  { id: 'c5f9bd1d-c318-f111-8341-002248047d5e', name: 'Data Plane & Front End', areaId: '3fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Serve requests globally with minimum latency and highest reliability while onboarding serving capacity seamlessly. Further. auto Handles API management, auth, serving scale while minimizing model serving latencies with maximum prompt cache rates.', ownerName: 'Leonidas Sample', pmLeadName: 'Stefans Sample', engLeadName: 'Valarie Sample', engBizMgrName: 'Keita Sample' },
  { id: '4fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Design (non-revenue focused)', areaId: 'd0d11dfd-6613-f111-8406-6045bd013b70', description: 'All Design team members not aligned to a specific revenue focused team', ownerName: 'Lei Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '4ba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Design Ops', areaId: 'd0d11dfd-6613-f111-8406-6045bd013b70', description: 'Operational support team for the Design org', ownerName: 'Kovan Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '71a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Dev Rel & Community (CoreAI)', areaId: '55d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Tuguldur Sample', pmLeadName: 'Tuguldur Sample' },
  { id: '73a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Dev Rel & Community (GitHub)', areaId: '55d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Tuguldur Sample', pmLeadName: 'Tuguldur Sample' },
  { id: '3ba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'DevBox, Azure Lab Services, DTL', areaId: 'efd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmLeadName: 'Katerina Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Raimo Sample', engBizMgrName: 'An Sample' },
  { id: '4da2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'DevDiv Data Platform', areaId: 'f1d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Horvath Sample', pmLeadName: 'Tuyisenge Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Anne Sample', engBizMgrName: 'An Sample' },
  { id: 'a1a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'DevDiv Ops Team', areaId: '67d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'An Sample', pmBizMgrName: 'An Sample' },
  { id: '0ba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Devdiv x-services management', areaId: '1bd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Lisha Sample', pmLeadName: 'Manu Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Lisha Sample', engBizMgrName: 'An Sample' },
  { id: '5fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Developer Experience', areaId: 'b721c075-6113-f111-8406-6045bd013b70', description: 'Runtime Platform, Deploys, Feature Delivery, Service Catalog, Build & Test, Observability Delivery, Feature Management & Dev, Perf Engineering & Incident Lifecycle, Observability Experience', ownerName: 'Jiya Sample', pmLeadName: 'Raheela Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Shrantik Sample', engBizMgrName: 'Julian Sample' },
  { id: 'aba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'DSB (Deployment Safety Board) & OneRAI', areaId: '69d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'On-yu Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Manmaya Sample', engBizMgrName: 'Matej Sample' },
  { id: '5eef6137-c71c-f111-8341-00224803b3f9', name: 'Durable Task Service', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Krista Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Chris Sample', engBizMgrName: 'An Sample' },
  { id: '1f604f0e-b01c-f111-8341-00224803b3f9', name: 'E2E Experience', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Viktoria Sample', engBizMgrName: 'An Sample' },
  { id: '77a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'EA / COS / BM', areaId: '67d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '47a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Eng Ops', areaId: 'd0d11dfd-6613-f111-8406-6045bd013b70', description: 'Operational support team for the Engineering org', ownerName: 'Julian Sample', engBizMgrName: 'Julian Sample' },
  { id: '55a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'EngThrive - Misc', areaId: 'f3d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Marjan Sample', pmLeadName: 'Marjan Sample', pmBizMgrName: 'Marjan Sample', engLeadName: 'Marjan Sample', engBizMgrName: 'Carita Sample' },
  { id: 'a9a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'EngThrive - Tim', areaId: '65d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Marjan Sample', pmBizMgrName: 'Marjan Sample', engBizMgrName: 'Carita Sample' },
  { id: '51a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'EngThrive Insights', areaId: 'f3d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Marjan Sample', pmLeadName: 'Irene Sample', pmBizMgrName: 'Marjan Sample', engLeadName: 'Tomas Sample', engBizMgrName: 'Carita Sample' },
  { id: '610b6a3b-d618-f111-8341-6045bd013b70', name: 'Enterprise Core', areaId: 'b721c075-6113-f111-8406-6045bd013b70', description: 'Billing Core & Trade Compliance, Marketing Engineering, Billing Experiences, Licensing, Copilot Access, Authorization Experience, Enterprise Primitives, Authentication & External Identities, Authorization Platform, Copilot Controls, Auth & Limiter, Agent Control Plane, Enterprise AI Experience, Core Metrics, Enterprise Core Metrics, Data Engineering, Data Store & Piplines', ownerName: 'Jiya Sample', pmLeadName: 'Chen Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Rene Sample', engBizMgrName: 'Julian Sample' },
  { id: '45ae165c-d618-f111-8341-6045bd013b70', name: 'Enterprise Products', areaId: 'b721c075-6113-f111-8406-6045bd013b70', description: 'GHES Core Platform, GHES Release Engineering, GHES Reliability Engineering, GHES Operator Platform, Migration Tools, Audit Logs', ownerName: 'Jiya Sample', pmLeadName: 'Ashley Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Ramkrishna Sample', engBizMgrName: 'Julian Sample' },
  { id: '93a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Enterprise Sales', areaId: '5bd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Mariana Sample' },
  { id: '57a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Enterprise Security & Governance', areaId: '5ee13acf-6613-f111-8406-6045bd013b70', ownerName: 'Yordanos Sample', pmLeadName: 'Teresa Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Soon-Joo Sample', engBizMgrName: 'Julian Sample' },
  { id: 'aba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Evaluation & Science', areaId: '07d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Evaluation & Science (Benchmarking, Governance, Redteaming)', ownerName: 'Nemeth Sample', pmLeadName: 'Ivan Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Nemeth Sample', engBizMgrName: 'Elena Sample' },
  { id: '0fbef336-2914-f111-8406-6045bd013b70', name: 'Evaluations Foundations, Platform', areaId: '3fa451b0-2814-f111-8406-6045bd013b70', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: 'f9cb4b4c-2914-f111-8406-6045bd013b70', name: 'Evaluations Foundations, Science', areaId: '3fa451b0-2814-f111-8406-6045bd013b70', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '9da3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Exec LT', areaId: '65d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Snezhana Sample' },
  { id: 'd29b661a-581c-f111-8341-6045bd013b70', name: 'ExP Authoring', areaId: '62e647f0-2e17-f111-8341-6045bd0392f4', ownerName: 'Ana Sample', pmLeadName: 'Elijah Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Lou Sample', engBizMgrName: 'Elena Sample' },
  { id: '61f63e8d-571c-f111-8341-6045bd013b70', name: 'ExP Compute', areaId: '62e647f0-2e17-f111-8341-6045bd0392f4', description: 'Xin Li (xinli7) PM Lead', ownerName: 'Ana Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Lou Sample', engBizMgrName: 'Elena Sample' },
  { id: 'b1204009-571c-f111-8341-6045bd013b70', name: 'ExP Insights and Infra', areaId: '62e647f0-2e17-f111-8341-6045bd0392f4', ownerName: 'Ana Sample', pmLeadName: 'Elijah Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Lou Sample', engBizMgrName: 'Elena Sample' },
  { id: '2fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Extensions - Java', areaId: '27d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Tuyisenge Sample', pmLeadName: 'Sonja Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Blaise Sample', engBizMgrName: 'An Sample' },
  { id: '33a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Extensions - Other', areaId: '27d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample', pmLeadName: 'Sonja Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Blaise Sample', engBizMgrName: 'An Sample' },
  { id: '31a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Extensions - Python', areaId: '27d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Tuyisenge Sample', pmLeadName: 'Sonja Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Blaise Sample', engBizMgrName: 'An Sample' },
  { id: '95a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Field Services', areaId: '5dd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '4cb4c843-c418-f111-8341-002248047d5e', name: 'Fleet Management', areaId: '41d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Build and autonomously operate GPU & CPU capacity at massive-scale across Azure & 3P Clouds. Ensure that capacity is healthy and meeting the SLAs. Provide consistent reporting on allocation and usage for finance and GPU capacity owners.', ownerName: 'Leonidas Sample', pmLeadName: 'Rita Sample', engLeadName: 'Carmelo Sample', engBizMgrName: 'Keita Sample' },
  { id: '4fa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'FoSSE', areaId: 'f3d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Marjan Sample', pmLeadName: 'Merei Sample', pmBizMgrName: 'Marjan Sample', engLeadName: 'Merei Sample', engBizMgrName: 'Carita Sample' },
  { id: 'a3a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry Agent Distribution', areaId: '03d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Ana Sample', pmLeadName: 'Ujin Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Borbely Sample', engBizMgrName: 'Elena Sample' },
  { id: '9fa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry Agent Extensibility', areaId: '03d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'extensibility is part of Rajneesh\'s team, under AK', ownerName: 'Ana Sample', pmLeadName: 'Ujin Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Borbely Sample', engBizMgrName: 'Elena Sample' },
  { id: '9ba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry Agent Framework Foundations', areaId: '03d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'aligned to Rajneesh as Foundations is part of his team with Mark Wallace leading', ownerName: 'Ana Sample', pmLeadName: 'Ujin Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Borbely Sample', engBizMgrName: 'Elena Sample' },
  { id: 'a1a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry Agent Service', areaId: '03d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'selected Hosting and Authoring b/c aligned with Rajneesh', ownerName: 'Ana Sample', pmLeadName: 'Ujin Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Borbely Sample', engBizMgrName: 'Elena Sample' },
  { id: 'a1abd4fd-551c-f111-8341-6045bd013b70', name: 'Foundry Code-First Training', areaId: '4f825f31-2f17-f111-8341-6045bd0392f4', ownerName: 'Ana Sample', pmLeadName: 'Amadou Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Hanna Sample', engBizMgrName: 'Elena Sample' },
  { id: 'd78856b4-d11c-f111-8341-00224803b3f9', name: 'Foundry Control Plane', areaId: '05d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'An Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Siham Sample', engBizMgrName: 'An Sample' },
  { id: '636b7589-c518-f111-8341-002248047d5e', name: 'Foundry Core Infra & Services', areaId: '41d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Leonidas Sample', engLeadName: 'Katja Sample', engBizMgrName: 'Keita Sample' },
  { id: 'a5a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry Developer Experience', areaId: '05d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Ana Sample', pmLeadName: 'Ujin Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Mads Sample', engBizMgrName: 'Elena Sample' },
  { id: '93f8e6c9-551c-f111-8341-6045bd013b70', name: 'Foundry Fine Tuning as a Service (Training)', areaId: '4f825f31-2f17-f111-8341-6045bd0392f4', ownerName: 'Ana Sample', pmLeadName: 'Uwase Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Hanna Sample', engBizMgrName: 'Elena Sample' },
  { id: 'b9a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry IQ', areaId: '0bd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Agent Tools work to be accounted for in Foundry Agent. Engineering leader: Brian Smith; Science leader: Alec Berntson', ownerName: 'Sahra Sample', pmLeadName: 'Sahra Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Priyantha Sample', engBizMgrName: 'Elena Sample' },
  { id: '69a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry Local & ONNX', areaId: '4fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Leonidas Sample', pmLeadName: 'Endri Sample', engLeadName: 'Ergo Sample', engBizMgrName: 'Keita Sample' },
  { id: '1996c6e6-551c-f111-8341-6045bd013b70', name: 'Foundry Model Router', areaId: '4f825f31-2f17-f111-8341-6045bd0392f4', ownerName: 'Ana Sample', pmLeadName: 'Stefans Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Hanna Sample', engBizMgrName: 'Elena Sample' },
  { id: 'a7a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Foundry New Enterprise Experiences', areaId: '05d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Aligned to Sindhura since she leads developer Experiences', ownerName: 'Ana Sample', pmLeadName: 'Ujin Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Mads Sample', engBizMgrName: 'Elena Sample' },
  { id: 'b1a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Frontier Risk Measurement & Mitigation', areaId: '71d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Luca Sample', engLeadName: 'Sylvie Sample' },
  { id: 'ffa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Functions', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Asmerom Sample', pmLeadName: 'Asmerom Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Bijay Sample', engBizMgrName: 'An Sample' },
  { id: '23a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GHCP - 3rd party IDEs', areaId: '23d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Claude Sample', pmLeadName: 'Hayk Sample', pmBizMgrName: 'An Sample', engLeadName: 'Aaradhya Sample', engBizMgrName: 'An Sample' },
  { id: '21a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GHCP - VS', areaId: '23d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sidhhartha Sample', pmBizMgrName: 'Yu-ri Sample', engLeadName: 'Vishakha Sample', engBizMgrName: 'An Sample' },
  { id: '9fa3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GitHub (incl. Office of CEO)', areaId: '67d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '85a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GitHub CELA', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: 'f4bcab6e-b01c-f111-8341-00224803b3f9', name: 'GitHub Copilot App Modernization tools', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Ljubomir Sample', engBizMgrName: 'An Sample' },
  { id: '1cb0a872-af1c-f111-8341-00224803b3f9', name: 'Github Copilot for 3rd party IDEs', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Aaradhya Sample', engBizMgrName: 'An Sample' },
  { id: 'e7a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GitHub Copilot for Azure', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Asti Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Sonia Sample', engBizMgrName: 'An Sample' },
  { id: '87a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GitHub HR', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample', engBizMgrName: 'An Sample' },
  { id: '45a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GitHub inside Microsoft', areaId: 'edd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmLeadName: 'Aamir Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Anaru Sample', engBizMgrName: 'An Sample' },
  { id: 'b178c4ab-2022-f111-8341-6045bd013b70', name: 'GitHub IT', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Julian Sample' },
  { id: '59a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'GitHub Next', areaId: 'd0d11dfd-6613-f111-8406-6045bd013b70', ownerName: 'Emil Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '19c4feb8-2022-f111-8341-6045bd013b70', name: 'GitHub Security', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Julian Sample' },
  { id: '89a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Global Brand & Marketing', areaId: '5fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample', pmBizMgrName: 'Yua Sample' },
  { id: '93a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Go', areaId: 'ffd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Frantisek Sample', engBizMgrName: 'An Sample' },
  { id: '53a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Guidance', areaId: 'f3d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Marjan Sample', pmLeadName: 'Irene Sample', pmBizMgrName: 'Marjan Sample', engLeadName: 'Ifeanyi Sample', engBizMgrName: 'Carita Sample' },
  { id: 'b80ec206-d618-f111-8341-00224803b3f9', name: 'Helios (embeddable Grafana)', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Rima Sample', engBizMgrName: 'An Sample' },
  { id: '392e394c-6717-f111-8341-00224803b8ac', name: 'Inference‑Time Safety Precision', areaId: '71d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Safety innovation incubation (e.g. goodfire, RL training, etc)', ownerName: 'Iskandar Sample', pmLeadName: 'Adriana Sample', engLeadName: 'Sylvie Sample' },
  { id: '47a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Inner Loop & Continuous Integration', areaId: 'efd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmLeadName: 'Izaak Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Ensi Sample', engBizMgrName: 'An Sample' },
  { id: '35f2ad5b-b01c-f111-8341-00224803b3f9', name: 'Jakarta EE', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Ljubomir Sample', engBizMgrName: 'An Sample' },
  { id: '89a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Java', areaId: 'ffd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Sharmistha Sample', engBizMgrName: 'An Sample' },
  { id: '4e771b89-b01c-f111-8341-00224803b3f9', name: 'Java tooling for Azure', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Aaradhya Sample', engBizMgrName: 'An Sample' },
  { id: 'b1a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Language', areaId: '09d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sahra Sample', pmLeadName: 'Klara Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Inès Sample', engBizMgrName: 'Elena Sample' },
  { id: 'f7a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Liftr (Azure Native ISVs) & Ecosystem', areaId: '17d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmLeadName: 'Serafín Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Arina Sample', engBizMgrName: 'An Sample' },
  { id: 'efa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Logic Apps', areaId: '15d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Ana Sample', pmLeadName: 'Audrey Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Katrin Sample', engBizMgrName: 'An Sample' },
  { id: '959d9ca3-d518-f111-8341-6045bd013b70', name: 'MCP Platform', areaId: '25d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Client Platform, Agent Services', ownerName: 'Tuyisenge Sample', pmLeadName: 'Afifah Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Gil Sample', engBizMgrName: 'Julian Sample' },
  { id: 'bba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Memory', areaId: '0bd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sahra Sample', pmLeadName: 'Elise Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Aurora Sample', engBizMgrName: 'Elena Sample' },
  { id: '24a38904-c318-f111-8341-002248047d5e', name: 'Model Control Plane - Provisioning', areaId: '3fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'The platform responsible for converting GPUs to models across the fleet. Quickly and seamlessly discovers capacity, converts to serving models and rolls out new engine versions across the fleet.', ownerName: 'Leonidas Sample', pmLeadName: 'Priya Sample', engLeadName: 'Filippa Sample', engBizMgrName: 'Keita Sample' },
  { id: '91abd4c3-c318-f111-8341-002248047d5e', name: 'Model Eval Tooling', areaId: '45d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Drive high quality of life and user experience for MS researchers by providing  high leverage and delightful tools for running, reviewing auditing, and navigating the training workflow.', ownerName: 'Leonidas Sample', pmLeadName: 'Zhou Sample', engLeadName: 'Andile Sample', engBizMgrName: 'Keita Sample' },
  { id: '29a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Models & Copilot Business', areaId: '25d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Product Eng, Models Factory, Scholarly Squids', ownerName: 'Tuyisenge Sample', pmLeadName: 'Taji Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Susanne Sample', engBizMgrName: 'Julian Sample' },
  { id: '90c7e39f-a61c-f111-8341-6045bd013b70', name: 'Monolith Fitness', areaId: '29d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '4a9c3387-c218-f111-8341-002248047d5e', name: 'Multimodal AI Models & Safety', areaId: '3dd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Models/services with vision, audio, speech video, Realtime APIs, and generative media ensuring these capabilities integrate across 1P and 3P.  Including from MAI. Also owns partner AI safety models like those coming from OpenAI.', ownerName: 'Leonidas Sample', pmLeadName: 'Ramziya Sample', engLeadName: 'Fujita Sample', engBizMgrName: 'Keita Sample' },
  { id: 'b5424b7f-9a1c-f111-8341-00224803b3f9', name: 'NuGet', areaId: 'f7d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Eugen Sample', engBizMgrName: 'An Sample' },
  { id: 'afa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Observability optimizations', areaId: '07d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Observability optimizations (cost, ROI, speed)', ownerName: 'Nemeth Sample', pmLeadName: 'Ivan Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Nemeth Sample', engBizMgrName: 'Elena Sample' },
  { id: 'd8ae923d-c318-f111-8341-002248047d5e', name: 'Offer Management', areaId: '3fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Roll out various product shapes like paygo, guaranteed throughput (PTU-M), spot/batch offers. Ensure we are competitive across clouds and delight customers with the best product offer experience.', ownerName: 'Leonidas Sample', pmLeadName: 'Stefans Sample', engLeadName: 'Valarie Sample', engBizMgrName: 'Keita Sample' },
  { id: '75a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Outbound PM/Marketing/Content (CoreAI)', areaId: '57d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sydney Sample', pmLeadName: 'Sydney Sample', pmBizMgrName: 'Yu-ri Sample' },
  { id: '97a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Partner Sales & Professional Services', areaId: '61d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '22e396e2-d518-f111-8341-6045bd013b70', name: 'Plan & Track', areaId: '29d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Makhosi Sample', pmLeadName: 'Ginnypriya Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Linda Sample', engBizMgrName: 'Julian Sample' },
  { id: 'b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Platform & Convergence + M4', areaId: '69d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Guri Sample', pmBizMgrName: 'Matej Sample', engLeadName: 'Guillermo Sample', engBizMgrName: 'Matej Sample' },
  { id: 'ada2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Portal & UX', areaId: '07d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Portal & UX (APIs, Alerts, Control Plane)', ownerName: 'Nemeth Sample', pmLeadName: 'Ivan Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Nemeth Sample', engBizMgrName: 'Elena Sample' },
  { id: '49a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Product Ops', areaId: 'd0d11dfd-6613-f111-8406-6045bd013b70', description: 'Operational support team for the Product Org', ownerName: 'Corinne Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '57a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Project "Greencraft" / Explorations', areaId: 'f3d396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Marjan Sample', pmLeadName: 'Momchil Sample', pmBizMgrName: 'Marjan Sample', engLeadName: 'Momchil Sample', engBizMgrName: 'Carita Sample' },
  { id: '5cf14072-a61c-f111-8341-6045bd013b70', name: 'Pull Requests', areaId: '29d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Julian Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '8fa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Python', areaId: 'ffd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Dharef Sample', engBizMgrName: 'An Sample' },
  { id: '01a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Redis', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmLeadName: 'Erik Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Danielle Sample', engBizMgrName: 'An Sample' },
  { id: '25622a56-c318-f111-8341-002248047d5e', name: 'Reliability & LiveSite', areaId: '3fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Delivers the overall reliability and latency SLAs for the product. Customer obsessed to ensure right detection of issues, customer communication and CSS case handling to deliver the most reliable experience.', ownerName: 'Leonidas Sample', pmLeadName: 'Damir Sample', engLeadName: 'Swaathi Sample', engBizMgrName: 'Keita Sample' },
  { id: '99a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Revenue Ops & Enablement', areaId: '63d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Miren Sample' },
  { id: '8da2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Rust', areaId: 'ffd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Lara Sample', engBizMgrName: 'An Sample' },
  { id: '5ae8b877-c418-f111-8341-002248047d5e', name: 'Scheduling', areaId: '41d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Leonidas Sample', engLeadName: 'Rinki Sample', engBizMgrName: 'Keita Sample' },
  { id: 'd5a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SDK & API - .NET', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Illia Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Sonali Sample', engBizMgrName: 'An Sample' },
  { id: 'dfa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SDK & API - Go', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Da-eun Sample', engBizMgrName: 'An Sample' },
  { id: 'd7a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SDK & API - Java', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Andi Sample', engBizMgrName: 'An Sample' },
  { id: 'd9a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SDK & API - JS', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'David Sample', engBizMgrName: 'An Sample' },
  { id: 'dda2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SDK & API - Python', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Ye-sol Sample', engBizMgrName: 'An Sample' },
  { id: 'e1a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SDK & API - Rust', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Da-eun Sample', engBizMgrName: 'An Sample' },
  { id: 'dba2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SDK & API EngSys', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Deepa Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Gulnoza Sample', engBizMgrName: 'An Sample' },
  { id: 'b5a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Search Platform', areaId: '0bd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Engineering leaders include Brian Smith and Vaibhav Choubey', ownerName: 'Sahra Sample', pmLeadName: 'Sahra Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Priyantha Sample', engBizMgrName: 'Elena Sample' },
  { id: '43a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Secure Supply Chain', areaId: 'ebd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Anna Sample', pmLeadName: 'Anna Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Annemarie Sample', engBizMgrName: 'An Sample' },
  { id: 'e9a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Service Connector', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Alena Sample', engBizMgrName: 'An Sample' },
  { id: '07a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SignalR & WebPubSub', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Ella Sample', engBizMgrName: 'An Sample' },
  { id: 'e3f60d99-741b-f111-8341-6045bd01394c', name: 'Simship (Risk Identification at Scale)', areaId: '71d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Iskandar Sample', pmLeadName: 'Helga Sample', engLeadName: 'Sylvie Sample' },
  { id: 'bfa2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Speech', areaId: '0dd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sahra Sample', pmLeadName: 'Melis Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Inès Sample', engBizMgrName: 'Elena Sample' },
  { id: 'cda2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Spring Cloud', areaId: '11d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Eduarda Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Amin Sample', engBizMgrName: 'An Sample' },
  { id: 'f9a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'SRE Agent', areaId: '17d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Krista Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Tomás Sample', engBizMgrName: 'An Sample' },
  { id: '457e0924-c71c-f111-8341-00224803b3f9', name: 'Static Web Apps', areaId: '19d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Krista Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Ijaodola Sample', engBizMgrName: 'An Sample' },
  { id: '45a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Strategic Programs and Partnerships', areaId: 'd0d11dfd-6613-f111-8406-6045bd013b70', ownerName: 'Ethan Sample', pmLeadName: 'Ethan Sample', pmBizMgrName: 'Heorhii Sample', engBizMgrName: 'Julian Sample' },
  { id: '55a3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Supply Chain Security', areaId: '5ee13acf-6613-f111-8406-6045bd013b70', ownerName: 'Yordanos Sample', pmLeadName: 'Ardit Sample', pmBizMgrName: 'Heorhii Sample', engLeadName: 'Jiao Sample', engBizMgrName: 'Julian Sample' },
  { id: '75a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Testing Agent', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Klaus Sample', pmLeadName: 'Klaus Sample', engBizMgrName: 'An Sample' },
  { id: 'e3a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Tools for Agentic Apps (AI toolkit, VS Code tools, Azure Notebooks, Data Wrangler, Teams/M365 Agent Toolkit)', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmLeadName: 'Nikica Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Fabio Sample', engBizMgrName: 'An Sample' },
  { id: 'a9a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Tracing, Backend & Platforms', areaId: '07d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Tracing, Backend & Platforms (SDK, Logging, Open Telemetry)', ownerName: 'Nemeth Sample', pmLeadName: 'Ivan Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Tatsuki Sample', engBizMgrName: 'Elena Sample' },
  { id: 'f6d909f2-c218-f111-8341-002248047d5e', name: 'Traffic Shaping', areaId: '3fd496a6-8ef5-f011-840a-000d3a5c2c86', description: 'The platform responsible for supporting various QOS products running efficiently with highest utilization across the fleet. Directly responsible for increasing revenue per GPU for the company.', ownerName: 'Leonidas Sample', pmLeadName: 'Stefans Sample', engLeadName: 'Shakti Sample', engBizMgrName: 'Keita Sample' },
  { id: 'de39b50a-c518-f111-8341-002248047d5e', name: 'Training & Inference', areaId: '41d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Responsible core infra components that enable MAI training, Orange post-training, Foundry fine-tuning/RL, and inference at scale.', ownerName: 'Leonidas Sample', pmLeadName: 'Zhou Sample', engLeadName: 'Lidia Sample', engBizMgrName: 'Keita Sample' },
  { id: 'ca8875d7-c318-f111-8341-002248047d5e', name: 'Training Data', areaId: '45d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Provide access, search & discovery, lineage tracking, metadata, aggregation, and life cycle management of 1P and 3P training data.  Integration with federated systems outside CoreAI that provide storage, annotation, and purchase flow, and provide tooling to enable data engineering and quality assessment.', ownerName: 'Leonidas Sample', pmLeadName: 'Amadou Sample', engLeadName: 'Sigurjón Sample', engBizMgrName: 'Keita Sample' },
  { id: 'a6b1e991-c318-f111-8341-002248047d5e', name: 'Training Experience', areaId: '45d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'Operation and upkeep of our 1P training environment. Inclusive of onboarding, cluster availability and support, SW stack and FI deployment, container ingestion and lifecycle management, and observability.', ownerName: 'Leonidas Sample', pmLeadName: 'Amadou Sample', engLeadName: 'Nandesh Sample', engBizMgrName: 'Keita Sample' },
  { id: '42f0f5aa-c318-f111-8341-002248047d5e', name: 'Training Platform', areaId: '45d496a6-8ef5-f011-840a-000d3a5c2c86', description: 'The SW stack that executes training operations, across various SW stacks and model and engine architectures (OAI, MAI, and OSS,) and training environments (with and without access to model IP such as weights.)  Integration with CoreAI production systems for model deployment, lineage tracking, and offloading inference workloads in a secure manner.', ownerName: 'Leonidas Sample', pmLeadName: 'Zhou Sample', engLeadName: 'Olivia Sample', engBizMgrName: 'Keita Sample' },
  { id: 'b3a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Translation', areaId: '09d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sahra Sample', pmLeadName: 'Klara Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Inès Sample', engBizMgrName: 'Elena Sample' },
  { id: '91a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Typescript', areaId: 'ffd396a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sunisa Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Idoia Sample', engBizMgrName: 'An Sample' },
  { id: '94e24653-971c-f111-8341-00224803b3f9', name: 'TypeScript/JavaScript Sub Agents', areaId: '1fd496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'An Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Idoia Sample', engBizMgrName: 'An Sample' },
  { id: '97a2a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'Visual Studio', areaId: '01d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Sunisa Sample', pmLeadName: 'Sidhhartha Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Augustas Sample', engBizMgrName: 'An Sample' },
  { id: '2da3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'VS Code', areaId: '27d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Tuyisenge Sample', pmLeadName: 'Sonja Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Dhulesh Sample', engBizMgrName: 'An Sample' },
  { id: '2465a37b-b01c-f111-8341-00224803b3f9', name: 'VS Code Java', areaId: '13d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Renata Sample', pmBizMgrName: 'Lilan Sample', engLeadName: 'Aaradhya Sample', engBizMgrName: 'An Sample' },
  { id: '2ba3a1ac-8ff5-f011-840b-000d3a5bd0b7', name: 'VS Marketplace', areaId: '27d496a6-8ef5-f011-840a-000d3a5c2c86', ownerName: 'Tuyisenge Sample', pmLeadName: 'Sonja Sample', pmBizMgrName: 'Elena Sample', engLeadName: 'Blaise Sample', engBizMgrName: 'An Sample' },
];

export const mockServiceInitiatives: IServiceOrInitiative[] = serviceDefinitions.map((service) => {
  const team = teamById.get(service.areaId);
  const parent = service.parentId
    ? serviceDefinitions.find((candidate) => candidate.id === service.parentId)
    : undefined;

  if (!team) {
    throw new Error(`Missing team for service ${service.name}`);
  }

  return {
    cai_serviceorinitiativeid: service.id,
    cai_name: service.name,
    cai_description: service.description,
    _cai_area_value: team.cai_areaid,
    _cai_area_value_formatted: team.cai_areaname,
    _cai_parentserviceorinitiativeid_value: parent?.id,
    _cai_parentserviceorinitiativeid_value_formatted: parent?.name,
    _ownerid_value_formatted: service.ownerName,
    _cai_pmleadid_value_formatted: service.pmLeadName,
    _cai_pmbusinessmanagerid_value_formatted: service.pmBizMgrName,
    _cai_engleadid_value_formatted: service.engLeadName,
    _cai_engbusinessmanagerid_value_formatted: service.engBizMgrName,
  };
});

// Generate mock periods relative to current date so "last month" is always current
const MONTH_ABBREVS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Real CRM period GUIDs (most recent first: current month, last month, month before)
const PERIOD_GUIDS = [
  'f3121e23-6fdc-f011-8550-000d3a5c2c86',
  'f1121e23-6fdc-f011-8550-000d3a5c2c86',
  'ef121e23-6fdc-f011-8550-000d3a5c2c86',
];

function generateMockPeriods(): IAllocationPeriod[] {
  const now = new Date();
  const periods: IAllocationPeriod[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0-indexed
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const mm = String(month + 1).padStart(2, '0');
    const fy = month >= 6 ? year + 1 : year; // fiscal year: Jul-Jun
    periods.push({
      cai_allocationperiodid: PERIOD_GUIDS[i]!,
      cai_periodname: `${year}.${mm} - ${MONTH_ABBREVS[month]}`,
      cai_allocationperiod_start: `${year}-${mm}-01T00:00:00Z`,
      cai_allocationperiod_end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}T00:00:00Z`,
      cai_iscurrentperiod: null,
      cai_fiscalyear: fy,
    });
  }
  return periods;
}

export let mockAllocationPeriods: IAllocationPeriod[] = generateMockPeriods();

export const mockManagerResource: IResource = {
  cai_resourceid: MOCK_MANAGER_RESOURCE_ID,
  cai_displayname: MOCK_MANAGER_NAME,
  cai_alias: MOCK_MANAGER_ALIAS,
  _cai_userid_value: MOCK_MANAGER_USER_ID,
  _cai_userid_value_formatted: MOCK_MANAGER_NAME,
};

const reportDefinitions = [
  { name: 'Narine Gasparyan', alias: 'NGA-Sample' },
  { name: 'Isabella Simonsen', alias: 'ISI-Sample' },
  { name: 'Mauno Kilpi', alias: 'MKI-Sample' },
  { name: 'Lidia Nowakowska', alias: 'LNO-Sample' },
  { name: 'Rinki Verma', alias: 'RVE-Sample' },
  { name: 'Asti Kirana', alias: 'AKI-Sample' },
  { name: 'Valarie Cabral', alias: 'VCA-Sample' },
  { name: 'Aline Dupuy', alias: 'ADU-Sample' },
  { name: 'An Ni', alias: 'ANI-Sample' },
  { name: 'Bijay Dhakal', alias: 'BDH-Sample' },
  { name: 'Maciej Dudek', alias: 'MDU-Sample' },
  { name: 'Sylvie Rocher', alias: 'SRO-Sample' },
];

export const mockResources: IResource[] = reportDefinitions.map((report, index) => ({
  cai_resourceid: createGuid(0x200 + index),
  cai_displayname: report.name,
  cai_alias: report.alias,
  _cai_managerresourceid_value: MOCK_MANAGER_RESOURCE_ID,
  _cai_managerresourceid_value_formatted: MOCK_MANAGER_NAME,
  _cai_manageruserid_value: MOCK_MANAGER_USER_ID,
  _cai_manageruserid_value_formatted: MOCK_MANAGER_NAME,
  _cai_userid_value: createGuid(0x300 + index),
}));

// Sub-reports: Narine Gasparyan, Rinki Verma, and Aline Dupuy each manage people
const subManager1 = mockResources.find((r) => r.cai_alias === 'NGA-Sample')!;
const subManager2 = mockResources.find((r) => r.cai_alias === 'RVE-Sample')!;
const subManager3 = mockResources.find((r) => r.cai_alias === 'ADU-Sample')!;

const subReportDefinitions = [
  { name: 'Afifah Hairuddin', alias: 'AHA-Sample', manager: subManager1 },
  { name: 'Miren Elorriaga', alias: 'MEL-Sample', manager: subManager1 },
  { name: 'Ella Kreslina', alias: 'EKR-Sample', manager: subManager2 },
  { name: 'Laura Montfulleda', alias: 'LMO-Sample', manager: subManager2 },
  { name: 'Wen Jia', alias: 'WJI-Sample', manager: subManager3 },
  { name: 'Hakan Kokshoorn', alias: 'HKO-Sample', manager: subManager3 },
  { name: 'Tukur Abubakar', alias: 'TAB-Sample', manager: subManager3 },
];

export const mockSubReports: IResource[] = subReportDefinitions.map((report, index) => ({
  cai_resourceid: createGuid(0x250 + index),
  cai_displayname: report.name,
  cai_alias: report.alias,
  _cai_managerresourceid_value: report.manager.cai_resourceid,
  _cai_managerresourceid_value_formatted: report.manager.cai_displayname,
  _cai_manageruserid_value: report.manager._cai_userid_value,
  _cai_manageruserid_value_formatted: report.manager.cai_displayname,
  _cai_userid_value: createGuid(0x350 + index),
}));

// Level 3 resources — Afifah's reports (also include managers for deeper testing)
const level3Manager = mockSubReports.find((r) => r.cai_alias === 'AHA-Sample')!;
export const mockLevel3Reports: IResource[] = [
  { name: 'Dani Fonseca', alias: 'DFO-Sample' },
  { name: 'Kofi Mensah', alias: 'KME-Sample' },
].map((def, index) => ({
  cai_resourceid: createGuid(0x450 + index),
  cai_displayname: def.name,
  cai_alias: def.alias,
  _cai_managerresourceid_value: level3Manager.cai_resourceid,
  _cai_managerresourceid_value_formatted: level3Manager.cai_displayname,
  _cai_manageruserid_value: level3Manager._cai_userid_value,
  _cai_manageruserid_value_formatted: level3Manager.cai_displayname,
  _cai_userid_value: createGuid(0x550 + index),
}));

// Level 4: Dani Fonseca manages people
const level4Manager = mockLevel3Reports.find((r) => r.cai_alias === 'DFO-Sample')!;
export const mockLevel4Reports: IResource[] = [
  { name: 'Priya Sharma', alias: 'PSH-Sample' },
  { name: 'Tomás Herrera', alias: 'THE-Sample' },
  { name: 'Yuki Tanaka', alias: 'YTA-Sample' },
].map((def, index) => ({
  cai_resourceid: createGuid(0x460 + index),
  cai_displayname: def.name,
  cai_alias: def.alias,
  _cai_managerresourceid_value: level4Manager.cai_resourceid,
  _cai_managerresourceid_value_formatted: level4Manager.cai_displayname,
  _cai_manageruserid_value: level4Manager._cai_userid_value,
  _cai_manageruserid_value_formatted: level4Manager.cai_displayname,
  _cai_userid_value: createGuid(0x560 + index),
}));

// Level 5: Priya Sharma manages people
const level5Manager = mockLevel4Reports.find((r) => r.cai_alias === 'PSH-Sample')!;
export const mockLevel5Reports: IResource[] = [
  { name: 'Lars Johansson', alias: 'LJO-Sample' },
  { name: 'Amara Osei', alias: 'AOS-Sample' },
].map((def, index) => ({
  cai_resourceid: createGuid(0x470 + index),
  cai_displayname: def.name,
  cai_alias: def.alias,
  _cai_managerresourceid_value: level5Manager.cai_resourceid,
  _cai_managerresourceid_value_formatted: level5Manager.cai_displayname,
  _cai_manageruserid_value: level5Manager._cai_userid_value,
  _cai_manageruserid_value_formatted: level5Manager.cai_displayname,
  _cai_userid_value: createGuid(0x570 + index),
}));

const resourceByAlias = new Map([
  [mockManagerResource.cai_alias, mockManagerResource] as const,
  ...mockResources.map((resource) => [resource.cai_alias, resource] as const),
  ...mockSubReports.map((resource) => [resource.cai_alias, resource] as const),
  ...mockLevel3Reports.map((resource) => [resource.cai_alias, resource] as const),
  ...mockLevel4Reports.map((resource) => [resource.cai_alias, resource] as const),
  ...mockLevel5Reports.map((resource) => [resource.cai_alias, resource] as const),
]);
const resourceById = new Map([
  [mockManagerResource.cai_resourceid, mockManagerResource],
  ...mockResources.map((resource) => [resource.cai_resourceid, resource] as const),
  ...mockSubReports.map((resource) => [resource.cai_resourceid, resource] as const),
  ...mockLevel3Reports.map((resource) => [resource.cai_resourceid, resource] as const),
  ...mockLevel4Reports.map((resource) => [resource.cai_resourceid, resource] as const),
  ...mockLevel5Reports.map((resource) => [resource.cai_resourceid, resource] as const),
]);
const serviceById = new Map(mockServiceInitiatives.map((service) => [service.cai_serviceorinitiativeid, service]));

// Restore a curated set of branch members so the trimmed sample managers keep fuller direct-report teams.
const additionalReportDefs = [
  { name: 'Ararat Torosyan', alias: 'ATO-Sample', managerAlias: 'NGA-Sample' },
  { name: 'Claude Beaulieu', alias: 'CBE-Sample', managerAlias: 'NGA-Sample' },
  { name: 'On-yu Kim', alias: 'OKI-Sample', managerAlias: 'NGA-Sample' },
  { name: 'Xulio Penas', alias: 'XPE-Sample', managerAlias: 'NGA-Sample' },
  { name: 'Annemarie de Kock', alias: 'AKO-Sample', managerAlias: 'NGA-Sample' },
  { name: 'Matej Mitrevski', alias: 'MMI-Sample', managerAlias: 'RVE-Sample' },
  { name: 'Tilek Asan', alias: 'TAS-Sample', managerAlias: 'RVE-Sample' },
  { name: 'Tane Hiku', alias: 'THI-Sample', managerAlias: 'RVE-Sample' },
  { name: 'Artak Asatryan', alias: 'AAS-Sample', managerAlias: 'RVE-Sample' },
  { name: 'Augustas Backus', alias: 'ABA-Sample', managerAlias: 'RVE-Sample' },
  { name: 'Elen Williams', alias: 'EWI-Sample', managerAlias: 'ADU-Sample' },
  { name: 'Tuyisenge Noel', alias: 'TNO-Sample', managerAlias: 'ADU-Sample' },
  { name: 'Teresa Andrade', alias: 'TAN-Sample', managerAlias: 'ADU-Sample' },
  { name: 'Aamir Solangi', alias: 'ASO-Sample', managerAlias: 'ADU-Sample' },
  { name: 'Blaise Richer', alias: 'BRI-Sample', managerAlias: 'AHA-Sample' },
  { name: 'Aveen Goran', alias: 'AGO-Sample', managerAlias: 'AHA-Sample' },
  { name: 'Soon-Joo Woo', alias: 'SWO-Sample', managerAlias: 'AHA-Sample' },
  { name: 'Jeremias Espinosa', alias: 'JES-Sample', managerAlias: 'AHA-Sample' },
  { name: 'Alena Jankova', alias: 'AJA-Sample', managerAlias: 'AHA-Sample' },
  { name: 'Carita Hasu', alias: 'CHA-Sample', managerAlias: 'DFO-Sample' },
  { name: 'Lou Marin', alias: 'LMA-Sample', managerAlias: 'DFO-Sample' },
  { name: 'Annika Makinen', alias: 'AMK-Sample', managerAlias: 'DFO-Sample' },
  { name: 'Corinne Bissener', alias: 'CBI-Sample', managerAlias: 'DFO-Sample' },
  { name: 'Damir Benic', alias: 'DBE-Sample', managerAlias: 'PSH-Sample' },
  { name: 'Melis Unal', alias: 'MUN-Sample', managerAlias: 'PSH-Sample' },
  { name: 'Amin Alimov', alias: 'AAL-Sample', managerAlias: 'PSH-Sample' },
  { name: 'Rita Santos', alias: 'RSA-Sample', managerAlias: 'PSH-Sample' },
  { name: 'Noor Haddad', alias: 'NHA-Sample', managerAlias: 'PSH-Sample' },
] as const;

const additionalResources: IResource[] = [];
for (const [index, def] of additionalReportDefs.entries()) {
  const manager = resourceByAlias.get(def.managerAlias);
  if (!manager) {
    throw new Error(`Missing manager for alias ${def.managerAlias}`);
  }

  const resource: IResource = {
    cai_resourceid: createGuid(0x600 + index),
    cai_displayname: def.name,
    cai_alias: def.alias,
    _cai_managerresourceid_value: manager.cai_resourceid,
    _cai_managerresourceid_value_formatted: manager.cai_displayname,
    _cai_manageruserid_value: manager._cai_userid_value,
    _cai_manageruserid_value_formatted: manager.cai_displayname,
    _cai_userid_value: createGuid(0xC00 + index),
  };

  additionalResources.push(resource);
  resourceByAlias.set(def.alias, resource);
  resourceById.set(resource.cai_resourceid, resource);
}

// NOTE: Some employees intentionally do NOT total 100% to exercise the
// "Issues" filter and validation UI during development/training.
// ISI-Sample = has allocations but NO assignments (tests "Copy Assignments" flow)
// AKI-Sample = has assignments but NO allocations (tests "Copy Assignments" button)
// AHA-Sample = 110%, LMO-Sample = 70%.
const assignmentPlans = [
  { alias: 'NGA-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40]] },
  // ISI-Sample intentionally has NO assignments — allocations are created separately
  { alias: 'MKI-Sample', items: [['6d467b8b-a61c-f111-8341-6045bd013b70', 100]] },
  { alias: 'LNO-Sample', items: [['55a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['22e396e2-d518-f111-8341-6045bd013b70', 50]] },
  { alias: 'RVE-Sample', items: [['c2439c3f-6617-f111-8341-00224803b8ac', 60], ['f6baf769-6617-f111-8341-00224803b8ac', 40]] },
  { alias: 'AKI-Sample', items: [['aba3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  { alias: 'VCA-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 100]] },
  { alias: 'ADU-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['90c7e39f-a61c-f111-8341-6045bd013b70', 50]] },
  { alias: 'ANI-Sample', items: [['c2439c3f-6617-f111-8341-00224803b8ac', 100]] },
  { alias: 'BDH-Sample', items: [['55a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60], ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40]] },
  { alias: 'MDU-Sample', items: [
    ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30],
    ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30],
    ['6d467b8b-a61c-f111-8341-6045bd013b70', 20],
    ['22e396e2-d518-f111-8341-6045bd013b70', 20],
  ] },
  { alias: 'SRO-Sample', items: [['f6baf769-6617-f111-8341-00224803b8ac', 50], ['aba3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  // Manager
  { alias: MOCK_MANAGER_ALIAS, items: [['57a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  // Sub-reports
  { alias: 'AHA-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  { alias: 'MEL-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 100]] },
  { alias: 'EKR-Sample', items: [['c2439c3f-6617-f111-8341-00224803b8ac', 50], ['b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  { alias: 'LMO-Sample', items: [['90c7e39f-a61c-f111-8341-6045bd013b70', 40], ['57a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
  // Aline's sub-reports
  { alias: 'WJI-Sample', items: [['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['f6baf769-6617-f111-8341-00224803b8ac', 50]] },
  { alias: 'HKO-Sample', items: [
    ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30],
    ['aba3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40],
    ['22e396e2-d518-f111-8341-6045bd013b70', 30],
  ] },
  { alias: 'TAB-Sample', items: [['90c7e39f-a61c-f111-8341-6045bd013b70', 60], ['c2439c3f-6617-f111-8341-00224803b8ac', 40]] },
  // Level 3 (Afifah's reports)
  { alias: 'DFO-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['6d467b8b-a61c-f111-8341-6045bd013b70', 50]] },
  { alias: 'KME-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40]] },
  // Level 4 (Dani's reports)
  { alias: 'PSH-Sample', items: [['c2439c3f-6617-f111-8341-00224803b8ac', 50], ['f6baf769-6617-f111-8341-00224803b8ac', 50]] },
  { alias: 'THE-Sample', items: [['90c7e39f-a61c-f111-8341-6045bd013b70', 100]] },
  { alias: 'YTA-Sample', items: [['aba3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60], ['22e396e2-d518-f111-8341-6045bd013b70', 40]] },
  // Level 5 (Priya's reports)
  { alias: 'LJO-Sample', items: [['55a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  { alias: 'AOS-Sample', items: [['6d467b8b-a61c-f111-8341-6045bd013b70', 70], ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
] as const;

const additionalAssignmentPlans = [
  { alias: 'ATO-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30], ['59a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
  { alias: 'CBE-Sample', items: [['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  { alias: 'OKI-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 70], ['59a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
  { alias: 'XPE-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60]] },
  { alias: 'AKO-Sample', items: [['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 80], ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 20]] },
  { alias: 'MMI-Sample', items: [['c2439c3f-6617-f111-8341-00224803b8ac', 50], ['f6baf769-6617-f111-8341-00224803b8ac', 50]] },
  { alias: 'TAS-Sample', items: [['f6baf769-6617-f111-8341-00224803b8ac', 40], ['aba3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['c2439c3f-6617-f111-8341-00224803b8ac', 20]] },
  { alias: 'THI-Sample', items: [['aba3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['c2439c3f-6617-f111-8341-00224803b8ac', 60]] },
  { alias: 'AAS-Sample', items: [['c2439c3f-6617-f111-8341-00224803b8ac', 80], ['f6baf769-6617-f111-8341-00224803b8ac', 20]] },
  { alias: 'ABA-Sample', items: [['f6baf769-6617-f111-8341-00224803b8ac', 100]] },
  { alias: 'EWI-Sample', items: [['97a2a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['d2efe6a6-6313-f111-8406-6045bd01394c', 50]] },
  { alias: 'TNO-Sample', items: [['d2efe6a6-6313-f111-8406-6045bd01394c', 70], ['7da2a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
  { alias: 'TAN-Sample', items: [['7da2a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['97a2a1ac-8ff5-f011-840b-000d3a5bd0b7', 60]] },
  { alias: 'ASO-Sample', items: [['97a2a1ac-8ff5-f011-840b-000d3a5bd0b7', 34], ['d2efe6a6-6313-f111-8406-6045bd01394c', 33], ['7da2a1ac-8ff5-f011-840b-000d3a5bd0b7', 33]] },
  { alias: 'BRI-Sample', items: [['57a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50]] },
  { alias: 'AGO-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 70], ['55a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
  { alias: 'SWO-Sample', items: [['55a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['57a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60]] },
  { alias: 'JES-Sample', items: [['57a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 80], ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 20]] },
  { alias: 'AJA-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 100]] },
  { alias: 'CHA-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 50], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30], ['59a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 20]] },
  { alias: 'LMA-Sample', items: [['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 70], ['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
  { alias: 'AMK-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['59a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60]] },
  { alias: 'CBI-Sample', items: [['53a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 80], ['51a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 20]] },
  { alias: 'DBE-Sample', items: [['b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 100]] },
  { alias: 'MUN-Sample', items: [['c2439c3f-6617-f111-8341-00224803b8ac', 50], ['f6baf769-6617-f111-8341-00224803b8ac', 50]] },
  { alias: 'AAL-Sample', items: [['f6baf769-6617-f111-8341-00224803b8ac', 70], ['b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 30]] },
  { alias: 'RSA-Sample', items: [['b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 40], ['c2439c3f-6617-f111-8341-00224803b8ac', 30], ['f6baf769-6617-f111-8341-00224803b8ac', 30]] },
  { alias: 'NHA-Sample', items: [['b3a3a1ac-8ff5-f011-840b-000d3a5bd0b7', 60], ['c2439c3f-6617-f111-8341-00224803b8ac', 40]] },
] as const;

function buildAssignmentName(
  resource: Pick<IResource, 'cai_displayname' | 'cai_alias'>,
  percentage: number,
  service: Pick<IServiceOrInitiative, 'cai_name'>,
): string {
  return `${resource.cai_displayname} (${resource.cai_alias.toUpperCase()}) | ${percentage}% | ${service.cai_name}`;
}

function buildAssignments(): MockAssignment[] {
  let index = 0;
  const allPlans = [...assignmentPlans, ...additionalAssignmentPlans];
  return allPlans.flatMap((plan) => {
    const resource = resourceByAlias.get(plan.alias);
    if (!resource) {
      throw new Error(`Missing resource for alias ${plan.alias}`);
    }

    const total = plan.items.reduce((sum, [, percentage]) => sum + percentage, 0);

    return plan.items.map(([serviceId, percentage]) => {
      const service = serviceById.get(serviceId);
      if (!service) {
        throw new Error(`Missing service ${serviceId}`);
      }

      index += 1;
      return {
        cai_assignmentid: createGuid(0x400 + index),
        cai_assignmentname: buildAssignmentName(resource, percentage, service),
        cai_allocationpercentage: percentage,
        _cai_resourceid_value: resource.cai_resourceid,
        _cai_resourceid_value_formatted: resource.cai_displayname,
        _cai_serviceorinitiativeid_value: service.cai_serviceorinitiativeid,
        _cai_serviceorinitiativeid_value_formatted: service.cai_name,
        cai_totalallocatedperuserperperiod: total,
        statecode: ACTIVE_STATE_CODE,
        statuscode: ACTIVE_STATUS_CODE,
        modifiedon: nextModifiedOn(),
      };
    });
  });
}

function recalculateAssignmentTotals(resourceId: string): void {
  const total = mockAssignments
    .filter((assignment) => assignment.statecode === ACTIVE_STATE_CODE && assignment._cai_resourceid_value === resourceId)
    .reduce((sum, assignment) => sum + assignment.cai_allocationpercentage, 0);

  mockAssignments = mockAssignments.map((assignment) =>
    assignment.statecode === ACTIVE_STATE_CODE && assignment._cai_resourceid_value === resourceId
      ? { ...assignment, cai_totalallocatedperuserperperiod: total }
      : assignment,
  );
}

export let mockAssignments: MockAssignment[] = buildAssignments();

function getApprovalStatusForResource(resourceId: string): AllocationStatusValue {
  // First 3 direct reports + Aline's entire team are approved
  const approvedResourceIds = new Set([
    mockResources[0]!.cai_resourceid, // Narine
    mockResources[2]!.cai_resourceid, // Mauno
    subManager3.cai_resourceid,
    ...mockSubReports
      .filter((r) => r._cai_managerresourceid_value === subManager3.cai_resourceid)
      .map((r) => r.cai_resourceid),
  ]);
  return approvedResourceIds.has(resourceId)
    ? AllocationStatus.ReviewComplete
    : AllocationStatus.PendingReview;
}

type AllocationStatusValue = (typeof AllocationStatus)[keyof typeof AllocationStatus];

function formatApprovalStatus(status: AllocationStatusValue): string {
  switch (status) {
    case AllocationStatus.ReviewComplete:
      return 'Review Complete';
    case AllocationStatus.ReviewCompleteRemoved:
      return 'Review Complete - Removed';
    default:
      return 'Pending Review';
  }
}

// Standalone allocation plan for Isabella Simonsen (has allocations but no assignments)
const isabellaAllocationPlan: Array<[string, number]> = [
  ['6d467b8b-a61c-f111-8341-6045bd013b70', 40],
  ['22e396e2-d518-f111-8341-6045bd013b70', 35],
];

function buildAllocations(): MockAllocation[] {
  const currentPeriod = mockAllocationPeriods[1]; // index 1 = last month (the "current" period)
  if (!currentPeriod) {
    return [];
  }

  // Asti Kirana has assignments but NO allocations
  const astiResourceId = resourceByAlias.get('AKI-Sample')?.cai_resourceid;

  const fromAssignments: MockAllocation[] = mockAssignments
    .filter((a) => a._cai_resourceid_value !== astiResourceId)
    .map((assignment, index) => {
      const resource = resourceById.get(assignment._cai_resourceid_value);
      const service = serviceById.get(assignment._cai_serviceorinitiativeid_value);
      const status = getApprovalStatusForResource(assignment._cai_resourceid_value);

      if (!resource || !service) {
        throw new Error('Mock allocation references missing resource or service');
      }

      return {
        cai_allocationid: createGuid(0x700 + index),
        cai_name: `${currentPeriod.cai_periodname} - ${resource.cai_displayname} - ${service.cai_name}`,
        cai_allocationpercentage: assignment.cai_allocationpercentage,
        _cai_allocationperiodid_value: currentPeriod.cai_allocationperiodid,
        _cai_allocationperiodid_value_formatted: currentPeriod.cai_periodname,
        _cai_resourceid_value: resource.cai_resourceid,
        _cai_resourceid_value_formatted: resource.cai_displayname,
        _cai_serviceorinitiativeid_value: service.cai_serviceorinitiativeid,
        _cai_serviceorinitiativeid_value_formatted: service.cai_name,
        _cai_manager_systemuserid_value: MOCK_MANAGER_USER_ID,
        _cai_manager_systemuserid_value_formatted: MOCK_MANAGER_NAME,
        cai_managerapprovalstatus: status,
        cai_managerapprovalstatus_formatted: formatApprovalStatus(status),
        cai_employeename: resource.cai_displayname,
        cai_alias: resource.cai_alias,
        statecode: ACTIVE_STATE_CODE,
        statuscode: ACTIVE_STATUS_CODE,
        modifiedon: nextModifiedOn(),
      };
    });

  // Isabella Simonsen: allocations without assignments (tests "no assignments" scenario)
  const isabellaResource = resourceByAlias.get('ISI-Sample');
  const isabellaAllocations: MockAllocation[] = isabellaResource
    ? isabellaAllocationPlan.map(([serviceId, percentage], i) => {
        const service = serviceById.get(serviceId);
        if (!service) throw new Error(`Missing service ${serviceId} for Isabella allocations`);
        const status = getApprovalStatusForResource(isabellaResource.cai_resourceid);
        return {
          cai_allocationid: createGuid(0x7f0 + i),
          cai_name: `${currentPeriod.cai_periodname} - ${isabellaResource.cai_displayname} - ${service.cai_name}`,
          cai_allocationpercentage: percentage,
          _cai_allocationperiodid_value: currentPeriod.cai_allocationperiodid,
          _cai_allocationperiodid_value_formatted: currentPeriod.cai_periodname,
          _cai_resourceid_value: isabellaResource.cai_resourceid,
          _cai_resourceid_value_formatted: isabellaResource.cai_displayname,
          _cai_serviceorinitiativeid_value: service.cai_serviceorinitiativeid,
          _cai_serviceorinitiativeid_value_formatted: service.cai_name,
          _cai_manager_systemuserid_value: MOCK_MANAGER_USER_ID,
          _cai_manager_systemuserid_value_formatted: MOCK_MANAGER_NAME,
          cai_managerapprovalstatus: status,
          cai_managerapprovalstatus_formatted: formatApprovalStatus(status),
          cai_employeename: isabellaResource.cai_displayname,
          cai_alias: isabellaResource.cai_alias,
          statecode: ACTIVE_STATE_CODE,
          statuscode: ACTIVE_STATUS_CODE,
          modifiedon: nextModifiedOn(),
        };
      })
    : [];

  return [...fromAssignments, ...isabellaAllocations];
}

export let mockAllocations: MockAllocation[] = buildAllocations();

// Mock delegations: In training mode, the logged-in user (Klaus Sample) has
// a delegation from sub-manager Narine Gasparyan (specific manager scope).
// This lets testers see the scope switcher with "My Team" + "Narine Gasparyan's Team".
const mockDelegations: IDelegation[] = [
  {
    cai_delegationid: createGuid(0xD00),
    cai_name: 'Narine Gasparyan → Klaus Sample',
    cai_scopetype: DelegationScopeType.DesignatedManagerCascade,
    _cai_delegatorresourceid_value: createGuid(0x200), // Narine Gasparyan (first mockResource)
    _cai_delegatorresourceid_value_formatted: 'Narine Gasparyan',
    _ownerid_value: MOCK_CURRENT_USER_ID,
    _ownerid_value_formatted: MOCK_MANAGER_NAME,
  },
];

let mockManagerSummaries: IManagerSummary[] = [];

function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockApi = {
  async getCurrentResourceByUserId(userId: string): Promise<IResource | null> {
    await delay();
    return userId === MOCK_MANAGER_USER_ID ? { ...mockManagerResource } : null;
  },

  async getDelegationsForUser(userId: string): Promise<IDelegation[]> {
    await delay();
    return cloneItems(mockDelegations.filter((d) => d._ownerid_value === userId));
  },

  async getDirectReports(managerResourceId: string): Promise<IResource[]> {
    await delay();
    const allResources = [...mockResources, ...mockSubReports, ...mockLevel3Reports, ...mockLevel4Reports, ...mockLevel5Reports, ...additionalResources];
    return cloneItems(
      allResources.filter((resource) => resource._cai_managerresourceid_value === managerResourceId),
    );
  },

  async getResourceById(resourceId: string): Promise<IResource | null> {
    await delay();
    const allResources = [mockManagerResource, ...mockResources, ...mockSubReports, ...mockLevel3Reports, ...mockLevel4Reports, ...mockLevel5Reports, ...additionalResources];
    const found = allResources.find((r) => r.cai_resourceid === resourceId);
    return found ? { ...found } : null;
  },

  async getResourcesByIds(resourceIds: string[]): Promise<IResource[]> {
    await delay();
    const allResources = [mockManagerResource, ...mockResources, ...mockSubReports, ...mockLevel3Reports, ...mockLevel4Reports, ...mockLevel5Reports, ...additionalResources];
    const idSet = new Set(resourceIds);
    return allResources.filter((r) => idSet.has(r.cai_resourceid)).map((r) => ({ ...r }));
  },

  async searchResources(term: string): Promise<IResource[]> {
    await delay();
    const allResources = [mockManagerResource, ...mockResources, ...mockSubReports, ...mockLevel3Reports, ...mockLevel4Reports, ...mockLevel5Reports, ...additionalResources];
    const isContains = term.startsWith('*');
    const needle = (isContains ? term.slice(1).trim() : term).toLowerCase();
    if (!needle) return [];
    const match = isContains
      ? (val: string) => val.toLowerCase().includes(needle)
      : (val: string) => val.toLowerCase().startsWith(needle);
    const seen = new Set<string>();
    return allResources
      .filter((r) => {
        if (seen.has(r.cai_resourceid)) return false;
        seen.add(r.cai_resourceid);
        return match(r.cai_displayname) || match(r.cai_alias);
      })
      .sort((a, b) => a.cai_displayname.localeCompare(b.cai_displayname))
      .slice(0, 30)
      .map((r) => ({ ...r }));
  },

  async getFunctionalTeams(): Promise<IFunctionalTeam[]> {
    await delay();
    return cloneItems(mockFunctionalTeams);
  },

  async getServiceInitiatives(): Promise<IServiceOrInitiative[]> {
    await delay();
    return cloneItems(mockServiceInitiatives);
  },

  async getAllocationPeriods(): Promise<IAllocationPeriod[]> {
    await delay();
    return cloneItems(mockAllocationPeriods);
  },

  async getAssignments(resourceIds?: string[]): Promise<IAssignment[]> {
    await delay();
    const activeAssignments = mockAssignments.filter((assignment) => assignment.statecode === ACTIVE_STATE_CODE);
    const filtered = resourceIds && resourceIds.length > 0
      ? activeAssignments.filter((assignment) => resourceIds.includes(assignment._cai_resourceid_value))
      : activeAssignments;
    return filtered.map(toPublicAssignment);
  },

  async createAssignment(data: Omit<IAssignment, 'cai_assignmentid'>): Promise<IAssignment> {
    await delay();
    const resource = resourceById.get(data._cai_resourceid_value);
    const service = serviceById.get(data._cai_serviceorinitiativeid_value);
    const inactiveMatch = mockAssignments
      .filter((assignment) =>
        assignment.statecode === INACTIVE_STATE_CODE
        && assignment._cai_resourceid_value === data._cai_resourceid_value
        && assignment._cai_serviceorinitiativeid_value === data._cai_serviceorinitiativeid_value,
      )
      .sort((left, right) => right.modifiedon.localeCompare(left.modifiedon))[0];

    if (inactiveMatch) {
      mockAssignments = mockAssignments.map((assignment) =>
        assignment.cai_assignmentid === inactiveMatch.cai_assignmentid
          ? {
              ...assignment,
              ...data,
              cai_assignmentname:
                resource && service
                  ? buildAssignmentName(resource, data.cai_allocationpercentage, service)
                  : data.cai_assignmentname,
              _cai_resourceid_value_formatted: resource?.cai_displayname ?? data._cai_resourceid_value_formatted,
              _cai_serviceorinitiativeid_value_formatted: service?.cai_name ?? data._cai_serviceorinitiativeid_value_formatted,
              statecode: ACTIVE_STATE_CODE,
              statuscode: ACTIVE_STATUS_CODE,
              modifiedon: nextModifiedOn(),
            }
          : assignment,
      );
      recalculateAssignmentTotals(data._cai_resourceid_value);
      return toPublicAssignment(
        mockAssignments.find((assignment) => assignment.cai_assignmentid === inactiveMatch.cai_assignmentid)!,
      );
    }

    const created: MockAssignment = {
      ...data,
      cai_assignmentid: createGuid(0x900 + mockAssignments.length + 1),
      cai_assignmentname:
        resource && service
          ? buildAssignmentName(resource, data.cai_allocationpercentage, service)
          : data.cai_assignmentname,
      _cai_resourceid_value_formatted: resource?.cai_displayname ?? data._cai_resourceid_value_formatted,
      _cai_serviceorinitiativeid_value_formatted: service?.cai_name ?? data._cai_serviceorinitiativeid_value_formatted,
      statecode: ACTIVE_STATE_CODE,
      statuscode: ACTIVE_STATUS_CODE,
      modifiedon: nextModifiedOn(),
    };
    mockAssignments = [...mockAssignments, created];
    recalculateAssignmentTotals(created._cai_resourceid_value);
    return toPublicAssignment(mockAssignments.find((assignment) => assignment.cai_assignmentid === created.cai_assignmentid)!);
  },

  async updateAssignment(
    id: string,
    data: Partial<Pick<IAssignment, 'cai_allocationpercentage' | '_cai_serviceorinitiativeid_value' | 'cai_totalallocatedperuserperperiod'>>,
  ): Promise<void> {
    await delay();
    let resourceIdToRecalculate: string | null = null;
    mockAssignments = mockAssignments.map((assignment) => {
      if (assignment.cai_assignmentid !== id) {
        return assignment;
      }

      resourceIdToRecalculate = assignment._cai_resourceid_value;
      const nextServiceId = data._cai_serviceorinitiativeid_value ?? assignment._cai_serviceorinitiativeid_value;
      const nextService = serviceById.get(nextServiceId);
      const nextPercentage = data.cai_allocationpercentage ?? assignment.cai_allocationpercentage;

      const resource = resourceById.get(assignment._cai_resourceid_value);

        return {
          ...assignment,
          cai_allocationpercentage: nextPercentage,
          _cai_serviceorinitiativeid_value: nextServiceId,
          _cai_serviceorinitiativeid_value_formatted: nextService?.cai_name ?? assignment._cai_serviceorinitiativeid_value_formatted,
        cai_assignmentname:
          resource && nextService
            ? buildAssignmentName(resource, nextPercentage, nextService)
            : assignment.cai_assignmentname,
          modifiedon: nextModifiedOn(),
        };
      });

    if (resourceIdToRecalculate) {
      recalculateAssignmentTotals(resourceIdToRecalculate);
    }
  },

  async deleteAssignment(id: string): Promise<void> {
    await delay();
    const assignment = mockAssignments.find((item) => item.cai_assignmentid === id);
    mockAssignments = mockAssignments.map((item) =>
      item.cai_assignmentid === id
        ? {
            ...item,
            cai_allocationpercentage: 0,
            cai_totalallocatedperuserperperiod: 0,
            statecode: INACTIVE_STATE_CODE,
            statuscode: INACTIVE_STATUS_CODE,
            modifiedon: nextModifiedOn(),
          }
        : item,
    );
    if (assignment) {
      recalculateAssignmentTotals(assignment._cai_resourceid_value);
    }
  },

  async getAllocations(periodId?: string, resourceIds?: string[]): Promise<IAllocation[]> {
    await delay();
    let result = mockAllocations.filter((allocation) => allocation.statecode === ACTIVE_STATE_CODE);
    if (periodId) {
      result = result.filter((allocation) => allocation._cai_allocationperiodid_value === periodId);
    }
    if (resourceIds && resourceIds.length > 0) {
      result = result.filter((allocation) => resourceIds.includes(allocation._cai_resourceid_value));
    }
    return result.map(toPublicAllocation);
  },

  async updateAllocation(
    id: string,
    data: Partial<Pick<IAllocation,
      'cai_allocationpercentage'
      | '_cai_serviceorinitiativeid_value'
      | 'cai_managerapprovalstatus'
      | 'cai_managerreviewdate'
      | '_cai_managerreviewcompletedbyid_value'
    >>,
  ): Promise<void> {
    await delay();
    mockAllocations = mockAllocations.map((allocation) => {
      if (allocation.cai_allocationid !== id) {
        return allocation;
      }

      const nextServiceId = data._cai_serviceorinitiativeid_value ?? allocation._cai_serviceorinitiativeid_value;
      const nextService = serviceById.get(nextServiceId);

      return {
        ...allocation,
        cai_allocationpercentage: data.cai_allocationpercentage ?? allocation.cai_allocationpercentage,
        _cai_serviceorinitiativeid_value: nextServiceId,
        _cai_serviceorinitiativeid_value_formatted: nextService?.cai_name ?? allocation._cai_serviceorinitiativeid_value_formatted,
        cai_managerapprovalstatus: data.cai_managerapprovalstatus ?? allocation.cai_managerapprovalstatus,
        cai_managerapprovalstatus_formatted: formatApprovalStatus(
          (data.cai_managerapprovalstatus ?? allocation.cai_managerapprovalstatus) as AllocationStatusValue,
        ),
        cai_managerreviewdate: 'cai_managerreviewdate' in data ? (data.cai_managerreviewdate ?? null) : allocation.cai_managerreviewdate,
        _cai_managerreviewcompletedbyid_value: '_cai_managerreviewcompletedbyid_value' in data
          ? (data._cai_managerreviewcompletedbyid_value ?? null)
          : allocation._cai_managerreviewcompletedbyid_value,
        cai_name: `${allocation._cai_allocationperiodid_value_formatted ?? 'Period'} - ${allocation.cai_employeename} - ${nextService?.cai_name ?? nextServiceId}`,
        modifiedon: nextModifiedOn(),
      };
    });
  },

  async approveAllocations(ids: string[]): Promise<void> {
    await delay(250);
    mockAllocations = mockAllocations.map((allocation) =>
      ids.includes(allocation.cai_allocationid)
        ? {
            ...allocation,
            cai_managerapprovalstatus: AllocationStatus.ReviewComplete,
            cai_managerapprovalstatus_formatted: formatApprovalStatus(AllocationStatus.ReviewComplete),
          }
        : allocation,
    );
  },

  async createAllocation(data: Omit<IAllocation, 'cai_allocationid'>): Promise<IAllocation> {
    await delay();
    const service = serviceById.get(data._cai_serviceorinitiativeid_value);
    const inactiveMatch = mockAllocations
      .filter((allocation) =>
        allocation.statecode === INACTIVE_STATE_CODE
        && allocation._cai_resourceid_value === data._cai_resourceid_value
        && allocation._cai_allocationperiodid_value === data._cai_allocationperiodid_value
        && allocation._cai_serviceorinitiativeid_value === data._cai_serviceorinitiativeid_value,
      )
      .sort((left, right) => right.modifiedon.localeCompare(left.modifiedon))[0];

    if (inactiveMatch) {
      mockAllocations = mockAllocations.map((allocation) =>
        allocation.cai_allocationid === inactiveMatch.cai_allocationid
          ? {
              ...allocation,
              ...data,
              _cai_serviceorinitiativeid_value_formatted: service?.cai_name ?? data._cai_serviceorinitiativeid_value_formatted ?? '',
              statecode: ACTIVE_STATE_CODE,
              statuscode: ACTIVE_STATUS_CODE,
              modifiedon: nextModifiedOn(),
            }
          : allocation,
      );
      return toPublicAllocation(
        mockAllocations.find((allocation) => allocation.cai_allocationid === inactiveMatch.cai_allocationid)!,
      );
    }

    const created: MockAllocation = {
      ...data,
      cai_allocationid: createGuid(0xA00 + mockAllocations.length + 1),
      _cai_serviceorinitiativeid_value_formatted: service?.cai_name ?? data._cai_serviceorinitiativeid_value_formatted ?? '',
      statecode: ACTIVE_STATE_CODE,
      statuscode: ACTIVE_STATUS_CODE,
      modifiedon: nextModifiedOn(),
    };
    mockAllocations = [...mockAllocations, created];
    return toPublicAllocation(created);
  },

  async deleteAllocation(id: string): Promise<void> {
    await delay();
    mockAllocations = mockAllocations.map((allocation) =>
      allocation.cai_allocationid === id
        ? {
            ...allocation,
            cai_allocationpercentage: 0,
            statecode: INACTIVE_STATE_CODE,
            statuscode: INACTIVE_STATUS_CODE,
            modifiedon: nextModifiedOn(),
          }
        : allocation,
    );
  },

  async getAllManagerSummaries(
    summaryType: number,
    periodId?: string | null,
  ): Promise<IManagerSummary[]> {
    await delay();
    return cloneItems(
      mockManagerSummaries.filter((s) =>
        s.cai_summarytype === summaryType
        && (summaryType !== ManagerSummaryType.Allocation || s._cai_allocationperiodid_value === periodId),
      ),
    );
  },

  /** Reset all mutable mock data to initial state (for training mode restarts) */
  resetData(): void {
    mockModifiedOnCounter = 0;
    mockAllocationPeriods = generateMockPeriods();
    mockAssignments = buildAssignments();
    mockAllocations = buildAllocations();
    mockManagerSummaries = [];
  },
};


