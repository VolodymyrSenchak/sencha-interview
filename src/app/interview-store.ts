import { moveItemInArray } from '@angular/cdk/drag-drop';
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthStore } from './auth/auth-store';
import { httpErrorMessage } from './http-error';
import {
  FlatItem,
  InterviewSession,
  Question,
  ResultQuestion,
  SubQuestion,
  Topic,
  TopicResult,
  TopicWeakGroup,
} from './models';
import { QuestionsApi } from './storage/questions-api';
import { StorageAdapter } from './storage/storage-adapter';

const TOPICS_KEY = 'iqm.topics';
const SESSION_KEY = 'iqm.session';

export type CloudStatus = 'idle' | 'loading' | 'saving';

const EMPTY_SESSION: InterviewSession = {
  started: false,
  selectedTopicIds: [],
  index: 0,
};

function createId(): string {
  return crypto.randomUUID();
}

@Injectable({ providedIn: 'root' })
export class InterviewStore {
  private readonly storage = inject(StorageAdapter);
  private readonly auth = inject(AuthStore);
  private readonly questionsApi = inject(QuestionsApi);

  readonly topics = signal<Topic[]>([]);
  readonly session = signal<InterviewSession>(EMPTY_SESSION);
  readonly ready = signal(false);

  // Cloud state. The interview session itself is never sent to the API - it
  // stays on this device in local storage.
  readonly cloudStatus = signal<CloudStatus>('idle');
  readonly cloudError = signal<string | null>(null);
  readonly cloudSavedAt = signal<Date | null>(null);

  // Expand/collapse state persists while switching views (kept in-memory only).
  // Topics and questions are collapsed by default, so only expanded ids are tracked.
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
      const strong: ResultQuestion[] = [];
      const weak: ResultQuestion[] = [];
      for (const question of topic.questions) {
        // A question is listed when it or any of its sub-questions matches,
        // with the matching sub-questions grouped under it, e.g. Service Bus (TOPIC, QUEUE).
        const strongSubs = question.subQuestions
          .filter((sub) => isStrong(sub.mark))
          .map((sub) => sub.text);
        if (isStrong(question.mark) || strongSubs.length > 0) {
          strong.push({ text: question.text, subs: strongSubs });
        }
        const weakSubs = question.subQuestions
          .filter((sub) => isWeak(sub.mark))
          .map((sub) => sub.text);
        if (isWeak(question.mark) || weakSubs.length > 0) {
          weak.push({ text: question.text, subs: weakSubs });
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

  /** Resolves once the local copy has been read, so a cloud load cannot be undone by it. */
  private readonly localLoaded = this.load();

  constructor() {
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      untracked(() => {
        this.cloudError.set(null);
        this.cloudSavedAt.set(null);
        if (loggedIn) {
          // Signed in: the cloud copy wins, and changes go back with "Save to cloud".
          void this.loadFromCloud();
        }
      });
    });
  }

  // --- Cloud (signed-in users only) ---

  async loadFromCloud(): Promise<void> {
    if (!this.auth.isLoggedIn() || this.cloudStatus() !== 'idle') {
      return;
    }
    this.cloudStatus.set('loading');
    this.cloudError.set(null);
    try {
      const [topics] = await Promise.all([this.questionsApi.getTopics(), this.localLoaded]);
      // Nothing saved yet - keep whatever this device already has.
      if (topics && topics.length > 0) {
        this.topics.set(topics);
        this.persistTopics();
        this.syncSessionWithTopics();
      }
    } catch (error) {
      this.cloudError.set(httpErrorMessage(error, 'Could not load questions from the cloud.'));
    } finally {
      this.cloudStatus.set('idle');
    }
  }

  async saveToCloud(): Promise<void> {
    if (!this.auth.isLoggedIn() || this.cloudStatus() !== 'idle') {
      return;
    }
    this.cloudStatus.set('saving');
    this.cloudError.set(null);
    try {
      await this.questionsApi.saveTopics(this.topics());
      this.cloudSavedAt.set(new Date());
    } catch (error) {
      this.cloudError.set(httpErrorMessage(error, 'Could not save questions to the cloud.'));
    } finally {
      this.cloudStatus.set('idle');
    }
  }

  /** Drops selections pointing at topics the cloud copy does not have. */
  private syncSessionWithTopics(): void {
    const ids = this.topics().map((t) => t.id);
    const known = new Set(ids);
    this.session.update((s) => {
      const selectedTopicIds = s.selectedTopicIds.filter((id) => known.has(id));
      return { ...s, selectedTopicIds: selectedTopicIds.length > 0 ? selectedTopicIds : ids };
    });
    this.persistSession();
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

  reorderTopic(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) {
      return;
    }
    this.topics.update((topics) => {
      const next = [...topics];
      moveItemInArray(next, previousIndex, currentIndex);
      return next;
    });
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

  reorderQuestion(topicId: string, previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) {
      return;
    }
    this.updateTopic(topicId, (t) => {
      const questions = [...t.questions];
      moveItemInArray(questions, previousIndex, currentIndex);
      return { ...t, questions };
    });
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

  setQuestionCode(topicId: string, questionId: string, code: string): void {
    this.updateQuestion(topicId, questionId, (q) => ({ ...q, code }));
  }

  isQuestionExpanded(questionId: string): boolean {
    return this.expandedQuestionIds().has(questionId);
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
    this.updateQuestion(topicId, questionId, (q) => {
      const subQuestions = q.subQuestions.map((sub) =>
        sub.id === subQuestionId ? { ...sub, mark } : sub,
      );
      // Marked sub-questions take over the scoring, so the parent's own mark is dropped
      // (and its mark buttons disabled) until every sub-question is cleared again.
      const scoredBySubs = subQuestions.some((sub) => sub.mark !== null);
      return { ...q, subQuestions, mark: scoredBySubs ? null : q.mark };
    });
  }

  // --- Interview session ---

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

  /** Back to setup with all topics pre-checked and all marks cleared. */
  restartInterview(): void {
    this.topics.update((topics) =>
      topics.map((t) => ({
        ...t,
        questions: t.questions.map((q) => ({
          ...q,
          mark: null,
          subQuestions: q.subQuestions.map((sub) => ({ ...sub, mark: null })),
        })),
      })),
    );
    this.session.set({
      started: false,
      selectedTopicIds: this.topics().map((t) => t.id),
      index: 0,
    });
    this.persistTopics();
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
