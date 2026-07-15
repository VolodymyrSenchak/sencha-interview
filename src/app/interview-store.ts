import { computed, inject, Injectable, signal } from '@angular/core';
import {
  FlatItem,
  InterviewSession,
  Question,
  SubQuestion,
  Topic,
  TopicResult,
  TopicWeakGroup,
  WeakQuestion,
} from './models';
import { StorageAdapter } from './storage/storage-adapter';

const TOPICS_KEY = 'iqm.topics';
const SESSION_KEY = 'iqm.session';

const EMPTY_SESSION: InterviewSession = {
  started: false,
  candidateName: '',
  selectedTopicIds: [],
  index: 0,
};

function createId(): string {
  return crypto.randomUUID();
}

@Injectable({ providedIn: 'root' })
export class InterviewStore {
  private readonly storage = inject(StorageAdapter);

  readonly topics = signal<Topic[]>([]);
  readonly session = signal<InterviewSession>(EMPTY_SESSION);
  readonly ready = signal(false);

  // Expand/collapse state persists while switching views (kept in-memory only).
  readonly expandedTopicIds = signal<ReadonlySet<string>>(new Set());
  readonly expandedQuestionIds = signal<ReadonlySet<string>>(new Set());

  /** Questions and sub-questions of the topics selected for the interview, in walk order. */
  readonly flatItems = computed<FlatItem[]>(() => {
    const selected = new Set(this.session().selectedTopicIds);
    const items: FlatItem[] = [];
    for (const topic of this.topics()) {
      if (!selected.has(topic.id)) {
        continue;
      }
      for (const question of topic.questions) {
        items.push({
          topicId: topic.id,
          topicName: topic.name,
          questionId: question.id,
          subQuestionId: null,
          text: question.text,
          description: null,
          parentText: null,
          mark: question.mark,
        });
        for (const sub of question.subQuestions) {
          items.push({
            topicId: topic.id,
            topicName: topic.name,
            questionId: question.id,
            subQuestionId: sub.id,
            text: sub.text,
            description: sub.description || null,
            parentText: question.text,
            mark: sub.mark,
          });
        }
      }
    }
    return items;
  });

  readonly currentIndex = computed(() => {
    const max = this.flatItems().length - 1;
    return Math.max(0, Math.min(this.session().index, max));
  });

  readonly currentItem = computed<FlatItem | null>(
    () => this.flatItems()[this.currentIndex()] ?? null,
  );

  readonly topicResults = computed<TopicResult[]>(() =>
    this.topics().map((topic) => {
      const strong: string[] = [];
      const weak: WeakQuestion[] = [];
      for (const question of topic.questions) {
        if (isStrong(question.mark)) {
          strong.push(question.text);
        }
        for (const sub of question.subQuestions) {
          if (isStrong(sub.mark)) {
            strong.push(sub.text);
          }
        }
        // A question is listed as weak when it or any of its sub-questions is weak.
        const weakSubs = question.subQuestions
          .filter((sub) => isWeak(sub.mark))
          .map((sub) => sub.text);
        if (isWeak(question.mark) || weakSubs.length > 0) {
          weak.push({ text: question.text, weakSubs });
        }
      }
      return { topicId: topic.id, topicName: topic.name, strong, weak };
    }),
  );

  readonly weakGroups = computed<TopicWeakGroup[]>(() =>
    this.topicResults()
      .map(({ topicId, topicName, weak }) => ({ topicId, topicName, items: weak }))
      .filter((group) => group.items.length > 0),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const [topics, session] = await Promise.all([
      this.storage.get<Topic[]>(TOPICS_KEY),
      this.storage.get<InterviewSession>(SESSION_KEY),
    ]);
    if (topics) {
      this.topics.set(topics);
    }
    if (session) {
      this.session.set(session);
    }
    this.ready.set(true);
  }

  private persistTopics(): void {
    void this.storage.set(TOPICS_KEY, this.topics());
  }

  private persistSession(): void {
    void this.storage.set(SESSION_KEY, this.session());
  }

  // --- Topics ---

  addTopic(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const topic: Topic = { id: createId(), name: trimmed, questions: [] };
    this.topics.update((topics) => [...topics, topic]);
    // New topics are pre-checked for the next interview.
    this.session.update((s) => ({ ...s, selectedTopicIds: [...s.selectedTopicIds, topic.id] }));
    this.persistTopics();
    this.persistSession();
  }

  renameTopic(topicId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    this.topics.update((topics) =>
      topics.map((t) => (t.id === topicId ? { ...t, name: trimmed } : t)),
    );
    this.persistTopics();
  }

  deleteTopic(topicId: string): void {
    this.topics.update((topics) => topics.filter((t) => t.id !== topicId));
    this.session.update((s) => ({
      ...s,
      selectedTopicIds: s.selectedTopicIds.filter((id) => id !== topicId),
    }));
    this.persistTopics();
    this.persistSession();
  }

  toggleTopicExpanded(topicId: string): void {
    this.expandedTopicIds.update((ids) => toggleInSet(ids, topicId));
  }

