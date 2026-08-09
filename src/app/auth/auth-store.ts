import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { loadGoogleIdentity } from './google-identity';

const AUTH_KEY = 'iqm.auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Shape of `{ user, session }` returned by the API auth endpoints (Supabase). */
interface ApiAuthResponse {
  user?: ApiUser;
  session?: {
    access_token: string;
    refresh_token: string;
    user?: ApiUser;
  };
}

interface ApiUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

/**
 * Holds the signed-in session. The tokens live in localStorage so a reload keeps
 * the user signed in; the access token is attached to API calls by the auth
 * interceptor and refreshed transparently when it expires.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);

  private readonly session = signal<StoredSession | null>(readStoredSession());
  private refreshing: Promise<string | null> | null = null;

  readonly user = computed<AuthUser | null>(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  /** Exchanges a Google ID token for an API session. Throws on failure. */
  async loginWithGoogle(idToken: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<ApiAuthResponse>(`${environment.apiBaseUrl}/auth/google`, { idToken }),
    );
    const session = toStoredSession(response);
    if (!session) {
      throw new Error('The API did not return a session.');
    }
    this.setSession(session);
  }

  logout(): void {
    this.setSession(null);
    // Otherwise Google silently re-picks the same account on the next sign-in.
    void loadGoogleIdentity()
      .then((google) => google.disableAutoSelect())
      .catch(() => undefined);
  }

  /**
   * Renews the access token, signing the user out when the refresh token is no
   * longer valid. Concurrent callers share one request.
   */
  async refresh(): Promise<string | null> {
    if (!this.refreshing) {
      const pending = this.requestRefresh();
      this.refreshing = pending;
      void pending.finally(() => {
        if (this.refreshing === pending) {
          this.refreshing = null;
        }
      });
    }
    return this.refreshing;
  }

  private async requestRefresh(): Promise<string | null> {
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) {
      return null;
    }
    try {
      const response = await firstValueFrom(
        this.http.post<ApiAuthResponse>(`${environment.apiBaseUrl}/auth/refreshToken`, {
          refreshToken,
        }),
      );
      const session = toStoredSession(response);
      if (!session) {
        this.setSession(null);
        return null;
      }
      this.setSession(session);
      return session.accessToken;
    } catch {
      this.setSession(null);
      return null;
    }
  }

  private setSession(session: StoredSession | null): void {
    this.session.set(session);
    if (session) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }
}

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed?.accessToken && parsed?.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

function toStoredSession(response: ApiAuthResponse): StoredSession | null {
  const session = response?.session;
  if (!session?.access_token || !session?.refresh_token) {
    return null;
  }
  const apiUser = response.user ?? session.user;
  const metadata = apiUser?.user_metadata ?? {};
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: {
      id: apiUser?.id ?? '',
      email: apiUser?.email ?? '',
      name: metadata.full_name ?? metadata.name ?? null,
      avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
    },
  };
}
