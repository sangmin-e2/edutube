export interface VideoRecommendation {
  id: number;
  title: string;
  channel: string;
  url: string;
  description: string;
}

export interface AssessmentOption {
  id: number;
  title: string;
  description: string;
}

export interface VideoAnalysis {
  summary: string;
  assessments: AssessmentOption[];
}

export interface LessonPlan {
  markdownContent: string;
}

export enum AppStep {
  INPUT_TOPIC = 0,
  SELECT_VIDEO = 1,
  SELECT_ASSESSMENT = 2,
  VIEW_PLAN = 3,
}
