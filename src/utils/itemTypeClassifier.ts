// Classifies any itemId into a broad type bucket (weapon, armor, material,
// etc.) covering essentially every item in the game -- not just crafted
// output items. Backs the "所持品一覧" item browser's category filter.

export type ItemType =
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'gathererCrafterGear'
  | 'fashion'
  | 'material'
  | 'dye'
  | 'foodPotion'
  | 'housing'
  | 'materia'
  | 'currency'
  | 'collectible'
  | 'other';

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  weapon: '⚔️ 武器',
  armor: '🛡️ 防具',
  accessory: '💍 アクセサリー',
  gathererCrafterGear: '🔨 ギャザクラ装備',
  fashion: '👗 おしゃれ装備',
  material: '🪨 素材',
  dye: '🎨 染料',
  foodPotion: '🍗 食料・薬',
  housing: '⛲ 家具・庭具',
  materia: '💠 マテリア',
  currency: '🪙 通貨',
  collectible: '📦 収集品・その他',
  other: '📎 その他',
};

let mapPromise: Promise<Record<number, ItemType>> | null = null;

async function loadMap(): Promise<Record<number, ItemType>> {
  if (!mapPromise) {
    mapPromise = import('../data/itemTypeIndex.json').then((mod) => (mod.default || mod) as unknown as Record<number, ItemType>);
  }
  return mapPromise;
}

/** Loads (and caches) the full itemId -> type map for synchronous per-item lookups. */
export async function loadItemTypeMap(): Promise<Record<number, ItemType>> {
  return loadMap();
}

export function getItemType(itemId: number, map: Record<number, ItemType>): ItemType {
  return map[itemId] || 'other';
}
