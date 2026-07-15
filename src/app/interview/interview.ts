import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { InterviewStore } from '../interview-store';
import { Topic } from '../models';
import { MarkButtons } from '../shared/mark-buttons';

@Component({
  selector: 'app-interview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MarkButtons,
  ],
  templateUrl: './interview.html',
  styleUrl: './interview.scss',
})
export class Interview {
  protected readonly store = inject(InterviewStore);
  private readonly router = inject(Router);

  protected readonly hasAnyQuestions = computed(() =>
    this.store.topics().some((t) => t.questions.length > 0),
  );

  protected readonly isLastItem = computed(
    () => this.store.currentIndex() === this.store.flatItems().length - 1,
  );

  protected readonly progressPercent = computed(() => {
    const total = this.store.flatItems().length;
    return total === 0 ? 0 : ((this.store.currentIndex() + 1) / total) * 100;
  });

  protected questionCountLabel(topic: Topic): string {
    const count =
      topic.questions.length + topic.questions.reduce((sum, q) => sum + q.subQuestions.length, 0);
    return `${count} q`;
  }

  protected isSelected(topicId: string): boolean {
    return this.store.session().selectedTopicIds.includes(topicId);
  }

  protected setCurrentMark(mark: number | null): void {
    const item = this.store.currentItem();
    if (!item) {
      return;
    }
    if (item.subQuestionId) {
      this.store.setSubQuestionMark(item.topicId, item.questionId, item.subQuestionId, mark);
    } else {
      this.store.setQuestionMark(item.topicId, item.questionId, mark);
    }
  }

  protected previous(): void {
    this.store.goToIndex(this.store.currentIndex() - 1);
  }

  protected nextOrFinish(): void {
    if (this.isLastItem()) {
      void this.router.navigate(['/results']);
    } else {
      this.store.goToIndex(this.store.currentIndex() + 1);
    }
  }
}
