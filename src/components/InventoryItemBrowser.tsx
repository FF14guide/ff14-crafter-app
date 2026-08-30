import React, { useState, useEffect, useMemo } from 'react';
import { InventorySyncData } from '../types/ff14';
import { CharacterGroup, loadCharacterGroups } from '../utils/inventoryStorage';
import { ItemType, ITEM_TYPE_LABELS, loadItemTypeMap, getItemType } from '../utils/itemTypeClassifier';
import { ItemIcon } from './common/ItemIcon';
import { Search, Boxes, Package, Loader2, Globe, Users, User, Archive, Shirt, Sparkles } from 'lucide-react';

interface InventoryItemBrowserProps {
  inventoryData: InventorySyncData | null;
  onOpenInventorySync: () => void;
}

interface AggregatedItem {
  itemId: number;
  name: string;
  totalQty: number;
  hqQty: number;
  nqQty: number;
  bySource: Record<string, number>;
  inArmoire: boolean;
  inGlamourChest: boolean;
  inArmory: boolean;
  isEquipped: boolean;
}

let iconMapPromise: Promise<Record<number, number>> | null = null;

// --- Special storage location detection -----------------------------------
// Allagan Tools' raw "Inventory Location" strings for these (confirmed from
// real exports): "Armoire - <category> -", "Armory - <slot> -",
// "Equipped Gear -", "Glamour Chest".
function isArmoireLocation(location: string): boolean {
  return location.startsWith('Armoire');
}
function isGlamourChestLocation(location: string): boolean {
  return location.startsWith('Glamour Chest');
}
function isArmoryLocation(location: string): boolean {
  return location.startsWith('Armory');
}
function isEquippedGearLocation(location: string): boolean {
  return location.startsWith('Equipped Gear');
}

interface SpecialLocationToggles {
  armoire: boolean;
  glamourChest: boolean;
  armory: boolean;
  equippedGear: boolean;
}

const DEFAULT_SPECIAL_TOGGLES: SpecialLocationToggles = {
  armoire: true,
  glamourChest: true,
  armory: true,
  equippedGear: true,
};


/** Loads (and caches) a full itemId -> icon-number map, derived from the
 * same official item index used for name resolution elsewhere. Needed
 * because the curated OFFICIAL_ITEM_ICON_BY_ID table only covers the
 * hand-picked recipe itemIds, not the thousands of arbitrary items that can
 * show up in a person's real inventory. */
async function loadFullIconMap(): Promise<Record<number, number>> {
  if (!iconMapPromise) {
    iconMapPromise = import('../data/itemNameIndex.json').then((mod) => {
      const list = (mod.default || mod) as unknown as [number, string, string, number | null][];
      const map: Record<number, number> = {};
      for (const [itemId, , , iconNum] of list) {
        if (iconNum) map[itemId] = iconNum;
      }
      return map;
    });
  }
  return iconMapPromise;
}

const PAGE_SIZE = 60;

