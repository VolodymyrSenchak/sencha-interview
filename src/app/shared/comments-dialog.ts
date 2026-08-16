import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface CommentsDialogData {
  comments: string;
}

/** Closes with the edited comments string on Save, or undefined on Cancel. */
@Component({
  selector: 'app-comments-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Comments</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="comments-field">
        <mat-label>Notes</mat-label>
        <textarea
          matInput
          cdkFocusInitial
          rows="12"
          placeholder="Anything worth remembering about this candidate…"
          [(ngModel)]="comments"
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Cancel</button>
      <button matButton="filled" [mat-dialog-close]="comments">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    .comments-field {
      width: 100%;

      textarea {
        font-size: 13.5px;
        line-height: 1.5;
      }
    }
  `,
})
export class CommentsDialog {
  protected readonly data = inject<CommentsDialogData>(MAT_DIALOG_DATA);

  protected comments = this.data.comments;
}
