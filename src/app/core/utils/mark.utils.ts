export function isMarkStrong(mark: number | null | undefined): boolean {
  return mark !== null && mark !== undefined && mark >= 3;
}

export function isMarkWeak(mark: number | null | undefined): boolean {
  return mark === 1 || mark === 2;
}
