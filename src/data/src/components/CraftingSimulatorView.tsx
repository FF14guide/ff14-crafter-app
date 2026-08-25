import React, { useState, useMemo } from 'react';
import { Recipe, CrafterStats } from '../types/ff14';
import { CRAFTER_SKILLS, CrafterSkill, SKILL_MAP } from '../data/crafterSkills';
import { simulateRotation, generateMacroBlocks } from '../utils/craftingSimulator';
import { ItemIcon } from './common/ItemIcon';
import { JobIcon } from './common/JobIcon';
import confetti from 'canvas-confetti';
import {
  Hammer,
  RotateCcw,
  Sparkles,
  Zap,
  Copy,
  Check,
  Play,
  Settings2,
  ListOrdered,
  FileCode,
  TrendingUp,
  Shield,
  HelpCircle
} from 'lucide-react';

interface CraftingSimulatorViewProps {
  recipe: Recipe;
  stats: CrafterStats;
  onChangeStats: (stats: CrafterStats) => void;
  onOpenPresets: () => void;
}

export const CraftingSimulatorView: React.FC<CraftingSimulatorViewProps> = ({
  recipe,
  stats,
  onChangeStats,
  onOpenPresets,
}) => {
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([
    'reflect',
    'manipulation',
    'waste_not_2',
    'innovation',
    'preparatory_touch',
    'preparatory_touch',
    'preparatory_touch',
    'preparatory_touch',
    'great_strides',
    'byregot_blessing',
    'veneration',
    'groundwork',
    'groundwork',
    'groundwork',
  ]);

  const [activeSkillCategory, setActiveSkillCategory] = useState<'all' | 'progression' | 'quality' | 'buff' | 'durability'>('all');
  const [copiedMacroIndex, setCopiedMacroIndex] = useState<number | null>(null);

  // Run simulation
  const simResult = useMemo(() => {
    return simulateRotation(recipe, stats, selectedSkillIds);
  }, [recipe, stats, selectedSkillIds]);

  // Add skill to sequence
  const handleAddSkill = (skillId: string) => {
    setSelectedSkillIds((prev) => [...prev, skillId]);
  };

  // Remove skill at step index
  const handleRemoveSkill = (index: number) => {
    setSelectedSkillIds((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear all
  const handleClear = () => {
    setSelectedSkillIds([]);
  };

  // Trigger celebration confetti on 100% HQ craft
  const handleCelebrate = () => {
    if (simResult.hqChance === 100 && simResult.isCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  // Generate Macro blocks
  const macroBlocks = useMemo(() => {
    return generateMacroBlocks(selectedSkillIds, recipe.name);
  }, [selectedSkillIds, recipe.name]);

  const handleCopyMacro = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMacroIndex(index);
    handleCelebrate();
    setTimeout(() => setCopiedMacroIndex(null), 2000);
  };

  // Food / Potion Presets
  const foodOptions = [
    { label: 'なし', name: '', craftsmanshipBonus: 0, controlBonus: 0, cpBonus: 0 },
    { label: 'ローストチキンHQ (作業+94, CP+86)', name: 'ローストチキンHQ', craftsmanshipBonus: 94, controlBonus: 0, cpBonus: 86 },
    { label: 'ベイクド・ダークホースHQ (加工+94, CP+86)', name: 'ベイクド・ダークホースHQ', craftsmanshipBonus: 0, controlBonus: 94, cpBonus: 86 },
  ];

  const potionOptions = [
    { label: 'なし', name: '', craftsmanshipBonus: 0, controlBonus: 0, cpBonus: 0 },
    { label: '魔匠の薬茶HQ (CP+27)', name: '魔匠の薬茶HQ', craftsmanshipBonus: 0, controlBonus: 0, cpBonus: 27 },
  ];

  const filteredSkills = CRAFTER_SKILLS.filter((s) => {
    if (activeSkillCategory === 'all') return true;
    return s.type === activeSkillCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ItemIcon itemId={recipe.itemId} icon={recipe.icon} name={recipe.name} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">{recipe.name} クラフトシミュレータ</h2>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/40 flex items-center gap-1">
                <JobIcon job={recipe.job} size="xs" />
                <span>Lv{recipe.level} {recipe.job}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Patch {recipe.patch} | 耐久: {recipe.durability} | 工数: {recipe.difficulty} | 品質: {recipe.maxQuality}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs border border-amber-500/40 font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>高効率マクロ集から選ぶ</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>リセット</span>
          </button>
        </div>
      </div>

      {/* Crafter Stats & Buffs Configuration Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-slate-200">クラフターステータス & 飯薬バフ設定</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block text-[11px] mb-1">作業精度 (Craftsmanship)</label>
            <input
              type="number"
              value={stats.craftsmanship}
              onChange={(e) => onChangeStats({ ...stats, craftsmanship: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-rajdhani font-bold text-amber-300 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">加工精度 (Control)</label>
            <input
              type="number"
              value={stats.control}
              onChange={(e) => onChangeStats({ ...stats, control: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-rajdhani font-bold text-sky-300 text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">最大CP (Max CP)</label>
            <input
              type="number"
              value={stats.cp}
              onChange={(e) => onChangeStats({ ...stats, cp: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-rajdhani font-bold text-emerald-300 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">クラフター飯</label>
            <select
              aria-label="クラフター飯の選択"
              value={stats.foodBuff?.name || ''}
              onChange={(e) => {
                const opt = foodOptions.find((f) => f.name === e.target.value);
                onChangeStats({ ...stats, foodBuff: opt ? { name: opt.name, craftsmanshipBonus: opt.craftsmanshipBonus, controlBonus: opt.controlBonus, cpBonus: opt.cpBonus } : undefined });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {foodOptions.map((f, i) => (
                <option key={i} value={f.name} className="bg-slate-900">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">クラフター薬茶</label>
            <select
              aria-label="クラフター薬茶の選択"
              value={stats.potionBuff?.name || ''}
              onChange={(e) => {
                const opt = potionOptions.find((p) => p.name === e.target.value);
                onChangeStats({ ...stats, potionBuff: opt ? { name: opt.name, craftsmanshipBonus: opt.craftsmanshipBonus, controlBonus: opt.controlBonus, cpBonus: opt.cpBonus } : undefined });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {potionOptions.map((p, i) => (
                <option key={i} value={p.name} className="bg-slate-900">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Crafting Gauges Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Progress Gauge */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>作業進捗 (Progress)</span>
              <span className="font-rajdhani font-bold text-amber-300">
                {simResult.finalProgress} / {recipe.difficulty}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  simResult.isCompleted ? 'bg-amber-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'
                }`}
                style={{ width: `${Math.min(100, (simResult.finalProgress / recipe.difficulty) * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">達成率</span>
            <span className={`font-rajdhani font-bold ${simResult.isCompleted ? 'text-amber-400' : 'text-slate-300'}`}>
              {simResult.progressPercent}% {simResult.isCompleted ? '✅ 完成' : ''}
            </span>
          </div>
        </div>

        {/* Quality Gauge */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>品質 (Quality)</span>
              <span className="font-rajdhani font-bold text-sky-300">
                {simResult.finalQuality} / {recipe.maxQuality}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (simResult.finalQuality / recipe.maxQuality) * 100)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">品質率</span>
            <span className="font-rajdhani font-bold text-sky-300">{simResult.qualityPercent}%</span>
          </div>
        </div>

        {/* HQ Chance Gauge */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>HQ完成率 (HQ Rate)</span>
              <Sparkles className={`w-4 h-4 ${simResult.hqChance === 100 ? 'text-amber-400 hq-sparkle' : 'text-slate-500'}`} />
            </div>
            <div className="text-2xl font-black font-rajdhani text-center my-0.5">
              <span className={simResult.hqChance === 100 ? 'text-amber-400' : 'text-slate-200'}>
                {simResult.hqChance}%
              </span>
            </div>
          </div>
          <div className="text-center text-[10px] text-slate-400">
            {simResult.hqChance === 100 ? '⭐ 100% HQ 確定' : 'NQ混入の可能性あり'}
          </div>
        </div>

        {/* Durability & CP Gauges */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>残り耐久</span>
                <span className={`font-rajdhani font-bold ${simResult.remainingDurability <= 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {simResult.remainingDurability} / {recipe.durability}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${simResult.remainingDurability <= 10 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.max(0, Math.min(100, (simResult.remainingDurability / recipe.durability) * 100))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>残りCP</span>
                <span className="font-rajdhani font-bold text-indigo-300">
                  {simResult.remainingCp} / {stats.cp + (stats.foodBuff?.cpBonus || 0) + (stats.potionBuff?.cpBonus || 0)}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (simResult.remainingCp / (stats.cp + (stats.foodBuff?.cpBonus || 0) + (stats.potionBuff?.cpBonus || 0))) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
            <span>総ターン数: {simResult.totalSteps}</span>
            <span>所要時間: 約{simResult.totalTimeSeconds}秒</span>
          </div>
        </div>
      </div>

      {/* Rotation Step by Step Timeline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-200">
              組み立て中のスキル回し ({selectedSkillIds.length} 手)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">クリックで手順から削除</span>
        </div>

        {selectedSkillIds.length === 0 ? (
          <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            下のスキルパレットからアクションをクリックしてスキル回しを作成してください
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {simResult.steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => handleRemoveSkill(idx)}
                className="group relative flex items-center gap-1.5 bg-slate-950 border border-slate-700/80 hover:border-rose-500/80 px-2.5 py-1.5 rounded-lg text-xs transition-all shadow-sm"
                title={`${step.stepNumber}. ${step.actionName} (消費CP:${step.cpCost} 耐久:${step.durabilityCost})`}
              >
                <span className="text-[10px] text-slate-500 font-rajdhani font-semibold">#{step.stepNumber}</span>
                <span>{step.actionIcon}</span>
                <span className="font-medium text-slate-200 group-hover:text-rose-300">{step.actionName}</span>
                <span className="text-[10px] text-slate-500 group-hover:text-rose-400 font-mono ml-0.5">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Skills Palette */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Hammer className="w-4 h-4 text-amber-400" />
            <span>クラフタースキルパレット (クリックでスキル回しに追加)</span>
          </h3>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveSkillCategory('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeSkillCategory === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全スキル
            </button>
            <button
              onClick={() => setActiveSkillCategory('progression')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeSkillCategory === 'progression' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔨 作業系
            </button>
            <button
              onClick={() => setActiveSkillCategory('quality')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeSkillCategory === 'quality' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💎 加工系
            </button>
            <button
              onClick={() => setActiveSkillCategory('buff')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeSkillCategory === 'buff' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💡 バフ・補助
            </button>
            <button
              onClick={() => setActiveSkillCategory('durability')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                activeSkillCategory === 'durability' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛡️ 耐久回復
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filteredSkills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => handleAddSkill(skill.id)}
              className="bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 p-2.5 rounded-xl text-left transition-all flex items-start justify-between group"
            >
              <div className="flex items-start gap-2">
                <span className="text-xl p-1 bg-slate-900 rounded border border-slate-800 group-hover:border-amber-500/40">
                  {skill.icon}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-300">
                    {skill.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-rajdhani">
                    CP {skill.cpCost} | 耐久 {skill.durabilityCost}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Generated In-Game Macros */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-200">
              ゲーム内マクロ出力 (15行自動分割 & 通知音付き)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">ワンクリックでFF14マクロ欄へ貼り付け可能</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {macroBlocks.map((block, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300 font-cinzel">{block.title}</span>
                  <button
                    onClick={() => handleCopyMacro(block.text, idx)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-xs border border-amber-500/40 transition-all"
                  >
                    {copiedMacroIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedMacroIndex === idx ? 'コピー済み！' : 'マクロをコピー'}</span>
                  </button>
                </div>

                <pre className="text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 font-mono overflow-x-auto whitespace-pre leading-relaxed">
                  {block.text}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
