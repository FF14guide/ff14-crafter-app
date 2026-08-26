import { CrafterStats, Recipe } from '../types/ff14';
import { simulateRotation, calculateInitialQuality, CraftingSimulationResult } from './craftingSimulator';

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
  // True only when the simulated rotation both finishes progress AND reaches
  // the recipe's maxQuality (i.e. a genuine 100% HQ macro). When false, the
  // macro is the best the builder could do with the given stats -- `warning`
  // explains what's short.
  isFullyAchieved: boolean;
  warning?: string;
  // Starting quality granted by HQ materials before any actions are taken
  // (0 if no HQ materials were selected or the recipe has no eligible ones).
  initialQuality: number;
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

/** Convenience: last step's buff snapshot, or an empty object before turn 1. */
function lastBuffs(sim: CraftingSimulationResult): Record<string, number> {
  return sim.steps.length ? sim.steps[sim.steps.length - 1].buffs : {};
}

function lastInnerQuiet(sim: CraftingSimulationResult): number {
  return sim.steps.length ? sim.steps[sim.steps.length - 1].innerQuietStacks : 0;
}

/** Returns 2 while Waste Not or Waste Not II is active (durability costs are
 * halved by the simulator in that state), otherwise 1. Using the real
 * divisor -- rather than always assuming full cost -- avoids leaving usable
 * durability on the table once one of these buffs is up. */
function durabilityDivisor(buffs: Record<string, number>): number {
  return (buffs.waste_not_2 ?? 0) > 0 || (buffs.waste_not ?? 0) > 0 ? 2 : 1;
}

/**
 * Builds the "quality" half of the rotation: opens with either Muscle Memory
 * (progress-focused opener) or Reflect (quality-focused opener, stacks Inner
 * Quiet immediately), then greedily adds actions -- re-simulating against the
 * real crafting engine after every addition -- until the recipe's maxQuality
 * is reached or the CP/durability budget runs out.
 *
 * This directly reacts to the recipe's actual numbers (difficulty, durability,
 * maxQuality, suggested stats) and the crafter's actual effective stats
 * (which already include food/potion/specialist bonuses baked in via
 * `simStats`), rather than picking from a fixed template.
 */
function buildQualityPhase(
  recipe: Recipe,
  simStats: CrafterStats,
  opener: 'muscle_memory' | 'reflect',
  initialQuality: number
): string[] {
  const skills: string[] = [opener];

  // Larger-durability crafts (finished gear, typically 70-80 durability) can
  // afford -- and usually need -- Manipulation to sustain a long touch chain.
  // Small 40-durability intermediate materials rarely have room for its
  // 96 CP cost, so we let the simulation decide by only attempting it when
  // there's CP to spare.
  const wantsManipulation = recipe.durability >= 60;
  let manipulationUsed = false;

  // Conversely, tight-durability crafts benefit far more from halving every
  // action's durability cost than from sustaining durability over time --
  // Waste Not II covers a full short rotation (8 turns) and effectively
  // doubles how many actions the durability pool can support.
  const wantsWasteNot = recipe.durability < 60;
  let wasteNotUsed = false;

  const MAX_ITER = 24;
  for (let i = 0; i < MAX_ITER; i++) {
    const sim = simulateRotation(recipe, simStats, skills, initialQuality);

    if (sim.isFailed) {
      // The last action broke durability -- undo it and stop the quality phase.
      skills.pop();
      break;
    }
    if (!recipe.canHq || recipe.maxQuality <= 0 || sim.finalQuality >= recipe.maxQuality) {
      break;
    }
    if (sim.remainingDurability <= 0) break;

    const buffs = lastBuffs(sim);
    const iq = lastInnerQuiet(sim);
    const qualityGapRatio = (recipe.maxQuality - sim.finalQuality) / recipe.maxQuality;
    const durDivisor = durabilityDivisor(buffs);
    const prepTouchDurCost = Math.floor(20 / durDivisor);
    const basicTouchDurCost = Math.floor(10 / durDivisor);

    // 1) Durability setup first, before any touch spends durability we can't
    //    get back: apply Waste Not II (tight-durability crafts) or
    //    Manipulation (large-durability crafts) as early as possible so the
    //    buff covers as much of the rotation as it can.
    if (wantsWasteNot && !wasteNotUsed) {
      if (sim.remainingCp >= 98 + 60) {
        skills.push('waste_not_2');
        wasteNotUsed = true;
        continue;
      } else if (sim.remainingCp >= 56 + 40) {
        skills.push('waste_not');
        wasteNotUsed = true;
        continue;
      }
    }
    if (wantsManipulation && !manipulationUsed && sim.remainingCp >= 96 + 120) {
      skills.push('manipulation');
      manipulationUsed = true;
      continue;
    }

    // 2) Keep Innovation up while we still plan to touch -- refresh a little
    //    before it actually expires so we never touch un-buffed.
    if ((buffs.innovation ?? 0) <= 1 && sim.remainingCp >= 18 + 40) {
      skills.push('innovation');
      continue;
    }

    // 3) Once Inner Quiet is well stacked and the remaining quality gap is
    //    small enough that Byregot's Blessing can plausibly close it, finish
    //    with Great Strides + Byregot's Blessing rather than grinding more
    //    touches.
    if (iq >= 6 && qualityGapRatio <= 0.35 && sim.remainingCp >= 32 + 24 && sim.remainingDurability >= 10) {
      skills.push('great_strides', 'byregot_blessing');
      continue;
    }

    // 4) Regular quality action: Preparatory Touch is the most CP-efficient
    //    per point of quality *and* builds Inner Quiet, so prefer it whenever
    //    the budget allows; otherwise fall back to the cheaper Basic Touch.
    if (sim.remainingCp >= 40 && sim.remainingDurability >= prepTouchDurCost) {
      skills.push('preparatory_touch');
    } else if (sim.remainingCp >= 18 && sim.remainingDurability >= basicTouchDurCost) {
      skills.push('basic_touch');
    } else {
      break; // Nothing affordable left for the quality phase.
    }
  }

  return skills;
}

