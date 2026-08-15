import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth-interceptor';
import { LocalStorageAdapter, StorageAdapter } from '@core/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Local storage keeps the interview session and the offline copy of the
    // questions; signed-in users additionally sync questions with the API.
    { provide: StorageAdapter, useClass: LocalStorageAdapter },
  ],
};
