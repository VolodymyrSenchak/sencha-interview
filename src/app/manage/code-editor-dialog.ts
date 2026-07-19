import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface CodeEditorDialogData {
  questionText: string;
  code: string;
}

/** Closes with the edited code string on Save, or undefined on Cancel. */
@Component({
  selector: 'app-code-editor-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Code snippet</h2>
    <mat-dialog-content>
      <div class="question-text">{{ data.questionText }}</div>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="code-field">
        <mat-label>Code</mat-label>
        <textarea
          matInput
          rows="14"
          spellcheck="false"
          [(ngModel)]="code"
          (keydown.tab)="insertTab($event)"
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Cancel</button>
      <button matButton="filled" [mat-dialog-close]="code">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    .question-text {
      margin-bottom: 12px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13.5px;
    }

    .code-field {
      width: 100%;

      textarea {
        font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre;
        tab-size: 2;
      }
    }
  `,
})
export class CodeEditorDialog {
  protected readonly data = inject<CodeEditorDialogData>(MAT_DIALOG_DATA);

  protected code = this.data.code;

  /** Keep Tab inside the editor as indentation instead of moving focus. */
  protected insertTab(event: Event): void {
    event.preventDefault();
    const textarea = event.target as HTMLTextAreaElement;
    const { selectionStart, selectionEnd, value } = textarea;
    textarea.value = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
    textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
    this.code = textarea.value;
  }
}
