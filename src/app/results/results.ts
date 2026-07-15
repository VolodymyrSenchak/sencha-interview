import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { InterviewStore } from '../interview-store';
import { WeakQuestion } from '../models';

@Component({
  selector: 'app-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results {
  protected readonly store = inject(InterviewStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected weakLine(item: WeakQuestion): string {
    return item.weakSubs.length > 0 ? `${item.text} (${item.weakSubs.join(', ')})` : item.text;
  }

  protected copyStrong(items: string[]): void {
    this.copy(items.map((text) => `- ${text}`).join('\n'));
  }

  protected copyWeak(items: WeakQuestion[]): void {
    this.copy(items.map((item) => `- ${this.weakLine(item)}`).join('\n'));
  }

  protected copyAllWeak(): void {
    const text = this.store
      .weakGroups()
      .map((group) =>
        [group.topicName, ...group.items.map((item) => `- ${this.weakLine(item)}`)].join('\n'),
      )
      .join('\n\n');
    this.copy(text);
  }

  private copy(text: string): void {
    void navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied', undefined, { duration: 1500 });
    });
  }

  protected newInterview(): void {
    this.store.restartInterview();
    void this.router.navigate(['/interview']);
  }
}
