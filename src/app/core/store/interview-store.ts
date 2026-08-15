import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthStore } from '../../auth/auth-store';
import { httpErrorMessage } from '../utils/http-error';
import { EMPTY_SESSION, InterviewSession, Topic } from '../models';
import { QuestionsApi } from '../api';
import { StorageAdapter } from './storage-adapter';
import { TopicsStore } from './topics.store';

const TOPICS_KEY = 'iqm.topics';
const SESSION_KEY = 'iqm.session';

export type CloudStatus = 'idle' | 'loading' | 'saving';

@Injectable({ providedIn: 'root' })
export class InterviewStore {
  private readonly storage = inject(StorageAdapter);
  private readonly auth = inject(AuthStore);
  private readonly questionsApi = inject(QuestionsApi);
  private readonly topicsStore = inject(TopicsStore);

  getTopicsStore(): TopicsStore {
    return this.topicsStore;
  }

  readonly session = signal<InterviewSession>(EMPTY_SESSION);
  readonly ready = signal(false);

  readonly topicsWithMarks = computed<Topic[]>(() => {
    const marks = this.session().marks ?? [];
    const marksMap = new Map(marks.map((m) => [m.questionId, m.mark]));

    return this.topicsStore.topics().map((topic) => ({
      ...topic,
      questions: topic.questions.map((question) => ({
        ...question,
        mark: marksMap.get(question.id) ?? null,
        subQuestions: question.subQuestions.map((subQuestion) => ({
          ...subQuestion,
          mark: marksMap.get(subQuestion.id) ?? null,
        })),
      })),
    }));
  });

  // Cloud state. The interview session itself is never sent to the API - it
  // stays on this device in local storage.
  readonly cloudStatus = signal<CloudStatus>('idle');
  readonly cloudError = signal<string | null>(null);
  readonly cloudSavedAt = signal<Date | null>(null);

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
        this.topicsStore.topics.set(topics);
        this.persistTopics();
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
      this.persistTopics();
      await this.questionsApi.saveTopics(this.topicsStore.topics());
      this.cloudSavedAt.set(new Date());
    } catch (error) {
      this.cloudError.set(httpErrorMessage(error, 'Could not save questions to the cloud.'));
    } finally {
      this.cloudStatus.set('idle');
    }
  }

  private async load(): Promise<void> {
    const [topics, session] = await Promise.all([
      this.storage.get<Topic[]>(TOPICS_KEY),
      this.storage.get<InterviewSession>(SESSION_KEY),
    ]);
    if (topics) {
      this.topicsStore.topics.set(topics);
    }
    if (session) {
      this.session.set(session);
    }
    this.ready.set(true);
  }

  private persistTopics(): void {
    void this.storage.set(TOPICS_KEY, this.topicsStore.topics());
  }

  private persistSession(): void {
    void this.storage.set(SESSION_KEY, this.session());
  }

  // --- Interview session ---

  startInterview(): void {
    this.session.update((s) => ({ ...s, started: true }));
    this.persistSession();
  }

  setQuestionMark(questionId: string, mark: number | null): void {
    this.session.update((s) => ({
      ...s,
      marks: [...s.marks.filter((m) => m.questionId !== questionId), { questionId, mark }],
    }));
    this.persistSession();
  }

  /** Back to setup with all marks cleared. */
  restartInterview(): void {
    this.topicsStore.topics.update((topics) =>
      topics.map((t) => ({
        ...t,
        questions: t.questions.map((q) => ({
          ...q,
          mark: null,
          subQuestions: q.subQuestions.map((sub) => ({ ...sub, mark: null })),
        })),
      })),
    );
    this.session.set(EMPTY_SESSION);
    this.persistSession();
  }
}
