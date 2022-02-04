import type { ReleaseCondition } from '../backend/scraper/types-azure';

export type ScrapedProject = {
  name: [collection: string, project: string];
  lastUpdated: string | null;
};

export type AnalyticsItem = {
  label: string;
  start: string;
  end: string;
  pageLoads: number;
  uniques: number;
  pages: {
    pathname: string;
    count: number;
  }[];
};

export type PipelineStageStats = {
  id: number;
  name: string;
  // conditions: {
  //   type: ReleaseEnvironment['conditions'][number]['conditionType'];
  //   name: string;
  // }[];
  lastReleaseDate: Date;
  releaseCount: number;
  successCount: number;
};

export type BranchPolicies = Partial<{
  minimumNumberOfReviewers: { count: number; isOptional: boolean };
  workItemLinking: { isOptional: boolean };
  builds: { isOptional: boolean };
  commentRequirements: { isOptional: boolean };
  requireMergeStrategy: { isOptional: boolean };
}>;

export type PipelineStage = {
  name: string;
  conditions: {
    type: ReleaseCondition['conditionType'];
    name: string;
  }[];
  rank: number;
};

export type PipelineDefinitions = Record<number, PipelineStage[]>;

export type PipelineCount = {
  total: number;
  successful: number;
  name: string;
};

export type Pipeline = {
  id: number;
  name: string;
  url: string;
  repos: Record<string, {
    name: string;
    branches: string[];
    additionalBranches?: string[];
  }>;
  stageCounts: PipelineCount[];
};

export type ReleasePipelineStats = {
  pipelines: Pipeline[];
  policies: Record<string, Record<string, BranchPolicies>>;
};

export type UIBuildPipeline = {
  count: number;
  success: number;
  name: string;
  url: string;
  duration: { average: string; min: string; max: string };
  definitionId: string;
  status:
  | { type: 'unknown' }
  | { type: 'succeeded' }
  | { type: 'failed'; since: Date };
};

export type UIBuilds = null | {
  count: number;
  pipelines: UIBuildPipeline[];
};

export type UIBranchStats = {
  branches: {
    name: string;
    url: string;
    lastCommitDate: Date;
  }[];
  count: number;
  limit: number;
};

type SignificantlyAheadBranchStats = Pick<UIBranchStats, 'count' | 'limit'> & {
  branches: (UIBranchStats['branches'][0] & {
    aheadBy: number;
  })[];
};

export type UIBranches = {
  total: UIBranchStats;
  active: UIBranchStats;
  abandoned: UIBranchStats;
  deleteCandidates: UIBranchStats;
  possiblyConflicting: UIBranchStats;
  significantlyAhead: SignificantlyAheadBranchStats;
};

export type UIPullRequests = {
  total: number;
  active: number;
  abandoned: number;
  completed: number;
  timeToApprove: null | { average: string; min: string; max: string };
};

export type UITests = null | {
  total: number;
  pipelines: {
    name: string;
    url: string;
    successful: number;
    failed: number;
    executionTime: string;
    coverage: string;
  }[];
};

export type QualityGateDetails = {
  value?: number;
  op?: 'gt' | 'lt';
  level?: number;
  status: 'pass' | 'warn' | 'fail' | 'unknown';
};

export type UICodeQuality = null | {
  name: string;
  url: string;
  lastAnalysisDate: Date;
  qualityGateName: string;
  files?: number;
  complexity: {
    cyclomatic?: number;
    cognitive?: number;
  };
  quality: {
    gate: QualityGateDetails['status'];
    securityRating?: QualityGateDetails;
    coverage?: QualityGateDetails;
    duplicatedLinesDensity?: QualityGateDetails;
    blockerViolations?: QualityGateDetails;
    codeSmells?: QualityGateDetails;
    criticalViolations?: QualityGateDetails;
  };
  maintainability: {
    rating?: number;
    techDebt?: number;
    codeSmells?: number;
  };
  coverage: {
    byTests?: number;
    line?: number;
    linesToCover?: number;
    uncoveredLines?: number;
    branch?: number;
    conditionsToCover?: number;
    uncoveredConditions?: number;
  };
  reliability: {
    rating?: number;
    bugs?: number;
  };
  security: {
    rating?: number;
    vulnerabilities?: number;
  };
  duplication: {
    blocks?: number;
    files?: number;
    lines?: number;
    linesDensity?: number;
  };
}[];

export type AggregatedCommitsByDev = {
  name: string;
  imageUrl: string;
  changes: {
    add: number;
    edit: number;
    delete: number;
  };
  byDate: Record<string, number>;
};

export type UICommits = {
  count: number;
  byDev: AggregatedCommitsByDev[];
};

export type RepoAnalysis = {
  name: string;
  id: string;
  url: string;
  defaultBranch?: string;
  languages?: { lang: string; loc: number; color: string }[];
  commits: UICommits;
  builds: UIBuilds;
  branches: UIBranches;
  prs: UIPullRequests;
  tests: UITests;
  codeQuality: UICodeQuality;
  pipelineCount?: number;
};

export type UIWorkItem = {
  id: number;
  project: string;
  typeId: string;
  state: string;
  iterationPath: string;
  created: {
    // name: string;
    on: string;
    // pic: string;
  };
  updated: {
    on: string;
  };
  // assigned: {
  // name: string;
  // pic: string;
  // };
  title: string;
  // description: string;
  url: string;
  env?: string;
  groupId?: string;
  priority?: number;
  severity?: string;
  rca?: string;
  filterBy?: { label: string; tags: string[] }[];
};

export type UIWorkItemRevision = {
  state: string;
  date: string;
};

export type UIWorkItemType = {
  name: [string, string];
  icon: string;
  color: string;
  iconColor: string | null;
  workCenters: { label: string; startDateField: string[]; endDateField: string[]}[];
  groupLabel?: string;
  startDateFields?: string[];
  endDateFields?: string[];
  devCompleteFields?: string[];
};

export type AnalysedWorkItems = {
  ids: Record<number, number[] | undefined>;
  byId: Record<number, UIWorkItem>;
  types: Record<string, UIWorkItemType>;
};

export type Overview = {
  byId: Record<number, UIWorkItem>;
  types: Record<string, UIWorkItemType>;
  groups: Record<string, { witId: string; name: string }>;
  times: Record<number, {
    start?: string;
    end?: string;
    devComplete?: string;
    workCenters: {
      label: string;
      start: string;
      end?: string;
    }[];
  }>;
  relations: Record<number, number[]>;
};

export type UIProjectAnalysis = {
  name: [collection: string, project: string];
  lastUpdated: string;
  reposCount: number;
  releasePipelineCount: number;
  workItemCount: number;
  workItemLabel: [singular: string, plural: string];
};

export type TestCasesAnalysis = {
  automated: {
    total: number;
  };
  notAutomated: {
    total: number;
  };
};

export type ProjectRepoAnalysis = UIProjectAnalysis & { repos: RepoAnalysis[] };

export type ProjectReleasePipelineAnalysis = UIProjectAnalysis & ReleasePipelineStats & {
  stagesToHighlight?: string[];
  ignoreStagesBefore?: string;
};

export type ProjectWorkItemAnalysis = UIProjectAnalysis & {
  workItems: AnalysedWorkItems | null;
  taskType?: string;
};

export type ProjectOverviewAnalysis = UIProjectAnalysis & {
  overview: Overview;
};

export type ProjectTestCasesAnalysis = UIProjectAnalysis & {
  testCases: TestCasesAnalysis;
};
