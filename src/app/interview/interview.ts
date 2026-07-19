import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { InterviewStore } from '../interview-store';
import { Question, Topic } from '../models';
import { CodeViewerDialog, CodeViewerDialogData } from '../shared/code-viewer-dialog';
import { MarkButtons } from '../shared/mark-buttons';

@Component({
  selector: 'app-interview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
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
  private readonly dialog = inject(MatDialog);

  protected readonly hasAnyQuestions = computed(() =>
    this.store.topics().some((t) => t.questions.length > 0),
  );

  protected readonly selectedTopics = computed(() => {
    const selected = new Set(this.store.session().selectedTopicIds);
    return this.store.topics().filter((t) => selected.has(t.id) && t.questions.length > 0);
  });

  protected readonly scoredCount = computed(
    () => this.store.flatItems().filter((item) => item.mark !== null).length,
  );

  protected readonly progressPercent = computed(() => {
    const total = this.store.flatItems().length;
    return total === 0 ? 0 : (this.scoredCount() / total) * 100;
  });

  protected questionCountLabel(topic: Topic): string {
    const count =
      topic.questions.length + topic.questions.reduce((sum, q) => sum + q.subQuestions.length, 0);
    return `${count} q`;
  }

  protected hasSubQuestions(question: Question): boolean {
    return question.subQuestions.length > 0;
  }

  protected hasCode(question: Question): boolean {
    return !!question.code?.trim();
  }

  protected openCode(question: Question): void {
    this.dialog.open<CodeViewerDialog, CodeViewerDialogData>(CodeViewerDialog, {
      width: '680px',
      data: { questionText: question.text, code: question.code ?? '' },
    });
  }

  protected isSelected(topicId: string): boolean {
    return this.store.session().selectedTopicIds.includes(topicId);
  }

  protected finish(): void {
    void this.router.navigate(['/results']);
  }
}
