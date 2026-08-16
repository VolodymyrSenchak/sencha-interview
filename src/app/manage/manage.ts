import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthStore } from '../auth/auth-store';
import { exportTopicsPdf, setInSet, toggleInSet } from '@core/utils';
import { InterviewStore } from '@core/store';
import { Question, SubQuestion, Topic } from '@core/models';
import { CodeEditorDialog, CodeEditorDialogData } from './code-editor-dialog';

interface AddForm {
  kind: 'question' | 'sub';
  topicId: string;
  questionId: string | null;
  text: string;
  description: string;
}

interface EditState {
  kind: 'topic' | 'question' | 'sub';
  id: string;
  text: string;
  description: string;
}

@Component({
  selector: 'app-manage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TextFieldModule,
  ],
  templateUrl: './manage.html',
  styleUrl: './manage.scss',
})
export class Manage {
  protected readonly store = inject(InterviewStore);
  protected readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  protected readonly topicsStore = this.store.topicsStore;

  protected newTopicName = '';

  // Only one inline add-form is open at a time.
  protected readonly addForm = signal<AddForm | null>(null);
  protected readonly editing = signal<EditState | null>(null);

  // Topics and questions are collapsed by default, so only expanded ids are tracked.
  private readonly expandedTopicIds = signal<ReadonlySet<string>>(new Set());
  private readonly expandedQuestionIds = signal<ReadonlySet<string>>(new Set());

  protected itemCountLabel(topic: Topic): string {
    const count =
      topic.questions.length + topic.questions.reduce((sum, q) => sum + q.subQuestions.length, 0);
    return count === 1 ? '1 item' : `${count} items`;
  }

  // --- Expand / collapse ---

  protected isTopicExpanded(topicId: string): boolean {
    return this.expandedTopicIds().has(topicId);
  }

  protected setTopicExpanded(topicId: string, expanded: boolean): void {
    this.expandedTopicIds.update((ids) => setInSet(ids, topicId, expanded ? 'add' : 'remove'));
  }

  protected isQuestionExpanded(questionId: string): boolean {
    return this.expandedQuestionIds().has(questionId);
  }

  protected toggleQuestionExpanded(questionId: string): void {
    this.expandedQuestionIds.update((ids) => toggleInSet(ids, questionId));
  }

  protected exportPdf(): void {
    void exportTopicsPdf(this.topicsStore.topics());
  }

  protected saveToCloud(): void {
    void this.store.saveToCloud();
  }

  protected reloadFromCloud(): void {
    void this.store.loadFromCloud();
  }

  protected addTopic(): void {
    this.topicsStore.addTopic(this.newTopicName);
    this.newTopicName = '';
  }

  protected dropTopic(event: CdkDragDrop<Topic[]>): void {
    this.topicsStore.reorderTopic(event.previousIndex, event.currentIndex);
  }

  protected dropQuestion(topicId: string, event: CdkDragDrop<Question[]>): void {
    this.topicsStore.reorderQuestion(topicId, event.previousIndex, event.currentIndex);
  }

  protected deleteTopic(topic: Topic): void {
    if (confirm(`Delete topic "${topic.name}" and all its questions?`)) {
      this.topicsStore.deleteTopic(topic.id);
    }
  }

  protected hasCode(question: Question): boolean {
    return !!question.code?.trim();
  }

  protected openCodeEditor(topicId: string, question: Question): void {
    const ref = this.dialog.open<CodeEditorDialog, CodeEditorDialogData, string>(CodeEditorDialog, {
      width: '680px',
      data: { questionText: question.text, code: question.code ?? '' },
    });
    ref.afterClosed().subscribe((code) => {
      if (code !== undefined) {
        this.topicsStore.setQuestionCode(topicId, question.id, code);
      }
    });
  }

  protected deleteQuestion(topicId: string, question: Question): void {
    if (confirm(`Delete question "${question.text}"?`)) {
      this.topicsStore.deleteQuestion(topicId, question.id);
    }
  }

  protected deleteSubQuestion(topicId: string, questionId: string, sub: SubQuestion): void {
    if (confirm(`Delete sub-question "${sub.text}"?`)) {
      this.topicsStore.deleteSubQuestion(topicId, questionId, sub.id);
    }
  }

  // --- Inline add forms ---

  protected openAddQuestion(topicId: string): void {
    this.addForm.set({ kind: 'question', topicId, questionId: null, text: '', description: '' });
  }

  protected openAddSub(topicId: string, questionId: string): void {
    this.addForm.set({ kind: 'sub', topicId, questionId, text: '', description: '' });
  }

  protected isAddQuestionOpen(topicId: string): boolean {
    const form = this.addForm();
    return form?.kind === 'question' && form.topicId === topicId;
  }

  protected isAddSubOpen(questionId: string): boolean {
    const form = this.addForm();
    return form?.kind === 'sub' && form.questionId === questionId;
  }

  protected submitAddForm(): void {
    const form = this.addForm();
    if (!form) {
      return;
    }
    if (form.kind === 'question') {
      this.topicsStore.addQuestion(form.topicId, form.text);
    } else if (form.questionId) {
      this.topicsStore.addSubQuestion(form.topicId, form.questionId, form.text, form.description);
    }
    this.addForm.set(null);
  }

  protected cancelAddForm(): void {
    this.addForm.set(null);
  }

  // --- Inline editing ---

  protected startEditTopic(topic: Topic): void {
    this.editing.set({ kind: 'topic', id: topic.id, text: topic.name, description: '' });
  }

  protected startEditQuestion(question: Question): void {
    this.editing.set({ kind: 'question', id: question.id, text: question.text, description: '' });
  }

  protected startEditSub(sub: SubQuestion): void {
    this.editing.set({ kind: 'sub', id: sub.id, text: sub.text, description: sub.description });
  }

  protected isEditing(kind: EditState['kind'], id: string): boolean {
    const edit = this.editing();
    return edit?.kind === kind && edit.id === id;
  }

  protected saveEdit(topicId: string, questionId: string | null = null): void {
    const edit = this.editing();
    if (!edit) {
      return;
    }
    if (edit.kind === 'topic') {
      this.topicsStore.renameTopic(edit.id, edit.text);
    } else if (edit.kind === 'question') {
      this.topicsStore.updateQuestionText(topicId, edit.id, edit.text);
    } else if (questionId) {
      this.topicsStore.updateSubQuestion(topicId, questionId, edit.id, edit.text, edit.description);
    }
    this.editing.set(null);
  }

  protected cancelEdit(): void {
    this.editing.set(null);
  }
}
