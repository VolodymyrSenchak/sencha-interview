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
  weak: string[];
}

export interface WeakItem {
  topicName: string;
  text: string;
}