export const InventoryItemBrowser: React.FC<InventoryItemBrowserProps> = ({ inventoryData, onOpenInventorySync }) => {
  const [characterGroups, setCharacterGroups] = useState<CharacterGroup[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['ALL']); // group ids and/or raw source names
  const [itemTypeMap, setItemTypeMap] = useState<Record<number, ItemType>>({});
  const [typeMapLoading, setTypeMapLoading] = useState(true);
  const [iconMap, setIconMap] = useState<Record<number, number>>({});
  const [selectedType, setSelectedType] = useState<ItemType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [specialToggles, setSpecialToggles] = useState<SpecialLocationToggles>(DEFAULT_SPECIAL_TOGGLES);

  useEffect(() => {
    setCharacterGroups(loadCharacterGroups());
    loadItemTypeMap().then((m) => {
      setItemTypeMap(m);
      setTypeMapLoading(false);
    });
    loadFullIconMap().then(setIconMap);
  }, []);

  const availableCharacters = useMemo(() => {
    const set = new Set<string>();
    for (const item of inventoryData?.inventories || []) {
      if (item.source && item.source.trim()) set.add(item.source.trim());
    }
    return Array.from(set).sort();
  }, [inventoryData]);

  const groupedSourceSet = useMemo(() => {
    const set = new Set<string>();
    for (const g of characterGroups) for (const m of g.memberSources) set.add(m);
    return set;
  }, [characterGroups]);

  const ungroupedCharacters = useMemo(
    () => availableCharacters.filter((c) => !groupedSourceSet.has(c)),
    [availableCharacters, groupedSourceSet]
  );

  // Maps a raw source (character/retainer name) to its group id, or to
  // itself if it isn't in any group. Used to detect when several rows
  // (e.g. a character's retainers) really represent the "same owner" for
  // account/character-level stats like currency.
  const sourceToGroupKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of characterGroups) {
      for (const m of g.memberSources) map.set(m, g.id);
    }
    return map;
  }, [characterGroups]);
  const groupKeyFor = (source: string | undefined) => (source ? sourceToGroupKey.get(source) || source : '__unknown__');

  const toggleTarget = (target: string) => {
    if (target === 'ALL') {
      setSelectedTargets(['ALL']);
      return;
    }
    setSelectedTargets((prev) => {
      const withoutAll = prev.filter((t) => t !== 'ALL');
      const next = withoutAll.includes(target) ? withoutAll.filter((t) => t !== target) : [...withoutAll, target];
      return next.length === 0 ? ['ALL'] : next;
    });
  };

  // Expand selected groups/raw-sources into a flat set of raw source names
  // to match against item.source, same approach used by the inventory sync
  // modal's character selector.
  const activeSources = useMemo(() => {
    if (selectedTargets.includes('ALL')) return null; // null = no filtering, include everything
    const set = new Set<string>();
    const groupById = new Map(characterGroups.map((g) => [g.id, g]));
    for (const t of selectedTargets) {
      const group = groupById.get(t);
      if (group) {
        for (const m of group.memberSources) set.add(m);
      } else {
        set.add(t);
      }
    }
    return set;
  }, [selectedTargets, characterGroups]);

  // Aggregate items across the selected sources
  const aggregated = useMemo(() => {
    const map = new Map<number, AggregatedItem>();

    // For currency-type items (Gil, MGP, Grand Company seals, PvP series,
    // etc.): these are character/account-level stats, not something a
    // retainer separately holds. Allagan Tools' export can end up repeating
    // the owning character's total on every retainer row scanned for that
    // character -- summing every row naively would multiply the real value
    // by however many retainers were exported. Instead, track the MAX value
    // seen per character-group (main character + its linked retainers) and
    // sum those per-group maxes, so each real character's currency is only
    // counted once.
    const currencyGroupMax = new Map<number, Map<string, number>>();

    for (const item of inventoryData?.inventories || []) {
      if (activeSources && (!item.source || !activeSources.has(item.source))) continue;

      const inArmoire = isArmoireLocation(item.location);
      const inGlamourChest = isGlamourChestLocation(item.location);
      const inArmory = isArmoryLocation(item.location);
      const isEquipped = isEquippedGearLocation(item.location);

      if (inArmoire && !specialToggles.armoire) continue;
      if (inGlamourChest && !specialToggles.glamourChest) continue;
      if (inArmory && !specialToggles.armory) continue;
      if (isEquipped && !specialToggles.equippedGear) continue;

      let entry = map.get(item.itemId);
      if (!entry) {
        entry = {
          itemId: item.itemId,
          name: item.name,
          totalQty: 0,
          hqQty: 0,
          nqQty: 0,
          bySource: {},
          inArmoire: false,
          inGlamourChest: false,
          inArmory: false,
          isEquipped: false,
        };
        map.set(item.itemId, entry);
      }

      const isCurrency = !typeMapLoading && getItemType(item.itemId, itemTypeMap) === 'currency';

      if (isCurrency) {
        const gKey = groupKeyFor(item.source);
        let groupMap = currencyGroupMax.get(item.itemId);
        if (!groupMap) {
          groupMap = new Map();
          currencyGroupMax.set(item.itemId, groupMap);
        }
        groupMap.set(gKey, Math.max(groupMap.get(gKey) || 0, item.quantity));
        // Keep the "who has it" breakdown informative using the raw
        // per-source value (not deduped across the group) rather than
        // summing duplicated rows.
        if (item.source) {
          entry.bySource[item.source] = Math.max(entry.bySource[item.source] || 0, item.quantity);
        }
      } else {
        entry.totalQty += item.quantity;
        if (item.isHq) entry.hqQty += item.quantity;
        else entry.nqQty += item.quantity;
        if (item.source) {
          entry.bySource[item.source] = (entry.bySource[item.source] || 0) + item.quantity;
        }
      }

      if (inArmoire) entry.inArmoire = true;
      if (inGlamourChest) entry.inGlamourChest = true;
      if (inArmory) entry.inArmory = true;
      if (isEquipped) entry.isEquipped = true;
    }

    // Finalize currency totals from the deduplicated per-group maxes.
    for (const [itemId, groupMap] of currencyGroupMax.entries()) {
      const entry = map.get(itemId);
      if (!entry) continue;
      let total = 0;
      for (const v of groupMap.values()) total += v;
      entry.totalQty = total;
      entry.nqQty = total;
    }

    return Array.from(map.values());
  }, [inventoryData, activeSources, specialToggles, itemTypeMap, typeMapLoading, sourceToGroupKey]);

  // Category breakdown counts (for the filter buttons), computed once the
  // type map has loaded.
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<ItemType, number>> = {};
    if (typeMapLoading) return counts;
    for (const item of aggregated) {
      const t = getItemType(item.itemId, itemTypeMap);
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [aggregated, itemTypeMap, typeMapLoading]);

  const filtered = useMemo(() => {
    return aggregated.filter((item) => {
      if (selectedType !== 'ALL') {
        const t = getItemType(item.itemId, itemTypeMap);
        if (t !== selectedType) return false;
      }
      if (searchQuery.trim()) {
        if (!item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [aggregated, selectedType, itemTypeMap, searchQuery]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.totalQty - a.totalQty), [filtered]);

  useEffect(() => {
    setPage(0);
  }, [selectedTargets, selectedType, searchQuery, specialToggles]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!inventoryData || inventoryData.inventories.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <Package className="w-10 h-10 text-slate-600 mx-auto" />
        <p className="text-slate-400 text-sm">所持品データがまだ同期されていません。</p>
        <button
          onClick={onOpenInventorySync}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
        >
          所持品マネージャーを開く
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Boxes className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">所持品一覧</h2>
          <span className="text-xs text-slate-500">同期中: {inventoryData.inventories.length.toLocaleString()} 件</span>
        </div>

        {/* Character / group selector */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <button
            onClick={() => toggleTarget('ALL')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
              selectedTargets.includes('ALL')
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            全キャラ合算
          </button>
          {characterGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleTarget(g.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                !selectedTargets.includes('ALL') && selectedTargets.includes(g.id)
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {g.displayName}
            </button>
          ))}
          {ungroupedCharacters.map((c) => (
            <button
              key={c}
              onClick={() => toggleTarget(c)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                !selectedTargets.includes('ALL') && selectedTargets.includes(c)
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              {c}
            </button>
          ))}
        </div>

        {/* Special storage location toggles */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[11px] text-slate-400 mr-0.5">表示する保管場所:</span>
          <button
            onClick={() => setSpecialToggles((p) => ({ ...p, armoire: !p.armoire }))}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
              specialToggles.armoire
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950/60 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            愛蔵品 (Armoire)
          </button>
          <button
            onClick={() => setSpecialToggles((p) => ({ ...p, glamourChest: !p.glamourChest }))}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
              specialToggles.glamourChest
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950/60 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            ミラージュドレッサー
          </button>
          <button
            onClick={() => setSpecialToggles((p) => ({ ...p, armory: !p.armory }))}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
              specialToggles.armory
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950/60 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            アーマリーチェスト
          </button>
          <button
            onClick={() => setSpecialToggles((p) => ({ ...p, equippedGear: !p.equippedGear }))}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
              specialToggles.equippedGear
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950/60 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            装備品 (Equipped)
          </button>
        </div>

        {/* Item type filter */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[11px] text-slate-400 mr-0.5">カテゴリ:</span>
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
              selectedType === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            すべて ({aggregated.length})
          </button>
          {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => {
            const count = typeCounts[t] || 0;
            if (count === 0) return null;
            const meta = ITEM_TYPE_LABELS[t];
            const Icon = meta.icon;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  selectedType === t
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="アイテム名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
        </div>
      </div>

      {typeMapLoading ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-16">
          <Loader2 className="w-4 h-4 animate-spin" />
          アイテム分類データを読み込み中...
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-400">該当: {filtered.length.toLocaleString()} 種類</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {pageItems.map((item) => (
              <div
                key={item.itemId}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-start gap-2.5 transition-all"
              >
                <ItemIcon
                  itemId={item.itemId}
                  name={item.name}
                  icon={iconMap[item.itemId] ? String(iconMap[item.itemId]) : undefined}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-100 truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-rajdhani">
                    <span className="text-amber-300 font-bold">x{item.totalQty.toLocaleString()}</span>
                    {item.hqQty > 0 && <span className="text-sky-300">HQ:{item.hqQty}</span>}
                  </div>
                  {(item.inArmoire || item.inGlamourChest || item.inArmory || item.isEquipped) && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.inArmoire && (
                        <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded px-1 py-0.5 flex items-center gap-0.5">
                          <Archive className="w-2.5 h-2.5" /> 愛蔵品
                        </span>
                      )}
                      {item.inGlamourChest && (
                        <span className="text-[9px] bg-pink-500/15 text-pink-300 border border-pink-500/30 rounded px-1 py-0.5 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> ミラージュ
                        </span>
                      )}
                      {item.inArmory && (
                        <span className="text-[9px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded px-1 py-0.5 flex items-center gap-0.5">
                          <Boxes className="w-2.5 h-2.5" /> アーマリー
                        </span>
                      )}
                      {item.isEquipped && (
                        <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded px-1 py-0.5 flex items-center gap-0.5">
                          <Shirt className="w-2.5 h-2.5" /> 装備中
                        </span>
                      )}
                    </div>
                  )}
                  {/* Who actually has this item */}
                  {Object.keys(item.bySource).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5">
                      {Object.entries(item.bySource)
                        .sort((a, b) => b[1] - a[1])
                        .map(([source, qty]) => (
                          <span
                            key={source}
                            className="text-[9px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded px-1 py-0.5 whitespace-nowrap flex items-center gap-0.5"
                          >
                            <User className="w-2.5 h-2.5" /> {source} <span className="text-slate-300 font-semibold">x{qty}</span>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">該当するアイテムが見つかりませんでした。</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 text-xs"
              >
                前へ
              </button>
              <span className="text-xs text-slate-400 font-rajdhani">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 text-xs"
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
