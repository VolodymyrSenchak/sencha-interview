export interface SubQuestion {
  id: string;
  text: string;
  description: string;
  mark: number | null;
}

export interface Question {
  id: string;
  text: string;
  mark: number | null;
  subQuestions: SubQuestion[];
  /** Optional code snippet shown with the question; absent on data saved before this field existed. */
  code?: string;
}

export interface Topic {
  id: string;
  name: string;
  questions: Question[];
}

export interface InterviewSession {
  started: boolean;
  candidateName: string;
  selectedTopicIds: string[];
  index: number;
}

/** One entry of the flattened question/sub-question walk used by the running interview. */
export interface FlatItem {
  topicId: string;
  topicName: string;
  questionId: string;
  subQuestionId: string | null;
  text: string;
  description: string | null;
  parentText: string | null;
  mark: number | null;
}

export interface TopicResult {
  topicId: string;
  topicName: string;
  strong: string[];
  weak: WeakQuestion[];
}

/** A question with a weak mark and/or weak sub-questions, for the "All Weak Sides" summary. */
export interface WeakQuestion {
  text: string;
  weakSubs: string[];
}

export interface TopicWeakGroup {
  topicId: string;
  topicName: string;
  items: WeakQuestion[];
}
