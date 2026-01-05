import { env } from './env';

function stripTrailingSlash(s: string) {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

export function buildWebUrl(path: string) {
  const base = env.webBaseUrl?.trim() ?? '';
  if (!base) return '';

  const [baseNoQuery, query] = base.split('?');
  const normalizedBase = stripTrailingSlash(baseNoQuery);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBase}${normalizedPath}`;
  return query ? `${url}?${query}` : url;
}

