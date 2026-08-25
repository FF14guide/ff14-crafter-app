import React, { useState, useEffect, useCallback } from 'react';
import { BatchCraftItem, Recipe, CrafterStats, InventorySyncData, InventoryItemLocation, UniversalisItemData } from '../types/ff14';
import { RECIPES_DATABASE } from '../data/recipes';
import { ItemIcon } from './common/ItemIcon';
import { JobIcon } from './common/JobIcon';
import { CrafterStatsBar } from './common/CrafterStatsBar';
import { LocationTooltip } from './inventory/LocationTooltip';
import {
  buildBatchRecipeTree,
  getBatchIntermediateCraftRequirements,
  getBatchRawShortages,
  RecipeTreeNode,
} from '../utils/recipeTreeBuilder';
import {
  getItemStockTotal,
  getItemStockBreakdown,
  generateWithdrawalList,
} from '../utils/inventoryStorage';
import { generateGameMacro, getEffectiveCrafterStats } from '../utils/macroGenerator';
import { getMaterialSource } from '../data/materialSourceRegistry';
import { fetchUniversalisMultiPrices } from '../services/universalisApi';
import {
  ListPlus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  DollarSign,
  TrendingUp,
  PackageCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Hammer,
  FileCode,
  Layers,
  Search,
  AlertTriangle,
} from 'lucide-react';

interface CraftingBatchPlannerProps {
  batchItems: BatchCraftItem[];
  crafterStats: CrafterStats;
  inventoryData: InventorySyncData | null;
  selectedWorldOrDc?: string;
  onChangeStats: (newStats: CrafterStats) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onSelectRecipeForSim: (recipe: Recipe) => void;
  onAddToBatch?: (recipe: Recipe) => void;
  onOpenInventorySync?: () => void;
}

