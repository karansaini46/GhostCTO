export type CodeAuditSourceMode = 'repo' | 'snippet';

export type CodeAuditGenerationInput = {
  codeSnippet?: string | null;
  repoUrl?: string | null;
};

export type CodeAuditConfidence = 'low' | 'medium' | 'high';
export type CodeAuditPriority = 'low' | 'medium' | 'high';
export type CodeAuditSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CodeAuditRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type CodeAuditFinding = {
  category: 'critical_risk' | 'security' | 'scalability' | 'maintainability' | 'delivery_risk';
  confidenceLevel: CodeAuditConfidence;
  evidence: string;
  explanation: string;
  impact: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  severity: CodeAuditSeverity;
  suggestedFix: string;
  title: string;
};

export type CodeAuditAction = {
  action: string;
  priority: CodeAuditPriority;
  reason: string;
};

export type CodeAuditAcceptableArea = {
  area: string;
  evidence: string;
  explanation: string;
};

export type CodeAuditQuestion = {
  priority: CodeAuditPriority;
  question: string;
  reason: string;
};

export type CodeAuditCard = {
  detail?: string | null;
  title: string;
  tone: 'neutral' | 'positive' | 'warning' | 'danger' | 'accent';
  value: string;
};

export type CodeAuditOutput = {
  acceptableAreas: CodeAuditAcceptableArea[];
  cards: CodeAuditCard[];
  criticalRisks: CodeAuditFinding[];
  disclaimer: string;
  executiveSummary: string;
  findings: CodeAuditFinding[];
  maintainabilityIssues: CodeAuditFinding[];
  moduleType: 'code_audit';
  nextSteps: Array<{ action: string; reason?: string | null }>;
  overviewRiskLevel: CodeAuditRiskLevel;
  questionsForDeveloper: CodeAuditQuestion[];
  recommendedNextActions: CodeAuditAction[];
  recommendation: string;
  reportMarkdown: string;
  risks: Array<{ impact: string; mitigation: string; risk: string }>;
  rushedWorkSignals: CodeAuditFinding[];
  scalabilityIssues: CodeAuditFinding[];
  securityIssues: CodeAuditFinding[];
  assumptions: Array<{ reason?: string | null; text: string }>;
};

export type CodeAuditDocumentMetadata = {
  codeAudit?: unknown;
  request?: {
    codeSnippet?: {
      characters: number;
    } | null;
    repoUrl?: string | null;
  };
  repository?: {
    defaultBranch: string;
    fullName: string;
    repoUrl: string;
    selectedFiles: Array<{
      path: string;
      reason: string;
      size: number;
    }>;
    skippedFiles: Array<{
      path: string;
      reason: string;
      size: number | null;
    }>;
  } | null;
};
