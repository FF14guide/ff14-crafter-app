import { CrafterSkill, CRAFTER_SKILLS, SKILL_MAP } from '../data/crafterSkills';
import { Recipe, CrafterStats, CraftingStep } from '../types/ff14';

export interface CraftingSimulationResult {
  steps: CraftingStep[];
  finalProgress: number;
  finalQuality: number;
  progressPercent: number;
  qualityPercent: number;
  hqChance: number;
  remainingDurability: number;
  remainingCp: number;
  isCompleted: boolean;
  isFailed: boolean;
  totalSteps: number;
  totalTimeSeconds: number;
}

/**
 * Calculates HQ chance percentage based on quality reached
 */
export function calculateHqChance(quality: number, maxQuality: number): number {
  if (maxQuality <= 0) return 0;
  const ratio = Math.min(1.0, Math.max(0, quality / maxQuality));
  
  if (ratio >= 1.0) return 100;
  if (ratio <= 0) return 1;

  // FF14 Quality -> HQ Chance interpolation table approximation
  const percent = Math.floor(ratio * 100);
  if (percent <= 20) return Math.max(1, Math.round(percent * 0.2));
  if (percent <= 40) return Math.round(4 + (percent - 20) * 0.4);
  if (percent <= 60) return Math.round(12 + (percent - 40) * 0.8);
  if (percent <= 80) return Math.round(28 + (percent - 60) * 1.5);
  return Math.min(100, Math.round(58 + (percent - 80) * 2.1));
}

/**
 * Calculates Base Progress per 100% efficiency
 */
export function calculateBaseProgress(craftsmanship: number, recipe: Recipe): number {
  const base = Math.floor((craftsmanship * 10) / (recipe.suggestedCraftsmanship || 4500) * 120 + 35);
  return Math.max(100, base);
}

/**
 * Calculates Base Quality per 100% efficiency
 */
export function calculateBaseQuality(control: number, recipe: Recipe): number {
  const base = Math.floor((control * 10) / (recipe.suggestedControl || 4200) * 80 + 30);
  return Math.max(80, base);
}

/**
 * Runs a complete simulation from a sequence of skill IDs
 */
