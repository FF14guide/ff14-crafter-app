import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Recipe, CraftJob, CRAFT_JOBS, UniversalisItemData } from '../types/ff14';
import { Search, Sparkles, Plus, Play, ChevronRight, BarChart3, TreeDeciduous, Compass, ArrowUpDown, TrendingUp, Percent, AlertTriangle, Globe, Loader2, ChevronLeft, ExternalLink } from 'lucide-react';
import { ItemIcon } from './common/ItemIcon';
import { JobIcon } from './common/JobIcon';
import { fetchUniversalisMultiPrices } from '../services/universalisApi';
import { loadLodestoneMap, buildLodestoneUrlFromHash } from '../utils/lodestoneLinks';
import { loadExpansionRecipes } from '../utils/legacyRecipeLoader';

interface RecipeCatalogProps {
  recipes: Recipe[];
  currentPurpose: string;
  onChangePurpose: (purpose: string) => void;
  onSelectRecipeForWorkflow?: (recipe: Recipe) => void;
  onSelectRecipeForCost: (recipe: Recipe) => void;
  onSelectRecipeForTree: (recipe: Recipe) => void;
  onSelectRecipeForSim: (recipe: Recipe) => void;
  onAddToBatch: (recipe: Recipe) => void;
  selectedWorldOrDc: string;
}

type SortMode = 'default' | 'profitDesc' | 'profitRateDesc';

const PATCH_OPTIONS = ['7.0', '7.1', '7.2', '7.3', '7.4', '7.5'];

// Minimum item level to be considered "latest patch" content. This threshold
// is intentionally the only thing that needs bumping when a new even-higher
// tier ships -- everything else (the filter itself, and the label text
// below) is derived from it plus the curated data, so it won't silently
// become wrong the way a hardcoded "Patch 7.4" string would.
const LATEST_PATCH_IL_THRESHOLD = 740;

/** Builds an evergreen "latest patch" category label from whatever curated
 * recipes actually meet the threshold, instead of a hardcoded patch number
 * that would go stale the moment a newer patch ships. */
function buildLatestPatchLabel(recipes: Recipe[]): { label: string; desc: string } {
  const qualifying = recipes.filter((r) => r.ilvl >= LATEST_PATCH_IL_THRESHOLD);
  const patches = Array.from(new Set(qualifying.map((r) => r.patch))).sort().reverse();
  const maxIlvl = qualifying.reduce((max, r) => Math.max(max, r.ilvl), 0);
  const patchLabel = patches.length > 0 ? patches.slice(0, 2).join('/') : '';
  return {
    label: patchLabel ? `🔥 最新パッチ ${patchLabel}` : '🔥 最新パッチ',
    desc: maxIlvl > 0 ? `新式IL${maxIlvl}・宝薬・最新飯` : '新式装備・宝薬・最新飯',
  };
}

// Approximate patch grouping for the bulk (non-curated) Dawntrail recipes,
// based on the item-level tiers verified during this session's research.
// This is a best-effort bucketing, not confirmed per-recipe patch data —
// recipes outside these known "new-style" tiers are grouped as 'DT' (shown
// under no specific patch filter) since their exact sub-patch isn't verified.
function approximatePatch(ilvl: number): string | null {
  if (ilvl === 690 || ilvl === 700 || ilvl === 710) return '7.0';
  if (ilvl === 720) return '7.1';
  if (ilvl === 740) return '7.2';
  if (ilvl === 750) return '7.3';
  if (ilvl === 770) return '7.4';
  if (ilvl === 780) return '7.5';
  return null;
}

interface RecipeEconomics {
  materialCost: number;
  grossRevenue: number;
  netProfit: number;
  profitRatePercent: number;
  isEstimate: boolean;
}

/** Same formula as CostProfitCalculator (single-craft basis): NQ material
 * cost, HQ (or NQ if the recipe can't be HQ) selling price, 5% market tax. */
