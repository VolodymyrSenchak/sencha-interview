import { Topic } from "@core/models";

/**
 * Comparable copy of the topic list. Marks are left out: they belong to the
 * interview session, not to the question list that goes to the cloud.
 */
export function serializeTopics(topics: readonly Topic[]): string {
  return JSON.stringify(topics, (key, value) => (key === 'mark' ? undefined : value));
}