  setTopicExpanded(topicId: string, expanded: boolean): void {
    this.expandedTopicIds.update((ids) => setInSet(ids, topicId, expanded));
  }

  // --- Questions ---

  addQuestion(topicId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const question: Question = { id: createId(), text: trimmed, mark: null, subQuestions: [] };
    this.updateTopic(topicId, (t) => ({ ...t, questions: [...t.questions, question] }));
  }

  updateQuestionText(topicId: string, questionId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.updateQuestion(topicId, questionId, (q) => ({ ...q, text: trimmed }));
  }

  deleteQuestion(topicId: string, questionId: string): void {
    this.updateTopic(topicId, (t) => ({
      ...t,
      questions: t.questions.filter((q) => q.id !== questionId),
    }));
  }

  setQuestionMark(topicId: string, questionId: string, mark: number | null): void {
    this.updateQuestion(topicId, questionId, (q) => ({ ...q, mark }));
  }

  toggleQuestionExpanded(questionId: string): void {
    this.expandedQuestionIds.update((ids) => toggleInSet(ids, questionId));
  }

  setQuestionExpanded(questionId: string, expanded: boolean): void {
    this.expandedQuestionIds.update((ids) => setInSet(ids, questionId, expanded));
  }

  // --- Sub-questions ---

  addSubQuestion(topicId: string, questionId: string, text: string, description: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const sub: SubQuestion = {
      id: createId(),
      text: trimmed,
      description: description.trim(),
      mark: null,
    };
    this.updateQuestion(topicId, questionId, (q) => ({
      ...q,
      subQuestions: [...q.subQuestions, sub],
    }));
  }

  updateSubQuestion(
    topicId: string,
    questionId: string,
    subQuestionId: string,
    text: string,
    description: string,
  ): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.updateSub(topicId, questionId, subQuestionId, (sub) => ({
      ...sub,
      text: trimmed,
      description: description.trim(),
    }));
  }

  deleteSubQuestion(topicId: string, questionId: string, subQuestionId: string): void {
    this.updateQuestion(topicId, questionId, (q) => ({
      ...q,
      subQuestions: q.subQuestions.filter((sub) => sub.id !== subQuestionId),
    }));
  }

  setSubQuestionMark(
    topicId: string,
    questionId: string,
    subQuestionId: string,
    mark: number | null,
  ): void {
    this.updateSub(topicId, questionId, subQuestionId, (sub) => ({ ...sub, mark }));
  }

  // --- Interview session ---

  setCandidateName(name: string): void {
    this.session.update((s) => ({ ...s, candidateName: name }));
    this.persistSession();
  }

  toggleSelectedTopic(topicId: string): void {
    this.session.update((s) => ({
      ...s,
      selectedTopicIds: s.selectedTopicIds.includes(topicId)
        ? s.selectedTopicIds.filter((id) => id !== topicId)
        : [...s.selectedTopicIds, topicId],
    }));
    this.persistSession();
  }

  startInterview(): void {
    if (this.flatItems().length === 0) {
      return;
    }
    this.session.update((s) => ({ ...s, started: true, index: 0 }));
    this.persistSession();
  }

  goToIndex(index: number): void {
    const max = this.flatItems().length - 1;
    this.session.update((s) => ({ ...s, index: Math.max(0, Math.min(index, max)) }));
    this.persistSession();
  }

  /** Back to setup with all topics pre-checked; marks are kept. */
  restartInterview(): void {
    this.session.set({
      started: false,
      candidateName: '',
      selectedTopicIds: this.topics().map((t) => t.id),
      index: 0,
    });
    this.persistSession();
  }

  // --- Internal helpers ---

  private updateTopic(topicId: string, fn: (topic: Topic) => Topic): void {
    this.topics.update((topics) => topics.map((t) => (t.id === topicId ? fn(t) : t)));
    this.persistTopics();
  }

  private updateQuestion(
    topicId: string,
    questionId: string,
    fn: (question: Question) => Question,
  ): void {
    this.updateTopic(topicId, (t) => ({
      ...t,
      questions: t.questions.map((q) => (q.id === questionId ? fn(q) : q)),
    }));
  }

  private updateSub(
    topicId: string,
    questionId: string,
    subQuestionId: string,
    fn: (sub: SubQuestion) => SubQuestion,
  ): void {
    this.updateQuestion(topicId, questionId, (q) => ({
      ...q,
      subQuestions: q.subQuestions.map((sub) => (sub.id === subQuestionId ? fn(sub) : sub)),
    }));
  }
}

function isStrong(mark: number | null): boolean {
  return mark !== null && mark > 2;
}

function isWeak(mark: number | null): boolean {
  return mark === 1 || mark === 2;
}

function toggleInSet(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return setInSet(ids, id, !ids.has(id));
}

function setInSet(ids: ReadonlySet<string>, id: string, present: boolean): ReadonlySet<string> {
  if (ids.has(id) === present) {
    return ids;
  }
  const next = new Set(ids);
  if (present) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}
