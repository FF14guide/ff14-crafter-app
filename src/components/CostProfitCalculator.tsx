import React, { useState, useEffect } from 'react';
import { Recipe, UniversalisItemData } from '../types/ff14';
import { fetchUniversalisPrice } from '../services/universalisApi';
import { ItemIcon } from './common/ItemIcon';
import { TrendingUp, RefreshCw, DollarSign, ShoppingCart, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

interface CostProfitCalculatorProps {
  recipe: Recipe;
  selectedWorldOrDc: string;
  onNavigateToSim: (recipe: Recipe) => void;
  onNavigateToTree: (recipe: Recipe) => void;
}

export const CostProfitCalculator: React.FC<CostProfitCalculatorProps> = ({
  recipe,
  selectedWorldOrDc,
  onNavigateToSim,
  onNavigateToTree,
}) => {
  const [productMarket, setProductMarket] = useState<UniversalisItemData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [materialPrices, setMaterialPrices] = useState<Record<number, { price: number; isSelfGathered: boolean; isHQ: boolean }>>({});
  const [sellingPriceType, setSellingPriceType] = useState<'HQ' | 'NQ' | 'CUSTOM'>('HQ');
  const [customSellingPrice, setCustomSellingPrice] = useState<number>(0);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);

  // Load Universalis prices
  const loadPrices = async () => {
    setLoading(true);
    try {
      const data = await fetchUniversalisPrice(recipe.itemId, selectedWorldOrDc, recipe.defaultSellingPrice || 5000);
      setProductMarket(data);
      setCustomSellingPrice(data.minPriceHQ);

      // Initialize material prices
      const initMat: Record<number, { price: number; isSelfGathered: boolean; isHQ: boolean }> = {};
      for (const mat of recipe.materials) {
        initMat[mat.itemId] = {
          price: mat.defaultPriceNQ || 1000,
          isSelfGathered: false,
          isHQ: false,
        };
      }
      setMaterialPrices(initMat);
    } catch (e) {
      console.warn('Error loading market prices:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrices();
  }, [recipe.id, selectedWorldOrDc]);

  // Calculations
  const unitSellingPrice =
    sellingPriceType === 'HQ'
      ? productMarket?.minPriceHQ || recipe.defaultSellingPrice || 5000
      : sellingPriceType === 'NQ'
      ? productMarket?.minPriceNQ || recipe.defaultSellingPrice || 4000
      : customSellingPrice;

  // Single craft material cost
  const singleCraftCost = recipe.materials.reduce((total, mat) => {
    const p = materialPrices[mat.itemId];
    if (!p || p.isSelfGathered) return total;
    return total + p.price * mat.amount;
  }, 0);

  // Total produced units per craft
  const producedPerCraft = recipe.yields || 1;
  const unitMaterialCost = Math.round(singleCraftCost / producedPerCraft);

  // Total batch calculations
  const totalCrafts = batchQuantity;
  const totalProducedUnits = totalCrafts * producedPerCraft;
  const totalMaterialCost = singleCraftCost * totalCrafts;

  const totalGrossRevenue = unitSellingPrice * totalProducedUnits;
  const marketTax = Math.round(totalGrossRevenue * 0.05); // 5% Market Board Tax
  const netRevenue = totalGrossRevenue - marketTax;
  const netProfit = netRevenue - totalMaterialCost;
  const profitMarginPercent = totalGrossRevenue > 0 ? Math.round((netProfit / totalGrossRevenue) * 100) : 0;

  const updateMaterialPrice = (itemId: number, price: number) => {
    setMaterialPrices((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], price: Math.max(0, price) },
    }));
  };

  const toggleSelfGathered = (itemId: number) => {
    setMaterialPrices((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], isSelfGathered: !prev[itemId]?.isSelfGathered },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ItemIcon itemId={recipe.itemId} icon={recipe.icon} name={recipe.name} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">{recipe.name}</h2>
              {recipe.yields > 1 && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  1回の製作で {recipe.yields} 個完成
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-rajdhani">
              {recipe.enName} | Patch {recipe.patch} | {selectedWorldOrDc} マーケット参照
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPrices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>価格再取得</span>
          </button>
          <button
            onClick={() => onNavigateToSim(recipe)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-xs border border-indigo-500/40 font-medium transition-all"
          >
            <span>シミュレータへ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main KPI Summary Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unit Sell Price */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>販売単価設定 (1個あたり)</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-rajdhani text-amber-300">
            {unitSellingPrice.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => setSellingPriceType('HQ')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                sellingPriceType === 'HQ' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              HQ最安 ({productMarket?.minPriceHQ.toLocaleString()}G)
            </button>
            <button
              onClick={() => setSellingPriceType('NQ')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                sellingPriceType === 'NQ' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              NQ最安 ({productMarket?.minPriceNQ.toLocaleString()}G)
            </button>
          </div>
        </div>

        {/* Unit Material Cost */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>製作原価 (1個あたり)</span>
            <ShoppingCart className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-rajdhani text-sky-300">
            {unitMaterialCost.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            1クラフト原価: {singleCraftCost.toLocaleString()} Gil (x{producedPerCraft}個)
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>純利益 (税引後)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-xl font-bold font-rajdhani ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netProfit >= 0 ? '+' : ''}
            {netProfit.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                profitMarginPercent >= 50
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : profitMarginPercent >= 20
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : profitMarginPercent > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              利益率 {profitMarginPercent}%
            </span>
            <span className="text-[10px] text-slate-400 font-rajdhani">手数料5%: -{marketTax.toLocaleString()}G</span>
          </div>
        </div>

        {/* Market Board Velocity */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>マーケット売れ行き</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-rajdhani text-indigo-300">
            {productMarket?.regularSaleVelocity.toFixed(1) || '10.5'}{' '}
            <span className="text-xs text-slate-400 font-normal">個 / 日</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            出品数: {productMarket?.listingsCount || 8} 件 | 流動性高
          </p>
        </div>
      </div>

      {/* Batch Quantity Slider */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">製作予定回数 (クラフト数):</span>
          <div className="flex items-center gap-2">
            {[1, 5, 10, 20, 50, 100].map((qty) => (
              <button
                key={qty}
                onClick={() => setBatchQuantity(qty)}
                className={`px-2.5 py-1 rounded text-xs font-rajdhani font-semibold border transition-all ${
                  batchQuantity === qty
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {qty}回 ({qty * producedPerCraft}個)
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">カスタム回数:</span>
          <input
            type="number"
            min="1"
            max="999"
            value={batchQuantity}
            onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-rajdhani font-semibold text-amber-300 text-right focus:outline-none"
          />
        </div>
      </div>

      {/* Materials Cost Breakdown Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">必要素材・原価内訳 (Material Price Breakdown)</h3>
            <span className="text-xs text-slate-400">※自力採集・所持素材は「自給(0G)」に設定可能</span>
          </div>
          <button
            onClick={() => onNavigateToTree(recipe)}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
          >
            素材集めツリーを開く <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">素材名</th>
                <th className="py-2.5 px-4">入手区分</th>
                <th className="py-2.5 px-4 text-center">必要数 (1回)</th>
                <th className="py-2.5 px-4 text-center">必要総数 ({batchQuantity}回)</th>
                <th className="py-2.5 px-4 text-right">単価 (Gil)</th>
                <th className="py-2.5 px-4 text-right">小計</th>
                <th className="py-2.5 px-4 text-center">自給設定</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recipe.materials.map((mat) => {
                const priceInfo = materialPrices[mat.itemId] || { price: mat.defaultPriceNQ || 1000, isSelfGathered: false };
                const effectivePrice = priceInfo.isSelfGathered ? 0 : priceInfo.price;
                const totalReqAmount = mat.amount * batchQuantity;
                const subTotal = effectivePrice * totalReqAmount;

                return (
                  <tr key={mat.itemId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ItemIcon itemId={mat.itemId} icon={mat.icon} name={mat.name} size="xs" />
                        <span className="font-semibold text-slate-200">{mat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          mat.sourceType === 'gathering'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : mat.sourceType === 'reduction'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : mat.sourceType === 'tomestone'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : mat.sourceType === 'subcraft'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {mat.sourceType === 'gathering'
                          ? '🌲 採集'
                          : mat.sourceType === 'reduction'
                          ? '✨ 精選'
                          : mat.sourceType === 'tomestone'
                          ? '🪙 トームストーン'
                          : mat.sourceType === 'subcraft'
                          ? '🔨 中間素材'
                          : '🛒 店売り/他'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-rajdhani font-bold text-slate-300">
                      x{mat.amount}
                    </td>
                    <td className="py-3 px-4 text-center font-rajdhani font-bold text-amber-300">
                      x{totalReqAmount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {priceInfo.isSelfGathered ? (
                        <span className="text-emerald-400 font-bold text-xs">0 G (自給)</span>
                      ) : (
                        <input
                          type="number"
                          value={priceInfo.price}
                          onChange={(e) => updateMaterialPrice(mat.itemId, parseInt(e.target.value) || 0)}
                          className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right font-rajdhani font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-rajdhani font-bold text-slate-200">
                      {subTotal.toLocaleString()} G
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleSelfGathered(mat.itemId)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                          priceInfo.isSelfGathered
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {priceInfo.isSelfGathered ? '✅ 自給中' : '自給にする'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Market History */}
      {productMarket && productMarket.recentHistory && productMarket.recentHistory.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <span>📜 最近の取引履歴 ({selectedWorldOrDc})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {productMarket.recentHistory.slice(0, 3).map((h, i) => (
              <div key={i} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs flex justify-between items-center">
                <div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${h.hq ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                    {h.hq ? 'HQ' : 'NQ'}
                  </span>
                  <span className="font-rajdhani font-bold text-slate-200">{h.pricePerUnit.toLocaleString()} G</span>
                  <span className="text-slate-400 ml-1">x{h.quantity}</span>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
