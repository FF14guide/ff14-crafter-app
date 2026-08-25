/**
 * Safe JSON and Query Parameter Utility
 * Protects against truncated strings, JSON syntax errors, and malformed TRPC responses.
 */

export function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr || typeof jsonStr !== 'string') {
    return fallback;
  }

  const trimmed = jsonStr.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    console.warn('[JSON Safe Parser] Failed standard JSON.parse, attempting repair...', error);
    
    // Attempt common repairs (e.g. unterminated strings, missing closing braces/brackets)
    try {
      let repaired = trimmed;
      
      // If ends with unclosed quote, close it
      const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repaired += '"';
      }

      // Check open vs closed brackets/braces
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        repaired += '}'.repeat(openBraces - closeBraces);
      }

      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        repaired += ']'.repeat(openBrackets - closeBrackets);
      }

      return JSON.parse(repaired) as T;
    } catch (repairError) {
      console.error('[JSON Safe Parser] Repair attempt also failed, returning safe fallback:', repairError);
      return fallback;
    }
  }
}

/**
 * Parses query params safely without throwing
 */
export function getSafeUrlParams(): { purpose?: string; itemId?: string; job?: string; patch?: string; tab?: string } {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return {
      purpose: params.get('purpose') || undefined,
      itemId: params.get('itemId') || undefined,
      job: params.get('job') || undefined,
      patch: params.get('patch') || undefined,
      tab: params.get('tab') || undefined,
    };
  } catch (err) {
    console.warn('[URL Params] Failed to parse URL search params, returning default empty:', err);
    return {};
  }
}

export function updateUrlQueryParam(key: string, value?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    console.warn('Could not update URL history:', e);
  }
}

/**
 * Pushes a *new* browser history entry (unlike updateUrlQueryParam, which
 * only rewrites the current one) so the browser's Back/Forward buttons can
 * navigate between in-app states instead of leaving the site entirely.
 * Pass `null`/`undefined` for a param to remove it from the URL.
 */
export function pushUrlState(params: Record<string, string | null | undefined>) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    }
    window.history.pushState({ ...params }, '', url.toString());
  } catch (e) {
    console.warn('Could not push URL history:', e);
  }
}