export const CraftingBatchPlanner: React.FC<CraftingBatchPlannerProps> = ({
  batchItems,
  crafterStats,
  inventoryData,
  selectedWorldOrDc = 'Mana',
  onChangeStats,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  onSelectRecipeForSim,
  onAddToBatch,
  onOpenInventorySync,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });
  const [copiedWithdrawal, setCopiedWithdrawal] = useState(false);
  const [copiedShortage, setCopiedShortage] = useState(false);
  const [copiedPlanSummary, setCopiedPlanSummary] = useState(false);
  const [copiedMacroInterId, setCopiedMacroInterId] = useState<string | null>(null);
  const [copiedFinalMacro, setCopiedFinalMacro] = useState<{ itemId: number; part: number } | null>(null);
  const [livePrices, setLivePrices] = useState<Record<number, number>>({});
  const [liveMarketData, setLiveMarketData] = useState<Record<number, UniversalisItemData>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedQuickRecipeId, setSelectedQuickRecipeId] = useState<string>(RECIPES_DATABASE[0].id);

  // Derived Batch Trees and Requirements
  const batchTrees = buildBatchRecipeTree(batchItems, inventoryData);
  const intermediateCrafts = getBatchIntermediateCraftRequirements(batchItems, inventoryData);
  const rawShortages = getBatchRawShortages(batchItems, inventoryData);

  // Fetch live market prices for all batch items, intermediate materials, and raw shortages
  const fetchBatchPrices = useCallback(async () => {
    if (batchItems.length === 0) return;
    setLoadingPrices(true);
    try {
      const allIds = new Set<number>();
      const fallbackMap: Record<number, number> = {};

      for (const item of batchItems) {
        allIds.add(item.recipe.itemId);
        fallbackMap[item.recipe.itemId] = item.recipe.defaultSellingPrice || 5000;
        for (const mat of item.recipe.materials) {
          allIds.add(mat.itemId);
          fallbackMap[mat.itemId] = mat.defaultPriceNQ || 500;
        }
      }

      for (const raw of rawShortages) {
        allIds.add(raw.itemId);
        fallbackMap[raw.itemId] = raw.marketPriceNQ || 500;
      }

      const marketData = await fetchUniversalisMultiPrices(Array.from(allIds), selectedWorldOrDc, fallbackMap);
      setLiveMarketData(marketData);
      const newLivePrices: Record<number, number> = {};
      for (const [idStr, data] of Object.entries(marketData)) {
        const id = parseInt(idStr);
        newLivePrices[id] = data.minPriceNQ || data.minPriceHQ || fallbackMap[id] || 500;
      }
      setLivePrices(newLivePrices);
    } catch (e) {
      console.warn('Failed to load batch market prices:', e);
    } finally {
      setLoadingPrices(false);
    }
  }, [batchItems, rawShortages.length, selectedWorldOrDc]);

  useEffect(() => {
    fetchBatchPrices();
  }, [fetchBatchPrices]);

  // Economic calculations using live market prices
  let totalEstimatedRevenue = 0;
  for (const item of batchItems) {
    const unitPrice = livePrices[item.recipe.itemId] || item.recipe.defaultSellingPrice || 5000;
    totalEstimatedRevenue += unitPrice * item.quantity;
  }

  const marketBuyoutCost = rawShortages.reduce(
    (sum, item) => sum + (livePrices[item.itemId] || item.marketPriceNQ) * item.shortage,
    0
  );

  const tax = Math.round(totalEstimatedRevenue * 0.05);
  const netProfit = totalEstimatedRevenue - tax - marketBuyoutCost;
  const profitMargin =
    totalEstimatedRevenue > 0 ? Math.round((netProfit / totalEstimatedRevenue) * 100) : 0;

  // Toggle tree node expansion
  const toggleNode = (key: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExpandAll = () => {
    const newExpanded: Record<string, boolean> = { root: true };
    batchTrees.forEach((bt, idx) => {
      newExpanded[`batch_${idx}`] = true;
      bt.treeRoot.children.forEach((c, cIdx) => {
        newExpanded[`batch_${idx}_node_${cIdx}`] = true;
      });
    });
    setExpandedNodes(newExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({ root: false });
  };

  // Copy withdrawal list for retainers/character bags
  const handleCopyWithdrawalList = () => {
    const itemsForWithdrawal: { name: string; needed: number; locations: InventoryItemLocation[] }[] = [];

    // Check intermediate crafts
    for (const inter of intermediateCrafts) {
      const breakdown = getItemStockBreakdown(inter.recipe.itemId, inventoryData);
      const totalOwned = getItemStockTotal(inter.recipe.itemId, inventoryData);
      if (totalOwned > 0) {
        itemsForWithdrawal.push({
          name: inter.recipe.name,
          needed: inter.neededTotal,
          locations: breakdown,
        });
      }
    }

    // Check raw shortages
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

  // Copy shortage raw materials for chat
  const handleCopyShortageChat = () => {
    const lines = [
      `【FF14 Eorzean Crafter】一括製作計画 不足素材・マケボ買足リスト`,
      `========================================`,
      `【製作対象 (${selectedWorldOrDc})】`,
      ...batchItems.map((b) => `・${b.recipe.name} × ${b.quantity}個 (${b.recipe.job})`),
      `----------------------------------------`,
      `【不足素材一覧】`,
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
        const unitP = livePrices[s.itemId] || s.marketPriceNQ;
        return `・${s.name} × 不足 ${s.shortage}個 ${info} (約 ${(unitP * s.shortage).toLocaleString()} G)`;
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

  // Copy full plan summary
  const handleCopyPlanSummary = () => {
    const lines = [
      `【FF14 Eorzean Crafter】一括製作計画サマリー (${selectedWorldOrDc})`,
      `========================================`,
      `【製作予定アイテム】`,
      ...batchItems.map((b) => `・${b.recipe.name} × ${b.quantity}個 (${b.recipe.job} Lv${b.recipe.level})`),
      `----------------------------------------`,
      `【中間素材製作予定】`,
      ...intermediateCrafts.map(
        (i) => `・${i.recipe.name} × ${i.neededTotal}個 (手持ち${i.ownedTotal}個 ➔ 要製作 ${i.craftsNeeded}回)`
      ),
      `----------------------------------------`,
      `【経済予測】`,
      `総想定売上: ${totalEstimatedRevenue.toLocaleString()} Gil`,
      `素材買足原価: ${marketBuyoutCost.toLocaleString()} Gil`,
      `想定純利益: ${netProfit.toLocaleString()} Gil (${profitMargin}%)`,
      `========================================`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedPlanSummary(true);
    setTimeout(() => setCopiedPlanSummary(false), 2500);
  };

  // Copy intermediate macro
  const handleCopyInterMacro = (interRecipe: Recipe) => {
    const macro = generateGameMacro(interRecipe, crafterStats);
    const text = macro.macro1.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedMacroInterId(interRecipe.id);
    setTimeout(() => setCopiedMacroInterId(null), 2500);
  };

  // Copy final product macro part
  const handleCopyFinalMacroPart = (recipe: Recipe, part: 1 | 2) => {
    const macro = generateGameMacro(recipe, crafterStats);
    const lines = part === 1 ? macro.macro1 : macro.macro2 || [];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedFinalMacro({ itemId: recipe.itemId, part });
    setTimeout(() => setCopiedFinalMacro(null), 2500);
  };

  // Handle quick adding of a recipe
  const handleAddQuickRecipe = () => {
    const found = RECIPES_DATABASE.find((r) => r.id === selectedQuickRecipeId);
    if (found && onAddToBatch) {
      onAddToBatch(found);
    }
  };

  // Recursive Tree Node Renderer for Batch Tree
  const renderTreeNode = (node: RecipeTreeNode, key: string) => {
    const isExpanded = expandedNodes[key] ?? true;
    const hasChildren = node.children && node.children.length > 0;
    const breakdown = getItemStockBreakdown(node.material.itemId, inventoryData);
    const isFulfilled = node.ownedTotal >= node.totalNeeded;

    return (
      <div key={key} className="relative">
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/40 text-xs transition-colors group">
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

          <ItemIcon
            itemId={node.recipe?.itemId || node.material.itemId}
            icon={node.recipe?.icon || node.material.icon}
            name={node.material.name}
            size="xs"
          />

          <span
            className={`font-medium truncate max-w-[140px] sm:max-w-[170px] ${
              node.isSubCraft ? 'text-amber-200 font-semibold' : 'text-slate-300'
            }`}
          >
            {node.material.name}
          </span>

          <div className="ml-auto flex items-center gap-1.5 text-[11px] font-rajdhani">
            <span className="text-slate-400">
              {node.ownedTotal} / <b className="text-amber-300">{node.totalNeeded}</b>
            </span>

            {isFulfilled ? (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1 rounded border border-emerald-500/30">
                在庫OK
              </span>
            ) : (
              <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 px-1 rounded border border-rose-500/30">
                不足{node.shortage}
              </span>
            )}

            <LocationTooltip
              itemId={node.material.itemId}
              itemName={node.material.name}
              totalOwned={node.ownedTotal}
              requiredAmount={node.totalNeeded}
              breakdown={breakdown}
            />
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4 pl-2 border-l border-slate-800 space-y-0.5">
            {node.children.map((child, cIdx) =>
              renderTreeNode(child, `${key}_child_${cIdx}`)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
            📋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                一括製作計画 & ワークフロー (Batch Crafting Workflow)
              </h2>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/40">
                登録: {batchItems.length} 品目
              </span>
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                {selectedWorldOrDc} Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              複数アイテムの必要素材ツリー・在庫引き出し・マケボ買足・装備ステータス連動マクロを①〜⑤で一括管理
            </p>
          </div>
        </div>

        {batchItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchBatchPrices}
              disabled={loadingPrices}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPrices ? 'animate-spin text-amber-400' : ''}`} />
              <span>マケボ価格更新</span>
            </button>
            <button
              onClick={handleCopyPlanSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs border border-amber-500/40 font-medium transition-all"
            >
              {copiedPlanSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPlanSummary ? '計画サマリーをコピー！' : '計画サマリーをコピー'}</span>
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs border border-slate-700 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>計画全クリア</span>
            </button>
          </div>
        )}
      </div>

      {/* Crafter Equipment Stats & Food / Potion / Specialist Bar */}
      <CrafterStatsBar stats={crafterStats} onChangeStats={onChangeStats} />

      {batchItems.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-3xl mb-4 text-slate-400">
            📦
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-2">計画リストは空です</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            「レシピ一覧」または下のクイック追加から製作したいアイテムを追加すると、左カラムでのツリー展開と右カラムでの①から⑤の工程を一括管理できます。
          </p>

          <div className="inline-flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
            <select
              aria-label="クイック追加レシピ選択"
              value={selectedQuickRecipeId}
              onChange={(e) => setSelectedQuickRecipeId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              {RECIPES_DATABASE.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.patch}] {r.name} ({r.job} IL{r.ilvl})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddQuickRecipe}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>計画に追加</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2-COLUMN LAYOUT: Left = Batch Tree (4 cols), Right = 5-Step Workflow (8 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT COLUMN: BATCH RECIPE TREE (4 cols) ================= */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Add Selector in Tree Column */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ListPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>アイテムを追加</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="計画へレシピ追加"
                  value={selectedQuickRecipeId}
                  onChange={(e) => setSelectedQuickRecipeId(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 truncate"
                >
                  {RECIPES_DATABASE.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.patch}] {r.name} ({r.job})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddQuickRecipe}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>追加</span>
                </button>
              </div>
            </div>

            {/* Tree Container */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg sticky top-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-slate-100">計画アイテム & 素材ツリー</h3>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={handleExpandAll}
                    className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    全展開
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    全折畳
                  </button>
                </div>
              </div>

              {/* List of Batch Items with Tree */}
              <div className="space-y-4">
                {batchTrees.map((bt, idx) => {
                  const isRootExpanded = expandedNodes[`batch_${idx}`] ?? true;
                  const item = bt.batchItem;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-2.5 space-y-2"
                    >
                      {/* Batch Item Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => toggleNode(`batch_${idx}`)}
                            className="text-slate-400 hover:text-slate-200 p-0.5"
                          >
                            {isRootExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <ItemIcon
                            itemId={item.recipe.itemId}
                            icon={item.recipe.icon}
                            name={item.recipe.name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-200 text-xs truncate">
                              {item.recipe.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-rajdhani">
                              <JobIcon job={item.recipe.job} size="xs" />
                              <span>{item.recipe.job} Lv{item.recipe.level}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quantity Stepper & Remove */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={item.quantity}
                              onChange={(e) =>
                                onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-8 bg-transparent text-center text-xs font-bold font-rajdhani text-amber-300 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-300 hover:bg-slate-800 rounded"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded"
                            title="計画から削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tree Children of this Item */}
                      {isRootExpanded && (
                        <div className="pl-2 border-l border-slate-800/80 space-y-0.5 mt-1 pt-1 border-t border-t-slate-800/40">
                          {bt.treeRoot.children.map((child, cIdx) =>
                            renderTreeNode(child, `batch_${idx}_node_${cIdx}`)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: 5-STEP WORKFLOW (8 cols) ================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* STEP 1: TARGET QUANTITIES & AGGREGATE PROFIT */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/40">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      ① 製作目標一覧 & 総合利益予測
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      登録された全{batchItems.length}品目の合算売上・原価・純利益
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-rajdhani bg-slate-950/60 px-2 py-1 rounded border border-slate-700">
                    マケボ: <b className="text-amber-300">{selectedWorldOrDc}</b>
                  </span>
                  <button
                    onClick={fetchBatchPrices}
                    disabled={loadingPrices}
                    className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingPrices ? 'animate-spin text-amber-400' : ''}`} />
                    <span>更新</span>
                  </button>
                </div>
              </div>

              {/* Items Grid in Step 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {batchItems.map((item) => {
                  const unitPrice = livePrices[item.recipe.itemId] || item.recipe.defaultSellingPrice || 5000;
                  const itemRevenue = unitPrice * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ItemIcon itemId={item.recipe.itemId} icon={item.recipe.icon} name={item.recipe.name} size="md" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate">{item.recipe.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <JobIcon job={item.recipe.job} size="xs" />
                            <span>{item.recipe.job} Lv{item.recipe.level}</span>
                            <span>| 単価: {unitPrice.toLocaleString()} G</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-rajdhani shrink-0">
                        <div className="text-xs font-bold text-amber-300">× {item.quantity} 個</div>
                        <div className="text-[11px] text-slate-400">計 {itemRevenue.toLocaleString()} G</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Profit KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">総想定売上 (税引前)</span>
                  <span className="text-sm font-bold font-rajdhani text-amber-300">
                    {totalEstimatedRevenue.toLocaleString()} G
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">全不足素材 買足原価</span>
                  <span className="text-sm font-bold font-rajdhani text-sky-300">
                    {marketBuyoutCost.toLocaleString()} G
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">想定純利益 (マケボ税5%控除後)</span>
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

            {/* STEP 2: AGGREGATED INTERMEDIATE MATERIALS & INVENTORY SUBTRACTION */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500"></div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center text-xs border border-sky-500/40">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      ② 中間素材の集約所持数 & 保管庫引き出しリスト
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      リテイナー・チョコボかばん・所持品の手持ち在庫を自動集約
                    </span>
                  </div>
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
              {intermediateCrafts.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center text-xs text-slate-400">
                  中間素材を必要とするレシピは含まれていません
                </div>
              ) : (
                <div className="space-y-2">
                  {intermediateCrafts.map((inter) => {
                    const breakdown = getItemStockBreakdown(inter.recipe.itemId, inventoryData);
                    const isComplete = inter.ownedTotal >= inter.neededTotal;
                    const shortage = Math.max(0, inter.neededTotal - inter.ownedTotal);

                    return (
                      <div
                        key={inter.subRecipeId}
                        className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <ItemIcon
                            itemId={inter.recipe.itemId}
                            icon={inter.recipe.icon}
                            name={inter.recipe.name}
                            size="sm"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-100">{inter.recipe.name}</span>
                              <LocationTooltip
                                itemId={inter.recipe.itemId}
                                itemName={inter.recipe.name}
                                totalOwned={inter.ownedTotal}
                                requiredAmount={inter.neededTotal}
                                breakdown={breakdown}
                              />
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              必要総数: <b className="text-amber-300">{inter.neededTotal}個</b>
                              {isComplete ? (
                                <span className="ml-2 text-emerald-400 font-semibold">
                                  ✅ 手持ち・保管庫で充足 (新規製作不要)
                                </span>
                              ) : (
                                <span className="ml-2 text-rose-400 font-semibold">
                                  ➔ 不足: {shortage}個 (要製作 {inter.craftsNeeded}回)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

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
              )}
            </div>

            {/* STEP 3: RAW MATERIAL GATHERING & PROCUREMENT LIST */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs border border-emerald-500/40">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      ③ 末端素材の採集・調達リスト（不足分のみ集約）
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      中間素材の所持数を差し引いた実質不足量と入手先
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyShortageChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-all"
                >
                  {copiedShortage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedShortage ? 'チャット用リストをコピー！' : '📋 不足素材をチャット用コピー'}</span>
                </button>
              </div>

              {/* Raw materials list */}
              {rawShortages.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-xl text-center text-xs text-emerald-400">
                  🎉 すべての必要末端素材がインベントリ・保管庫に揃っています！調達不要です。
                </div>
              ) : (
                <div className="space-y-2.5">
                  {rawShortages.map((item) => {
                    const gInfo = item.gatheringInfo;
                    const breakdown = getItemStockBreakdown(item.itemId, inventoryData);
                    const unitPrice = livePrices[item.itemId] || item.marketPriceNQ;
                    const itemCost = unitPrice * item.shortage;

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

                          {/* Gathering / source tags */}
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
                                    <span className="bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-medium">
                                      🪙 トームストーン: 天道 / 美学 20個交換 ({dSource.zone})
                                    </span>
                                  );
                                }
                                if (dSource.sourceType === 'bicolor') {
                                  return (
                                    <span className="bg-orange-950/60 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded font-medium">
                                      💎 バイカラージェム 10個交換 ({dSource.zone})
                                    </span>
                                  );
                                }
                                if (dSource.sourceType === 'monster') {
                                  return (
                                    <span className="bg-rose-950/60 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-medium">
                                      ⚔️ モンスター討伐 / ジェム交換 ({dSource.monsterName || dSource.zone})
                                    </span>
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
                                  </>
                                );
                              }

                              return <span className="text-slate-400">マケボ調達 / 採集</span>;
                            })()}
                          </div>
                        </div>

                        {/* Price Subtotal */}
                        <div className="text-right font-rajdhani">
                          <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                            単価 {unitPrice.toLocaleString()} G
                            {liveMarketData[item.itemId]?.isEstimate && (
                              <span title={liveMarketData[item.itemId]?.estimateReason || '推定値（マケボ未取得）'}>
                                <AlertTriangle className="w-3 h-3 text-amber-500/80" />
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-bold text-sky-300">
                            不足計: {itemCost.toLocaleString()} Gil
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">マケボ買い足し合計金額:</span>
                    <span className="text-sm font-bold font-rajdhani text-sky-300">
                      {marketBuyoutCost.toLocaleString()} Gil
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 4: INTERMEDIATE CRAFTING & STATS-ADAPTIVE MACROS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs border border-indigo-500/40">
                    4
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      ④ 中間素材の製作 & ステータス連動マクロ出力
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      現在の装備・飯薬・マイスター値に合わせて最適化されたクラフトマクロ
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
                    const macro = generateGameMacro(inter.recipe, crafterStats);

                    return (
                      <div
                        key={inter.recipe.id}
                        className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
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
                                <span>| 耐久 {inter.recipe.durability} | 約{macro.estimatedTimeSeconds}秒 | 消費CP {macro.totalCpCost}</span>
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
                              onClick={() => onSelectRecipeForSim(inter.recipe)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-all flex items-center gap-1"
                            >
                              <Hammer className="w-3.5 h-3.5" />
                              <span>シミュ</span>
                            </button>
                          </div>
                        </div>

                        {/* Macro Snippet Preview */}
                        <pre className="bg-slate-900/90 p-2.5 rounded-lg text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto border border-slate-800/80 max-h-24">
                          {macro.macro1.join('\n')}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STEP 5: FINAL FINISHED PRODUCTS & STATS-ADAPTIVE MACROS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs border border-purple-500/40">
                    5
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      ⑤ 最終完成品の製作 & ゲーム内マクロ出力
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      計画に登録された各装備・完成品のステータス連動マクロ
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {batchItems.map((item) => {
                  const macro = generateGameMacro(item.recipe, crafterStats);
                  const isCopied1 = copiedFinalMacro?.itemId === item.recipe.itemId && copiedFinalMacro?.part === 1;
                  const isCopied2 = copiedFinalMacro?.itemId === item.recipe.itemId && copiedFinalMacro?.part === 2;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800/70">
                        <div className="flex items-center gap-3">
                          <ItemIcon itemId={item.recipe.itemId} icon={item.recipe.icon} name={item.recipe.name} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-100">{item.recipe.name}</span>
                              <span className="text-xs text-amber-300 font-rajdhani font-bold">
                                × {item.quantity} 個
                              </span>
                              <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded border border-slate-700 font-semibold flex items-center gap-1">
                                <JobIcon job={item.recipe.job} size="xs" />
                                <span>{item.recipe.job} Lv{item.recipe.level}</span>
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              耐久 {item.recipe.durability} | 工数 {item.recipe.difficulty} | 品質 {item.recipe.maxQuality} | 推定所要時間: 約{macro.estimatedTimeSeconds}秒
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => onSelectRecipeForSim(item.recipe)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          <span>シミュレータで開く</span>
                        </button>
                      </div>

                      {/* Macro 1 & 2 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Macro 1 */}
                        <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                              <FileCode className="w-3.5 h-3.5 text-amber-400" />
                              <span>マクロ 1 ({macro.macro1.length}行)</span>
                            </span>
                            <button
                              onClick={() => handleCopyFinalMacroPart(item.recipe, 1)}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-all flex items-center gap-1"
                            >
                              {isCopied1 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{isCopied1 ? 'コピー完了！' : 'マクロ1 コピー'}</span>
                            </button>
                          </div>
                          <pre className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-300 max-h-28 overflow-y-auto leading-relaxed">
                            {macro.macro1.join('\n')}
                          </pre>
                        </div>

                        {/* Macro 2 */}
                        {macro.macro2 && (
                          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                                <span>マクロ 2 ({macro.macro2.length}行)</span>
                              </span>
                              <button
                                onClick={() => handleCopyFinalMacroPart(item.recipe, 2)}
                                className="px-2 py-0.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded text-xs transition-all flex items-center gap-1"
                              >
                                {isCopied2 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied2 ? 'コピー完了！' : 'マクロ2 コピー'}</span>
                              </button>
                            </div>
                            <pre className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-300 max-h-28 overflow-y-auto leading-relaxed">
                              {macro.macro2.join('\n')}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
