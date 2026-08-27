import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Recipe, CraftJob, CRAFT_JOBS, RecipeCategory, UniversalisItemData, InventorySyncData } from '../types/ff14';
import { getItemStockTotal } from '../utils/inventoryStorage';
import { Search, Plus, History, Loader2, ChevronLeft, ChevronRightIcon as ChevronRight, ArrowUpDown, TrendingUp, Percent, AlertTriangle, Package } from 'lucide-react';
import { ItemIcon } from './common/ItemIcon';
import { JobIcon } from './common/JobIcon';
import { Expansion, ALL_EXPANSIONS, EXPANSION_LABELS, loadExpansionRecipes } from '../utils/legacyRecipeLoader';
import { loadLodestoneMap, buildLodestoneUrlFromHash } from '../utils/lodestoneLinks';
import { fetchUniversalisMultiPrices } from '../services/universalisApi';

interface LegacyRecipeBrowserProps {
  onAddToBatch: (recipe: Recipe) => void;
  onSelectRecipeForWorkflow?: (recipe: Recipe) => void;
  onSelectRecipeForCost: (recipe: Recipe) => void;
  onSelectRecipeForTree?: (recipe: Recipe) => void;
  onSelectRecipeForSim: (recipe: Recipe) => void;
  selectedWorldOrDc: string;
  inventoryData: InventorySyncData | null;
}

const PAGE_SIZE = 30;
const MAX_ECONOMICS_ITEMS = 300;

type SortMode = 'default' | 'profitDesc' | 'profitRateDesc';

const CATEGORY_OPTIONS: { id: RecipeCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'すべてのレシピ' },
  { id: 'battleGear', label: '⚔️ 戦闘用装備' },
  { id: 'gathererCrafterGear', label: '🔨 ギャザクラ装備' },
  { id: 'fashion', label: '👗 おしゃれ装備' },
  { id: 'foodPotion', label: '🍗 飯・薬' },
  { id: 'housing', label: '⛲ ハウジング家具' },
  { id: 'intermediate', label: '🟫 中間素材' },
  { id: 'collectibles', label: '📦 収集品' },
  { id: 'other', label: '📎 その他 (道具/雑貨など)' },
];

interface RecipeEconomics {
  materialCost: number;
  netProfit: number;
  profitRatePercent: number;
  isEstimate: boolean;
  anyOwned: boolean;
}

function computeEconomics(
  recipe: Recipe,
  marketData: Record<number, UniversalisItemData>,
  inventoryData: InventorySyncData | null
): RecipeEconomics {
  let materialCost = 0;
  let anyEstimate = false;
  let anyOwned = false;
  for (const mat of recipe.materials) {
    const md = marketData[mat.itemId];
    const price = md?.minPriceNQ ?? mat.defaultPriceNQ ?? 0;
    if (md?.isEstimate) anyEstimate = true;
    const owned = inventoryData ? getItemStockTotal(mat.itemId, inventoryData) : 0;
    const shortfall = Math.max(0, mat.amount - owned);
    if (owned > 0) anyOwned = true;
    materialCost += price * shortfall;
  }
  const productMarket = marketData[recipe.itemId];
  const unitSellingPrice = recipe.canHq
    ? productMarket?.minPriceHQ ?? recipe.defaultSellingPrice ?? 0
    : productMarket?.minPriceNQ ?? recipe.defaultSellingPrice ?? 0;
  if (productMarket?.isEstimate) anyEstimate = true;

  const yields = recipe.yields || 1;
  const grossRevenue = unitSellingPrice * yields;
  const marketTax = Math.round(grossRevenue * 0.05);
  const netRevenue = grossRevenue - marketTax;
  const netProfit = netRevenue - materialCost;
  const profitRatePercent = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

  return { materialCost, netProfit, profitRatePercent, isEstimate: anyEstimate, anyOwned };
}

