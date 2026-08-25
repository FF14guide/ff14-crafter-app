import React, { useState } from 'react';
import { CrafterStats } from '../../types/ff14';
import { FOOD_BUFF_OPTIONS, POTION_BUFF_OPTIONS } from '../../data/crafterBuffs';
import { getEffectiveCrafterStats } from '../../utils/macroGenerator';
import { Sliders, Sparkles, Utensils, FlaskConical, Award, ChevronDown, ChevronUp, Check, RefreshCw } from 'lucide-react';

interface CrafterStatsBarProps {
  stats: CrafterStats;
  onChangeStats: (newStats: CrafterStats) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export const CrafterStatsBar: React.FC<CrafterStatsBarProps> = ({
  stats,
  onChangeStats,
  className = '',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const effective = getEffectiveCrafterStats(stats);

  const currentFoodId = stats.foodBuff
    ? FOOD_BUFF_OPTIONS.find((f) => f.name === stats.foodBuff?.name)?.id || 'custom'
    : 'none';

  const currentPotionId = stats.potionBuff
    ? POTION_BUFF_OPTIONS.find((p) => p.name === stats.potionBuff?.name)?.id || 'custom'
    : 'none';

  const handleSelectFood = (foodId: string) => {
    const found = FOOD_BUFF_OPTIONS.find((f) => f.id === foodId);
    if (!found || found.id === 'none') {
      onChangeStats({
        ...stats,
        foodBuff: undefined,
      });
    } else {
      onChangeStats({
        ...stats,
        foodBuff: {
          name: found.name,
          craftsmanshipBonus: found.craftsmanshipBonus,
          controlBonus: found.controlBonus,
          cpBonus: found.cpBonus,
        },
      });
    }
  };

  const handleSelectPotion = (potionId: string) => {
    const found = POTION_BUFF_OPTIONS.find((p) => p.id === potionId);
    if (!found || found.id === 'none') {
      onChangeStats({
        ...stats,
        potionBuff: undefined,
      });
    } else {
      onChangeStats({
        ...stats,
        potionBuff: {
          name: found.name,
          craftsmanshipBonus: found.craftsmanshipBonus,
          controlBonus: found.controlBonus,
          cpBonus: found.cpBonus,
        },
      });
    }
  };

  const handleToggleSpecialist = () => {
    onChangeStats({
      ...stats,
      specialist: !stats.specialist,
    });
  };

  const applyPreset = (type: 'standard_74' | 'high_cp_food_pot' | 'no_buffs') => {
    if (type === 'standard_74') {
      onChangeStats({
        craftsmanship: 5120,
        control: 4720,
        cp: 640,
        level: 100,
        specialist: false,
        foodBuff: {
          name: '【7.4/7.2最新】ローストチキン HQ',
          craftsmanshipBonus: 105,
          controlBonus: 55,
          cpBonus: 92,
        },
        potionBuff: {
          name: '【7.4/7.2最新】魔匠の薬液 HQ',
          craftsmanshipBonus: 0,
          controlBonus: 0,
          cpBonus: 27,
        },
      });
    } else if (type === 'high_cp_food_pot') {
      onChangeStats({
        craftsmanship: 5250,
        control: 4850,
        cp: 655,
        level: 100,
        specialist: true,
        foodBuff: {
          name: '【7.4/7.2最新】ベジタブルスープ HQ',
          craftsmanshipBonus: 60,
          controlBonus: 90,
          cpBonus: 92,
        },
        potionBuff: {
          name: '【7.4/7.2最新】魔匠の薬液 HQ',
          craftsmanshipBonus: 0,
          controlBonus: 0,
          cpBonus: 27,
        },
      });
    } else {
      onChangeStats({
        craftsmanship: 4950,
        control: 4550,
        cp: 630,
        level: 100,
        specialist: false,
        foodBuff: undefined,
        potionBuff: undefined,
      });
    }
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-md ${className}`}>
      {/* Header Summary Bar */}
      <div className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Sliders className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                装備ステータス & 飯薬・マイスター設定
              </span>
              <span className="text-[10px] text-slate-400">マクロ生成・シミュレーションに即時連動</span>
            </div>
          </div>

          {/* Live Effective Stats Pills */}
          <div className="flex flex-wrap items-center gap-1.5 font-rajdhani text-xs">
            <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
              <span className="text-[10px] text-amber-400 font-bold">実効 作業:</span>
              <span className="font-bold text-slate-100 text-sm">{effective.craftsmanship.toLocaleString()}</span>
            </span>

            <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
              <span className="text-[10px] text-sky-400 font-bold">実効 加工:</span>
              <span className="font-bold text-slate-100 text-sm">{effective.control.toLocaleString()}</span>
            </span>

            <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-amber-500/40 text-slate-300 flex items-center gap-1.5 shadow-sm shadow-amber-950/30">
              <span className="text-[10px] text-amber-300 font-bold">実効 CP:</span>
              <span className="font-bold text-amber-300 text-sm">{effective.cp}</span>
            </span>

            {stats.specialist && (
              <span className="bg-purple-950/80 border border-purple-500/50 text-purple-200 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1">
                <Award className="w-3 h-3 text-purple-300" />
                マイスター (+20/+20/+15)
              </span>
            )}
          </div>
        </div>

        {/* Action / Toggle buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
          >
            <span>{isExpanded ? 'ステータス設定を閉じる' : 'ステータス・飯薬を調整'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls Panel */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-slate-900/60">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium">クイック設定プリセット:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset('standard_74')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-all font-semibold"
              >
                🔥 Patch 7.4 新式標準 (ローストチキンHQ + 魔匠薬液HQ)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('high_cp_food_pot')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 transition-all font-semibold"
              >
                💎 極・加工&マイスター型 (ベジスープHQ + 魔匠薬液HQ)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('no_buffs')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                素ステータス (無飯・無薬)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Base Craftsmanship */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                装備 作業精度 (素の値)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1000"
                  max="7000"
                  value={stats.craftsmanship}
                  onChange={(e) => onChangeStats({ ...stats, craftsmanship: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-rajdhani font-bold text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400 font-rajdhani">
                  +{stats.foodBuff?.craftsmanshipBonus || 0}
                </span>
              </div>
            </div>

            {/* 2. Base Control */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                装備 加工精度 (素の値)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1000"
                  max="7000"
                  value={stats.control}
                  onChange={(e) => onChangeStats({ ...stats, control: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-rajdhani font-bold text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400 font-rajdhani">
                  +{stats.foodBuff?.controlBonus || 0}
                </span>
              </div>
            </div>

            {/* 3. Base CP */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <label className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                装備 最大CP (素の値)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="300"
                  max="1000"
                  value={stats.cp}
                  onChange={(e) => onChangeStats({ ...stats, cp: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-rajdhani font-bold text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-amber-400 font-rajdhani">
                  +{(stats.foodBuff?.cpBonus || 0) + (stats.potionBuff?.cpBonus || 0) + (stats.specialist ? 15 : 0)}
                </span>
              </div>
            </div>

            {/* 4. Specialist Toggle */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                マイスター (Specialist)
              </span>
              <button
                type="button"
                onClick={handleToggleSpecialist}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                  stats.specialist
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-850'
                }`}
              >
                <Award className={`w-3.5 h-3.5 ${stats.specialist ? 'text-purple-300' : 'text-slate-500'}`} />
                <span>{stats.specialist ? 'マイスター有効 (作業+20 / 加工+20 / CP+15)' : 'マイスター無効'}</span>
              </button>
            </div>
          </div>

          {/* Food and Potion Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Food Selection */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-400" />
                  <span>クラフター飯 (食事バフ)</span>
                </span>
                {stats.foodBuff && (
                  <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    CP+{stats.foodBuff.cpBonus} / 作+{stats.foodBuff.craftsmanshipBonus} / 加+{stats.foodBuff.controlBonus}
                  </span>
                )}
              </div>
              <select
                aria-label="食事バフ選択"
                value={currentFoodId}
                onChange={(e) => handleSelectFood(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {FOOD_BUFF_OPTIONS.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name} - {food.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Potion Selection */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
                  <span>クラフター薬 (薬品バフ)</span>
                </span>
                {stats.potionBuff && (
                  <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    CP+{stats.potionBuff.cpBonus} / 作+{stats.potionBuff.craftsmanshipBonus} / 加+{stats.potionBuff.controlBonus}
                  </span>
                )}
              </div>
              <select
                aria-label="薬品バフ選択"
                value={currentPotionId}
                onChange={(e) => handleSelectPotion(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {POTION_BUFF_OPTIONS.map((potion) => (
                  <option key={potion.id} value={potion.id}>
                    {potion.name} - {potion.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
