import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../environments/environment';
import { httpErrorMessage } from '../http-error';
import { ThemeStore } from '../theme-store';
import { AuthStore } from './auth-store';
import { GoogleCredentialResponse, loadGoogleIdentity } from './google-identity';

/** Closes with `true` once the user is signed in. */
@Component({
  selector: 'app-login-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Sign in</h2>
    <mat-dialog-content>
      <p class="hint">Sign in to load and save your topics and questions in the cloud.</p>
      <div class="google-button" #googleButton></div>
      @if (status(); as status) {
        <p class="status">{{ status }}</p>
      }
      @if (error(); as error) {
        <p class="error">{{ error }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  styles: `
    .hint {
      margin: 0 0 16px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13.5px;
    }

    .google-button {
      display: flex;
      justify-content: center;
      min-height: 44px;
    }

    .status {
      margin: 14px 0 0;
      text-align: center;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .error {
      margin: 14px 0 0;
      font-size: 13px;
      color: var(--mat-sys-error);
    }
  `,
})
export class LoginDialog {
  private readonly dialogRef = inject(MatDialogRef<LoginDialog, boolean>);
  private readonly auth = inject(AuthStore);
  private readonly theme = inject(ThemeStore);

  private readonly buttonHost = viewChild.required<ElementRef<HTMLElement>>('googleButton');

  protected readonly status = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    afterNextRender(() => void this.renderGoogleButton());
  }

  private async renderGoogleButton(): Promise<void> {
    if (!environment.googleClientId) {
      this.error.set(
        'Google sign-in is not configured. Set googleClientId in src/environments/environment.ts.',
      );
      return;
    }
    try {
      const google = await loadGoogleIdentity();
      google.initialize({
        client_id: environment.googleClientId,
        callback: (response) => void this.signIn(response),
        cancel_on_tap_outside: true,
      });
      google.renderButton(this.buttonHost().nativeElement, {
        theme: this.theme.theme() === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 280,
      });
    } catch (error) {
      this.error.set(httpErrorMessage(error, 'Could not load the Google sign-in button.'));
    }
  }

  private async signIn(response: GoogleCredentialResponse): Promise<void> {
    this.status.set('Signing in…');
    this.error.set(null);
    try {
      await this.auth.loginWithGoogle(response.credential);
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(httpErrorMessage(error, 'Sign-in failed.'));
    } finally {
      this.status.set(null);
    }
  }
}