function computeEconomics(recipe: Recipe, marketData: Record<number, UniversalisItemData>): RecipeEconomics {
  let materialCost = 0;
  let anyEstimate = false;

  for (const mat of recipe.materials) {
    const md = marketData[mat.itemId];
    const price = md?.minPriceNQ ?? mat.defaultPriceNQ ?? 0;
    if (md?.isEstimate) anyEstimate = true;
    materialCost += price * mat.amount;
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

  return { materialCost, grossRevenue, netProfit, profitRatePercent, isEstimate: anyEstimate };
}

export const RecipeCatalog: React.FC<RecipeCatalogProps> = ({
  recipes,
  currentPurpose,
  onChangePurpose,
  onSelectRecipeForWorkflow,
  onSelectRecipeForCost,
  onSelectRecipeForTree,
  onSelectRecipeForSim,
  onAddToBatch,
  selectedWorldOrDc,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<CraftJob | 'ALL'>('ALL');
  const [selectedPatches, setSelectedPatches] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [marketData, setMarketData] = useState<Record<number, UniversalisItemData>>({});
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [allDtRecipes, setAllDtRecipes] = useState<Recipe[] | null>(null);
  const [lodestoneMap, setLodestoneMap] = useState<Record<number, string>>({});

  useEffect(() => {
    loadLodestoneMap().then(setLodestoneMap);
  }, []);
  const [page, setPage] = useState(0);
  const CATALOG_PAGE_SIZE = 30;

  // Merge the hand-curated recipes with the full Dawntrail catalog so this
  // page covers all of patch 7.0-7.5, not just the manually-curated subset.
  // Curated entries (richer sourceType/masterbook/pricing detail) win when
  // the same itemId appears in both.
  useEffect(() => {
    let cancelled = false;
    loadExpansionRecipes('DT').then((dtRecipes) => {
      if (cancelled) return;
      const curatedIds = new Set(recipes.map((r) => r.itemId));
      const extra = dtRecipes
        .filter((r) => !curatedIds.has(r.itemId))
        .map((r) => {
          const approx = approximatePatch(r.ilvl);
          return approx ? { ...r, patch: approx } : r;
        });
      setAllDtRecipes(extra);
    });
    return () => {
      cancelled = true;
    };
  }, [recipes]);

  const mergedRecipes = useMemo(() => {
    return allDtRecipes ? [...recipes, ...allDtRecipes] : recipes;
  }, [recipes, allDtRecipes]);

  const togglePatch = (patch: string) => {
    setSelectedPatches((prev) => (prev.includes(patch) ? prev.filter((p) => p !== patch) : [...prev, patch]));
  };

  const MAX_ECONOMICS_ITEMS = 300;

  // Fetch live market prices (product + every material) for every recipe
  // currently shown, so cost/profit/rate can be displayed and sorted on.
  // Capped to a reasonable result size — with thousands of Dawntrail
  // recipes now merged in, fetching prices for an unfiltered full list
  // would mean a huge batch request; narrowing by job/patch/search brings
  // the count under the cap.
  const loadMarketData = useCallback(async (targetRecipes: Recipe[]) => {
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
  }, [selectedWorldOrDc]);

  // Filter recipes
  const filteredRecipes = mergedRecipes.filter((recipe) => {
    // Purpose filter
    if (currentPurpose === 'latestPatch') {
      if (recipe.ilvl < LATEST_PATCH_IL_THRESHOLD) return false;
    } else if (currentPurpose !== 'all') {
      if (recipe.category !== currentPurpose) return false;
    }

    // Job filter
    if (selectedJob !== 'ALL' && recipe.job !== selectedJob) {
      return false;
    }

    // Patch filter (multi-select; empty = no restriction)
    if (selectedPatches.length > 0 && !selectedPatches.includes(recipe.patch)) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = recipe.name.toLowerCase().includes(q);
      const matchEn = recipe.enName.toLowerCase().includes(q);
      const matchJob = recipe.job.toLowerCase().includes(q);
      const matchPatch = recipe.patch.includes(q);
      if (!matchName && !matchEn && !matchJob && !matchPatch) return false;
    }

    return true;
  });

  useEffect(() => {
    loadMarketData(filteredRecipes);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMarketData, filteredRecipes.length, currentPurpose, selectedJob, selectedPatches.join(','), searchQuery]);

  const economicsAvailable = filteredRecipes.length > 0 && filteredRecipes.length <= MAX_ECONOMICS_ITEMS;

  // Attach economics to each recipe (memoized on marketData/recipe list) and
  // apply the selected sort.
  const sortedRecipes = useMemo(() => {
    const withEconomics = filteredRecipes.map((recipe) => ({
      recipe,
      econ: computeEconomics(recipe, marketData),
    }));

    if (sortMode === 'profitDesc') {
      withEconomics.sort((a, b) => b.econ.netProfit - a.econ.netProfit);
    } else if (sortMode === 'profitRateDesc') {
      withEconomics.sort((a, b) => b.econ.profitRatePercent - a.econ.profitRatePercent);
    }

    return withEconomics;
  }, [filteredRecipes, marketData, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sortedRecipes.length / CATALOG_PAGE_SIZE));
  const pageRecipes = sortedRecipes.slice(page * CATALOG_PAGE_SIZE, (page + 1) * CATALOG_PAGE_SIZE);

  const categories = [
    (() => {
      const { label, desc } = buildLatestPatchLabel(recipes);
      return { id: 'latestPatch', label, desc };
    })(),
    { id: 'foodPotion', label: '🍗 レイド飯・薬', desc: 'レイド飯・宝薬・薬茶' },
    (() => {
      const gearItems = recipes.filter((r) => r.category === 'gear');
      const maxGearIl = gearItems.reduce((max, r) => Math.max(max, r.ilvl), 0);
      return {
        id: 'gear',
        label: '🛡️ 新式装備・防具',
        desc: maxGearIl > 0 ? `最高IL${maxGearIl}の新式装備` : '新式装備・防具',
      };
    })(),
    { id: 'intermediate', label: '🟫 中間素材', desc: '黄金のレザー・インゴット・布' },
    { id: 'collectibles', label: '📦 収集品 (橙貨/紫貨)', desc: 'クラフター貨幣集め用' },
    { id: 'housing', label: '⛲ ハウジング家具', desc: '庭具・調度品' },
    { id: 'all', label: '✨ すべてのレシピ', desc: '全カタログ' },
  ];

  return (
    <div className="space-y-6">
      {/* Purpose Filter Tabs */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">目的別レシピ選定 (Purpose Filter)</h2>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            該当レシピ: {filteredRecipes.length.toLocaleString()} 件
            {allDtRecipes === null && (
              <span className="flex items-center gap-1 text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                黄金の全レシピを読み込み中...
              </span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {categories.map((cat) => {
            const isActive = currentPurpose === cat.id;
            return (
              <button
                key={cat.id}
                id={`filter-purpose-${cat.id}`}
                onClick={() => onChangePurpose(cat.id)}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-950/20 text-amber-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-xs font-semibold">{cat.label}</span>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{cat.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Job Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-recipe-input"
            type="text"
            placeholder="アイテム名 / 英語名 / パッチ検索 (例: ローストチキン, G2, ケツァル)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
        </div>

        {/* Job Icons filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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
          {(Object.keys(CRAFT_JOBS) as CraftJob[]).map((jobCode) => {
            const job = CRAFT_JOBS[jobCode];
            const isJobActive = selectedJob === jobCode;
            return (
              <button
                key={jobCode}
                id={`filter-job-${jobCode}`}
                onClick={() => setSelectedJob(jobCode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isJobActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={job.name}
              >
                <JobIcon job={jobCode} size="xs" />
                <span className="font-rajdhani font-semibold">{jobCode}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort & Patch Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        {/* Sort buttons */}
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
        </div>

        {/* Patch filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-0.5">パッチ:</span>
          {PATCH_OPTIONS.map((patch) => {
            const isActive = selectedPatches.includes(patch);
            return (
              <button
                key={patch}
                onClick={() => togglePatch(patch)}
                className={`px-2 py-1 rounded-lg text-xs font-rajdhani font-bold border transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {patch}
              </button>
            );
          })}
          {selectedPatches.length > 0 && (
            <button
              onClick={() => setSelectedPatches([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline ml-1"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageRecipes.map(({ recipe, econ }) => {
          const jobInfo = CRAFT_JOBS[recipe.job];
          return (
            <div
              key={recipe.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-black/40 group"
            >
              <div>
                {/* Card Top: Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-white flex items-center gap-1.5 font-rajdhani"
                      style={{ backgroundColor: `${jobInfo.color}CC` }}
                    >
                      <JobIcon job={recipe.job} size="xs" />
                      <span>{jobInfo.code}</span>
                      <span>Lv{recipe.level}</span>
                    </span>
                    {recipe.stars > 0 && (
                      <span className="text-amber-400 text-xs font-bold" title={`${recipe.stars}星レシピ`}>
                        {'★'.repeat(recipe.stars)}
                      </span>
                    )}
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-rajdhani">
                      Patch {recipe.patch}
                    </span>
                  </div>

                  {recipe.ilvl > 0 && (
                    <span className="text-[11px] text-amber-300/90 font-rajdhani font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      IL {recipe.ilvl}
                    </span>
                  )}
                </div>

                {/* Item Name & Official Icon */}
                <div className="flex items-start gap-2.5 my-2">
                  <ItemIcon
                    itemId={recipe.itemId}
                    icon={recipe.icon}
                    name={recipe.name}
                    size="lg"
                    className="shadow-inner border-slate-700 bg-slate-900"
                  />
                  <div>
                    <a
                      href={
                        lodestoneMap[recipe.itemId]
                          ? buildLodestoneUrlFromHash(lodestoneMap[recipe.itemId])
                          : `https://garlandtools.org/db/#item/${recipe.itemId}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link inline-flex items-center gap-1 text-sm font-bold text-slate-100 hover:text-amber-300 transition-colors"
                      title={lodestoneMap[recipe.itemId] ? 'FF14公式アイテムページ (Lodestone) を新しいタブで開く' : '公式アイテムデータ (Garland Tools) を新しいタブで開く'}
                    >
                      <h3>{recipe.name}</h3>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-70 transition-opacity shrink-0" />
                    </a>
                    <p className="text-[11px] text-slate-400 font-rajdhani line-clamp-1">{recipe.enName}</p>
                  </div>
                </div>

                {/* Description or Masterbook */}
                {recipe.description && (
                  <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-3 leading-relaxed">
                    {recipe.description}
                  </p>
                )}

                {/* Recipe Stats Requirements */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950/40 p-2 rounded-xl border border-slate-800/60 text-[11px] mb-2 font-rajdhani">
                  <div>
                    <span className="text-slate-400 block text-[10px]">耐久</span>
                    <span className="text-slate-200 font-semibold">{recipe.durability}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">必要工数</span>
                    <span className="text-amber-300 font-semibold">{recipe.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">最大品質</span>
                    <span className="text-sky-300 font-semibold">{recipe.maxQuality}</span>
                  </div>
                </div>

                {/* Cost / Profit / Rate summary */}
                {economicsAvailable ? (
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60 text-[11px] mb-3 font-rajdhani">
                    <div>
                      <span className="text-slate-400 block text-[10px]">原価 (材料費)</span>
                      <span className="text-slate-200 font-semibold">{Math.round(econ.materialCost).toLocaleString()}G</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">利益額</span>
                      <span className={`font-semibold ${econ.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                        {econ.netProfit >= 0 ? '+' : ''}
                        {Math.round(econ.netProfit).toLocaleString()}G
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] flex items-center gap-1">
                        利益率
                        {econ.isEstimate && (
                          <span title="マケボ価格の一部が推定値です">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500/80" />
                          </span>
                        )}
                      </span>
                      <span className={`font-semibold ${econ.profitRatePercent >= 0 ? 'text-sky-300' : 'text-rose-400'}`}>
                        {econ.profitRatePercent}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 mb-3">
                    絞り込み件数が多いため原価・利益は非表示です（{MAX_ECONOMICS_ITEMS}件以下で表示）
                  </div>
                )}

                {/* Materials preview */}
                <div className="space-y-1 mb-3">
                  <span className="text-[10px] text-slate-400 font-semibold block">必要素材 ({recipe.materials.length} 種):</span>
                  <div className="flex flex-wrap gap-1">
                    {recipe.materials.map((m) => (
                      <span
                        key={m.itemId}
                        className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/60 flex items-center gap-1.5"
                      >
                        <ItemIcon itemId={m.itemId} icon={m.icon} name={m.name} size="xs" />
                        <span>{m.name}</span>
                        <span className="text-amber-400 font-semibold font-rajdhani">x{m.amount}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                {onSelectRecipeForWorkflow && (
                  <button
                    id={`btn-workflow-${recipe.id}`}
                    onClick={() => onSelectRecipeForWorkflow(recipe)}
                    className="w-full bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-200 border border-amber-500/40 hover:border-amber-500/60 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="レストラネット風 製作ワークフローへ"
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>🧭 製作ワークフロー (ToDo) を開く</span>
                  </button>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    id={`btn-cost-${recipe.id}`}
                    onClick={() => onSelectRecipeForCost(recipe)}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    title="Universalis原価・利益計算"
                  >
                    <BarChart3 className="w-3 h-3 text-amber-400" />
                    <span>原価</span>
                  </button>

                  <button
                    id={`btn-tree-${recipe.id}`}
                    onClick={() => onSelectRecipeForTree(recipe)}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    title="素材集めツリー & 未知タイマー"
                  >
                    <TreeDeciduous className="w-3 h-3 text-emerald-400" />
                    <span>素材</span>
                  </button>

                  <button
                    id={`btn-sim-${recipe.id}`}
                    onClick={() => onSelectRecipeForSim(recipe)}
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    title="マクロ生成 & シミュレータ"
                  >
                    <Play className="w-3 h-3 text-indigo-300" />
                    <span>シミュ</span>
                  </button>

                  <button
                    id={`btn-add-batch-${recipe.id}`}
                    onClick={() => onAddToBatch(recipe)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 rounded-lg text-xs border border-slate-700 transition-all flex items-center justify-center"
                    title="製作計画リストに追加"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
            {page + 1} / {totalPages} ページ（全{sortedRecipes.length.toLocaleString()}件）
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

      {filteredRecipes.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400 text-sm">該当するレシピが見つかりませんでした。</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedJob('ALL');
              setSelectedPatches([]);
              onChangePurpose('latestPatch');
            }}
            className="mt-3 text-xs text-amber-400 hover:underline inline-flex items-center gap-1"
          >
            最新パッチレシピ一覧に戻る <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
