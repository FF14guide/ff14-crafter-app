import React, { useState, useEffect, useCallback } from 'react';
import { Recipe, UniversalisItemData } from '../types/ff14';
import { fetchUniversalisMultiPrices } from '../services/universalisApi';
import { ItemIcon } from './common/ItemIcon';
import {
  TrendingUp,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Globe,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface CostProfitCalculatorProps {
  recipe: Recipe;
  selectedWorldOrDc: string;
  onNavigateToSim: (recipe: Recipe) => void;
  onNavigateToTree: (recipe: Recipe) => void;
}

interface MaterialPriceState {
  price: number;
  marketNQ: number;
  marketHQ: number;
  isSelfGathered: boolean;
  selectedTier: 'NQ' | 'HQ' | 'CUSTOM' | 'SELF';
  lastUploadTime?: number;
}

export const CostProfitCalculator: React.FC<CostProfitCalculatorProps> = ({
  recipe,
  selectedWorldOrDc,
  onNavigateToSim,
  onNavigateToTree,
}) => {
  const [productMarket, setProductMarket] = useState<UniversalisItemData | null>(null);
  const [materialsMarket, setMaterialsMarket] = useState<Record<number, UniversalisItemData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [lastFetchedTime, setLastFetchedTime] = useState<number | null>(null);
  const [materialPrices, setMaterialPrices] = useState<Record<number, MaterialPriceState>>({});
  const [sellingPriceType, setSellingPriceType] = useState<'HQ' | 'NQ' | 'CUSTOM'>('HQ');
  const [customSellingPrice, setCustomSellingPrice] = useState<number>(0);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);

  // Load Universalis prices for finished product AND all materials in one batch request
  const loadPrices = useCallback(async () => {
    setLoading(true);
    try {
      const allItemIds = [recipe.itemId, ...recipe.materials.map((m) => m.itemId)];
      const fallbackMap: Record<number, number> = {
        [recipe.itemId]: recipe.defaultSellingPrice || 10000,
      };
      for (const m of recipe.materials) {
        fallbackMap[m.itemId] = m.defaultPriceNQ || 1000;
      }

      const marketDataMap = await fetchUniversalisMultiPrices(allItemIds, selectedWorldOrDc, fallbackMap);
      setMaterialsMarket(marketDataMap);

      const productData = marketDataMap[recipe.itemId] || null;
      setProductMarket(productData);

      if (productData) {
        setCustomSellingPrice(productData.minPriceHQ || productData.minPriceNQ || recipe.defaultSellingPrice || 10000);
      }

      // Populate material prices from live market board
      const newMaterialPrices: Record<number, MaterialPriceState> = {};
      for (const mat of recipe.materials) {
        const itemMarket = marketDataMap[mat.itemId];
        const nqPrice = itemMarket?.minPriceNQ || mat.defaultPriceNQ || 1000;
        const hqPrice = itemMarket?.minPriceHQ || Math.round(nqPrice * 1.35);
        
        // Default to NQ price for materials (or HQ if requested)
        newMaterialPrices[mat.itemId] = {
          price: nqPrice,
          marketNQ: nqPrice,
          marketHQ: hqPrice,
          isSelfGathered: false,
          selectedTier: 'NQ',
          lastUploadTime: itemMarket?.lastUploadTime,
        };
      }
      setMaterialPrices(newMaterialPrices);
      setLastFetchedTime(Date.now());
    } catch (e) {
      console.warn('Error loading Universalis market prices:', e);
    } finally {
      setLoading(false);
    }
  }, [recipe, selectedWorldOrDc]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  // Calculations
  const unitSellingPrice =
    sellingPriceType === 'HQ'
      ? productMarket?.minPriceHQ || recipe.defaultSellingPrice || 10000
      : sellingPriceType === 'NQ'
      ? productMarket?.minPriceNQ || recipe.defaultSellingPrice || 8000
      : customSellingPrice;

  // Single craft material cost
  const singleCraftCost = recipe.materials.reduce((total, mat) => {
    const p = materialPrices[mat.itemId];
    if (!p || p.isSelfGathered || p.selectedTier === 'SELF') return total;
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

  // Update specific material price custom input
  const updateCustomMaterialPrice = (itemId: number, price: number) => {
    setMaterialPrices((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          price: Math.max(0, price),
          selectedTier: 'CUSTOM',
          isSelfGathered: false,
        },
      };
    });
  };

  // Set material tier (NQ, HQ, or SELF)
  const setMaterialTier = (itemId: number, tier: 'NQ' | 'HQ' | 'SELF') => {
    setMaterialPrices((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      let price = current.price;
      let isSelf = false;
      if (tier === 'NQ') {
        price = current.marketNQ;
      } else if (tier === 'HQ') {
        price = current.marketHQ;
      } else if (tier === 'SELF') {
        price = 0;
        isSelf = true;
      }
      return {
        ...prev,
        [itemId]: {
          ...current,
          price,
          selectedTier: tier,
          isSelfGathered: isSelf,
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ItemIcon itemId={recipe.itemId} icon={recipe.icon} name={recipe.name} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">{recipe.name}</h2>
              {recipe.yields > 1 && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-500/40">
                  1クラフトで {recipe.yields} 個完成
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400 font-rajdhani">
              <span>{recipe.enName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400/90 font-medium">Patch {recipe.patch}</span>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                <Globe className="w-3 h-3" />
                <span>マケボ参照: <b>{selectedWorldOrDc}</b></span>
              </span>
              {lastFetchedTime && (
                <span className="text-[11px] text-slate-400">
                  (取得: {new Date(lastFetchedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPrices}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 rounded-xl text-xs border border-amber-500/40 transition-all font-semibold shadow-sm"
            title="Universalis APIから全素材の最新価格を再取得します"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'マケボ価格取得中...' : 'マケボ価格を全更新'}</span>
          </button>
          <button
            onClick={() => onNavigateToSim(recipe)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-xs border border-indigo-500/40 font-semibold transition-all"
          >
            <span>シミュレータ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main KPI Summary Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unit Sell Price */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>完成品 販売想定単価 (1個)</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-rajdhani text-amber-300">
              {unitSellingPrice.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => setSellingPriceType('HQ')}
                className={`flex-1 py-1 px-1.5 rounded font-semibold border text-center transition-all ${
                  sellingPriceType === 'HQ'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                HQ最安 ({(productMarket?.minPriceHQ || 0).toLocaleString()}G)
              </button>
              <button
                onClick={() => setSellingPriceType('NQ')}
                className={`flex-1 py-1 px-1.5 rounded font-semibold border text-center transition-all ${
                  sellingPriceType === 'NQ'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                NQ最安 ({(productMarket?.minPriceNQ || 0).toLocaleString()}G)
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[10px]">カスタム:</span>
              <input
                type="number"
                min="0"
                value={customSellingPrice}
                onChange={(e) => {
                  setCustomSellingPrice(Math.max(0, parseInt(e.target.value) || 0));
                  setSellingPriceType('CUSTOM');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-rajdhani font-semibold text-amber-300 text-right focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Unit Material Cost */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>完成品 原価 (1個あたり)</span>
              <ShoppingCart className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-rajdhani text-sky-300">
              {unitMaterialCost.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-0.5 font-rajdhani">
            <div className="flex justify-between">
              <span>1クラフト素材費:</span>
              <span className="text-slate-200 font-semibold">{singleCraftCost.toLocaleString()} G</span>
            </div>
            <div className="flex justify-between">
              <span>製作完成数:</span>
              <span className="text-amber-300 font-semibold">x{producedPerCraft} 個</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>純利益 (税・素材費引後)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`text-2xl font-bold font-rajdhani ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netProfit >= 0 ? '+' : ''}
              {netProfit.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
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
            <span className="text-[10px] text-slate-400 font-rajdhani">マケボ税5%: -{marketTax.toLocaleString()}G</span>
          </div>
        </div>

        {/* Market Board Velocity */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>マケボ流動性 (販売速度)</span>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-rajdhani text-indigo-300">
              {(productMarket?.regularSaleVelocity || 5.0).toFixed(1)}{' '}
              <span className="text-xs text-slate-400 font-normal">個 / 日</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400">
            <span>出品数: <b className="text-slate-200 font-rajdhani">{productMarket?.listingsCount || 0}</b> 件</span>
            <span className="text-emerald-400/90 font-medium">● 稼働良好</span>
          </div>
        </div>
      </div>

      {/* Batch Quantity Selector Bar */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            製作回数 (クラフト数):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 3, 5, 10, 20, 50, 100].map((qty) => (
              <button
                key={qty}
                onClick={() => setBatchQuantity(qty)}
                className={`px-2.5 py-1 rounded-lg text-xs font-rajdhani font-semibold border transition-all ${
                  batchQuantity === qty
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {qty}回 ({qty * producedPerCraft}個)
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">任意指定:</span>
          <input
            type="number"
            min="1"
            max="999"
            value={batchQuantity}
            onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-rajdhani font-bold text-amber-300 text-right focus:outline-none focus:border-amber-500"
          />
          <span className="text-xs text-slate-400 font-rajdhani">回</span>
        </div>
      </div>

      {/* Materials Cost Breakdown Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <span>必要素材・マーケット価格内訳</span>
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                {selectedWorldOrDc} Live
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToTree(recipe)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-colors"
            >
              <span>素材集めツリーを開く</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">素材名</th>
                <th className="py-3 px-4">入手ルート</th>
                <th className="py-3 px-4 text-center">必要数 (1回)</th>
                <th className="py-3 px-4 text-center">必要総数 ({batchQuantity}回)</th>
                <th className="py-3 px-4 text-center">マケボ最安 (NQ / HQ)</th>
                <th className="py-3 px-4 text-right">適用単価 (Gil)</th>
                <th className="py-3 px-4 text-right">素材費小計</th>
                <th className="py-3 px-4 text-center">調達切替</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recipe.materials.map((mat) => {
                const itemMarket = materialsMarket[mat.itemId];
                const priceState = materialPrices[mat.itemId] || {
                  price: mat.defaultPriceNQ || 1000,
                  marketNQ: mat.defaultPriceNQ || 1000,
                  marketHQ: Math.round((mat.defaultPriceNQ || 1000) * 1.35),
                  isSelfGathered: false,
                  selectedTier: 'NQ',
                };

                const effectivePrice = priceState.isSelfGathered || priceState.selectedTier === 'SELF' ? 0 : priceState.price;
                const totalReqAmount = mat.amount * batchQuantity;
                const subTotal = effectivePrice * totalReqAmount;

                return (
                  <tr key={mat.itemId} className="hover:bg-slate-800/40 transition-colors">
                    {/* Item Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <ItemIcon itemId={mat.itemId} icon={mat.icon} name={mat.name} size="sm" />
                        <div>
                          <div className="font-semibold text-slate-100">{mat.name}</div>
                          {itemMarket && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                              <span>{itemMarket.worldName || selectedWorldOrDc}</span>
                              <span>出品:{itemMarket.listingsCount}件</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Source Type */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                          mat.sourceType === 'gathering'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : mat.sourceType === 'reduction'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : mat.sourceType === 'tomestone'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : mat.sourceType === 'subcraft'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
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

                    {/* Per-craft quantity */}
                    <td className="py-3 px-4 text-center font-rajdhani font-bold text-slate-300 text-sm">
                      x{mat.amount}
                    </td>

                    {/* Total quantity for batch */}
                    <td className="py-3 px-4 text-center font-rajdhani font-bold text-amber-300 text-sm">
                      x{totalReqAmount}
                    </td>

                    {/* Live Market NQ/HQ values */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-rajdhani text-xs">
                        <button
                          onClick={() => setMaterialTier(mat.itemId, 'NQ')}
                          className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold transition-all ${
                            priceState.selectedTier === 'NQ' && !priceState.isSelfGathered
                              ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                              : 'bg-slate-850 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                          title="NQ最安値を使用"
                        >
                          NQ {priceState.marketNQ.toLocaleString()}G
                        </button>
                        <button
                          onClick={() => setMaterialTier(mat.itemId, 'HQ')}
                          className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold transition-all ${
                            priceState.selectedTier === 'HQ' && !priceState.isSelfGathered
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-slate-850 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                          title="HQ最安値を使用"
                        >
                          HQ {priceState.marketHQ.toLocaleString()}G
                        </button>
                      </div>
                    </td>

                    {/* Effective Price input */}
                    <td className="py-3 px-4 text-right">
                      {priceState.isSelfGathered || priceState.selectedTier === 'SELF' ? (
                        <span className="text-emerald-400 font-bold font-rajdhani text-xs bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30">
                          0 G (自給/所持)
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            value={priceState.price}
                            onChange={(e) => updateCustomMaterialPrice(mat.itemId, parseInt(e.target.value) || 0)}
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right font-rajdhani font-bold text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-rajdhani">G</span>
                        </div>
                      )}
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-4 text-right font-rajdhani font-bold text-slate-200 text-sm">
                      {subTotal.toLocaleString()} <span className="text-xs text-slate-400 font-normal">G</span>
                    </td>

                    {/* Self-gather toggle button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setMaterialTier(mat.itemId, priceState.isSelfGathered || priceState.selectedTier === 'SELF' ? 'NQ' : 'SELF')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          priceState.isSelfGathered || priceState.selectedTier === 'SELF'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {priceState.isSelfGathered || priceState.selectedTier === 'SELF' ? '✅ 自給中 (0G)' : '自給にする'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-950/80 border-t-2 border-slate-700">
              <tr>
                <td colSpan={5} className="py-3 px-4 font-semibold text-slate-300 text-right">
                  素材費 総計 ({batchQuantity}回製作 / {totalProducedUnits}個):
                </td>
                <td colSpan={2} className="py-3 px-4 text-right font-rajdhani font-bold text-base text-amber-300">
                  {totalMaterialCost.toLocaleString()} <span className="text-xs text-slate-400 font-normal">Gil</span>
                </td>
                <td className="py-3 px-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recent Market History */}
      {productMarket && productMarket.recentHistory && productMarket.recentHistory.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>📜 最近のマケボ成立履歴</span>
              <span className="text-amber-400/90 font-mono">({selectedWorldOrDc})</span>
            </span>
            <span className="text-[11px] text-slate-400">最新 {productMarket.recentHistory.length} 件</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {productMarket.recentHistory.slice(0, 4).map((h, i) => (
              <div key={i} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${
                      h.hq ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {h.hq ? 'HQ' : 'NQ'}
                  </span>
                  <span className="font-rajdhani font-bold text-slate-100">{h.pricePerUnit.toLocaleString()} G</span>
                  <span className="text-slate-400 ml-1 font-rajdhani">x{h.quantity}</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-rajdhani">
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {h.buyerName && (
                    <div className="text-[9px] text-slate-400 truncate max-w-[80px]">{h.buyerName}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
