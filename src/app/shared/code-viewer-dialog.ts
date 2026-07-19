import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface CodeViewerDialogData {
  questionText: string;
  code: string;
}

/** Read-only view of a question's code snippet with a copy-to-clipboard button. */
@Component({
  selector: 'app-code-viewer-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Code snippet</h2>
    <mat-dialog-content>
      <div class="question-text">{{ data.questionText }}</div>
      <pre class="code-block">{{ data.code }}</pre>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton (click)="copy()">
        <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
        {{ copied() ? 'Copied' : 'Copy' }}
      </button>
      <button matButton="filled" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .question-text {
      margin-bottom: 12px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13.5px;
    }

    .code-block {
      margin: 0;
      padding: 14px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 10px;
      background: var(--mat-sys-surface-container);
      font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      tab-size: 2;
      overflow-x: auto;
    }
  `,
})
export class CodeViewerDialog {
  protected readonly data = inject<CodeViewerDialogData>(MAT_DIALOG_DATA);

  protected readonly copied = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  protected copy(): void {
    void navigator.clipboard.writeText(this.data.code).then(() => {
      this.copied.set(true);
      if (this.copiedTimer !== null) {
        clearTimeout(this.copiedTimer);
      }
      this.copiedTimer = setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
