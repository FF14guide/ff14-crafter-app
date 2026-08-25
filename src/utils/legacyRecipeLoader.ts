import { Recipe, MaterialRequirement, CraftJob } from '../types/ff14';

export type Expansion = 'ARR' | 'HW' | 'SB' | 'ShB' | 'EW' | 'DT';

export const EXPANSION_LABELS: Record<Expansion, string> = {
  ARR: '新生エオルゼア (2.0)',
  HW: '蒼天のイシュガルド (3.0)',
  SB: '紅蓮のリベレーター (4.0)',
  ShB: '漆黒のヴィランズ (5.0)',
  EW: '暁月のフィナーレ (6.0)',
  DT: '黄金のレガシー (7.0)',
};

export const ALL_EXPANSIONS: Expansion[] = ['ARR', 'HW', 'SB', 'ShB', 'EW', 'DT'];

interface RawLegacyMaterial {
  itemId: number;
  name: string;
  amount: number;
  icon: number | null;
  sourceType: 'gathering' | 'subcraft';
  subRecipeId: string | null;
}

interface RawLegacyRecipe {
  id: string;
  itemId: number;
  name: string;
  enName: string;
  icon: number | null;
  job: CraftJob;
  level: number;
  stars: number;
  ilvl: number;
  expansion: Expansion;
  durability: number;
  difficulty: number;
  maxQuality: number;
  canHq: boolean;
  yields: number;
  suggestedCraftsmanship: number;
  suggestedControl: number;
  materials: RawLegacyMaterial[];
}

const iconUrl = (iconNum: number | null): string =>
  iconNum ? `https://garlandtools.org/files/icons/item/${iconNum}.png` : '';

function toMaterialRequirement(m: RawLegacyMaterial): MaterialRequirement {
  return {
    itemId: m.itemId,
    name: m.name,
    amount: m.amount,
    icon: iconUrl(m.icon),
    isSubCraft: m.sourceType === 'subcraft',
    subRecipeId: m.subRecipeId || undefined,
    sourceType: m.sourceType,
  };
}

function toRecipe(r: RawLegacyRecipe): Recipe {
  return {
    id: r.id,
    itemId: r.itemId,
    name: r.name,
    enName: r.enName,
    icon: iconUrl(r.icon),
    category: 'legacy',
    patch: r.expansion, // precise patch isn't tracked for legacy data; expansion is the best available grouping
    job: r.job,
    level: r.level,
    stars: r.stars,
    ilvl: r.ilvl,
    durability: r.durability,
    maxQuality: r.maxQuality,
    difficulty: r.difficulty,
    suggestedCraftsmanship: r.suggestedCraftsmanship,
    suggestedControl: r.suggestedControl,
    materials: r.materials.map(toMaterialRequirement),
    yields: r.yields,
    canHq: r.canHq,
    description: undefined,
  };
}

const cache: Partial<Record<Expansion, Recipe[]>> = {};
const inFlight: Partial<Record<Expansion, Promise<Recipe[]>>> = {};

/**
 * Lazily loads (and caches) all recipes for one historical expansion.
 * Each expansion is a separately-fetched ~2MB chunk so the app never pays
 * the cost of the full historical catalog unless the person actually
 * browses past-expansion recipes.
 */
export async function loadExpansionRecipes(expansion: Expansion): Promise<Recipe[]> {
  if (cache[expansion]) return cache[expansion]!;
  if (inFlight[expansion]) return inFlight[expansion]!;

  const promise = (async () => {
    let raw: RawLegacyRecipe[];
    switch (expansion) {
      case 'ARR':
        raw = (await import('../data/legacy/ARR.json')).default as RawLegacyRecipe[];
        break;
      case 'HW':
        raw = (await import('../data/legacy/HW.json')).default as RawLegacyRecipe[];
        break;
      case 'SB':
        raw = (await import('../data/legacy/SB.json')).default as RawLegacyRecipe[];
        break;
      case 'ShB':
        raw = (await import('../data/legacy/ShB.json')).default as RawLegacyRecipe[];
        break;
      case 'EW':
        raw = (await import('../data/legacy/EW.json')).default as RawLegacyRecipe[];
        break;
      case 'DT':
        raw = (await import('../data/legacy/DT.json')).default as RawLegacyRecipe[];
        break;
    }
    const converted = raw.map(toRecipe);
    cache[expansion] = converted;
    return converted;
  })();

  inFlight[expansion] = promise;
  return promise;
}
