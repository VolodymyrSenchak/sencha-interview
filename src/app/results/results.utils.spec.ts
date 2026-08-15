import { Question, SubQuestion, Topic } from '@core/models';
import { toTopicResults, toWeakGroups } from './results.utils';

function sub(text: string, mark: number | null): SubQuestion {
  return { id: `sub-${text}`, text, description: '', mark };
}

function question(text: string, mark: number | null, subQuestions: SubQuestion[] = []): Question {
  return { id: `q-${text}`, text, mark, subQuestions };
}

function topic(name: string, questions: Question[]): Topic {
  return { id: `topic-${name}`, name, questions };
}

describe('results.utils', () => {
  it('buckets marks >2 as strong, 1-2 as weak, and omits unmarked and 0', () => {
    const topics = [
      topic('React', [
        question('Explain closures', null, [sub('Weak one', 2)]),
        question('Strong question', 4),
        question('Unmarked question', null),
        question('Zero question', 0),
      ]),
    ];

    const result = toTopicResults(topics)[0];

    expect(result.strong).toEqual([{ text: 'Strong question', subs: [] }]);
    expect(result.weak).toEqual([{ text: 'Explain closures', subs: ['Weak one'] }]);
  });

  it('groups the weak questions of every topic that has one', () => {
    const topics = [
      topic('React', [question('Explain closures', null, [sub('Weak one', 2)])]),
      topic('CSS', [question('Explain specificity', 5)]),
    ];

    expect(toWeakGroups(toTopicResults(topics))).toEqual([
      {
        topicId: 'topic-React',
        topicName: 'React',
        items: [{ text: 'Explain closures', subs: ['Weak one'] }],
      },
    ]);
  });
});
