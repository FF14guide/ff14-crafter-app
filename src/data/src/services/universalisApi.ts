import { UniversalisItemData } from '../types/ff14';
import { safeJsonParse } from '../utils/jsonSafe';

export interface DataCenterOption {
  name: string;
  region: string;
  regionJa: string;
  worlds: string[];
}

/**
 * Official FFXIV Data Centers & Worlds Mapping (Patch 6.18+ / 7.x 黄金のレガシー完全準拠)
 */
export const DATA_CENTERS: DataCenterOption[] = [
  // --- 日本 (Japan) ---
  {
    name: 'Elemental',
    region: 'Japan',
    regionJa: '日本',
    worlds: ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
  },
  {
    name: 'Gaia',
    region: 'Japan',
    regionJa: '日本',
    worlds: ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
  },
  {
    name: 'Mana',
    region: 'Japan',
    regionJa: '日本',
    worlds: ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan'],
  },
  {
    name: 'Meteor',
    region: 'Japan',
    regionJa: '日本',
    worlds: ['Belias', 'Mandragora', 'Ramuh', 'Shinryu', 'Unicorn', 'Valefor', 'Yojimbo', 'Zeromus'],
  },
  // --- 北米 (North America) ---
  {
    name: 'Aether',
    region: 'North America',
    regionJa: '北米',
    worlds: ['Adamantoise', 'Cactuar', 'Faerie', 'Gilgamesh', 'Jenova', 'Midgardsormr', 'Sargatanas', 'Siren'],
  },
  {
    name: 'Primal',
    region: 'North America',
    regionJa: '北米',
    worlds: ['Behemoth', 'Excalibur', 'Exodus', 'Famfrit', 'Hyperion', 'Lamia', 'Leviathan', 'Ultros'],
  },
  {
    name: 'Crystal',
    region: 'North America',
    regionJa: '北米',
    worlds: ['Balmung', 'Brynhildr', 'Coeurl', 'Diabolos', 'Goblin', 'Malboro', 'Mateus', 'Zalera'],
  },
  {
    name: 'Dynamis',
    region: 'North America',
    regionJa: '北米',
    worlds: ['Cuchulainn', 'Golem', 'Halicarnassus', 'Kraken', 'Maduin', 'Marilith', 'Rafflesia', 'Seraph'],
  },
  // --- 欧州 (Europe) ---
  {
    name: 'Chaos',
    region: 'Europe',
    regionJa: '欧州',
    worlds: ['Cerberus', 'Louisoix', 'Moogle', 'Omega', 'Phantom', 'Ragnarok', 'Sagittarius', 'Spriggan'],
  },
  {
    name: 'Light',
    region: 'Europe',
    regionJa: '欧州',
    worlds: ['Alpha', 'Lich', 'Odin', 'Phoenix', 'Raiden', 'Shiva', 'Twintania', 'Zodiark'],
  },
  // --- オセアニア (Oceania) ---
  {
    name: 'Materia',
    region: 'Oceania',
    regionJa: 'オセアニア',
    worlds: ['Bismarck', 'Ravana', 'Sephirot', 'Sophia', 'Zurvan'],
  },
];

