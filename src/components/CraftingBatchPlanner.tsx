import React, { useState, useEffect, useCallback } from 'react';
import { BatchCraftItem, Recipe } from '../types/ff14';
import { ItemIcon } from './common/ItemIcon';
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
  Globe,
} from 'lucide-react';
import { fetchUniversalisMultiPrices } from '../services/universalisApi';

interface CraftingBatchPlannerProps {
  batchItems: BatchCraftItem[];
  selectedWorldOrDc?: string;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onSelectRecipeForSim: (recipe: Recipe) => void;
}

export const CraftingBatchPlanner: React.FC<CraftingBatchPlannerProps> = ({
  batchItems,
  selectedWorldOrDc = 'Mana',
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  onSelectRecipeForSim,
}) => {
  const [copied, setCopied] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<number, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Aggregate all raw materials across all recipes
  const aggregatedMaterials: Record<
    number,
    { itemId: number; icon?: string; name: string; amount: number; sourceType: string; defaultPrice: number }
  > = {};
  let totalEstimatedRevenue = 0;

  for (const item of batchItems) {
    const yieldCount = item.recipe.yields || 1;
    const craftTimes = Math.ceil(item.quantity / yieldCount);

    // Revenue estimation
    const unitPrice = livePrices[item.recipe.itemId] || item.recipe.defaultSellingPrice || 5000;
    totalEstimatedRevenue += unitPrice * item.quantity;

    for (const mat of item.recipe.materials) {
      const needed = mat.amount * craftTimes;
      const price = livePrices[mat.itemId] || mat.defaultPriceNQ || 500;

      if (!aggregatedMaterials[mat.itemId]) {
        aggregatedMaterials[mat.itemId] = {
          itemId: mat.itemId,
          icon: mat.icon,
          name: mat.name,
          amount: needed,
          sourceType: mat.sourceType,
          defaultPrice: price,
        };
      } else {
        aggregatedMaterials[mat.itemId].amount += needed;
      }
    }
  }

  // Calculate total costs with live prices
  let totalEstimatedCost = 0;
  for (const mat of Object.values(aggregatedMaterials)) {
    const price = livePrices[mat.itemId] || mat.defaultPrice;
    totalEstimatedCost += mat.amount * price;
  }

  const tax = Math.round(totalEstimatedRevenue * 0.05);
  const netProfit = totalEstimatedRevenue - tax - totalEstimatedCost;

  // Fetch live market prices for all batch items and materials
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

      const marketData = await fetchUniversalisMultiPrices(Array.from(allIds), selectedWorldOrDc, fallbackMap);
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
  }, [batchItems, selectedWorldOrDc]);

  useEffect(() => {
    fetchBatchPrices();
  }, [fetchBatchPrices]);

  const handleCopyPlan = () => {
    const lines = [
      `【FF14 Eorzean Crafter】一括製作計画 & 集約素材リスト (${selectedWorldOrDc})`,
      `========================================`,
      `【製作予定アイテム】`,
      ...batchItems.map((b) => `・${b.recipe.name} x${b.quantity}個 (${b.recipe.job})`),
      `----------------------------------------`,
      `【必要素材の集約合計】`,
      ...Object.values(aggregatedMaterials).map((m) => {
        const p = livePrices[m.itemId] || m.defaultPrice;
        return `・${m.name} x${m.amount}個 (単価 約${p.toLocaleString()}G / 計 ${(p * m.amount).toLocaleString()}G)`;
      }),
      `----------------------------------------`,
      `総想定売上: ${totalEstimatedRevenue.toLocaleString()} Gil`,
      `総素材原価: ${totalEstimatedCost.toLocaleString()} Gil`,
      `想定純利益: ${netProfit.toLocaleString()} Gil`,
      `========================================`,
      `https://clafter.eorzeanfishing.com`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
            📋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">マイクラフト計画 (Batch Crafting Planner)</h2>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/40">
                登録: {batchItems.length} 種類
              </span>
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                {selectedWorldOrDc} Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              複数アイテムの製作数を設定し、必要な全一次素材・クリスタル・費用を一括集約
            </p>
          </div>
        </div>

        {batchItems.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBatchPrices}
              disabled={loadingPrices}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPrices ? 'animate-spin text-amber-400' : ''}`} />
              <span>マケボ価格更新</span>
            </button>
            <button
              onClick={handleCopyPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs border border-amber-500/40 font-medium transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '集約リストをコピー！' : '集約リストをコピー'}</span>
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs border border-slate-700 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>全削除</span>
            </button>
          </div>
        )}
      </div>

      {batchItems.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-3xl mb-4 text-slate-400">
            📦
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-2">計画リストは空です</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            「レシピ一覧」から製作したいアイテムの「計画に追加」ボタンを押すと、ここで素材の合算や総原価・利益を一括計算できます。
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>総想定売上 (税引前)</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-rajdhani text-amber-300">
                {totalEstimatedRevenue.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>総素材原価 ({selectedWorldOrDc} 最安値)</span>
                <PackageCheck className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-bold font-rajdhani text-sky-300">
                {totalEstimatedCost.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>想定純利益 (マケボ税5%控除後)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className={`text-xl font-bold font-rajdhani ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}{' '}
                <span className="text-xs text-slate-400 font-normal">Gil</span>
              </div>
            </div>
          </div>

          {/* Planned Items Grid */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
              <span>製作対象アイテム一覧 ({batchItems.length}件)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {batchItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon itemId={item.recipe.itemId} icon={item.recipe.icon} name={item.recipe.name} size="md" />
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">{item.recipe.name}</div>
                      <div className="text-[10px] text-slate-400 font-rajdhani">
                        {item.recipe.job} Lv{item.recipe.level} | 単価: 約{(livePrices[item.recipe.itemId] || item.recipe.defaultSellingPrice || 5000).toLocaleString()}G
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400">数量:</span>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 bg-transparent text-right font-rajdhani font-bold text-amber-300 text-xs focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">個</span>
                    </div>

                    <button
                      onClick={() => onSelectRecipeForSim(item.recipe)}
                      className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded border border-transparent hover:border-indigo-500/30"
                      title="このアイテムのシミュレータを開く"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-950/30"
                      title="計画から削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aggregated Materials Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">全アイテム 集約必要素材リスト</h3>
              <span className="text-xs text-slate-400 font-rajdhani">{Object.keys(aggregatedMaterials).length} 種類の素材</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">素材名</th>
                    <th className="py-2.5 px-4">区分</th>
                    <th className="py-2.5 px-4 text-center">必要集約総数</th>
                    <th className="py-2.5 px-4 text-right">推定単価 ({selectedWorldOrDc})</th>
                    <th className="py-2.5 px-4 text-right">費用小計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.values(aggregatedMaterials).map((mat) => {
                    const price = livePrices[mat.itemId] || mat.defaultPrice;
                    const subtotal = mat.amount * price;

                    return (
                      <tr key={mat.itemId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                          <ItemIcon itemId={mat.itemId} icon={mat.icon} name={mat.name} size="xs" />
                          <span>{mat.name}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {mat.sourceType === 'gathering' ? '採集' : mat.sourceType === 'reduction' ? '精選' : mat.sourceType === 'subcraft' ? '中間素材' : 'その他'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-rajdhani font-bold text-amber-300">
                          x{mat.amount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-rajdhani text-slate-300">
                          {price.toLocaleString()} G
                        </td>
                        <td className="py-2.5 px-4 text-right font-rajdhani font-bold text-slate-200">
                          {subtotal.toLocaleString()} G
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