export function simulateRotation(
  recipe: Recipe,
  stats: CrafterStats,
  skillIds: string[],
  initialQuality = 0
): CraftingSimulationResult {
  const effectiveCraftsmanship = stats.craftsmanship + (stats.foodBuff?.craftsmanshipBonus || 0) + (stats.potionBuff?.craftsmanshipBonus || 0);
  const effectiveControl = stats.control + (stats.foodBuff?.controlBonus || 0) + (stats.potionBuff?.controlBonus || 0);
  const maxCp = stats.cp + (stats.foodBuff?.cpBonus || 0) + (stats.potionBuff?.cpBonus || 0);

  const baseProg = calculateBaseProgress(effectiveCraftsmanship, recipe);
  const baseQual = calculateBaseQuality(effectiveControl, recipe);

  let currentProgress = 0;
  let currentQuality = initialQuality;
  let currentDurability = recipe.durability;
  let currentCp = maxCp;
  let innerQuiet = 0;
  let isCompleted = false;
  let isFailed = false;

  // Active Buffs: turns remaining
  const buffs: Record<string, number> = {
    veneration: 0,
    innovation: 0,
    great_strides: 0,
    muscle_memory: 0,
    manipulation: 0,
    waste_not: 0,
    waste_not_2: 0,
    final_appraisal: 0,
  };

  // One-shot flags for the newer special-mechanic actions.
  let trainedPerfectionUsed = false;
  let quickInnovationUsed = false;
  // Set by Trained Perfection; consumed by whichever action follows it.
  let nextActionFreeDurability = false;

  const steps: CraftingStep[] = [];
  let totalWaitSeconds = 0;
  let lastTouchAction = '';

  for (let i = 0; i < skillIds.length; i++) {
    const skillId = skillIds[i];
    const skill = SKILL_MAP.get(skillId);
    if (!skill || isCompleted || isFailed) break;

    // Check CP
    let actualCpCost = skill.cpCost;
    
    // Combo CP reductions for Standard/Advanced Touch
    if (skill.id === 'standard_touch' && lastTouchAction === 'basic_touch') {
      actualCpCost = 18;
    } else if (skill.id === 'advanced_touch' && lastTouchAction === 'standard_touch') {
      actualCpCost = 18;
    }

    if (currentCp < actualCpCost) {
      // Out of CP
      break;
    }
    currentCp -= actualCpCost;

    // Check Durability cost with Waste Not buffs
    let actualDurabilityCost = skill.durabilityCost;
    if (actualDurabilityCost > 0) {
      if (nextActionFreeDurability) {
        actualDurabilityCost = 0;
        nextActionFreeDurability = false;
      } else if (buffs.waste_not > 0 || buffs.waste_not_2 > 0) {
        actualDurabilityCost = Math.floor(actualDurabilityCost / 2);
      }
    }

    currentDurability -= actualDurabilityCost;

    // Immaculate Mend: restore full durability in one action.
    if (skill.id === 'immaculate_mend') {
      currentDurability = recipe.durability;
    }

    // Progression Calc
    let progressGained = 0;
    if (skill.efficiencyProgress) {
      let eff = skill.efficiencyProgress;
      if (buffs.veneration > 0) {
        eff += skill.efficiencyProgress * 0.5;
      }
      if (buffs.muscle_memory > 0) {
        eff += skill.efficiencyProgress * 1.0;
        buffs.muscle_memory = 0; // consumed on next prog action
      }
      progressGained = Math.floor((baseProg * eff) / 100);
      currentProgress += progressGained;

      if (currentProgress >= recipe.difficulty) {
        if (buffs.final_appraisal > 0 && currentProgress >= recipe.difficulty) {
          currentProgress = recipe.difficulty - 1;
          buffs.final_appraisal = 0;
        } else {
          isCompleted = true;
        }
      }
    }

    // Quality Calc
    let qualityGained = 0;
    if (skill.id === 'trained_eye' && i === 0 && recipe.level <= stats.level - 10) {
      // Eligible Trained Eye: its real mechanic is an instant jump straight
      // to the recipe's max quality, not an efficiency multiplier -- so we
      // set it directly rather than routing through the generic formula
      // below (which can under- or over-shoot depending on the recipe's
      // quality curve).
      qualityGained = recipe.maxQuality - currentQuality;
      currentQuality = recipe.maxQuality;
      innerQuiet = Math.min(10, innerQuiet + 1);
      lastTouchAction = skill.id;
    } else if (skill.efficiencyQuality) {
      let eff = skill.efficiencyQuality;

      // Byregot's Blessing scaling: +20% per IQ stack
      if (skill.id === 'byregot_blessing') {
        eff = 100 + innerQuiet * 20;
      }

      // An ineligible Trained Eye (used outside turn 1, or on a recipe not
      // low enough level) degrades to an ordinary touch instead of silently
      // pretending to still be a guaranteed-max-quality hit.
      if (skill.id === 'trained_eye') {
        eff = 100;
      }

      // Innovation buff +50%
      let mult = 1.0;
      if (buffs.innovation > 0) {
        mult += 0.5;
      }

      // Great Strides +100%
      if (buffs.great_strides > 0) {
        mult += 1.0;
        buffs.great_strides = 0; // consumed
      }

      // Inner Quiet control stat boost
      const iqBoost = 1 + (innerQuiet * 0.1);
      qualityGained = Math.floor((baseQual * eff * mult * iqBoost) / 100);
      currentQuality = Math.min(recipe.maxQuality, currentQuality + qualityGained);

      // Stack Inner Quiet
      if (skill.id === 'reflect') {
        innerQuiet = Math.min(10, innerQuiet + 3);
      } else if (skill.id === 'preparatory_touch') {
        innerQuiet = Math.min(10, innerQuiet + 2);
      } else if (skill.id === 'refined_touch') {
        // Real combo bonus (+2 IQ total) only applies immediately after
        // Basic Touch; otherwise it gains IQ like a normal touch action (+1).
        innerQuiet = Math.min(10, innerQuiet + (lastTouchAction === 'basic_touch' ? 2 : 1));
      } else if (skill.id === 'byregot_blessing') {
        innerQuiet = 0;
      } else if (skill.efficiencyQuality > 0) {
        innerQuiet = Math.min(10, innerQuiet + 1);
      }

      lastTouchAction = skill.id;
    } else {
      if (skill.type !== 'buff') {
        lastTouchAction = '';
      }
    }

    // Apply special Buff skills
    if (skill.id === 'veneration') buffs.veneration = 4;
    if (skill.id === 'innovation') buffs.innovation = 4;
    if (skill.id === 'great_strides') buffs.great_strides = 3;
    if (skill.id === 'muscle_memory') buffs.muscle_memory = 5;
    if (skill.id === 'manipulation') buffs.manipulation = 8;
    if (skill.id === 'waste_not') buffs.waste_not = 4;
    if (skill.id === 'waste_not_2') buffs.waste_not_2 = 8;
    if (skill.id === 'final_appraisal') buffs.final_appraisal = 5;

    // Trained Perfection: once per craft, makes the next action's durability
    // cost 0 (does not affect this turn's own cost -- it has none anyway).
    if (skill.id === 'trained_perfection' && !trainedPerfectionUsed) {
      trainedPerfectionUsed = true;
      nextActionFreeDurability = true;
    }

    // Quick Innovation: once per craft, only while Innovation isn't already
    // active; grants Innovation for 1 turn without consuming a turn itself
    // (handled below by skipping the buff-decrement step for this action).
    let quickInnovationConsumedNoTurn = false;
    if (skill.id === 'quick_innovation' && !quickInnovationUsed && buffs.innovation === 0) {
      quickInnovationUsed = true;
      buffs.innovation = 1;
      quickInnovationConsumedNoTurn = true;
    }

    // Manipulation tick (+5 durability)
    if (buffs.manipulation > 0) {
      currentDurability = Math.min(recipe.durability, currentDurability + 5);
    }

    // Decrement buff turn counts (except ones consumed manually).
    // Quick Innovation doesn't consume a turn at all, so buffs are frozen
    // for this step when it fires.
    if (!quickInnovationConsumedNoTurn) {
      if (buffs.veneration > 0 && skill.id !== 'veneration') buffs.veneration--;
      if (buffs.innovation > 0 && skill.id !== 'innovation') buffs.innovation--;
      if (buffs.great_strides > 0 && skill.id !== 'great_strides' && !skill.efficiencyQuality) buffs.great_strides--;
      if (buffs.manipulation > 0 && skill.id !== 'manipulation') buffs.manipulation--;
      if (buffs.waste_not > 0 && skill.id !== 'waste_not') buffs.waste_not--;
      if (buffs.waste_not_2 > 0 && skill.id !== 'waste_not_2') buffs.waste_not_2--;
      if (buffs.final_appraisal > 0 && skill.id !== 'final_appraisal') buffs.final_appraisal--;
    }

    totalWaitSeconds += skill.waitDuration || 3;

    if (currentDurability <= 0 && !isCompleted) {
      isFailed = true;
    }

    steps.push({
      stepNumber: i + 1,
      actionId: skill.id,
      actionName: skill.name,
      actionNameEn: skill.enName,
      actionIcon: skill.icon,
      durabilityCost: actualDurabilityCost,
      cpCost: actualCpCost,
      progressGained,
      qualityGained,
      currentProgress,
      currentQuality,
      currentDurability,
      currentCp,
      currentCondition: 'normal',
      hqChance: calculateHqChance(currentQuality, recipe.maxQuality),
      innerQuietStacks: innerQuiet,
      buffs: { ...buffs },
      success: true,
    });
  }

  return {
    steps,
    finalProgress: currentProgress,
    finalQuality: currentQuality,
    progressPercent: Math.min(100, Math.floor((currentProgress / recipe.difficulty) * 100)),
    qualityPercent: Math.min(100, Math.floor((currentQuality / recipe.maxQuality) * 100)),
    hqChance: calculateHqChance(currentQuality, recipe.maxQuality),
    remainingDurability: currentDurability,
    remainingCp: currentCp,
    isCompleted,
    isFailed,
    totalSteps: steps.length,
    totalTimeSeconds: totalWaitSeconds,
  };
}