/**
 * Builds the "progress" half of the rotation on top of whatever the quality
 * phase left behind, greedily adding Veneration + Groundwork (falling back
 * to CP-free Basic Synthesis) until the recipe's difficulty is met or the
 * remaining budget runs out.
 */
function buildProgressPhase(recipe: Recipe, simStats: CrafterStats, base: string[], initialQuality: number): string[] {
  const skills = [...base];

  const MAX_ITER = 20;
  for (let i = 0; i < MAX_ITER; i++) {
    const sim = simulateRotation(recipe, simStats, skills, initialQuality);

    if (sim.isCompleted) break;
    if (sim.isFailed) {
      skills.pop();
      break;
    }
    if (sim.remainingDurability <= 0) break;

    const buffs = lastBuffs(sim);

    // Keep Veneration up while progress remains.
    if ((buffs.veneration ?? 0) <= 0 && sim.remainingCp >= 18 + 18) {
      skills.push('veneration');
      continue;
    }

    const durDivisor = durabilityDivisor(buffs);
    const groundworkDurCost = Math.floor(20 / durDivisor);
    const basicSynthDurCost = Math.floor(10 / durDivisor);

    if (sim.remainingCp >= 18 && sim.remainingDurability >= groundworkDurCost) {
      skills.push('groundwork');
    } else if (sim.remainingCp >= 7 && sim.remainingDurability >= basicSynthDurCost) {
      // Careful Synthesis (7 CP, 150% efficiency) is strictly better than
      // the CP-free Basic Synthesis (120% efficiency) for the same
      // durability cost, so prefer it whenever a little CP remains.
      skills.push('careful_synthesis');
    } else if (sim.remainingDurability >= basicSynthDurCost) {
      // Basic Synthesis costs no CP at all -- always usable as a last resort
      // while durability remains, even after CP is fully spent.
      skills.push('basic_synthesis');
    } else {
      break;
    }
  }

  return skills;
}

/**
 * Last-resort repair pass: if the two structured phases above still leave
 * progress unfinished (can happen when the crafter's stats are well below
 * what the recipe suggests), keep appending whatever cheap action is still
 * affordable until either progress completes or the budget is truly spent.
 * This never fabricates success -- the caller is told via `isFullyAchieved`
 * and `warning` whether the recipe was actually completed.
 */
function repairIncompleteProgress(recipe: Recipe, simStats: CrafterStats, base: string[], initialQuality: number): string[] {
  const skills = [...base];
  const MAX_ITER = 10;
  for (let i = 0; i < MAX_ITER; i++) {
    const sim = simulateRotation(recipe, simStats, skills, initialQuality);
    if (sim.isCompleted || sim.isFailed) break;
    const durDivisor = durabilityDivisor(lastBuffs(sim));
    const groundworkDurCost = Math.floor(20 / durDivisor);
    const basicSynthDurCost = Math.floor(10 / durDivisor);
    if (sim.remainingCp >= 18 && sim.remainingDurability >= groundworkDurCost) {
      skills.push('groundwork');
    } else if (sim.remainingCp >= 7 && sim.remainingDurability >= basicSynthDurCost) {
      skills.push('careful_synthesis');
    } else if (sim.remainingDurability >= basicSynthDurCost) {
      skills.push('basic_synthesis');
    } else {
      break;
    }
  }
  return skills;
}

/**
 * Builds one full candidate rotation (quality phase, then progress phase)
 * for a given opener choice, and returns it together with its simulated
 * outcome so candidates can be compared on actual results.
 */
