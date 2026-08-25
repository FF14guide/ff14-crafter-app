import { CrafterStats, Recipe } from '../types/ff14';
import { simulateRotation, CraftingSimulationResult } from './craftingSimulator';

export interface GeneratedMacro {
  macro1: string[];
  macro2?: string[];
  macro3?: string[];
  estimatedTimeSeconds: number;
  totalCpCost: number;
  effectiveStats: {
    craftsmanship: number;
    control: number;
    cp: number;
    specialistBonusApplied: boolean;
  };
  simulationResult: CraftingSimulationResult;
  isSingleMacro: boolean;
}

/**
 * Calculate total effective stats taking into account:
 * - Base equipment stats
 * - Food buff
 * - Potion/Draught buff
 * - Specialist bonus (+20 Craftsmanship, +20 Control, +15 CP)
 */
export function getEffectiveCrafterStats(stats: CrafterStats): {
  craftsmanship: number;
  control: number;
  cp: number;
  specialistBonusApplied: boolean;
} {
  const specialistCraftsmanship = stats.specialist ? 20 : 0;
  const specialistControl = stats.specialist ? 20 : 0;
  const specialistCp = stats.specialist ? 15 : 0;

  const totalCraftsmanship =
    (stats.craftsmanship || 0) +
    (stats.foodBuff?.craftsmanshipBonus || 0) +
    (stats.potionBuff?.craftsmanshipBonus || 0) +
    specialistCraftsmanship;

  const totalControl =
    (stats.control || 0) +
    (stats.foodBuff?.controlBonus || 0) +
    (stats.potionBuff?.controlBonus || 0) +
    specialistControl;

  const totalCp =
    (stats.cp || 0) +
    (stats.foodBuff?.cpBonus || 0) +
    (stats.potionBuff?.cpBonus || 0) +
    specialistCp;

  return {
    craftsmanship: totalCraftsmanship,
    control: totalControl,
    cp: totalCp,
    specialistBonusApplied: Boolean(stats.specialist),
  };
}

/**
 * Generate in-game macros formatted with /ac, <wait.x>, and sound cues
 * dynamically tailored to the player's actual equipment stats, food, potion, and specialist.
 */
