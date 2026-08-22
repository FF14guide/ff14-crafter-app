import React, { useState, useEffect } from 'react';
import { calculateEorzeaTime, EorzeaTimeState } from '../utils/eorzeaTime';
import { DATA_CENTERS } from '../services/universalisApi';
import { InventorySyncData } from '../types/ff14';
import {
  Sparkles,
  Clock,
  Globe,
  Hammer,
  BarChart3,
  TreeDeciduous,
  ScrollText,
  ListPlus,
  ExternalLink,
  Compass,
  Layers,
  Check,
} from 'lucide-react';

export type MainTabType = 'workflow' | 'recipeCatalog' | 'costProfit' | 'gatheringTree' | 'simulator' | 'batchPlanner';

interface HeaderProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  selectedWorldOrDc: string;
  onSelectWorldOrDc: (world: string) => void;
  batchCount: number;
  inventoryData: InventorySyncData | null;
  onOpenInventorySync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  selectedWorldOrDc,
  onSelectWorldOrDc,
  batchCount,
  inventoryData,
  onOpenInventorySync,
}) => {
  const [et, setEt] = useState<EorzeaTimeState>(calculateEorzeaTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setEt(calculateEorzeaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-[#0f121d]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner / Parent Link */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border-b border-slate-800/80 px-4 py-1.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-amber-400 font-medium font-cinzel">
            <Sparkles className="w-3.5 h-3.5" /> Eorzean Crafter
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">FFXIV Patch 7.1 / 7.05 黄金のレガシー対応</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <a
            href="https://eorzeanfishing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>親サイト: eorzeanfishing.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 font-rajdhani text-amber-300 font-semibold bg-slate-950/60 px-2 py-0.5 rounded border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>ET {et.timeString}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({et.period === 'day' ? '☀️ 昼' : et.period === 'night' ? '🌙 夜' : et.period === 'dawn' ? '🌅 明け方' : '🌆 夕方'})
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('workflow')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 text-white font-bold text-xl border border-amber-400/40">
            🔨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-wide font-cinzel">Eorzean Crafter</h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/40">
                v7.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400">レストラネット風2カラムToDo・原価・素材集め・マクロ</p>
          </div>
        </div>

        {/* Action Controls: World Selector & Inventory Sync */}
        <div className="flex items-center gap-2.5">
          {/* Inventory Sync Button */}
          <button
            onClick={onOpenInventorySync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              inventoryData
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900/60'
            }`}
            title="Dalamud / Allagan Tools 所持品同期"
          >
            <Layers className="w-3.5 h-3.5" />
            {inventoryData ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                所持品同期中 ({inventoryData.inventories.length}品)
              </span>
            ) : (
              <span>📥 所持品同期</span>
            )}
          </button>

          {/* World / Data Center Selector */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/70 text-xs">
            <Globe className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 font-medium">DC:</span>
            <select
              aria-label="データセンター / ワールド選択"
              value={selectedWorldOrDc}
              onChange={(e) => onSelectWorldOrDc(e.target.value)}
              className="bg-transparent text-amber-200 font-semibold font-rajdhani focus:outline-none cursor-pointer"
            >
              {DATA_CENTERS.map((dc) => (
                <optgroup key={dc.name} label={`${dc.name} (${dc.region})`}>
                  <option value={dc.name} className="bg-slate-900 text-slate-100">
                    {dc.name} (全ワールド平均)
                  </option>
                  {dc.worlds.map((w) => (
                    <option key={w} value={w} className="bg-slate-900 text-slate-100">
                      {w}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex-wrap">
          <button
            id="tab-workflow"
            onClick={() => onSelectTab('workflow')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'workflow'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>製作ワークフロー (ToDo)</span>
          </button>

          <button
            id="tab-recipe-catalog"
            onClick={() => onSelectTab('recipeCatalog')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'recipeCatalog'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            <span>レシピ選定</span>
          </button>

          <button
            id="tab-cost-profit"
            onClick={() => onSelectTab('costProfit')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'costProfit'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>原価・利益計算</span>
          </button>

          <button
            id="tab-gathering-tree"
            onClick={() => onSelectTab('gatheringTree')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'gatheringTree'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TreeDeciduous className="w-4 h-4" />
            <span>素材集め & 未知</span>
          </button>

          <button
            id="tab-simulator"
            onClick={() => onSelectTab('simulator')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>シミュレータ & マクロ</span>
          </button>

          <button
            id="tab-batch-planner"
            onClick={() => onSelectTab('batchPlanner')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all relative ${
              activeTab === 'batchPlanner'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ListPlus className="w-4 h-4" />
            <span>製作計画</span>
            {batchCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {batchCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};

