import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { InterviewStore } from '../interview-store';
import { Question, SubQuestion, Topic } from '../models';
import { exportTopicsPdf } from '../pdf-export';

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
    FormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './manage.html',
  styleUrl: './manage.scss',
})
export class Manage {
  protected readonly store = inject(InterviewStore);

  protected newTopicName = '';

  // Only one inline add-form is open at a time.
  protected readonly addForm = signal<AddForm | null>(null);
  protected readonly editing = signal<EditState | null>(null);

  protected itemCountLabel(topic: Topic): string {
    const count =
      topic.questions.length + topic.questions.reduce((sum, q) => sum + q.subQuestions.length, 0);
    return count === 1 ? '1 item' : `${count} items`;
  }

  protected exportPdf(): void {
    void exportTopicsPdf(this.store.topics());
  }

  protected addTopic(): void {
    this.store.addTopic(this.newTopicName);
    this.newTopicName = '';
  }

  protected dropTopic(event: CdkDragDrop<Topic[]>): void {
    this.store.reorderTopic(event.previousIndex, event.currentIndex);
  }

  protected deleteTopic(topic: Topic): void {
    if (confirm(`Delete topic "${topic.name}" and all its questions?`)) {
      this.store.deleteTopic(topic.id);
    }
  }

  protected deleteQuestion(topicId: string, question: Question): void {
    if (confirm(`Delete question "${question.text}"?`)) {
      this.store.deleteQuestion(topicId, question.id);
    }
  }

  protected deleteSubQuestion(topicId: string, questionId: string, sub: SubQuestion): void {
    if (confirm(`Delete sub-question "${sub.text}"?`)) {
      this.store.deleteSubQuestion(topicId, questionId, sub.id);
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
      this.store.addQuestion(form.topicId, form.text);
    } else if (form.questionId) {
      this.store.addSubQuestion(form.topicId, form.questionId, form.text, form.description);
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
      this.store.renameTopic(edit.id, edit.text);
    } else if (edit.kind === 'question') {
      this.store.updateQuestionText(topicId, edit.id, edit.text);
    } else if (questionId) {
      this.store.updateSubQuestion(topicId, questionId, edit.id, edit.text, edit.description);
    }
    this.editing.set(null);
  }

  protected cancelEdit(): void {
    this.editing.set(null);
  }
}
