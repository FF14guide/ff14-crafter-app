export type CraftJob = 'CRP' | 'BSM' | 'ARM' | 'GSM' | 'LTW' | 'WVR' | 'ALC' | 'CUL';
export type GatherJob = 'MIN' | 'BTN' | 'FSH';

export interface CraftJobInfo {
  code: CraftJob;
  name: string;
  enName: string;
  icon: string;
  color: string;
}

export const CRAFT_JOBS: Record<CraftJob, CraftJobInfo> = {
  CRP: { code: 'CRP', name: '木工師', enName: 'Carpenter', icon: '🪵', color: '#B45309' },
  BSM: { code: 'BSM', name: '鍛冶師', enName: 'Blacksmith', icon: '⚔️', color: '#DC2626' },
  ARM: { code: 'ARM', name: '甲冑師', enName: 'Armorer', icon: '🛡️', color: '#4B5563' },
  GSM: { code: 'GSM', name: '彫金師', enName: 'Goldsmith', icon: '💎', color: '#D97706' },
  LTW: { code: 'LTW', name: '革細工師', enName: 'Leatherworker', icon: '👞', color: '#92400E' },
  WVR: { code: 'WVR', name: '裁縫師', enName: 'Weaver', icon: '🧵', color: '#2563EB' },
  ALC: { code: 'ALC', name: '錬金術師', enName: 'Alchemist', icon: '🧪', color: '#7C3AED' },
  CUL: { code: 'CUL', name: '調理師', enName: 'Culinarian', icon: '🍳', color: '#EA580C' },
};

export type RecipeCategory =
  | 'latestPatch'
  | 'foodPotion'
  | 'gear'
  | 'collectibles'
  | 'housing'
  | 'intermediate'
  | 'legacy'
  | 'battleGear'
  | 'gathererCrafterGear'
  | 'fashion'
  | 'other';

export interface MaterialRequirement {
  itemId: number;
  name: string;
  amount: number;
  icon?: string;
  isSubCraft?: boolean;
  subRecipeId?: string;
  sourceType: 'gathering' | 'subcraft' | 'scrip' | 'tomestone' | 'reduction' | 'vendor' | 'monster';
  // False only for items that structurally have no HQ variant in-game
  // (elemental crystals/clusters, aethersand from reduction). Omitted/true
  // for everything else. The UI must not show an HQ price or toggle when
  // this is false.
  hqAvailable?: boolean;
  // Per-unit "quality" weight this material contributes toward the craft's
  // starting quality when brought in as HQ (real game mechanic: initial
  // quality = maxQuality * 0.5 * (sum of qualityContribution*amount for
  // materials actually used as HQ) / (sum of qualityContribution*amount for
  // all materials in the recipe)). Sourced directly from the official
  // recipe data; materials with no real quality variant (crystals, etc.)
  // have this at 0.
  qualityContribution?: number;
  gatheringInfo?: {
    location: string;
    zone: string;
    nodeType: 'normal' | 'unspoiled' | 'legendary' | 'ephemeral';
    spawnTimes?: number[]; // ET hours
    slot?: number;
    perceptionReq?: number;
    job: GatherJob;
  };
  defaultPriceNQ?: number;
  defaultPriceHQ?: number;
}

export interface Recipe {
  id: string;
  itemId: number;
  name: string;
  enName: string;
  icon: string;
  category: RecipeCategory;
  patch: string;
  job: CraftJob;
  level: number;
  stars: number;
  ilvl: number;
  durability: number;
  maxQuality: number;
  difficulty: number; // Required progress
  suggestedCraftsmanship: number;
  suggestedControl: number;
  materials: MaterialRequirement[];
  yields: number;
  canHq: boolean;
  masterBook?: string;
  defaultSellingPrice?: number;
  description?: string;
}

export interface CrafterStats {
  craftsmanship: number;
  control: number;
  cp: number;
  level: number;
  specialist: boolean;
  foodBuff?: {
    name: string;
    craftsmanshipBonus: number;
    controlBonus: number;
    cpBonus: number;
  };
  potionBuff?: {
    name: string;
    craftsmanshipBonus: number;
    controlBonus: number;
    cpBonus: number;
  };
}

export interface UniversalisItemData {
  itemId: number;
  worldName: string;
  dcName: string;
  minPriceNQ: number;
  minPriceHQ: number;
  averagePriceNQ: number;
  averagePriceHQ: number;
  currentAveragePrice: number;
  regularSaleVelocity: number;
  lastUploadTime: number;
  listingsCount: number;
  // True when some or all of the above prices could not be read from a live
  // Universalis response and were instead computed from a rough fallback
  // heuristic (e.g. Universalis was unreachable, or returned no listings for
  // this item/world). The UI must surface this to the user rather than
  // presenting the numbers as confirmed market data.
  isEstimate: boolean;
  // True when the selected World had no listings and this data was instead
  // fetched by aggregating across the whole Data Center. Still real market
  // data (not a guess) — isEstimate stays false — but the UI may want to
  // note that it isn't specific to the selected World.
  isDcWide?: boolean;
  // Short human-readable reason shown alongside the "estimated" badge,
  // e.g. "マーケット情報を取得できませんでした" — omitted when isEstimate is false.
  estimateReason?: string;
  recentHistory: {
    hq: boolean;
    pricePerUnit: number;
    quantity: number;
    timestamp: number;
    buyerName?: string;
  }[];
}

export interface CraftingStep {
  stepNumber: number;
  actionId: string;
  actionName: string;
  actionNameEn: string;
  actionIcon: string;
  durabilityCost: number;
  cpCost: number;
  progressGained: number;
  qualityGained: number;
  currentProgress: number;
  currentQuality: number;
  currentDurability: number;
  currentCp: number;
  currentCondition: 'normal' | 'good' | 'excellent' | 'poor';
  hqChance: number;
  innerQuietStacks: number;
  buffs: Record<string, number>; // active buffs and remaining turns
  success: boolean;
}

export interface TimedGatheringNode {
  id: string;
  itemId: number;
  itemName: string;
  job: GatherJob;
  level: number;
  stars: number;
  patch: string;
  nodeType: 'legendary' | 'unspoiled' | 'ephemeral';
  zone: string;
  nearestAetheryte: string;
  coordinates: string;
  spawnHours: number[]; // ET hours: e.g. [2, 14]
  durationHours: number; // usually 2 hours ET
  slot?: number;
  gatheringReq: number;
  perceptionReq: number;
  itemIcon: string;
  folkloreBook?: string;
  isEphemeral?: boolean; // 刻限
  reductionYield?: string; // 精選アイテム
}

export interface BatchCraftItem {
  id: string;
  recipe: Recipe;
  quantity: number;
  targetHQ: boolean;
}

export type InventoryLocationType = 'Player' | 'Retainer' | 'FC_Chest' | 'Saddlebag' | 'Armoury';

export interface InventoryItemLocation {
  location: string; // e.g. "Player", "Retainer: Nana", "FC_Chest: Tab1", "Saddlebag"
  locationType: InventoryLocationType;
  itemId: number;
  name: string;
  quantity: number;
  isHq?: boolean;
  source?: string; // Character name, Retainer, or FC (e.g. "Moja Kun", "Asagi Kun", "Halelea")
}

export interface InventorySyncData {
  timestamp: number;
  character?: string;
  selectedCharacter?: string; // 'ALL' or specific character/source name (legacy single select)
  selectedCharacters?: string[]; // Array of selected character names (multi-select support)
  characters?: string[]; // Unique list of all detected character/source names
  inventories: InventoryItemLocation[];
}
