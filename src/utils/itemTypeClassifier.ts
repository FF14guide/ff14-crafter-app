// Classifies any itemId into a broad type bucket (weapon, armor, material,
// etc.) covering essentially every item in the game -- not just crafted
// output items. Backs the "所持品一覧" item browser's category filter.

import { LucideIcon, Swords, Shield, Gem, Wrench, Shirt, Package, Palette, Utensils, Home, Diamond, Coins, Paperclip } from 'lucide-react';

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

export interface ItemTypeMeta {
  icon: LucideIcon;
  label: string;
}

export const ITEM_TYPE_LABELS: Record<ItemType, ItemTypeMeta> = {
  weapon: { icon: Swords, label: '武器' },
  armor: { icon: Shield, label: '防具' },
  accessory: { icon: Gem, label: 'アクセサリー' },
  gathererCrafterGear: { icon: Wrench, label: 'ギャザクラ装備' },
  fashion: { icon: Shirt, label: 'おしゃれ装備' },
  material: { icon: Package, label: '素材' },
  dye: { icon: Palette, label: '染料' },
  foodPotion: { icon: Utensils, label: '食料・薬' },
  housing: { icon: Home, label: '家具・庭具' },
  materia: { icon: Diamond, label: 'マテリア' },
  currency: { icon: Coins, label: '通貨' },
  collectible: { icon: Package, label: '収集品・その他' },
  other: { icon: Paperclip, label: 'その他' },
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
