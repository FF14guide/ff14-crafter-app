import React, { useState, useEffect, useCallback } from 'react';
import { Recipe, CrafterStats, InventorySyncData, UniversalisItemData } from '../../types/ff14';
import {
  buildRecipeTree,
  getIntermediateCraftsNeeded,
  getRawShortages,
  RecipeTreeNode,
} from '../../utils/recipeTreeBuilder';
import {
  getItemStockTotal,
  getItemStockBreakdown,
  generateWithdrawalList,
} from '../../utils/inventoryStorage';
import { LocationTooltip } from '../inventory/LocationTooltip';
import { ItemIcon } from '../common/ItemIcon';
import { JobIcon } from '../common/JobIcon';
import { CrafterStatsBar } from '../common/CrafterStatsBar';
import { generateGameMacro } from '../../utils/macroGenerator';
import { calculateEorzeaTime, EorzeaTimeState } from '../../utils/eorzeaTime';
import { fetchUniversalisMultiPrices } from '../../services/universalisApi';
import { getMaterialSource } from '../../data/materialSourceRegistry';
import {
  Check,
  Copy,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  DollarSign,
  TrendingUp,
  Hammer,
  Clock,
  MapPin,
  ExternalLink,
  Shield,
  Box,
  User,
  Backpack,
  ArrowRight,
  FileCode,
  Package,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  Globe,
} from 'lucide-react';

interface RestanetCraftingWorkflowProps {
  recipe: Recipe;
  stats: CrafterStats;
  inventoryData: InventorySyncData | null;
  selectedWorldOrDc: string;
  onChangeStats?: (newStats: CrafterStats) => void;
  onOpenInventorySync: () => void;
  onNavigateToSim: (recipe: Recipe) => void;
  onSelectAnotherRecipe?: (recipe: Recipe) => void;
}

