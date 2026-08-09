import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthStore } from './auth-store';

/**
 * Attaches the access token to API calls and retries once with a refreshed
 * token when the API rejects it. The auth endpoints are skipped: they either
 * carry no token or are the refresh call itself.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiCall = req.url.startsWith(environment.apiBaseUrl);
  if (!isApiCall || req.url.startsWith(`${environment.apiBaseUrl}/auth/`)) {
    return next(req);
  }

  const auth = inject(AuthStore);
  const token = auth.accessToken();
  if (!token) {
    return next(req);
  }

  return next(withToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(auth.refresh()).pipe(
        switchMap((refreshed) =>
          refreshed ? next(withToken(req, refreshed)) : throwError(() => error),
        ),
      );
    }),
  );
};

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