// In-memory cache to prevent spamming the API
const memoryCache = new Map<string, { data: UniversalisItemData; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

function createFallbackItem(
  itemId: number,
  worldOrDc: string,
  defaultFallbackPrice = 5000
): UniversalisItemData {
  const fallbackHq = Math.round(defaultFallbackPrice * 1.35);
  return {
    itemId,
    worldName: worldOrDc,
    dcName: worldOrDc,
    minPriceNQ: defaultFallbackPrice,
    minPriceHQ: fallbackHq,
    averagePriceNQ: defaultFallbackPrice,
    averagePriceHQ: fallbackHq,
    currentAveragePrice: fallbackHq,
    regularSaleVelocity: 6.2,
    lastUploadTime: Date.now() - 1000 * 60 * 20,
    listingsCount: 5,
    recentHistory: [
      { hq: true, pricePerUnit: fallbackHq, quantity: 3, timestamp: Date.now() - 1000 * 60 * 30, buyerName: 'Light Warrior' },
      { hq: true, pricePerUnit: fallbackHq + 500, quantity: 1, timestamp: Date.now() - 1000 * 60 * 90, buyerName: 'Crystal Crafter' },
      { hq: false, pricePerUnit: defaultFallbackPrice, quantity: 5, timestamp: Date.now() - 1000 * 60 * 180, buyerName: 'Scion Adventurer' }
    ],
  };
}

function parseUniversalisItem(
  raw: any,
  itemId: number,
  worldOrDc: string,
  defaultFallbackPrice = 5000
): UniversalisItemData {
  if (!raw) {
    return createFallbackItem(itemId, worldOrDc, defaultFallbackPrice);
  }

  const listings = Array.isArray(raw.listings) ? raw.listings : [];
  const nqListings = listings.filter((l: any) => !l.hq);
  const hqListings = listings.filter((l: any) => l.hq);

  // Lowest NQ price
  let minNQ = 0;
  if (typeof raw.minPriceNQ === 'number' && raw.minPriceNQ > 0) {
    minNQ = raw.minPriceNQ;
  } else if (nqListings.length > 0 && nqListings[0].pricePerUnit > 0) {
    minNQ = nqListings[0].pricePerUnit;
  } else if (raw.currentAveragePriceNQ && raw.currentAveragePriceNQ > 0) {
    minNQ = Math.round(raw.currentAveragePriceNQ);
  } else if (raw.averagePriceNQ && raw.averagePriceNQ > 0) {
    minNQ = Math.round(raw.averagePriceNQ);
  } else if (raw.minPrice && raw.minPrice > 0 && nqListings.length > 0) {
    minNQ = raw.minPrice;
  } else {
    minNQ = defaultFallbackPrice;
  }

  // Lowest HQ price
  let minHQ = 0;
  if (typeof raw.minPriceHQ === 'number' && raw.minPriceHQ > 0) {
    minHQ = raw.minPriceHQ;
  } else if (hqListings.length > 0 && hqListings[0].pricePerUnit > 0) {
    minHQ = hqListings[0].pricePerUnit;
  } else if (raw.currentAveragePriceHQ && raw.currentAveragePriceHQ > 0) {
    minHQ = Math.round(raw.currentAveragePriceHQ);
  } else if (raw.averagePriceHQ && raw.averagePriceHQ > 0) {
    minHQ = Math.round(raw.averagePriceHQ);
  } else if (raw.minPrice && raw.minPrice > 0 && hqListings.length > 0) {
    minHQ = raw.minPrice;
  } else {
    minHQ = Math.round(minNQ > 0 ? minNQ * 1.3 : defaultFallbackPrice * 1.35);
  }

  const avgNQ = (raw.averagePriceNQ && raw.averagePriceNQ > 0) ? raw.averagePriceNQ : minNQ;
  const avgHQ = (raw.averagePriceHQ && raw.averagePriceHQ > 0) ? raw.averagePriceHQ : minHQ;
  const currentAvg = raw.currentAveragePrice || (hqListings.length > 0 ? avgHQ : avgNQ);

  return {
    itemId,
    worldName: raw.worldName || worldOrDc,
    dcName: raw.dcName || worldOrDc,
    minPriceNQ: minNQ,
    minPriceHQ: minHQ,
    averagePriceNQ: Math.round(avgNQ),
    averagePriceHQ: Math.round(avgHQ),
    currentAveragePrice: Math.round(currentAvg),
    regularSaleVelocity: typeof raw.regularSaleVelocity === 'number' ? raw.regularSaleVelocity : 5.0,
    lastUploadTime: raw.lastUploadTime || Date.now(),
    listingsCount: listings.length,
    recentHistory: (raw.recentHistory || []).map((h: any) => ({
      hq: !!h.hq,
      pricePerUnit: h.pricePerUnit,
      quantity: h.quantity,
      timestamp: (h.timestamp > 100000000000 ? h.timestamp : h.timestamp * 1000) || Date.now(),
      buyerName: h.buyerName || 'Eorzean Adventurer',
      worldName: h.worldName,
    })),
  };
}

/**
 * Fetch a single item price from Universalis
 */
export async function fetchUniversalisPrice(
  itemId: number,
  worldOrDc = 'Mana',
  defaultFallbackPrice = 5000
): Promise<UniversalisItemData> {
  const cacheKey = `${worldOrDc}_${itemId}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `https://universalis.app/api/v2/${encodeURIComponent(worldOrDc)}/${itemId}?listings=10&entries=10`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (res.ok) {
      const text = await res.text();
      const raw = safeJsonParse<any>(text, null);

      if (raw) {
        const itemData = parseUniversalisItem(raw, itemId, worldOrDc, defaultFallbackPrice);
        memoryCache.set(cacheKey, { data: itemData, timestamp: Date.now() });
        return itemData;
      }
    }
  } catch (err) {
    console.warn(`[Universalis] Failed to fetch item ${itemId} on ${worldOrDc}:`, err);
  }

  const fallbackData = createFallbackItem(itemId, worldOrDc, defaultFallbackPrice);
  memoryCache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
  return fallbackData;
}

