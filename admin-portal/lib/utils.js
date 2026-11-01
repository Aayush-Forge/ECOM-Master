import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from 'sonner';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getAuthToken() {
  if (typeof window === 'undefined') return '';
  try {
    let raw = localStorage.getItem('auth_session');
    if (!raw) {
      const match = document.cookie.match(/(?:^|;\s*)sd_auth_session=([^;]+)/);
      if (match) {
        try {
          raw = decodeURIComponent(match[1]);
        } catch {}
      }
    }
    if (!raw) return '';
    const session = JSON.parse(raw);
    return session.access_token || session.token || '';
  } catch {
    return '';
  }
}

export function openAuthenticatedUrl(baseUrl) {
  if (typeof window === 'undefined') return;
  const token = getAuthToken();
  if (!token) {
    window.open(baseUrl, '_blank');
    return;
  }
  const separator = baseUrl.includes('?') ? '&' : '?';
  const fullUrl = `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  window.open(fullUrl, '_blank');
}

/**
 * Opens document view in a new tab with automatic native print / Save as PDF prompt.
 * Bypasses fragile raster canvas tools to deliver vector-sharp, single-page A4 PDFs.
 */
export function downloadAuthenticatedDocument(baseUrl) {
  if (typeof window === 'undefined') return;
  const separator = baseUrl.includes('?') ? '&' : '?';
  const fullUrl = `${baseUrl}${separator}print=true`;
  openAuthenticatedUrl(fullUrl);
}