export const RestanetCraftingWorkflow: React.FC<RestanetCraftingWorkflowProps> = ({
  recipe,
  stats,
  inventoryData,
  selectedWorldOrDc,
  onChangeStats,
  onOpenInventorySync,
  onNavigateToSim,
}) => {
  const [targetQuantity, setTargetQuantity] = useState<number>(1);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });
  const [copiedWithdrawal, setCopiedWithdrawal] = useState(false);
  const [copiedShortage, setCopiedShortage] = useState(false);
  const [copiedMacroInterId, setCopiedMacroInterId] = useState<string | null>(null);
  const [copiedFinalMacro, setCopiedFinalMacro] = useState<number | null>(null);
  const [etState, setEtState] = useState<EorzeaTimeState>(calculateEorzeaTime());
  const [livePrices, setLivePrices] = useState<Record<number, number>>({});
  const [liveMarketData, setLiveMarketData] = useState<Record<number, UniversalisItemData>>({});
  const [liveSellingPrice, setLiveSellingPrice] = useState<number>(recipe.defaultSellingPrice || 120000);
  const [loadingMarket, setLoadingMarket] = useState<boolean>(false);

  // Update ET time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setEtState(calculateEorzeaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Build tree and derived calculations
  const treeRoot = buildRecipeTree(recipe, targetQuantity, inventoryData);
  const intermediateCrafts = getIntermediateCraftsNeeded(recipe, targetQuantity, inventoryData);
  const rawShortages = getRawShortages(recipe, targetQuantity, inventoryData);

  // Fetch live prices for product and shortage raw materials
  const fetchWorkflowPrices = useCallback(async () => {
    setLoadingMarket(true);
    try {
      const allItemIds = [recipe.itemId, ...rawShortages.map((s) => s.itemId)];
      const fallbackMap: Record<number, number> = {
        [recipe.itemId]: recipe.defaultSellingPrice || 120000,
      };
      for (const s of rawShortages) {
        fallbackMap[s.itemId] = s.marketPriceNQ || 1000;
      }
      const dataMap = await fetchUniversalisMultiPrices(allItemIds, selectedWorldOrDc, fallbackMap);
      setLiveMarketData(dataMap);

      const newLivePrices: Record<number, number> = {};
      for (const s of rawShortages) {
        const itemMarket = dataMap[s.itemId];
        newLivePrices[s.itemId] = itemMarket?.minPriceNQ || itemMarket?.minPriceHQ || s.marketPriceNQ || 1000;
      }
      setLivePrices(newLivePrices);

      const productMarket = dataMap[recipe.itemId];
      if (productMarket) {
        setLiveSellingPrice(productMarket.minPriceHQ || productMarket.minPriceNQ || recipe.defaultSellingPrice || 120000);
      }
    } catch (e) {
      console.warn('Failed to load market prices for workflow:', e);
    } finally {
      setLoadingMarket(false);
    }
  }, [recipe, rawShortages.length, selectedWorldOrDc]);

  useEffect(() => {
    fetchWorkflowPrices();
  }, [fetchWorkflowPrices]);

  // Economic calculations using live market prices
  const unitSellingPrice = liveSellingPrice || recipe.defaultSellingPrice || 120000;
  const totalEstimatedRevenue = unitSellingPrice * targetQuantity;
  const marketBuyoutCost = rawShortages.reduce(
    (sum, item) => sum + (livePrices[item.itemId] || item.marketPriceNQ) * item.shortage,
    0
  );
  const tax = Math.round(totalEstimatedRevenue * 0.05);
  const netProfit = totalEstimatedRevenue - tax - marketBuyoutCost;
  const profitMargin =
    totalEstimatedRevenue > 0
      ? Math.round((netProfit / totalEstimatedRevenue) * 100)
      : 0;

  // Final Macro Generation
  const finalMacro = generateGameMacro(recipe, stats);

  // Toggle tree nodes
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Copy withdrawal list
  const handleCopyWithdrawalList = () => {
    const itemsForWithdrawal: { name: string; needed: number; locations: any[] }[] = [];

    // Check intermediate materials
    for (const mat of recipe.materials) {
      const breakdown = getItemStockBreakdown(mat.itemId, inventoryData);
      const totalOwned = getItemStockTotal(mat.itemId, inventoryData);
      if (totalOwned > 0) {
        itemsForWithdrawal.push({
          name: mat.name,
          needed: mat.amount * Math.ceil(targetQuantity / (recipe.yields || 1)),
          locations: breakdown,
        });
      }
    }

    // Check raw materials
    for (const raw of rawShortages) {
      const breakdown = getItemStockBreakdown(raw.itemId, inventoryData);
      if (raw.ownedTotal > 0) {
        itemsForWithdrawal.push({
          name: raw.name,
          needed: raw.neededTotal,
          locations: breakdown,
        });
      }
    }

    const text = generateWithdrawalList(itemsForWithdrawal);
    navigator.clipboard.writeText(text);
    setCopiedWithdrawal(true);
    setTimeout(() => setCopiedWithdrawal(false), 2500);
  };

  // Copy missing materials for chat
  const handleCopyShortageChat = () => {
    const lines = [
      `【FF14 Eorzean Crafter】不足素材・マケボ買足リスト`,
      `========================================`,
      `目標: ${recipe.name} × ${targetQuantity}個 (${selectedWorldOrDc})`,
      `----------------------------------------`,
      ...rawShortages.map((s) => {
        const dSource = s.detailedSource || getMaterialSource(s.itemId, s.name);
        const info = dSource
          ? `[${dSource.categoryLabel}: ${dSource.zone || dSource.details}]`
          : s.gatheringInfo
          ? `[採集: ${s.gatheringInfo.zone} ET${s.gatheringInfo.spawnTimes ? s.gatheringInfo.spawnTimes.join(':00, ') + ':00' : '常時'}]`
          : s.sourceType === 'tomestone'
          ? `[天道/美学 20交換]`
          : s.sourceType === 'bicolor'
          ? `[バイカラージェム交換]`
          : s.sourceType === 'reduction'
          ? `[刻限精選]`
          : `[モンスター/ショップ/マケボ]`;
        return `・${s.name} × 不足 ${s.shortage}個 ${info} (約 ${s.totalMarketCost.toLocaleString()} G)`;
      }),
      `----------------------------------------`,
      `マケボ買足合計: 約 ${marketBuyoutCost.toLocaleString()} Gil`,
      `想定純利益: 約 ${netProfit.toLocaleString()} Gil (${profitMargin}%)`,
      `========================================`,
      `https://clafter.eorzeanfishing.com`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedShortage(true);
    setTimeout(() => setCopiedShortage(false), 2500);
  };

  // Copy intermediate macro
  const handleCopyInterMacro = (interRecipe: Recipe) => {
    const macro = generateGameMacro(interRecipe, stats);
    const text = macro.macro1.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedMacroInterId(interRecipe.id);
    setTimeout(() => setCopiedMacroInterId(null), 2500);
  };

  // Copy final macro
  const handleCopyFinalMacroPart = (part: 1 | 2) => {
    const lines = part === 1 ? finalMacro.macro1 : finalMacro.macro2 || [];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedFinalMacro(part);
    setTimeout(() => setCopiedFinalMacro(null), 2500);
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: RecipeTreeNode, key: string, isLast = false) => {
    const isExpanded = expandedNodes[key] ?? true;
    const hasChildren = node.children && node.children.length > 0;
    const breakdown = getItemStockBreakdown(node.material.itemId, inventoryData);
    const isFulfilled = node.ownedTotal >= node.totalNeeded;

    return (
      <div key={key} className="relative">
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/40 text-xs transition-colors group">
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(key)}
              className="text-slate-400 hover:text-slate-200 p-0.5"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-3.5 inline-block text-slate-600">・</span>
          )}

          {/* Icon & Name */}
          <ItemIcon
            itemId={node.recipe?.itemId || node.material.itemId}
            icon={node.recipe?.icon || node.material.icon}
            name={node.material.name}
            size="xs"
          />
          <span
            className={`font-semibold truncate ${
              isFulfilled ? 'text-emerald-300' : 'text-slate-200'
            }`}
          >
            {node.material.name}
          </span>

          <span className="text-amber-400/90 font-rajdhani font-bold">
            ({node.totalNeeded})
          </span>

          {/* Subcraft badge */}
          {node.isSubCraft && (
            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded">
              中間
            </span>
          )}

          {/* Inventory stock badge with tooltip */}
          <div className="ml-auto">
            <LocationTooltip
              itemId={node.material.itemId}
              itemName={node.material.name}
              totalOwned={node.ownedTotal}
              requiredAmount={node.totalNeeded}
              breakdown={breakdown}
            />
          </div>
        </div>

        {/* Children branch */}
        {hasChildren && isExpanded && (
          <div className="ml-4 pl-3 border-l border-slate-800 space-y-1">
            {node.children.map((child, idx) =>
              renderTreeNode(child, `${key}_${idx}`, idx === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Inventory Sync Status */}
      <div className="bg-gradient-to-r from-slate-900 via-[#101422] to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
            🧭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                製作ワークフロー & ToDo (FF14 レストラネット式)
              </h2>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/40">
                Patch {recipe.patch || '7.2'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              左のレシピツリー展開と連動し、所持品引き出し・素材調達・中間/完成マクロを5ステップで完結
            </p>
          </div>
        </div>

        {/* Inventory Sync Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInventorySync}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all border ${
              inventoryData && inventoryData.inventories.length > 0
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 shadow-emerald-950/30'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white border-indigo-400/30 shadow-indigo-950/50'
            }`}
          >
            {inventoryData && inventoryData.inventories.length > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  📥 所持数反映中:{' '}
                  {inventoryData.selectedCharacters && inventoryData.selectedCharacters.length > 0 && !inventoryData.selectedCharacters.includes('ALL')
                    ? inventoryData.selectedCharacters.length === 1
                      ? `👤 ${inventoryData.selectedCharacters[0]}`
                      : `👥 ${inventoryData.selectedCharacters.length}名選択中 (${inventoryData.selectedCharacters.join(', ')})`
                    : inventoryData.selectedCharacter && inventoryData.selectedCharacter !== 'ALL'
                    ? `👤 ${inventoryData.selectedCharacter}`
                    : inventoryData.characters && inventoryData.characters.length > 1
                    ? '🌐 全キャラ合算'
                    : inventoryData.character || '同期済'}
                  <span className="ml-1 opacity-80 font-rajdhani">({inventoryData.inventories.length}品)</span>
                </span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                <span>📥 プラグイン所持数を一括反映</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Crafter Equipment Stats & Food / Potion / Specialist Bar */}
      {onChangeStats && <CrafterStatsBar stats={stats} onChangeStats={onChangeStats} />}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: RECIPE TREE (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  【左カラム】レシピツリー展開
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-rajdhani">
                全階層俯瞰
              </span>
            </div>

            {/* Tree Container */}
            <div className="space-y-1 overflow-x-auto max-h-[700px] pr-1">
              {renderTreeNode(treeRoot, 'root')}
            </div>

            {/* Tree Legend */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 充足
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> 一部所持
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span> 未所持 (要調達)
              </span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: 5-STEP WORKFLOW (8 cols) ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: TARGET QUANTITY & PROFIT ESTIMATION */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/40">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-100">
                  ① 製作数（欲しい数）の決定 & 利益予測
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-rajdhani bg-slate-950/60 px-2 py-1 rounded border border-slate-700">
                  マケボ: <b className="text-amber-300">{selectedWorldOrDc}</b>
                </span>
                <button
                  onClick={fetchWorkflowPrices}
                  disabled={loadingMarket}
                  className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 transition-colors"
                  title="Universalisから最新価格を再取得"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingMarket ? 'animate-spin text-amber-400' : ''}`} />
                  <span>更新</span>
                </button>
              </div>
            </div>

            {/* Item Card with Stepper */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ItemIcon itemId={recipe.itemId} icon={recipe.icon} name={recipe.name} size="xl" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{recipe.name}</span>
                    <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700 font-semibold flex items-center gap-1">
                      <JobIcon job={recipe.job} size="xs" />
                      <span>{recipe.job} Lv{recipe.level}</span>
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                      IL{recipe.ilvl}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1クラフトで {recipe.yields || 1}個 完成 | 耐久 {recipe.durability}
                  </p>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setTargetQuantity(Math.max(1, targetQuantity - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 bg-transparent text-center text-amber-300 font-bold font-rajdhani text-sm focus:outline-none"
                />
                <span className="text-xs text-slate-400 pr-1">個</span>
                <button
                  type="button"
                  onClick={() => setTargetQuantity(targetQuantity + 1)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Profit Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">想定売上 (単価 {unitSellingPrice.toLocaleString()} G)</span>
                <span className="text-sm font-bold font-rajdhani text-amber-300">
                  {totalEstimatedRevenue.toLocaleString()} G
                </span>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">不足素材 買足原価</span>
                <span className="text-sm font-bold font-rajdhani text-sky-300">
                  {marketBuyoutCost.toLocaleString()} G
                </span>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">推定純利益 (税引後)</span>
                <span className={`text-sm font-bold font-rajdhani ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} G
                </span>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">利益率</span>
                <span className="text-sm font-bold font-rajdhani text-emerald-400">
                  {profitMargin}%
                </span>
              </div>
            </div>
          </div>

          {/* STEP 2: INTERMEDIATE MATERIALS & INVENTORY SUBTRACTION */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500"></div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center text-xs border border-sky-500/40">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-100">
                  ② 中間素材の所持数（プラグインから自動反映）
                </h3>
              </div>

              <button
                onClick={handleCopyWithdrawalList}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-medium transition-all"
              >
                {copiedWithdrawal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWithdrawal ? '引き出しリストをコピー！' : '引き出しリストをコピー'}</span>
              </button>
            </div>

            {/* Intermediate materials list */}
            <div className="space-y-2">
              {recipe.materials
                .filter((m) => m.sourceType === 'subcraft')
                .map((mat) => {
                  const required = mat.amount * Math.ceil(targetQuantity / (recipe.yields || 1));
                  const owned = getItemStockTotal(mat.itemId, inventoryData);
                  const shortage = Math.max(0, required - owned);
                  const breakdown = getItemStockBreakdown(mat.itemId, inventoryData);
                  const isComplete = owned >= required;

                  return (
                    <div
                      key={mat.itemId}
                      className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <ItemIcon itemId={mat.itemId} icon={mat.icon} name={mat.name} size="sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{mat.name}</span>
                            <LocationTooltip
                              itemId={mat.itemId}
                              itemName={mat.name}
                              totalOwned={owned}
                              requiredAmount={required}
                              breakdown={breakdown}
                            />
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            必要: <b className="text-amber-300">{required}個</b>
                            {isComplete ? (
                              <span className="ml-2 text-emerald-400 font-semibold">
                                ✅ 手持ち・保管庫で充足 (新規製作不要)
                              </span>
                            ) : (
                              <span className="ml-2 text-rose-400 font-semibold">
                                ➔ 不足: {shortage}個 (要製作)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Location text snapshot */}
                      <div className="text-right text-[11px] text-slate-400">
                        {breakdown.length > 0 ? (
                          <span>({breakdown.map((b) => `${b.location}に${b.quantity}`).join(', ')})</span>
                        ) : (
                          <span className="text-slate-500">未所持</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* STEP 3: RAW MATERIAL GATHERING & PROCUREMENT */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs border border-emerald-500/40">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    ③ 末端素材の採集・調達リスト（不足分のみ）
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    中間素材の所持数を差し引いた実質不足量
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyShortageChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-all"
                >
                  {copiedShortage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedShortage ? 'チャット用リストをコピー！' : '📋 不足素材をチャット用コピー'}</span>
                </button>
              </div>
            </div>

            {/* Raw materials list */}
            {rawShortages.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-xl text-center text-xs text-emerald-400">
                🎉 すべての必要素材がインベントリ・保管庫に揃っています！調達不要です。
              </div>
            ) : (
              <div className="space-y-2.5">
                {rawShortages.map((item) => {
                  const gInfo = item.gatheringInfo;
                  const breakdown = getItemStockBreakdown(item.itemId, inventoryData);

                  return (
                    <div
                      key={item.itemId}
                      className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ItemIcon itemId={item.itemId} name={item.name} size="sm" />
                          <span className="text-xs font-bold text-slate-100">{item.name}</span>
                          <span className="text-xs text-amber-300 font-rajdhani font-bold">
                            [所持: {item.ownedTotal} / 必要: {item.neededTotal}]
                          </span>
                          <span className="text-xs font-bold text-rose-400">
                            ➔ 不足 {item.shortage}個
                          </span>
                          <LocationTooltip
                            itemId={item.itemId}
                            itemName={item.name}
                            totalOwned={item.ownedTotal}
                            requiredAmount={item.neededTotal}
                            breakdown={breakdown}
                          />
                        </div>

                        {/* Gathering or source info */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          {(() => {
                            const dSource = item.detailedSource || getMaterialSource(item.itemId, item.name);
                            if (dSource) {
                              if (dSource.sourceType === 'legendary') {
                                return (
                                  <>
                                    <span className="bg-amber-950/60 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-medium flex items-center gap-1 font-rajdhani">
                                      <Clock className="w-3 h-3 text-amber-400" />
                                      伝説 ET {dSource.spawnHours ? dSource.spawnHours.join(':00, ') + ':00~' : ''} ({dSource.slot ? `${dSource.slot}段目` : ''})
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-300">
                                      <MapPin className="w-3 h-3 text-sky-400" />
                                      {dSource.zone} {dSource.coordinates && `(${dSource.coordinates})`}
                                    </span>
                                    <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-slate-400 border border-slate-700">
                                      {dSource.job} Lv{dSource.level}
                                    </span>
                                    {dSource.folkloreBook && (
                                      <span className="text-[10px] text-amber-400/80">📜 {dSource.folkloreBook}</span>
                                    )}
                                  </>
                                );
                              }
                              if (dSource.sourceType === 'ephemeral') {
                                return (
                                  <>
                                    <span className="bg-purple-950/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-purple-400" />
                                      刻限精選 / 紫貨・オレンジ貨
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-300">
                                      <MapPin className="w-3 h-3 text-purple-300" />
                                      {dSource.zone}
                                    </span>
                                    {dSource.spawnHours && (
                                      <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-purple-300 border border-slate-700 font-rajdhani">
                                        ET {dSource.spawnHours.join(':00, ')}:00~
                                      </span>
                                    )}
                                  </>
                                );
                              }
                              if (dSource.sourceType === 'gathering') {
                                return (
                                  <>
                                    <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-emerald-400" />
                                      常時採集 ({dSource.job} Lv{dSource.level || '90+'})
                                    </span>
                                    <span className="text-slate-300">
                                      {dSource.zone} {dSource.coordinates && `(${dSource.coordinates})`}
                                    </span>
                                    {dSource.vendorCost && (
                                      <span className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px] border border-slate-800">
                                        🛒 {dSource.vendorCost}
                                      </span>
                                    )}
                                  </>
                                );
                              }
                              if (dSource.sourceType === 'tomestone') {
                                return (
                                  <>
                                    <span className="bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-medium">
                                      🪙 トームストーン: 天道 / 美学 20個交換
                                    </span>
                                    <span className="text-slate-300">
                                      {dSource.zone} {dSource.coordinates && `(${dSource.coordinates})`}
                                    </span>
                                  </>
                                );
                              }
                              if (dSource.sourceType === 'bicolor') {
                                return (
                                  <>
                                    <span className="bg-orange-950/60 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded font-medium">
                                      💎 バイカラージェム 10個交換
                                    </span>
                                    <span className="text-slate-300">
                                      {dSource.zone} {dSource.coordinates && `(${dSource.coordinates})`}
                                    </span>
                                  </>
                                );
                              }
                              if (dSource.sourceType === 'monster') {
                                return (
                                  <>
                                    <span className="bg-rose-950/60 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-medium">
                                      ⚔️ モンスター討伐 / ジェム交換
                                    </span>
                                    <span className="text-slate-300">
                                      {dSource.monsterName || dSource.zone} ({dSource.exchangeRate || 'ジェム2個'})
                                    </span>
                                  </>
                                );
                              }
                            }

                            if (gInfo) {
                              return (
                                <>
                                  <span className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 border border-slate-700 flex items-center gap-1 font-rajdhani">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    {gInfo.spawnTimes ? `ET ${gInfo.spawnTimes.join(':00, ')}:00~` : '常時採集'}
                                  </span>
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <MapPin className="w-3 h-3 text-sky-400" />
                                    {gInfo.location} ({gInfo.job})
                                  </span>
                                  {gInfo.slot && (
                                    <span className="text-slate-400">{gInfo.slot}段目</span>
                                  )}
                                </>
                              );
                            }

                            if (item.sourceType === 'tomestone') {
                              return (
                                <span className="bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-medium">
                                  トームストーン: 天道 / 美学 20個交換
                                </span>
                              );
                            }

                            if (item.sourceType === 'reduction') {
                              return (
                                <span className="bg-purple-950/60 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-medium">
                                  刻限精選 (霊砂)
                                </span>
                              );
                            }

                            return <span className="text-slate-400">マケボ調達 / 採集</span>;
                          })()}
                        </div>
                      </div>

                      {/* Market Price calculation */}
                      <div className="text-right font-rajdhani">
                        {(() => {
                          const liveUnitPrice = livePrices[item.itemId] ?? item.marketPriceNQ;
                          const liveTotal = liveUnitPrice * item.shortage;
                          const itemMarket = liveMarketData[item.itemId];
                          return (
                            <>
                              <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                                マケボ最安 単価 {liveUnitPrice.toLocaleString()} G
                                {itemMarket?.isDcWide && (
                                  <span title="このワールドには出品がなかったため、DC全体の価格です">
                                    <Globe className="w-3 h-3 text-sky-400/80" />
                                  </span>
                                )}
                                {itemMarket?.isEstimate && (
                                  <span title={itemMarket.estimateReason || '推定値（マケボ未取得）'}>
                                    <AlertTriangle className="w-3 h-3 text-amber-500/80" />
                                  </span>
                                )}
                              </span>
                              <span className="text-xs font-bold text-sky-300">
                                不足分計: {liveTotal.toLocaleString()} Gil
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}

                {/* Total Procurement Cost Banner */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">マケボ買い足し合計金額 (全不足分を一括購入した場合):</span>
                  <span className="text-sm font-bold font-rajdhani text-sky-300">
                    {marketBuyoutCost.toLocaleString()} Gil
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: INTERMEDIATE CRAFTING & MACRO OUTPUT */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs border border-indigo-500/40">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    ④ 中間素材の製作 & マクロ出力
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    手持ち所持数を考慮した、実際に製作すべき回数
                  </span>
                </div>
              </div>
            </div>

            {intermediateCrafts.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center text-xs text-emerald-400">
                ✅ 中間素材はすべて在庫から充当されるため、追加製作は不要です！
              </div>
            ) : (
              <div className="space-y-3">
                {intermediateCrafts.map((inter) => {
                  const isCopied = copiedMacroInterId === inter.recipe.id;

                  return (
                    <div
                      key={inter.recipe.id}
                      className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <ItemIcon
                          itemId={inter.recipe.itemId}
                          icon={inter.recipe.icon}
                          name={inter.recipe.name}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{inter.recipe.name}</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.2 rounded border border-amber-500/40">
                              {inter.craftsNeeded} 回製作
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <JobIcon job={inter.recipe.job} size="xs" />
                            <span>{inter.recipe.job}</span>
                            <span>| 40耐久 | 35秒高速ワンポチマクロ推奨</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyInterMacro(inter.recipe)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-950/40 transition-all"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'マクロをコピー！' : '⚡ 最適マクロ出力・コピー'}</span>
                        </button>

                        <button
                          onClick={() => onNavigateToSim(inter.recipe)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-all flex items-center gap-1"
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          <span>シミュ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 5: FINAL ITEM CRAFTING & MACRO OUTPUT */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs border border-purple-500/40">
                  5
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    ⑤ 完成品の製作 & ゲーム内マクロ出力
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {recipe.name} × {targetQuantity}個 の最終クラフト (耐久 {recipe.durability})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateToSim(recipe)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>シミュレータで回しを調整</span>
                </button>
              </div>
            </div>

            {finalMacro.warning && (
              <div className="mb-4 flex items-start gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{finalMacro.warning}</span>
              </div>
            )}

            {/* Macro Parts Output Container */}
            <div className="space-y-3">
              {/* Macro 1 */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">
                      【マクロ 1】{finalMacro.isSingleMacro ? '完成まで一括実行' : '前半パート'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-rajdhani">
                      ({finalMacro.macro1.length}行 / 約32秒)
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyFinalMacroPart(1)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-all"
                  >
                    {copiedFinalMacro === 1 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFinalMacro === 1 ? 'コピー完了！' : 'マクロ1 コピー'}</span>
                  </button>
                </div>

                <pre className="bg-slate-900/90 p-2.5 rounded-lg text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto border border-slate-800/80 max-h-32">
                  {finalMacro.macro1.join('\n')}
                </pre>
              </div>

              {/* Macro 2 if present */}
              {finalMacro.macro2 && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-slate-200">
                        【マクロ 2】{finalMacro.isFullyAchieved ? '完成・100%HQフィニッシュ' : '後半パート'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-rajdhani">
                        ({finalMacro.macro2.length}行 / 約26秒)
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyFinalMacroPart(2)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded text-xs transition-all"
                    >
                      {copiedFinalMacro === 2 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedFinalMacro === 2 ? 'コピー完了！' : 'マクロ2 コピー'}</span>
                    </button>
                  </div>

                  <pre className="bg-slate-900/90 p-2.5 rounded-lg text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto border border-slate-800/80 max-h-32">
                    {finalMacro.macro2.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
