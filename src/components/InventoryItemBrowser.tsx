import React, { useState, useEffect, useMemo } from 'react';
import { InventorySyncData } from '../types/ff14';
import { CharacterGroup, loadCharacterGroups } from '../utils/inventoryStorage';
import { ItemType, ITEM_TYPE_LABELS, loadItemTypeMap, getItemType } from '../utils/itemTypeClassifier';
import { ItemIcon } from './common/ItemIcon';
import { Search, Boxes, Package, Loader2 } from 'lucide-react';

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
}

const PAGE_SIZE = 60;

export const InventoryItemBrowser: React.FC<InventoryItemBrowserProps> = ({ inventoryData, onOpenInventorySync }) => {
  const [characterGroups, setCharacterGroups] = useState<CharacterGroup[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['ALL']); // group ids and/or raw source names
  const [itemTypeMap, setItemTypeMap] = useState<Record<number, ItemType>>({});
  const [typeMapLoading, setTypeMapLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ItemType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setCharacterGroups(loadCharacterGroups());
    loadItemTypeMap().then((m) => {
      setItemTypeMap(m);
      setTypeMapLoading(false);
    });
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
    for (const item of inventoryData?.inventories || []) {
      if (activeSources && (!item.source || !activeSources.has(item.source))) continue;
      let entry = map.get(item.itemId);
      if (!entry) {
        entry = { itemId: item.itemId, name: item.name, totalQty: 0, hqQty: 0, nqQty: 0, bySource: {} };
        map.set(item.itemId, entry);
      }
      entry.totalQty += item.quantity;
      if (item.isHq) entry.hqQty += item.quantity;
      else entry.nqQty += item.quantity;
      if (item.source) {
        entry.bySource[item.source] = (entry.bySource[item.source] || 0) + item.quantity;
      }
    }
    return Array.from(map.values());
  }, [inventoryData, activeSources]);

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
  }, [selectedTargets, selectedType, searchQuery]);

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
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
              selectedTargets.includes('ALL')
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            🌐 全キャラ合算
          </button>
          {characterGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleTarget(g.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                !selectedTargets.includes('ALL') && selectedTargets.includes(g.id)
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              🧑‍🤝‍🧑 {g.displayName}
            </button>
          ))}
          {ungroupedCharacters.map((c) => (
            <button
              key={c}
              onClick={() => toggleTarget(c)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                !selectedTargets.includes('ALL') && selectedTargets.includes(c)
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              👤 {c}
            </button>
          ))}
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
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  selectedType === t
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {ITEM_TYPE_LABELS[t]} ({count})
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
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-center gap-2.5 transition-all"
              >
                <ItemIcon itemId={item.itemId} name={item.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-100 truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-rajdhani">
                    <span className="text-amber-300 font-bold">x{item.totalQty.toLocaleString()}</span>
                    {item.hqQty > 0 && <span className="text-sky-300">HQ:{item.hqQty}</span>}
                    {Object.keys(item.bySource).length > 1 && (
                      <span title={Object.entries(item.bySource).map(([s, q]) => `${s}: ${q}`).join(', ')}>
                        ({Object.keys(item.bySource).length}箇所)
                      </span>
                    )}
                  </div>
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
