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
  strong: ResultQuestion[];
  weak: ResultQuestion[];
}

/**
 * A question listed in the results because it and/or its sub-questions were marked.
 * `subs` holds the matching sub-question texts, e.g. Service Bus (TOPIC, QUEUE).
 */
export interface ResultQuestion {
  text: string;
  subs: string[];
}

export interface TopicWeakGroup {
  topicId: string;
  topicName: string;
  items: ResultQuestion[];
}
