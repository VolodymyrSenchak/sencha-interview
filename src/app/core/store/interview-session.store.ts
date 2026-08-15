import { inject, Injectable, signal } from '@angular/core';
import { EMPTY_SESSION, InterviewSession } from '../models';
import { StorageAdapter } from './storage-adapter';

const SESSION_KEY = 'iqm.session';

@Injectable({ providedIn: 'root' })
export class InterviewSessionStore {
  private readonly storage = inject(StorageAdapter);
  readonly session = signal<InterviewSession>(EMPTY_SESSION);

  async load(): Promise<void> {
    const session = await this.storage.get<InterviewSession>(SESSION_KEY);
    if (session) {
      this.session.set(session);
    }
  }

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

  restartInterview(): void {
    this.session.set(EMPTY_SESSION);
    this.persistSession();
  }

  private persistSession(): void {
    void this.storage.set(SESSION_KEY, this.session());
  }
}
