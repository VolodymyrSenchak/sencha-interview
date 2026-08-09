import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthStore } from './auth/auth-store';
import { LoginDialog } from './auth/login-dialog';
import { filter, map } from 'rxjs';
import { InterviewStore } from './interview-store';
import { ThemeStore } from './theme-store';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly store = inject(InterviewStore);
  private readonly dialog = inject(MatDialog);
  protected readonly theme = inject(ThemeStore);
  protected readonly auth = inject(AuthStore);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly title = computed(() => {
    const url = this.url();
    if (url.startsWith('/interview')) {
      return this.store.session().started ? 'Interview in progress' : 'Start Interview';
    }
    if (url.startsWith('/results')) {
      return 'Results';
    }
    return 'Topics & Questions';
  });

  protected openLogin(): void {
    this.dialog.open<LoginDialog, undefined, boolean>(LoginDialog, { width: '360px' });
  }

  protected logout(): void {
    this.auth.logout();
  }
}
