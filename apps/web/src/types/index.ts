export type DocType =
  | "rdd" | "prd" | "brd" | "technical_design" | "system_design" | "architecture"
  | "development_plan" | "runbook" | "sop" | "incident_report" | "postmortem" | "pm_roadmap";

export type Section = {
  id: string;
  title: string;
  order: number;
  content_md: string;
  word_count: number;
  ai_score: number | null;
  human_score: number | null;
  iteration: number;
};

export type DocumentDetail = {
  id: string;
  type: string;
  tone: string;
  depth: string;
  title: string;
  status: string;
  generation_model: string;
  humanize_model: string;
  human_score_avg: number | null;
  sections: Section[];
};
