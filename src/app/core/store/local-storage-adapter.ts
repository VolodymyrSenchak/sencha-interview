import { Injectable } from '@angular/core';
import { StorageAdapter } from './storage-adapter';

@Injectable()
export class LocalStorageAdapter extends StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
