import { isMarkStrong, isMarkWeak } from '@core/utils';
import { ResultQuestion, Topic, TopicResult, TopicWeakGroup } from '@core/models';

/** Splits every topic's marked questions into its strong and weak columns. */
export function toTopicResults(topics: Topic[]): TopicResult[] {
  return topics.map((topic) => {
    const strong: ResultQuestion[] = [];
    const weak: ResultQuestion[] = [];
    for (const question of topic.questions) {
      // A question is listed when it or any of its sub-questions matches,
      // with the matching sub-questions grouped under it, e.g. Service Bus (TOPIC, QUEUE).
      const strongSubs = question.subQuestions
        .filter((sub) => isMarkStrong(sub.mark))
        .map((sub) => sub.text);
      if (isMarkStrong(question.mark) || strongSubs.length > 0) {
        strong.push({ text: question.text, subs: strongSubs });
      }
      const weakSubs = question.subQuestions
        .filter((sub) => isMarkWeak(sub.mark))
        .map((sub) => sub.text);
      if (isMarkWeak(question.mark) || weakSubs.length > 0) {
        weak.push({ text: question.text, subs: weakSubs });
      }
    }
    return { topicId: topic.id, topicName: topic.name, strong, weak };
  });
}

/** The weak column of every topic that has one, for the combined "All Weak Sides" card. */
export function toWeakGroups(results: TopicResult[]): TopicWeakGroup[] {
  return results
    .map(({ topicId, topicName, weak }) => ({ topicId, topicName, items: weak }))
    .filter((group) => group.items.length > 0);
}
