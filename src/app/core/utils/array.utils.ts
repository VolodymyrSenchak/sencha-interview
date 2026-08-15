export function toggleInSet<T>(ids: ReadonlySet<T>, id: T): ReadonlySet<T> {
  return setInSet(ids, id, ids.has(id) ? 'remove' : 'add');
}

export function setInSet<T>(
  ids: ReadonlySet<T>,
  id: T,
  operation: 'add' | 'remove',
): ReadonlySet<T> {
  if (ids.has(id) === (operation === 'add')) {
    return ids;
  }
  const next = new Set(ids);
  if (operation === 'add') {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}
