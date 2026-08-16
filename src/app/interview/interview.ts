import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { InterviewStore } from '@core/store';
import { Question, Topic } from '@core/models';
import { CodeViewerDialog, CodeViewerDialogData } from '../shared/code-viewer-dialog';
import { CommentsDialog, CommentsDialogData } from '../shared/comments-dialog';
import { MarkButtons } from '../shared/mark-buttons';

@Component({
  selector: 'app-interview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule, MatIconModule, MarkButtons],
  templateUrl: './interview.html',
  styleUrl: './interview.scss',
})
export class Interview {
  protected readonly store = inject(InterviewStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly topicsWithQuestions = computed(() =>
    this.store.topicsWithMarks().filter((t) => t.questions.length > 0),
  );

  protected readonly hasComments = computed(() => !!this.store.sessionStore.comments().trim());

  protected questionCountLabel(topic: Topic): string {
    const count =
      topic.questions.length + topic.questions.reduce((sum, q) => sum + q.subQuestions.length, 0);
    return `${count} q`;
  }

  /** A question is scored through its sub-questions once any of them is marked. */
  protected hasMarkedSubQuestions(question: Question): boolean {
    return question.subQuestions.some((sub) => sub.mark !== null);
  }

  protected hasCode(question: Question): boolean {
    return !!question.code?.trim();
  }

  protected openCode(question: Question): void {
    this.dialog.open<CodeViewerDialog, CodeViewerDialogData>(CodeViewerDialog, {
      width: '700px',
      data: { questionText: question.text, code: question.code ?? '' },
    });
  }

  protected openComments(): void {
    this.dialog
      .open<CommentsDialog, CommentsDialogData, string | undefined>(CommentsDialog, {
        width: '560px',
        data: { comments: this.store.sessionStore.comments() },
      })
      .afterClosed()
      .subscribe((comments) => {
        if (comments !== undefined) {
          this.store.sessionStore.setComments(comments);
        }
      });
  }

  protected finish(): void {
    void this.router.navigate(['/results']);
  }
}
