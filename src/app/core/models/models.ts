export interface SubQuestion {
  id: string;
  text: string;
  description: string;
  mark?: number | null; // optional because this field was added later; absent on data saved before it existed
}

export interface Question {
  id: string;
  text: string;
  subQuestions: SubQuestion[];
  /** Optional code snippet shown with the question; absent on data saved before this field existed. */
  code?: string;

  mark?: number | null; // optional because this field was added later; absent on data saved before it existed
}

export interface Topic {
  id: string;
  name: string;
  questions: Question[];
}

export interface QuestionMark {
  questionId: string;
  mark: number | null;
}

export interface InterviewSession {
  started: boolean;
  marks: QuestionMark[];
}

export const EMPTY_SESSION: InterviewSession = {
  started: false,
  marks: [],
};

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

export type CloudStatus = 'idle' | 'loading' | 'saving';