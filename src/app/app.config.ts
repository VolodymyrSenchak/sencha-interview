import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { LocalStorageAdapter } from './storage/local-storage-adapter';
import { StorageAdapter } from './storage/storage-adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Swap LocalStorageAdapter for a backend-API implementation later without touching the app.
    { provide: StorageAdapter, useClass: LocalStorageAdapter },
  ],
};
