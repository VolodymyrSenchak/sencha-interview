/**
 * Async key/value storage abstraction. The app only talks to this interface,
 * so the LocalStorage implementation can later be swapped for a backend API
 * (provide a different implementation for this class in app.config.ts).
 */
export abstract class StorageAdapter {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T): Promise<void>;
  abstract remove(key: string): Promise<void>;
}