function buildCandidate(
  recipe: Recipe,
  simStats: CrafterStats,
  opener: 'muscle_memory' | 'reflect',
  initialQuality: number
): { skillIds: string[]; sim: CraftingSimulationResult } {
  let skillIds = buildQualityPhase(recipe, simStats, opener, initialQuality);
  skillIds = buildProgressPhase(recipe, simStats, skillIds, initialQuality);

  let sim = simulateRotation(recipe, simStats, skillIds, initialQuality);
  if (!sim.isCompleted && !sim.isFailed) {
    skillIds = repairIncompleteProgress(recipe, simStats, skillIds, initialQuality);
    sim = simulateRotation(recipe, simStats, skillIds, initialQuality);
  }

  return { skillIds, sim };
}

/**
 * Scores a simulated candidate so completed-and-quality-maxed rotations always
 * win outright, and otherwise quality achieved dominates the ranking (a
 * "completed" craft that only reached ~0% quality -- which can happen if
 * Muscle Memory alone overshoots a low-difficulty recipe's progress before
 * any quality action gets a turn -- must not outrank a candidate that
 * actually built real quality, even if that one fell short on progress).
 * Completion still earns a meaningful bonus so it breaks near-ties in favor
 * of actually finishing the craft.
 */
function scoreCandidate(sim: CraftingSimulationResult, recipe: Recipe): number {
  if (!recipe.canHq || recipe.maxQuality <= 0) {
    // Progress-only recipe (no HQ concept): completion is everything.
    return sim.isCompleted ? 1_000_000 : sim.finalProgress;
  }
  const qualityAchieved = Math.min(sim.finalQuality, recipe.maxQuality);
  const completionBonus = sim.isCompleted ? recipe.maxQuality * 0.15 : 0;
  return qualityAchieved + completionBonus;
}

/**
 * Generate in-game macros formatted with /ac, <wait.x>, and sound cues.
 *
 * Unlike a fixed template, the rotation is constructed by repeatedly running
 * the actual crafting simulator (same engine as the Simulator tab) against
 * the recipe's real numbers -- difficulty, durability, maxQuality, suggested
 * craftsmanship/control -- and the crafter's actual effective stats, which
 * already fold in food, potion, and Specialist bonuses. Two candidate
 * openers (Muscle Memory vs. Reflect) are built and simulated in full; the
 * one that actually reaches 100% quality (or gets closest) is used.
 */
export function generateGameMacro(
  recipe: Recipe,
  stats: CrafterStats,
  macroNamePrefix?: string,
  hqMaterialItemIds: Set<number> | number[] = []
): GeneratedMacro {
  const effective = getEffectiveCrafterStats(stats);
  const label = macroNamePrefix || recipe.name;
  const initialQuality = calculateInitialQuality(recipe, hqMaterialItemIds);

  // Clone stats object with effective values for simulator -- food/potion/
  // specialist bonuses are already folded into craftsmanship/control/cp
  // above, so the simulator sees a single "already-buffed" stat block.
  const simStats: CrafterStats = {
    ...stats,
    craftsmanship: effective.craftsmanship,
    control: effective.control,
    cp: effective.cp,
    foodBuff: undefined,
    potionBuff: undefined,
    specialist: false,
  };

  // Try both openers and keep whichever candidate actually performs better.
  const candidates = [
    buildCandidate(recipe, simStats, 'muscle_memory', initialQuality),
    buildCandidate(recipe, simStats, 'reflect', initialQuality),
  ];

  candidates.sort((a, b) => scoreCandidate(b.sim, recipe) - scoreCandidate(a.sim, recipe));

  const { skillIds, sim: simResult } = candidates[0];

  const isFullyAchieved = simResult.isCompleted && simResult.finalQuality >= recipe.maxQuality;
  let warning: string | undefined;
  if (!simResult.isCompleted) {
    warning = '現在のステータスでは作業工数が足りず、製作を完了できません。装備・飯薬・薬を見直すか、必要製作数を減らしてください。';
  } else if (recipe.canHq && simResult.finalQuality < recipe.maxQuality) {
    warning = `現在のステータスでは最高品質(HQ確定)まで届きません（到達品質 ${simResult.qualityPercent}% / HQ率 ${simResult.hqChance}%）。加工精度を強化すると改善します。`;
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
    refined_touch: { name: '洗練加工', wait: 3 },
    trained_perfection: { name: '匠の絶技', wait: 3 },
    trained_eye: { name: '匠の早業', wait: 3 },
    quick_innovation: { name: 'クイックイノベーション', wait: 1 },
    immaculate_mend: { name: 'パーフェクトメンド', wait: 3 },
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
      const completionText = isFullyAchieved ? '製作完了！HQ完成！' : '製作完了！';
      lines.push(`/echo 【${label}】${completionText} <se.1>`);
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
    isFullyAchieved,
    warning,
    initialQuality,
  };
}
