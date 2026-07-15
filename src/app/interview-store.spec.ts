import { TestBed } from '@angular/core/testing';
import { InterviewStore } from './interview-store';
import { LocalStorageAdapter } from './storage/local-storage-adapter';
import { StorageAdapter } from './storage/storage-adapter';

describe('InterviewStore', () => {
  let store: InterviewStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: StorageAdapter, useClass: LocalStorageAdapter }],
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

  it('adds a topic pre-checked for the interview', () => {
    store.addTopic('React');
    const topic = store.topics()[0];
    expect(topic.name).toBe('React');
    expect(store.session().selectedTopicIds).toContain(topic.id);
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

  it('flattens questions and sub-questions of selected topics in walk order', () => {
    const { topicId, questionId } = seedTopicWithQuestion();
    store.addSubQuestion(topicId, questionId, 'What about loops?', 'var vs let');
    store.addQuestion(topicId, 'Explain the event loop');

    const items = store.flatItems();
    expect(items.map((i) => i.text)).toEqual([
      'Explain closures',
      'What about loops?',
      'Explain the event loop',
    ]);
    expect(items[1].parentText).toBe('Explain closures');
    expect(items[1].description).toBe('var vs let');
  });

  it('buckets marks >2 as strong, 1-2 as weak, and omits unmarked and 0', () => {
    const { topicId, questionId } = seedTopicWithQuestion();
    store.addSubQuestion(topicId, questionId, 'Weak one', '');
    store.addQuestion(topicId, 'Unmarked question');
    store.addQuestion(topicId, 'Zero question');

    const questions = store.topics()[0].questions;
    store.setQuestionMark(topicId, questions[0].id, 4);
    store.setSubQuestionMark(topicId, questions[0].id, questions[0].subQuestions[0].id, 2);
    store.setQuestionMark(topicId, questions[2].id, 0);

    const result = store.topicResults()[0];
    expect(result.strong).toEqual(['Explain closures']);
    expect(result.weak).toEqual([{ text: 'Explain closures', weakSubs: ['Weak one'] }]);
    expect(store.weakGroups()).toEqual([
      {
        topicId: store.topics()[0].id,
        topicName: 'React',
        items: [{ text: 'Explain closures', weakSubs: ['Weak one'] }],
      },
    ]);
  });

  it('restartInterview resets the session and pre-checks all topics but keeps marks', () => {
    const { topicId, questionId } = seedTopicWithQuestion();
    store.setQuestionMark(topicId, questionId, 3);
    store.setCandidateName('Jane');
    store.startInterview();

    store.restartInterview();

    expect(store.session().started).toBe(false);
    expect(store.session().candidateName).toBe('');
    expect(store.session().selectedTopicIds).toEqual([topicId]);
    expect(store.topics()[0].questions[0].mark).toBe(3);
  });

  it('deleting a topic removes it from the interview selection', () => {
    const { topicId } = seedTopicWithQuestion();
    store.deleteTopic(topicId);
    expect(store.topics()).toEqual([]);
    expect(store.session().selectedTopicIds).toEqual([]);
  });
});
