import { moveItemInArray } from "@angular/cdk/drag-drop";
import { Injectable, signal } from "@angular/core";
import { Question, SubQuestion, Topic } from "@core/models/models";

function createId(): string {
  return crypto.randomUUID();
}

@Injectable({ providedIn: 'root' })
export class TopicsStore {
  readonly topics = signal<Topic[]>([]);

  addTopic(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const topic: Topic = { id: createId(), name: trimmed, questions: [] };
    this.topics.update((topics) => [...topics, topic]);
  }

  renameTopic(topicId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    this.topics.update((topics) =>
      topics.map((t) => (t.id === topicId ? { ...t, name: trimmed } : t)),
    );
  }

  reorderTopic(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) {
      return;
    }
    this.topics.update((topics) => {
      const next = [...topics];
      moveItemInArray(next, previousIndex, currentIndex);
      return next;
    });
  }

  deleteTopic(topicId: string): void {
    this.topics.update((topics) => topics.filter((t) => t.id !== topicId));
  }

  // --- Questions ---

  addQuestion(topicId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const question: Question = { id: createId(), text: trimmed, subQuestions: [] };
    this.updateTopic(topicId, (t) => ({ ...t, questions: [...t.questions, question] }));
  }

  updateQuestionText(topicId: string, questionId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.updateQuestion(topicId, questionId, (q) => ({ ...q, text: trimmed }));
  }

  reorderQuestion(topicId: string, previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) {
      return;
    }
    this.updateTopic(topicId, (t) => {
      const questions = [...t.questions];
      moveItemInArray(questions, previousIndex, currentIndex);
      return { ...t, questions };
    });
  }

  deleteQuestion(topicId: string, questionId: string): void {
    this.updateTopic(topicId, (t) => ({
      ...t,
      questions: t.questions.filter((q) => q.id !== questionId),
    }));
  }

  setQuestionCode(topicId: string, questionId: string, code: string): void {
    this.updateQuestion(topicId, questionId, (q) => ({ ...q, code }));
  }

  // --- Sub-questions ---

  addSubQuestion(topicId: string, questionId: string, text: string, description: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const sub: SubQuestion = {
      id: createId(),
      text: trimmed,
      description: description.trim(),
    };
    this.updateQuestion(topicId, questionId, (q) => ({
      ...q,
      subQuestions: [...q.subQuestions, sub],
    }));
  }

  updateSubQuestion(
    topicId: string,
    questionId: string,
    subQuestionId: string,
    text: string,
    description: string,
  ): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.updateSub(topicId, questionId, subQuestionId, (sub) => ({
      ...sub,
      text: trimmed,
      description: description.trim(),
    }));
  }

  deleteSubQuestion(topicId: string, questionId: string, subQuestionId: string): void {
    this.updateQuestion(topicId, questionId, (q) => ({
      ...q,
      subQuestions: q.subQuestions.filter((sub) => sub.id !== subQuestionId),
    }));
  }

  // --- Internal helpers ---

  private updateTopic(topicId: string, fn: (topic: Topic) => Topic): void {
    this.topics.update((topics) => topics.map((t) => (t.id === topicId ? fn(t) : t)));
  }

  private updateQuestion(
    topicId: string,
    questionId: string,
    fn: (question: Question) => Question,
  ): void {
    this.updateTopic(topicId, (t) => ({
      ...t,
      questions: t.questions.map((q) => (q.id === questionId ? fn(q) : q)),
    }));
  }

  private updateSub(
    topicId: string,
    questionId: string,
    subQuestionId: string,
    fn: (sub: SubQuestion) => SubQuestion,
  ): void {
    this.updateQuestion(topicId, questionId, (q) => ({
      ...q,
      subQuestions: q.subQuestions.map((sub) => (sub.id === subQuestionId ? fn(sub) : sub)),
    }));
  }
}
