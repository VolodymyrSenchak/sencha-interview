/**
 * Minimal typings and a lazy loader for the Google Identity Services client,
 * which is what mints the Google ID token the API exchanges for a session.
 */

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleCredentialResponse {
  /** The Google ID token (JWT) to send to the API. */
  credential: string;
  select_by?: string;
}

export interface GoogleInitializeConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

export interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  shape?: 'rectangular' | 'pill';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

export interface GoogleAccountsId {
  initialize(config: GoogleInitializeConfig): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

let loading: Promise<GoogleAccountsId> | null = null;

/** Loads the GSI script once and resolves with its `google.accounts.id` API. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (loading) {
    return loading;
  }

  const pending = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existing = window.google?.accounts?.id;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = window.google?.accounts?.id;
      if (api) {
        resolve(api);
      } else {
        reject(new Error('Google Identity Services loaded without an accounts API.'));
      }
    };
    script.onerror = () => reject(new Error('Could not load Google Identity Services.'));
    document.head.appendChild(script);
  });

  loading = pending;
  // Let a later attempt retry the load instead of replaying the failure forever.
  pending.catch(() => {
    if (loading === pending) {
      loading = null;
    }
  });
  return pending;
}
