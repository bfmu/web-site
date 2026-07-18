const VISITOR_ID_KEY = 'bfmu_visitor_id';

/**
 * ID anónimo persistente por navegador, usado para deduplicar likes
 * sin requerir cuenta de usuario.
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}
