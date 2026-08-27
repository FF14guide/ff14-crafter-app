// Builds links to the OFFICIAL Square Enix Lodestone item page
// (https://na.finalfantasyxiv.com/lodestone/playguide/db/item/{hash}/),
// which uses an opaque hash in its URL rather than the plain numeric itemId
// used everywhere else in this app. The itemId -> hash mapping is derived
// from the community-maintained ffxiv-lodestone-item-id project (line N of
// its data file = itemId N), lazy-loaded on first use.

let mapPromise: Promise<Record<number, string>> | null = null;

async function loadMap(): Promise<Record<number, string>> {
  if (!mapPromise) {
    mapPromise = import('../data/lodestoneItemIds.json').then((mod) => (mod.default || mod) as unknown as Record<number, string>);
  }
  return mapPromise;
}

/** Region subdomain for the Lodestone item page. 'jp' matches the app's Japanese UI. */
const LODESTONE_REGION = 'jp';

/** Loads (and caches) the full itemId -> Lodestone hash map, for components
 * that want to load it once and then do synchronous per-item lookups. */
export async function loadLodestoneMap(): Promise<Record<number, string>> {
  return loadMap();
}

/** Builds the Lodestone item page URL from an already-resolved hash. */
export function buildLodestoneUrlFromHash(hash: string): string {
  return `https://${LODESTONE_REGION}.finalfantasyxiv.com/lodestone/playguide/db/item/${hash}/`;
}

/**
 * Resolves the official Lodestone item page URL for an itemId. Returns null
 * if this itemId has no known Lodestone hash (very rare/new items not yet
 * covered by the community mapping) -- callers should fall back to another
 * link (e.g. Garland Tools) or just not render a link in that case.
 */
export async function getLodestoneItemUrl(itemId: number): Promise<string | null> {
  const map = await loadMap();
  const hash = map[itemId];
  if (!hash) return null;
  return buildLodestoneUrlFromHash(hash);
}
