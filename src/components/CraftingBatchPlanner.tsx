import React, { useState } from 'react';
import { BatchCraftItem, Recipe } from '../types/ff14';
import { ItemIcon } from './common/ItemIcon';
import { ListPlus, Trash2, Copy, Check, Sparkles, DollarSign, TrendingUp, PackageCheck, ArrowRight } from 'lucide-react';

interface CraftingBatchPlannerProps {
  batchItems: BatchCraftItem[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onSelectRecipeForSim: (recipe: Recipe) => void;
}

export const CraftingBatchPlanner: React.FC<CraftingBatchPlannerProps> = ({
  batchItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
  onSelectRecipeForSim,
}) => {
  const [copied, setCopied] = useState(false);

  // Aggregate all raw materials across all recipes
  const aggregatedMaterials: Record<number, { name: string; amount: number; sourceType: string; defaultPrice: number }> = {};
  let totalEstimatedCost = 0;
  let totalEstimatedRevenue = 0;

  for (const item of batchItems) {
    const yieldCount = item.recipe.yields || 1;
    const craftTimes = Math.ceil(item.quantity / yieldCount);
    
    // Revenue estimation
    const unitPrice = item.recipe.defaultSellingPrice || 5000;
    totalEstimatedRevenue += unitPrice * item.quantity;

    for (const mat of item.recipe.materials) {
      const needed = mat.amount * craftTimes;
      const price = mat.defaultPriceNQ || 500;
      totalEstimatedCost += needed * price;

      if (!aggregatedMaterials[mat.itemId]) {
        aggregatedMaterials[mat.itemId] = {
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

  const tax = Math.round(totalEstimatedRevenue * 0.05);
  const netProfit = totalEstimatedRevenue - tax - totalEstimatedCost;

  const handleCopyPlan = () => {
    const lines = [
      `【FF14 Eorzean Crafter】一括製作計画 & 集約素材リスト`,
      `========================================`,
      `【製作予定アイテム】`,
      ...batchItems.map((b) => `・${b.recipe.name} x${b.quantity}個 (${b.recipe.job})`),
      `----------------------------------------`,
      `【必要素材の集約合計】`,
      ...Object.values(aggregatedMaterials).map((m) => `・${m.name} x${m.amount}個 (${m.sourceType})`),
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
            </div>
            <p className="text-xs text-slate-400">
              複数アイテムの製作数を設定し、必要な全一次素材・クリスタル・費用を一括集約
            </p>
          </div>
        </div>

        {batchItems.length > 0 && (
          <div className="flex items-center gap-2">
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
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <ListPlus className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-300 text-sm font-semibold">製作計画リストが空です</p>
          <p className="text-slate-500 text-xs mt-1">
            「レシピ選定」タブから「＋」ボタンを押してアイテムを追加してください。
          </p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">想定総売上 (税込)</span>
              <div className="text-xl font-bold font-rajdhani text-amber-300">
                {totalEstimatedRevenue.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">想定総原価</span>
              <div className="text-xl font-bold font-rajdhani text-sky-300">
                {totalEstimatedCost.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">想定純利益 (税引後)</span>
              <div className={`text-xl font-bold font-rajdhani ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netProfit >= 0 ? '+' : ''}
                {netProfit.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
              </div>
            </div>
          </div>

          {/* Items in Batch */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">登録済みアイテム一覧</h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {batchItems.map((item) => (
                <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ItemIcon itemId={item.recipe.itemId} icon={item.recipe.icon} name={item.recipe.name} size="md" />
                    <div>
                      <div className="text-xs font-bold text-slate-100">{item.recipe.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.recipe.job} | 1クラフトで {item.recipe.yields} 個完成
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">目標数:</span>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-rajdhani font-bold text-amber-300 text-right focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">個</span>
                    </div>

                    <button
                      onClick={() => onSelectRecipeForSim(item.recipe)}
                      className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs border border-indigo-500/40 hover:bg-indigo-500/30 transition-all flex items-center gap-1"
                    >
                      <span>シミュ</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aggregated Raw Materials List */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">
                集約された必要一次素材・クリスタル ({Object.keys(aggregatedMaterials).length} 種)
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(aggregatedMaterials).map(([itemId, mat]) => (
                <div key={itemId} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <ItemIcon itemId={parseInt(itemId)} name={mat.name} size="sm" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{mat.name}</div>
                      <span className="text-[10px] text-slate-400">{mat.sourceType}</span>
                    </div>
                  </div>
                  <div className="text-right font-rajdhani shrink-0">
                    <div className="text-sm font-bold text-amber-300">x{mat.amount}</div>
                    <div className="text-[10px] text-slate-500">{(mat.amount * mat.defaultPrice).toLocaleString()} G</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