export function generateGameMacro(
  recipe: Recipe,
  stats: CrafterStats,
  macroNamePrefix?: string
): GeneratedMacro {
  const effective = getEffectiveCrafterStats(stats);
  const is40Durability = recipe.durability <= 40;
  const label = macroNamePrefix || recipe.name;

  // Clone stats object with effective values for simulator
  const simStats: CrafterStats = {
    ...stats,
    craftsmanship: effective.craftsmanship,
    control: effective.control,
    cp: effective.cp,
    foodBuff: undefined,
    potionBuff: undefined,
    specialist: false,
  };

  let skillIds: string[] = [];

  if (is40Durability) {
    // 40 Durability Intermediate Material
    // If CP is high enough (>= 520), use high-speed 1-macro rotation
    if (effective.cp >= 560) {
      skillIds = [
        'reflect', // 真価 (+3 IQ)
        'waste_not_2', // 長期倹約
        'innovation', // イノベーション
        'preparatory_touch', // 下地加工
        'preparatory_touch', // 下地加工
        'preparatory_touch', // 下地加工
        'great_strides', // グレートストライド
        'byregot_blessing', // ビエルゴの祝福
        'veneration', // ヴェネレーション
        'groundwork', // 下地作業
        'groundwork', // 下地作業
      ];
    } else if (effective.cp >= 480) {
      skillIds = [
        'reflect', // 真価
        'waste_not', // 倹約
        'innovation', // イノベーション
        'basic_touch', // 加工
        'standard_touch', // 中級加工
        'advanced_touch', // 上級加工
        'great_strides', // グレートストライド
        'byregot_blessing', // ビエルゴの祝福
        'veneration', // ヴェネレーション
        'groundwork', // 下地作業
        'groundwork', // 下地作業
      ];
    } else {
      skillIds = [
        'muscle_memory', // 確信
        'waste_not', // 倹約
        'veneration', // ヴェネレーション
        'groundwork', // 下地作業
        'innovation', // イノベーション
        'basic_touch', // 加工
        'standard_touch', // 中級加工
        'great_strides', // グレートストライド
        'byregot_blessing', // ビエルゴの祝福
        'basic_synthesis', // 作業
      ];
    }
  } else {
    // 70 / 80 Durability Finished Item (Equipment / Food / Potion)
    // High-End 2-Macro 100% HQ
    if (effective.cp >= 640) {
      skillIds = [
        'muscle_memory', // 確信
        'manipulation', // マニピュレーション
        'veneration', // ヴェネレーション
        'waste_not_2', // 長期倹約
        'groundwork', // 下地作業
        'groundwork', // 下地作業
        'innovation', // イノベーション
        'preparatory_touch', // 下地加工
        'preparatory_touch', // 下地加工
        'preparatory_touch', // 下地加工
        'preparatory_touch', // 下地加工
        'manipulation', // マニピュレーション
        'innovation', // イノベーション
        'prudent_touch', // 倹約加工 (or 匠の絶技)
        'great_strides', // グレートストライド
        'byregot_blessing', // ビエルゴの祝福
        'veneration', // ヴェネレーション
        'groundwork', // 下地作業
        'groundwork', // 下地作業
      ];
    } else {
      skillIds = [
        'muscle_memory', // 確信
        'manipulation', // マニピュレーション
        'waste_not', // 倹約
        'veneration', // ヴェネレーション
        'groundwork', // 下地作業
        'groundwork', // 下地作業
        'innovation', // イノベーション
        'basic_touch',
        'standard_touch',
        'advanced_touch',
        'great_strides',
        'byregot_blessing',
        'groundwork',
      ];
    }
  }

  // Run simulation with effective stats
  const simResult = simulateRotation(recipe, simStats, skillIds);

  // If simulation didn't finish progress, add extra groundwork
  if (!simResult.isCompleted && simResult.remainingCp >= 18 && simResult.remainingDurability >= 10) {
    skillIds.push('groundwork');
  }

  // Format into macros of max 15 lines (14 actions + 1 echo)
  const chunkSize = 14;
  const macroChunks: string[][] = [];

  const skillNameMap: Record<string, { name: string; wait: number }> = {
    reflect: { name: '真価', wait: 3 },
    muscle_memory: { name: '確信', wait: 3 },
    waste_not: { name: '倹約', wait: 2 },
    waste_not_2: { name: '長期倹約', wait: 2 },
    manipulation: { name: 'マニピュレーション', wait: 2 },
    innovation: { name: 'イノベーション', wait: 2 },
    veneration: { name: 'ヴェネレーション', wait: 2 },
    great_strides: { name: 'グレートストライド', wait: 2 },
    basic_touch: { name: '加工', wait: 3 },
    standard_touch: { name: '中級加工', wait: 3 },
    advanced_touch: { name: '上級加工', wait: 3 },
    preparatory_touch: { name: '下地加工', wait: 3 },
    prudent_touch: { name: '倹約加工', wait: 3 },
    byregot_blessing: { name: 'ビエルゴの祝福', wait: 3 },
    basic_synthesis: { name: '作業', wait: 3 },
    groundwork: { name: '下地作業', wait: 3 },
    careful_synthesis: { name: '模範作業', wait: 3 },
  };

  let currentLines: string[] = [];
  let totalTime = 0;

  for (let i = 0; i < skillIds.length; i++) {
    const sId = skillIds[i];
    const skillData = skillNameMap[sId] || { name: sId, wait: 3 };
    currentLines.push(`/ac ${skillData.name} <wait.${skillData.wait}>`);
    totalTime += skillData.wait;

    if (currentLines.length >= chunkSize || i === skillIds.length - 1) {
      macroChunks.push([...currentLines]);
      currentLines = [];
    }
  }

  // Add echo messages
  const totalParts = macroChunks.length;
  const formattedMacros: string[][] = [];

  for (let p = 0; p < totalParts; p++) {
    const isLastPart = p === totalParts - 1;
    const lines = [...macroChunks[p]];
    if (isLastPart) {
      lines.push(`/echo 【${label}】製作完了！HQ完成！ <se.1>`);
    } else {
      lines.push(`/echo 【${label}】マクロ${p + 1}終了 ➔ マクロ${p + 2}へ <se.6>`);
    }
    formattedMacros.push(lines);
  }

  return {
    macro1: formattedMacros[0] || [],
    macro2: formattedMacros[1],
    macro3: formattedMacros[2],
    estimatedTimeSeconds: totalTime,
    totalCpCost: simResult.steps.reduce((sum, s) => sum + s.cpCost, 0),
    effectiveStats: effective,
    simulationResult: simResult,
    isSingleMacro: formattedMacros.length === 1,
  };
}
