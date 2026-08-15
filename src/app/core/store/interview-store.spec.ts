import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { InterviewStore } from './interview-store';
import { LocalStorageAdapter } from './local-storage-adapter';
import { StorageAdapter } from './storage-adapter';

describe('InterviewStore', () => {
  let store: InterviewStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: StorageAdapter, useClass: LocalStorageAdapter }],
    });
    store = TestBed.inject(InterviewStore);
  });

  function seedTopicWithQuestion(): { topicId: string; questionId: string } {
    store.addTopic('React');
    const topicId = store.topics()[0].id;
    store.addQuestion(topicId, 'Explain closures');
    const questionId = store.topics()[0].questions[0].id;
    return { topicId, questionId };
  }

  it('adds a topic', () => {
    store.addTopic('React');
    expect(store.topics()[0].name).toBe('React');
  });

  it('reorders topics and persists the new order', () => {
    store.addTopic('React');
    store.addTopic('Angular');
    store.addTopic('CSS');

    store.reorderTopic(2, 0);

    expect(store.topics().map((t) => t.name)).toEqual(['CSS', 'React', 'Angular']);
    const raw = localStorage.getItem('iqm.topics');
    expect(JSON.parse(raw!).map((t: { name: string }) => t.name)).toEqual([
      'CSS',
      'React',
      'Angular',
    ]);
  });

  it('persists topics through the storage adapter', async () => {
    seedTopicWithQuestion();
    const raw = localStorage.getItem('iqm.topics');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)[0].questions[0].text).toBe('Explain closures');
  });

  it('marking a sub-question clears the parent mark, clearing them all restores scoring', () => {
    const { topicId, questionId } = seedTopicWithQuestion();
    store.addSubQuestion(topicId, questionId, 'Weak one', '');
    const subId = store.topics()[0].questions[0].subQuestions[0].id;

    store.setQuestionMark(topicId, questionId, 4);
    store.setSubQuestionMark(topicId, questionId, subId, 2);
    expect(store.topics()[0].questions[0].mark).toBeNull();

    store.setSubQuestionMark(topicId, questionId, subId, null);
    store.setQuestionMark(topicId, questionId, 5);
    expect(store.topics()[0].questions[0].mark).toBe(5);
  });

  it('restartInterview resets the session and clears marks', () => {
    const { topicId, questionId } = seedTopicWithQuestion();
    store.setQuestionMark(topicId, questionId, 3);
    store.startInterview();

    store.restartInterview();

    expect(store.session().started).toBe(false);
    expect(store.session().index).toBe(0);
    expect(store.topics()[0].questions[0].mark).toBeNull();
  });

  it('deleting a topic drops its questions', () => {
    const { topicId } = seedTopicWithQuestion();
    store.deleteTopic(topicId);
    expect(store.topics()).toEqual([]);
  });
});