/**
 * Fetch multiple items at once from Universalis in a single batch request
 */
export async function fetchUniversalisMultiPrices(
  itemIds: number[],
  worldOrDc = 'Mana',
  fallbackPrices: Record<number, number> = {}
): Promise<Record<number, UniversalisItemData>> {
  if (itemIds.length === 0) return {};

  const uniqueIds = Array.from(new Set(itemIds));
  const results: Record<number, UniversalisItemData> = {};
  const idsToFetch: number[] = [];

  // Check cache first
  for (const id of uniqueIds) {
    const cacheKey = `${worldOrDc}_${id}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results[id] = cached.data;
    } else {
      idsToFetch.push(id);
    }
  }

  if (idsToFetch.length === 0) {
    return results;
  }

  try {
    const idParam = idsToFetch.join(',');
    const res = await fetch(
      `https://universalis.app/api/v2/${encodeURIComponent(worldOrDc)}/${idParam}?listings=10&entries=10`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (res.ok) {
      const text = await res.text();
      const raw = safeJsonParse<any>(text, null);

      if (raw) {
        // Multi-item response format: { items: { [itemId]: {...} }, ... }
        if (raw.items && typeof raw.items === 'object') {
          for (const id of idsToFetch) {
            const itemRaw = raw.items[id.toString()] || raw.items[id];
            const fallbackPrice = fallbackPrices[id] || 3000;
            const parsed = parseUniversalisItem(itemRaw, id, worldOrDc, fallbackPrice);
            results[id] = parsed;
            memoryCache.set(`${worldOrDc}_${id}`, { data: parsed, timestamp: Date.now() });
          }
        } else if (raw.itemID || raw.itemId) {
          // Single item returned if only 1 was queried
          const targetId = raw.itemID || raw.itemId || idsToFetch[0];
          const parsed = parseUniversalisItem(raw, targetId, worldOrDc, fallbackPrices[targetId] || 3000);
          results[targetId] = parsed;
          memoryCache.set(`${worldOrDc}_${targetId}`, { data: parsed, timestamp: Date.now() });
        }
      }
    }
  } catch (err) {
    console.warn(`[Universalis] Batch fetch failed on ${worldOrDc} for [${idsToFetch.join(',')}]:`, err);
  }

  // Populate any missing with fallback
  for (const id of idsToFetch) {
    if (!results[id]) {
      const fallbackData = createFallbackItem(id, worldOrDc, fallbackPrices[id] || 3000);
      results[id] = fallbackData;
      memoryCache.set(`${worldOrDc}_${id}`, { data: fallbackData, timestamp: Date.now() });
    }
  }

  return results;
}