export const LegacyRecipeBrowser: React.FC<LegacyRecipeBrowserProps> = ({
  onAddToBatch,
  onSelectRecipeForWorkflow,
  onSelectRecipeForCost,
  onSelectRecipeForTree,
  onSelectRecipeForSim,
  selectedWorldOrDc,
  inventoryData,
}) => {
  const [expansion, setExpansion] = useState<Expansion>('DT');
  const [lodestoneMap, setLodestoneMap] = useState<Record<number, string>>({});

  useEffect(() => {
    loadLodestoneMap().then(setLodestoneMap);
  }, []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<CraftJob | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'ALL'>('ALL');
  const [selectedSubPatches, setSelectedSubPatches] = useState<string[]>([]);
  const [masterbookOnly, setMasterbookOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [page, setPage] = useState(0);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [marketData, setMarketData] = useState<Record<number, UniversalisItemData>>({});
  const [loadingMarket, setLoadingMarket] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);
    setSelectedSubPatches([]);
    loadExpansionRecipes(expansion).then((data) => {
      if (!cancelled) {
        setRecipes(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [expansion]);

  // Distinct sub-patches actually present in this expansion (e.g. 7.0, 7.05,
  // 7.1... for DT), sorted chronologically, for the multi-select filter.
  // Filtered to plausible major-version prefixes for the expansion, since a
  // small number of items carry a *later* patch version (their data was
  // touched in a balance patch) even though their level keeps them bucketed
  // in an earlier expansion -- showing that here would be confusing.
  const EXPANSION_MAJOR_VERSION: Record<Expansion, string> = {
    ARR: '2', HW: '3', SB: '4', ShB: '5', EW: '6', DT: '7',
  };
  const availableSubPatches = useMemo(() => {
    const expectedMajor = EXPANSION_MAJOR_VERSION[expansion];
    const set = new Set<string>();
    for (const r of recipes) {
      if (r.patch && r.patch.startsWith(expectedMajor)) set.add(r.patch);
    }
    return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
  }, [recipes, expansion]);

  const toggleSubPatch = (patch: string) => {
    setSelectedSubPatches((prev) => (prev.includes(patch) ? prev.filter((p) => p !== patch) : [...prev, patch]));
  };

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      if (selectedJob !== 'ALL' && recipe.job !== selectedJob) return false;
      if (selectedCategory !== 'ALL' && recipe.category !== selectedCategory) return false;
      if (selectedSubPatches.length > 0 && !selectedSubPatches.includes(recipe.patch)) return false;
      if (masterbookOnly && !recipe.masterBook) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !recipe.name.toLowerCase().includes(q) &&
          !recipe.enName.toLowerCase().includes(q) &&
          !recipe.job.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [recipes, selectedJob, selectedCategory, selectedSubPatches, masterbookOnly, searchQuery]);

  // Fetch market data (capped) whenever the filtered set changes, so sort by
  // profit/profit rate can work without eagerly pricing thousands of items.
  const loadMarketData = useCallback(
    async (targetRecipes: Recipe[]) => {
      if (targetRecipes.length === 0 || targetRecipes.length > MAX_ECONOMICS_ITEMS) {
        setMarketData({});
        return;
      }
      setLoadingMarket(true);
      try {
        const idsSet = new Set<number>();
        const fallbackPrices: Record<number, number> = {};
        for (const recipe of targetRecipes) {
          idsSet.add(recipe.itemId);
          fallbackPrices[recipe.itemId] = recipe.defaultSellingPrice || 5000;
          for (const mat of recipe.materials) {
            idsSet.add(mat.itemId);
            fallbackPrices[mat.itemId] = mat.defaultPriceNQ || 1000;
          }
        }
        const data = await fetchUniversalisMultiPrices(Array.from(idsSet), selectedWorldOrDc, fallbackPrices);
        setMarketData(data);
      } finally {
        setLoadingMarket(false);
      }
    },
    [selectedWorldOrDc]
  );

  useEffect(() => {
    loadMarketData(filtered);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMarketData, filtered.length, selectedJob, selectedCategory, searchQuery, expansion]);

  const economicsAvailable = filtered.length > 0 && filtered.length <= MAX_ECONOMICS_ITEMS;

  const sorted = useMemo(() => {
    const withEconomics = filtered.map((recipe) => ({
      recipe,
      econ: computeEconomics(recipe, marketData, inventoryData),
    }));
    if (sortMode === 'profitDesc') {
      withEconomics.sort((a, b) => b.econ.netProfit - a.econ.netProfit);
    } else if (sortMode === 'profitRateDesc') {
      withEconomics.sort((a, b) => b.econ.profitRatePercent - a.econ.profitRatePercent);
    }
    return withEconomics;
  }, [filtered, marketData, sortMode, inventoryData]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = (recipe: Recipe) => {
    onAddToBatch(recipe);
    setAddedIds((prev) => new Set(prev).add(recipe.id));
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <History className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">歴代レシピ (過去拡張パッケージ)</h2>
          <span className="text-[11px] text-slate-500">
            採集元・秘伝書等の詳細情報は簡略化されています。カテゴリ分類はアイテム名からの推定のため一部誤分類の可能性があります。
          </span>
        </div>

        {/* Expansion selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
          {ALL_EXPANSIONS.map((exp) => (
            <button
              key={exp}
              onClick={() => setExpansion(exp)}
              className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                expansion === exp
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-semibold font-rajdhani">{exp}</span>
              <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{EXPANSION_LABELS[exp]}</span>
            </button>
          ))}
        </div>

        {/* Sub-patch filter (multi-select within the selected expansion) */}
        {!loading && availableSubPatches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-[11px] text-slate-400 mr-0.5">サブパッチ:</span>
            {availableSubPatches.map((patch) => (
              <button
                key={patch}
                onClick={() => toggleSubPatch(patch)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-rajdhani font-bold border transition-all ${
                  selectedSubPatches.includes(patch)
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {patch}
              </button>
            ))}
            {selectedSubPatches.length > 0 && (
              <button
                onClick={() => setSelectedSubPatches([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 underline ml-1"
              >
                クリア
              </button>
            )}
            <button
              onClick={() => setMasterbookOnly((v) => !v)}
              className={`ml-2 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                masterbookOnly
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="秘伝書(マスターブック)が必要なレシピのみ表示"
            >
              <span>📖 秘伝書が必要なもののみ</span>
            </button>
          </div>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[11px] text-slate-400 mr-0.5">カテゴリ:</span>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & job filter */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="アイテム名 / 英語名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedJob('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                selectedJob === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              全クラス
            </button>
            {(Object.keys(CRAFT_JOBS) as CraftJob[]).map((jobCode) => (
              <button
                key={jobCode}
                onClick={() => setSelectedJob(jobCode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                  selectedJob === jobCode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <JobIcon job={jobCode} size="xs" />
                <span className="font-rajdhani font-semibold">{jobCode}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 ml-auto">該当: {filtered.length.toLocaleString()} 件</span>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            並び替え:
          </span>
          <button
            onClick={() => setSortMode('default')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              sortMode === 'default'
                ? 'bg-slate-700 text-slate-100 border-slate-600'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            デフォルト
          </button>
          <button
            onClick={() => setSortMode('profitDesc')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              sortMode === 'profitDesc'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            利益額が高い順
          </button>
          <button
            onClick={() => setSortMode('profitRateDesc')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              sortMode === 'profitRateDesc'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/60'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            利益率が高い順
          </button>
          {loadingMarket && <span className="text-[10px] text-slate-500 ml-1">マケボ価格取得中...</span>}
          {!economicsAvailable && filtered.length > MAX_ECONOMICS_ITEMS && (
            <span className="text-[10px] text-amber-400 ml-1">
              絞り込み件数が{MAX_ECONOMICS_ITEMS}件を超えるためソートは無効です（カテゴリ/クラス/検索で絞り込んでください）
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-16">
          <Loader2 className="w-4 h-4 animate-spin" />
          {EXPANSION_LABELS[expansion]} のレシピを読み込み中...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pageItems.map(({ recipe, econ }) => {
              const jobInfo = CRAFT_JOBS[recipe.job];
              const isAdded = addedIds.has(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col gap-2 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon itemId={recipe.itemId} icon={recipe.icon} name={recipe.name} size="md" />
                    <div className="min-w-0">
                      <a
                        href={
                          lodestoneMap[recipe.itemId]
                            ? buildLodestoneUrlFromHash(lodestoneMap[recipe.itemId])
                            : `https://garlandtools.org/db/#item/${recipe.itemId}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-slate-100 hover:text-amber-300 truncate transition-colors"
                        title={lodestoneMap[recipe.itemId] ? 'FF14公式アイテムページ (Lodestone) を新しいタブで開く' : '公式アイテムデータ (Garland Tools) を新しいタブで開く'}
                      >
                        {recipe.name}
                      </a>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span
                          className="px-1 py-0.5 rounded font-rajdhani font-semibold text-white"
                          style={{ backgroundColor: `${jobInfo.color}CC` }}
                        >
                          {jobInfo.code} Lv{recipe.level}
                        </span>
                        {recipe.stars > 0 && <span className="text-amber-400">{'★'.repeat(recipe.stars)}</span>}
                      </div>
                      {recipe.masterBook && (
                        <div className="text-[9px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5 mt-1 inline-flex items-center gap-1">
                          <span>📖</span>
                          <span className="truncate">{recipe.masterBook}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {economicsAvailable && (
                    <div className="grid grid-cols-3 gap-1 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/60 text-[10px] font-rajdhani">
                      <div>
                        <span className="text-slate-500 block text-[9px] flex items-center gap-0.5">
                          原価
                          {econ.anyOwned && (
                            <span title="所持品を保有分だけ差し引いて計算しています">
                              <Package className="w-2.5 h-2.5 text-emerald-400" />
                            </span>
                          )}
                        </span>
                        <span className="text-slate-200 font-semibold">{Math.round(econ.materialCost).toLocaleString()}G</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">利益</span>
                        <span className={`font-semibold ${econ.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                          {econ.netProfit >= 0 ? '+' : ''}
                          {Math.round(econ.netProfit).toLocaleString()}G
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] flex items-center gap-0.5">
                          利益率
                          {econ.isEstimate && <AlertTriangle className="w-2.5 h-2.5 text-amber-500/80" />}
                        </span>
                        <span className={`font-semibold ${econ.profitRatePercent >= 0 ? 'text-sky-300' : 'text-rose-400'}`}>
                          {econ.profitRatePercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {recipe.materials.slice(0, 4).map((m) => (
                      <span
                        key={m.itemId}
                        className="text-[9px] bg-slate-800/70 text-slate-300 px-1 py-0.5 rounded border border-slate-700/50 flex items-center gap-1"
                      >
                        <span>{m.name}</span>
                        <span className="text-amber-400 font-rajdhani">x{m.amount}</span>
                      </span>
                    ))}
                    {recipe.materials.length > 4 && (
                      <span className="text-[9px] text-slate-500">+{recipe.materials.length - 4}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 mt-auto pt-1">
                    {onSelectRecipeForWorkflow && (
                      <button
                        onClick={() => onSelectRecipeForWorkflow(recipe)}
                        className="w-full bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-200 border border-amber-500/40 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                        title="レストラネット風 製作ワークフローへ"
                      >
                        <span>🧭 製作ワークフローを開く</span>
                      </button>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectRecipeForCost(recipe)}
                        className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                      >
                        原価
                      </button>
                      {onSelectRecipeForTree && (
                        <button
                          onClick={() => onSelectRecipeForTree(recipe)}
                          className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                        >
                          素材
                        </button>
                      )}
                      <button
                        onClick={() => onSelectRecipeForSim(recipe)}
                        className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                      >
                        シミュ
                      </button>
                      <button
                        onClick={() => handleAdd(recipe)}
                        disabled={isAdded}
                        className={`px-2 py-1 rounded-lg text-[10px] border transition-all flex items-center gap-1 ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                        title="製作計画リストに追加"
                      >
                        <Plus className="w-3 h-3" />
                        {isAdded ? '追加済' : '計画へ'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">該当するレシピが見つかりませんでした。</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-rajdhani">
                {page + 1} / {totalPages} ページ
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
