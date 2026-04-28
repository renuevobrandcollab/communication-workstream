export type Role =
  | 'ADMIN'
  | 'PROGRAM_MANAGER'
  | 'PROJECT_MANAGER'
  | 'CHANGE_MANAGER'
  | 'SOLUTION_ARCHITECT'
  | 'PMO';

export type RAGStatus = 'RED' | 'AMBER' | 'GREEN';
export type Trend = 'IMPROVING' | 'STABLE' | 'WORSENING';
export type Phase =
  | 'ASSESS'
  | 'PREPARE'
  | 'DEMONSTRATE'
  | 'BUILD'
  | 'TEST_AND_TRAIN'
  | 'DEPLOY'
  | 'OPERATE';
export type GateCode = 'TG0' | 'TG1' | 'TG2' | 'TG3' | 'TG4' | 'TG5' | 'TG6';
export type MilestoneStatus = 'PLANNED' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'DELAYED';
export type CommStatus =
  | 'PLANNED'
  | 'DUE'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'SENT'
  | 'OVERDUE'
  | 'SKIPPED';
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskType = 'RISK' | 'ISSUE';
export type InfluenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type StakeholderLayer = 'PROJECT' | 'PROGRAM' | 'PARTNER';
export type EscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';
export type SurveyType = 'POST_KICKOFF' | 'POST_UAT' | 'T_PLUS_30';
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'OVERDUE';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';
export type DecisionStatus = 'OPEN' | 'DECIDED' | 'DEFERRED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  country: string;
  status: string;
  currentPhase: Phase;
  kickoffDate: string | null;
  goLiveDate: string | null;
  hyperCareEnd?: string | null;
  workstreams?: Workstream[];
  users?: { user: User; role: string }[];
}

export interface Workstream {
  id: string;
  name: string;
  order: number;
}

export interface ProgramSiteSummary {
  id: string;
  code: string;
  name: string;
  country: string;
  phase: Phase;
  status: string;
  goLiveDate: string | null;
  kickoffDate: string | null;
  daysToGoLive: number | null;
  pm: string;
  latestRAG: RAGStatus | null;
  lastUpdate: string | null;
  trend: Trend;
}

export interface OverdueEvent {
  id: string;
  siteCode: string;
  siteName: string;
  templateCode: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  pm: string;
}

export interface CommEvent {
  id: string;
  siteId: string;
  templateCode: string;
  title: string;
  dueDate: string;
  sentDate: string | null;
  status: CommStatus;
  approvedBy: string | null;
  archivedPath: string | null;
  notes: string | null;
}

export interface Risk {
  id: string;
  siteId: string;
  type: RiskType;
  title: string;
  description: string;
  impact: Severity;
  probability: Severity;
  status: RAGStatus;
  mitigation: string;
  ownerName: string;
  dueDate: string | null;
  resolved: boolean;
  resolution?: string | null;
}

export interface Stakeholder {
  id: string;
  siteId: string;
  name: string;
  role: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  influence: InfluenceLevel;
  interest: InfluenceLevel;
  engagementStrategy: string | null;
  keyMessages: string | null;
  layer: StakeholderLayer;
  isKeyUser: boolean;
  isActive: boolean;
}

export interface Milestone {
  id: string;
  siteId: string;
  gate: GateCode;
  name: string;
  plannedDate: string;
  actualDate: string | null;
  status: MilestoneStatus;
  notes: string | null;
  commSent: boolean;
}

export interface Escalation {
  id: string;
  siteId: string;
  raisedById: string;
  title: string;
  issueSummary: string;
  impact: string;
  options: string;
  recommendation: string;
  decisionNeededBy: string;
  decisionNeededFrom: string;
  status: EscalationStatus;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  raisedBy?: User;
}

export interface KPIEntry {
  id: string;
  siteId: string;
  quarter: string;
  scAttendanceRate: number | null;
  trainingAttendance: number | null;
  bsbDeliveryRate: number | null;
  glSequenceOnTime: boolean | null;
  unnecessaryEscalations: number | null;
  satisfactionScore: number | null;
  commRelatedGLIssues: number | null;
  notes: string | null;
}

export interface ActionItem {
  id: string;
  description: string;
  ownerName: string;
  dueDate: string;
  status: ActionStatus;
  notes?: string | null;
}

export interface Decision {
  id: string;
  description: string;
  context: string;
  recommendation: string;
  neededBy: string;
  decidedBy: string;
  status: DecisionStatus;
  resolution?: string | null;
}

export interface WorkstreamRAGEntry {
  id: string;
  workstreamId: string;
  reportId: string;
  rag: RAGStatus;
  trend: Trend;
  comment: string;
  workstream?: Workstream;
}

export interface WeeklyReport {
  id: string;
  siteId: string;
  authorId: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  status: ReportStatus;
  overallRAG: RAGStatus;
  doneThisWeek: string;
  plannedNextWeek: string;
  keyMessage: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  workstreamRAGs?: WorkstreamRAGEntry[];
  decisions?: Decision[];
  actions?: ActionItem[];
  risks?: { risk: Risk }[];
}

export interface Template {
  code: string;
  name: string;
  group: string;
  layer: 'PRJ' | 'PGM';
  owner: string;
  approver: string;
  timing: string;
  frequency: string;
  format: string;
  tone: string;
  mandatory: string[];
  forbidden: string[];
  wbsRef: string;
}

export interface Survey {
  id: string;
  siteId: string;
  type: SurveyType;
  sentDate: string;
  responses?: SurveyResponse[];
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  q1Score: number;
  q2Score: number;
  q3Text: string;
  q4Volume: string;
  q5Score: number;
  submittedAt: string;
}
