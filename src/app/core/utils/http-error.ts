import { HttpErrorResponse } from '@angular/common/http';

/**
 * Best-effort human message for a failed API call. The API forwards Supabase
 * errors as-is, so the body can be a string, `{ message }`, or - because `Error`
 * instances serialize without their message - only `{ name, code, status }`.
 */
export function httpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot reach the API. Check that it is running.';
    }
    const body = error.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object') {
      for (const key of ['message', 'error', 'msg', 'code', 'name']) {
        const value = (body as Record<string, unknown>)[key];
        if (typeof value === 'string' && value) {
          return value;
        }
      }
    }
    return fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
