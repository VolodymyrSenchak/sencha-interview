import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthStore } from '../../auth/auth-store';
import { httpErrorMessage } from '../utils/http-error';
import { CloudStatus, EMPTY_SESSION, InterviewSession, Topic } from '../models';
import { QuestionsApi } from '../api';
import { StorageAdapter } from './storage-adapter';
import { TopicsStore } from './topics.store';
import { serializeTopics } from '@core/utils/topics.utils';
import { InterviewSessionStore } from './interview-session.store';

const TOPICS_KEY = 'iqm.topics';

@Injectable({ providedIn: 'root' })
export class InterviewStore {
  private readonly storage = inject(StorageAdapter);
  private readonly auth = inject(AuthStore);
  private readonly questionsApi = inject(QuestionsApi);

  readonly topicsStore = inject(TopicsStore);
  readonly sessionStore = inject(InterviewSessionStore);

  readonly ready = signal(false);

  readonly topicsWithMarks = computed<Topic[]>(() => {
    const marks = this.sessionStore.session().marks ?? [];
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

  private readonly savedTopics = signal(serializeTopics([]));

  readonly hasUnsavedChanges = computed(
    () => serializeTopics(this.topicsStore.topics()) !== this.savedTopics(),
  );

  /** Resolves once the local copy has been read, so a cloud load cannot be undone by it. */
  private readonly localLoaded = this.load();

  constructor() {
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      untracked(() => {
        this.cloudError.set(null);
        this.cloudSavedAt.set(null);
        // A previous account's snapshot says nothing about this one's cloud copy.
        this.savedTopics.set(serializeTopics([]));
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
      // Nothing saved yet - keep whatever this device already has, and leave it
      // marked as unsaved so the user is told to push it up.
      if (topics && topics.length > 0) {
        this.topicsStore.topics.set(topics);
        this.persistTopics();
        this.savedTopics.set(serializeTopics(topics));
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
      const saved = this.topicsStore.topics();
      await this.questionsApi.saveTopics(saved);
      this.savedTopics.set(serializeTopics(saved));
      this.cloudSavedAt.set(new Date());
    } catch (error) {
      this.cloudError.set(httpErrorMessage(error, 'Could not save questions to the cloud.'));
    } finally {
      this.cloudStatus.set('idle');
    }
  }

  private async load(): Promise<void> {
    const [topics] = await Promise.all([
      this.storage.get<Topic[]>(TOPICS_KEY),
      this.sessionStore.load(),
    ]);
    if (topics) {
      this.topicsStore.topics.set(topics);
    }
    this.ready.set(true);
  }

  private persistTopics(): void {
    void this.storage.set(TOPICS_KEY, this.topicsStore.topics());
  }
}