/**
 * Formats a sequence of skill IDs into 15-line in-game FF14 Macro blocks
 */
export function generateMacroBlocks(skillIds: string[], macroName = 'クラフトマクロ'): { title: string; lines: string[]; text: string }[] {
  const macros: { title: string; lines: string[]; text: string }[] = [];
  const chunkSize = 14; // Leave 1 line for /echo
  
  let currentChunk: string[] = [];
  let partIndex = 1;

  for (let i = 0; i < skillIds.length; i++) {
    const skill = SKILL_MAP.get(skillIds[i]);
    if (!skill) continue;

    const wait = skill.waitDuration || 3;
    currentChunk.push(`/ac "${skill.name}" <wait.${wait}>`);

    if (currentChunk.length >= chunkSize || i === skillIds.length - 1) {
      const isLast = i === skillIds.length - 1;
      const soundEffect = isLast ? '<se.1>' : '<se.6>';
      const echoText = isLast
        ? `/echo 【${macroName}】製作完了！ ${soundEffect}`
        : `/echo 【${macroName}】マクロ ${partIndex} 終了 ➔ 次のマクロを押してください ${soundEffect}`;
      
      currentChunk.push(echoText);

      macros.push({
        title: `マクロ ${partIndex}`,
        lines: [...currentChunk],
        text: currentChunk.join('\n'),
      });

      currentChunk = [];
      partIndex++;
    }
  }

  return macros;
}
