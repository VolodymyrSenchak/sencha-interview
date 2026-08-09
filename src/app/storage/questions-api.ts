import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Topic } from '../models';

/**
 * Cloud copy of the topics/questions of the signed-in user. The API stores the
 * posted body as the row payload, so what goes out is what comes back.
 */
@Injectable({ providedIn: 'root' })
export class QuestionsApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/interview-questions`;

  /** Saved topics, or null when the user has never saved anything. */
  async getTopics(): Promise<Topic[] | null> {
    const payload = await firstValueFrom(this.http.get<unknown>(this.url));
    return toTopics(payload);
  }

  async saveTopics(topics: Topic[]): Promise<void> {
    await firstValueFrom(this.http.post(this.url, topics));
  }
}

function toTopics(payload: unknown): Topic[] | null {
  // A text column hands the payload back as a JSON string, a json column as an array.
  const value = typeof payload === 'string' ? parseJson(payload) : payload;
  return Array.isArray(value) ? (value as Topic[]) : null;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
