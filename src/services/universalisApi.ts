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

/**
 * Given a World name, returns the name of the Data Center it belongs to.
 * Returns undefined if the input is already a DC name or unrecognized.
 */
function resolveDataCenterForWorld(worldOrDc: string): string | undefined {
  const dc = DATA_CENTERS.find((d) => d.worlds.includes(worldOrDc));
  return dc?.name;
}

function createFallbackItem(
  itemId: number,
  worldOrDc: string,
  defaultFallbackPrice = 5000,
  reason: string = 'マーケット情報を取得できませんでした（通信エラー、またはこのワールドに出品がありません）'
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
    regularSaleVelocity: 0,
    lastUploadTime: 0,
    listingsCount: 0,
    isEstimate: true,
    estimateReason: reason,
    // No fabricated sales here — inventing buyer names/timestamps that look
    // like real Universalis transactions is misleading. When we have no real
    // data, we show no history rather than a fake one.
    recentHistory: [],
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
  let nqIsEstimate = false;
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
    // No real NQ price signal anywhere in the response — this number is a guess.
    minNQ = defaultFallbackPrice;
    nqIsEstimate = true;
  }

  // Lowest HQ price
  let minHQ = 0;
  let hqIsEstimate = false;
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
    // No real HQ price signal — derive a rough estimate from NQ (or the
    // fallback price) rather than leave it at 0, but flag it as a guess.
    minHQ = Math.round(minNQ > 0 ? minNQ * 1.3 : defaultFallbackPrice * 1.35);
    hqIsEstimate = true;
  }

  const avgNQ = (raw.averagePriceNQ && raw.averagePriceNQ > 0) ? raw.averagePriceNQ : minNQ;
  const avgHQ = (raw.averagePriceHQ && raw.averagePriceHQ > 0) ? raw.averagePriceHQ : minHQ;
  const currentAvg = raw.currentAveragePrice || (hqListings.length > 0 ? avgHQ : avgNQ);

  const isEstimate = nqIsEstimate || hqIsEstimate || listings.length === 0;

  return {
    itemId,
    worldName: raw.worldName || worldOrDc,
    dcName: raw.dcName || worldOrDc,
    minPriceNQ: minNQ,
    minPriceHQ: minHQ,
    averagePriceNQ: Math.round(avgNQ),
    averagePriceHQ: Math.round(avgHQ),
    currentAveragePrice: Math.round(currentAvg),
    regularSaleVelocity: typeof raw.regularSaleVelocity === 'number' ? raw.regularSaleVelocity : 0,
    lastUploadTime: raw.lastUploadTime || 0,
    listingsCount: listings.length,
    isEstimate,
    estimateReason: isEstimate
      ? 'このワールド/DCでは出品または取引履歴が確認できなかったため、価格の一部は概算です'
      : undefined,
    // Only ever reflects sales Universalis actually reported. If the person's
    // name wasn't included in the response we simply omit it — we never
    // invent a placeholder that could be mistaken for a real buyer.
    recentHistory: (raw.recentHistory || []).map((h: any) => ({
      hq: !!h.hq,
      pricePerUnit: h.pricePerUnit,
      quantity: h.quantity,
      timestamp: (h.timestamp > 100000000000 ? h.timestamp : h.timestamp * 1000) || Date.now(),
      buyerName: h.buyerName || undefined,
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

  let failureReason = 'マーケット情報を取得できませんでした（通信エラー、またはこのワールドに出品がありません）';

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

        // If this specific World had no real listings, try the whole Data
        // Center before giving up — niche/gathered materials are often not
        // listed on any one server but do have listings somewhere in the DC.
        const noListingsOnWorld = itemData.isEstimate && (!raw.listings || raw.listings.length === 0);
        const dcName = resolveDataCenterForWorld(worldOrDc);
        if (noListingsOnWorld && dcName && dcName !== worldOrDc) {
          const dcResult = await fetchUniversalisPrice(itemId, dcName, defaultFallbackPrice);
          if (!dcResult.isEstimate) {
            const dcWideData: UniversalisItemData = { ...dcResult, isDcWide: true };
            memoryCache.set(cacheKey, { data: dcWideData, timestamp: Date.now() });
            return dcWideData;
          }
        }

        memoryCache.set(cacheKey, { data: itemData, timestamp: Date.now() });
        return itemData;
      }
      failureReason = 'Universalisからの応答を解析できませんでした';
    } else {
      failureReason = `Universalis APIエラー (HTTP ${res.status})`;
    }
  } catch (err) {
    console.warn(`[Universalis] Failed to fetch item ${itemId} on ${worldOrDc}:`, err);
    failureReason = 'Universalisへの通信に失敗しました（ネットワークエラー）';
  }

  const fallbackData = createFallbackItem(itemId, worldOrDc, defaultFallbackPrice, failureReason);
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

  let batchFailureReason = 'マーケット情報を取得できませんでした（通信エラー、またはこのワールドに出品がありません）';

  // Universalis's multi-item endpoint has an undocumented but observed limit
  // on how many item IDs can be queried in one request. Sending too many at
  // once can cause the server to return an error response without CORS
  // headers, which browsers then surface as an opaque "blocked by CORS
  // policy" failure rather than the real cause. Chunking keeps every
  // individual request comfortably under that limit.
  const CHUNK_SIZE = 90;
  const chunks: number[][] = [];
  for (let i = 0; i < idsToFetch.length; i += CHUNK_SIZE) {
    chunks.push(idsToFetch.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunkIds) => {
      try {
        const idParam = chunkIds.join(',');
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
              for (const id of chunkIds) {
                const itemRaw = raw.items[id.toString()] || raw.items[id];
                const fallbackPrice = fallbackPrices[id] || 3000;
                const parsed = itemRaw
                  ? parseUniversalisItem(itemRaw, id, worldOrDc, fallbackPrice)
                  : createFallbackItem(id, worldOrDc, fallbackPrice, 'このワールド/DCではこのアイテムの出品が見つかりませんでした');
                results[id] = parsed;
                memoryCache.set(`${worldOrDc}_${id}`, { data: parsed, timestamp: Date.now() });
              }
            } else if (raw.itemID || raw.itemId) {
              // Single item returned if only 1 was queried
              const targetId = raw.itemID || raw.itemId || chunkIds[0];
              const parsed = parseUniversalisItem(raw, targetId, worldOrDc, fallbackPrices[targetId] || 3000);
              results[targetId] = parsed;
              memoryCache.set(`${worldOrDc}_${targetId}`, { data: parsed, timestamp: Date.now() });
            }
          } else {
            batchFailureReason = 'Universalisからの応答を解析できませんでした';
          }
        } else {
          batchFailureReason = `Universalis APIエラー (HTTP ${res.status})`;
        }
      } catch (err) {
        console.warn(`[Universalis] Batch fetch failed on ${worldOrDc} for [${chunkIds.join(',')}]:`, err);
        batchFailureReason = 'Universalisへの通信に失敗しました（ネットワークエラー）';
      }
    })
  );

  // Populate any missing with fallback
  for (const id of idsToFetch) {
    if (!results[id]) {
      const fallbackData = createFallbackItem(id, worldOrDc, fallbackPrices[id] || 3000, batchFailureReason);
      results[id] = fallbackData;
      memoryCache.set(`${worldOrDc}_${id}`, { data: fallbackData, timestamp: Date.now() });
    }
  }

  // For any items that had zero real listings on the selected World, retry
  // them as a single extra batch request against the whole Data Center
  // before falling back to a guessed price.
  const dcName = resolveDataCenterForWorld(worldOrDc);
  if (dcName && dcName !== worldOrDc) {
    const zeroListingIds = idsToFetch.filter((id) => {
      const r = results[id];
      return r && r.isEstimate && r.listingsCount === 0;
    });

    if (zeroListingIds.length > 0) {
      try {
        const dcResults = await fetchUniversalisMultiPrices(
          zeroListingIds,
          dcName,
          Object.fromEntries(zeroListingIds.map((id) => [id, fallbackPrices[id] || 3000]))
        );
        for (const id of zeroListingIds) {
          const dcData = dcResults[id];
          if (dcData && !dcData.isEstimate) {
            const dcWideData: UniversalisItemData = { ...dcData, isDcWide: true };
            results[id] = dcWideData;
            memoryCache.set(`${worldOrDc}_${id}`, { data: dcWideData, timestamp: Date.now() });
          }
        }
      } catch (err) {
        console.warn(`[Universalis] DC-wide retry failed for [${zeroListingIds.join(',')}] on ${dcName}:`, err);
      }
    }
  }

  return results;
}
