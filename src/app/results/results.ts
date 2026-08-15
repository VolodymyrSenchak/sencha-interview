import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { InterviewStore } from '@core/store';
import { ResultQuestion } from '@core/models';
import { toTopicResults, toWeakGroups } from './results.utils';

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

  protected readonly topicResults = computed(() => toTopicResults(this.store.topicsWithMarks()));
  protected readonly weakGroups = computed(() => toWeakGroups(this.topicResults()));

  protected resultLine(item: ResultQuestion): string {
    return item.subs.length > 0 ? `${item.text} (${item.subs.join(', ')})` : item.text;
  }

  protected copyStrong(items: ResultQuestion[]): void {
    this.copy(items.map((item) => `- ${this.resultLine(item)}`).join('\n'));
  }

  protected copyWeak(items: ResultQuestion[]): void {
    this.copy(items.map((item) => `- ${this.resultLine(item)}`).join('\n'));
  }

  protected copyAllWeak(): void {
    const text = this.weakGroups()
      .map((group) =>
        [group.topicName, ...group.items.map((item) => `- ${this.resultLine(item)}`)].join('\n'),
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
