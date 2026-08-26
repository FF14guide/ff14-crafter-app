import { InventorySyncData, InventoryItemLocation, InventoryLocationType } from '../types/ff14';
import { safeJsonParse } from './jsonSafe';

const STORAGE_KEY = 'eorzean_crafter_inventory_sync';

// Known Item Dictionary for fast name <-> itemId resolution
export interface KnownItemMeta {
  itemId: number;
  name: string;
  enName?: string;
  category?: string;
  icon?: string;
}

export const KNOWN_FF14_ITEMS: KnownItemMeta[] = [
  // Crystals & Clusters (Game standard IDs)
  { itemId: 8, name: 'ファイアクリスタル', enName: 'Fire Crystal', icon: '20007' },
  { itemId: 9, name: 'アイスクリスタル', enName: 'Ice Crystal', icon: '20009' },
  { itemId: 10, name: 'ウィンドクリスタル', enName: 'Wind Crystal', icon: '20010' },
  { itemId: 11, name: 'アースクリスタル', enName: 'Earth Crystal', icon: '20012' },
  { itemId: 12, name: 'ライトニングクリスタル', enName: 'Lightning Crystal', icon: '20011' },
  { itemId: 13, name: 'ウォータークリスタル', enName: 'Water Crystal', icon: '20008' },
  { itemId: 14, name: 'ファイアクラスター', enName: 'Fire Cluster', icon: '20013' },
  { itemId: 15, name: 'アイスクラスター', enName: 'Ice Cluster', icon: '20015' },
  { itemId: 16, name: 'ウィンドクラスター', enName: 'Wind Cluster', icon: '20016' },
  { itemId: 17, name: 'アースクラスター', enName: 'Earth Cluster', icon: '20018' },
  { itemId: 18, name: 'ライトニングクラスター', enName: 'Lightning Cluster', icon: '20017' },
  { itemId: 19, name: 'ウォータークラスター', enName: 'Water Cluster', icon: '20014' },

  // Patch 7.2 霊砂・素材 (Dawntrail 7.2)
  { itemId: 46246, name: '紫電の霊砂', enName: 'Levinchrome Aethersand', icon: '21248' },
  { itemId: 44035, name: '黄金の霊砂', enName: 'Sungilt Aethersand', icon: '21246' },
  { itemId: 49208, name: '高密度軽銀鉱', enName: 'Dense Aluminum Ore', icon: '21206' },
  { itemId: 49211, name: 'オルコ亜麻', enName: 'Urqopacha Flax', icon: '25033' },
  { itemId: 49224, name: '被膜形成材', enName: 'Double Duracoat', icon: '22663' },
  { itemId: 49227, name: 'トライヨラの染料', enName: 'Turali Pigment', icon: '22648' },
  { itemId: 49212, name: 'ガーデン・ソフトウォーター', enName: 'Windspath Water', icon: '22678' },
  { itemId: 44034, name: 'ヤクテル天然水', enName: 'Yak T\'el Spring Water', icon: '22614' },
  { itemId: 44071, name: 'タンブルクラブの枯草', enName: 'Tumbleclaw Weeds', icon: '21689' },
  { itemId: 44039, name: 'ウィンドパセリ', enName: 'Wind Parsley', icon: '25211' },
  { itemId: 44040, name: 'コザマル・カモミール', enName: "Kozama'uka Chamomile", icon: '25008' },
  { itemId: 44041, name: 'ウィンドローレル', enName: 'Windsbalm Bay Leaf', icon: '25009' },
  { itemId: 44042, name: 'ユーカリ', enName: 'Eucalyptus', icon: '25010' },
  { itemId: 44028, name: '帯雷繭', enName: 'Levinsilk', icon: '21687' },
  { itemId: 44006, name: 'ブラックスター原石', enName: 'Raw Black Star', icon: '21476' },
  { itemId: 44145, name: 'プルスサウルスの粗皮', enName: 'Purussaurus Skin', icon: '21825' },

  // Patch 7.2 中間素材
  { itemId: 49214, name: 'スーパージュラルミンインゴット', enName: 'Double Duraluminum Ingot', icon: '20828' },
  { itemId: 49215, name: 'ローズガーネット', enName: 'Rose Garnet', icon: '21336' },
  { itemId: 49217, name: 'オルコ・リネン', enName: 'Urqopacha Linen', icon: '21621' },
  { itemId: 49213, name: 'エレクトロパイン材', enName: 'Fulgurpine Lumber', icon: '22466' },
  { itemId: 49216, name: 'マストドンレザー', enName: 'Mastodon Leather', icon: '22007' },
  { itemId: 44033, name: 'サンダーヤードシルク', enName: 'Thunderyards Silk', icon: '21622' },
  { itemId: 44012, name: 'ブラックスター', enName: 'Black Star', icon: '21338' },
  { itemId: 49218, name: '剛力の宝水G4', enName: 'Grade 4 Gemsap of Strength', icon: '22683' },
  { itemId: 49219, name: '眼力の宝水G4', enName: 'Grade 4 Gemsap of Dexterity', icon: '22682' },
  { itemId: 49220, name: '活力の宝水G4', enName: 'Grade 4 Gemsap of Vitality', icon: '22680' },
  { itemId: 49221, name: '知力の宝水G4', enName: 'Grade 4 Gemsap of Intelligence', icon: '22679' },
  { itemId: 49222, name: '心力の宝水G4', enName: 'Grade 4 Gemsap of Mind', icon: '22681' },
  { itemId: 44051, name: '大聖水', enName: 'Sanctified Water', icon: '22653' },
  { itemId: 45989, name: '多色錬金薬', enName: 'Dichromatic Compound', icon: '22670' },

  // Patch 7.2 宝薬G3
  { itemId: 45995, name: '剛力の宝薬G3', enName: 'Grade 3 Gemdraught of Strength', icon: '20710' },
  { itemId: 45996, name: '眼力の宝薬G3', enName: 'Grade 3 Gemdraught of Dexterity', icon: '20709' },
  { itemId: 45997, name: '活力の宝薬G3', enName: 'Grade 3 Gemdraught of Vitality', icon: '20707' },
  { itemId: 45998, name: '知力の宝薬G3', enName: 'Grade 3 Gemdraught of Intelligence', icon: '20706' },
  { itemId: 45999, name: '心力の宝薬G3', enName: 'Grade 3 Gemdraught of Mind', icon: '20708' },

  // Patch 7.2 戦闘新式 (セレモニアル IL740)
  { itemId: 49272, name: 'コートリーラヴァー・ディフェンダーサーコート', enName: "Courtly Lover's Surcoat of Fending", icon: '57321' },
  { itemId: 49277, name: 'コートリーラヴァー・スレイヤーサーコート', enName: "Courtly Lover's Surcoat of Maiming", icon: '57322' },
  { itemId: 49282, name: 'コートリーラヴァー・ストライカークローク', enName: "Courtly Lover's Cloak of Striking", icon: '57325' },
  { itemId: 49292, name: 'コートリーラヴァー・スカウトシャツ', enName: "Courtly Lover's Shirt of Scouting", icon: '57327' },
  { itemId: 49302, name: 'コートリーラヴァー・キャスターバトルドレス', enName: "Courtly Lover's Longcoat of Casting", icon: '57324' },
  { itemId: 49307, name: 'コートリーラヴァー・アタッカーイヤリング', enName: "Courtly Lover's Earrings of Slaying", icon: '55565' },
  { itemId: 49312, name: 'コートリーラヴァー・アタッカーチョーカー', enName: "Courtly Lover's Choker of Slaying", icon: '55110' },
  { itemId: 49322, name: 'コートリーラヴァー・アタッカーリング', enName: "Courtly Lover's Ring of Slaying", icon: '54761' },

  // Patch 7.05 中間素材・採集・飯薬
  { itemId: 44147, name: 'マルエージングインゴット', enName: 'Maraging Steel Ingot', icon: '20833' },
  { itemId: 44148, name: 'スターリングシルバーインゴット', enName: 'Sterling Silver Ingot', icon: '20826' },
  { itemId: 44149, name: 'イペー材', enName: 'Ipe Lumber', icon: '22467' },
  { itemId: 44150, name: '海島綿布', enName: 'Blackseed Cotton Cloth', icon: '23252' },
  { itemId: 44151, name: 'プルスサウルスレザー', enName: 'Purussaurus Leather', icon: '21836' },
  { itemId: 44152, name: '剛力の宝水G2', enName: 'Grade 2 Gemsap of Strength', icon: '22683' },
  { itemId: 44153, name: '眼力の宝水G2', enName: 'Grade 2 Gemsap of Dexterity', icon: '22682' },
  { itemId: 44155, name: '知力の宝水G2', enName: 'Grade 2 Gemsap of Intelligence', icon: '22679' },
  { itemId: 44135, name: '混鉄鉱', enName: 'Harmonite Ore', icon: '21221' },
  { itemId: 44136, name: '真銀鉱', enName: 'Fine Silver Ore', icon: '21223' },
  { itemId: 44137, name: 'イペー原木', enName: 'Ipe Log', icon: '22415' },
  { itemId: 44138, name: '海島綿', enName: 'Blackseed Cotton Boll', icon: '25032' },
  { itemId: 44162, name: '剛力の宝薬G2', enName: 'Grade 2 Gemdraught of Strength', icon: '20710' },
  { itemId: 44163, name: '眼力の宝薬G2', enName: 'Grade 2 Gemdraught of Dexterity', icon: '20709' },
  { itemId: 44165, name: '知力の宝薬G2', enName: 'Grade 2 Gemdraught of Intelligence', icon: '20706' },
  { itemId: 44175, name: 'ローストチキン', enName: 'Roast Chicken', icon: '24359' },
  { itemId: 44178, name: 'ムケッカ', enName: 'Moqueca', icon: '24105' },
  { itemId: 44177, name: 'シュラスコ', enName: 'Churrasco', icon: '24371' },
  { itemId: 44180, name: 'コーヒーククルラスク', enName: 'Coffee Kukuru Rusks', icon: '24090' },
  { itemId: 44842, name: 'セビーチェ', enName: 'Ceviche', icon: '24337' },
  { itemId: 44174, name: 'ロイヤルロブスター', enName: 'Royal Lobster', icon: '29013' },
  { itemId: 44170, name: 'ラムプレスチキン', enName: 'Rumpless Chicken', icon: '25158' },
  { itemId: 43977, name: '高山食塩', enName: 'Mountain Salt', icon: '25104' },
  { itemId: 43985, name: 'ヤースラニガーリック', enName: 'Yyasulani Garlic', icon: '25006' },
  { itemId: 44106, name: 'ロネークの肩肉', enName: 'Rroneek Chuck', icon: '25159' },
  { itemId: 44171, name: 'ブラウンカルダモン', enName: 'Brown Cardamom', icon: '25021' },
  { itemId: 44172, name: 'ワイルドコーヒービーン', enName: 'Wild Coffee Beans', icon: '25919' },
  { itemId: 4833, name: 'バニラビーンズ', enName: 'Vanilla Beans', icon: '25014' },
  { itemId: 43975, name: 'ホイップクリーム', enName: 'Whipped Cream', icon: '25056' },
  { itemId: 43976, name: 'トラルコーンオイル', enName: 'Turali Corn Oil', icon: '25451' },
  { itemId: 27838, name: 'フラントーヨオイル', enName: 'Frantoio Oil', icon: '25451' },
  { itemId: 27835, name: 'リトルレモン', enName: 'Lemonette', icon: '25305' },
  { itemId: 19884, name: '魔匠の薬茶', enName: "Cunning Craftsman's Tea", icon: '24411' },

  // Patch 7.05 クラフター装備
  { itemId: 43315, name: 'サンダーヤードシルク・クラフターシャツ', enName: 'Thunderyards Silk Shirt of Crafting', icon: '57114' },
  { itemId: 43316, name: 'ガルガンチュア・クラフターハーフグローブ', enName: 'Gargantuaskin Halfgloves of Crafting', icon: '56238' },
  { itemId: 43320, name: 'サンダーヤードシルク・ギャザラーベスト', enName: 'Thunderyards Silk Vest of Gathering', icon: '57113' },
  { itemId: 44185, name: '収集用のウコギイヤリング', enName: 'Rarefied Ginseng Earrings', icon: '55532' },
  { itemId: 44111, name: 'ストーンパーティション', enName: 'Stone Partition', icon: '52799' },
];

/**
 * Fast item resolver by name or ID
 */
export function resolveItemInfo(identifier: number | string): KnownItemMeta | undefined {
  if (typeof identifier === 'number') {
    return KNOWN_FF14_ITEMS.find((i) => i.itemId === identifier);
  }
  const clean = identifier.trim().toLowerCase();
  return KNOWN_FF14_ITEMS.find(
    (i) =>
      i.name.toLowerCase() === clean ||
      i.name.toLowerCase().includes(clean) ||
      (i.enName && i.enName.toLowerCase() === clean) ||
      (i.enName && i.enName.toLowerCase().includes(clean))
  );
}

// --- Character Groups -------------------------------------------------
// Allagan Tools' export has no concept of "this retainer belongs to that
// character" -- every character, retainer, and even whichever character
// happened to scan the FC chest all show up as flat, unrelated "Source"
// values. This lets the person manually link them into groups (e.g. a
// character + all of their retainers), persisted per-browser/PC via
// localStorage so it doesn't need to be redone every visit.
export interface CharacterGroup {
  id: string;
  displayName: string;
  memberSources: string[];
}

const CHARACTER_GROUPS_KEY = 'eorzean_crafter_character_groups_v1';

export function loadCharacterGroups(): CharacterGroup[] {
  try {
    const raw = localStorage.getItem(CHARACTER_GROUPS_KEY);
    if (!raw) return [];
    const parsed = safeJsonParse<CharacterGroup[]>(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCharacterGroups(groups: CharacterGroup[]): void {
  try {
    localStorage.setItem(CHARACTER_GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // ignore (e.g. private browsing mode with storage disabled)
  }
}

/** Expands a list of selected group ids and/or raw source names into the
 * flat list of raw source names the stock-calculation logic actually
 * matches against (item.source). Ungrouped raw names pass through as-is. */
export function expandGroupSelectionToSources(
  selected: string[],
  groups: CharacterGroup[]
): string[] {
  const result = new Set<string>();
  const groupById = new Map(groups.map((g) => [g.id, g]));
  for (const sel of selected) {
    const group = groupById.get(sel);
    if (group) {
      for (const m of group.memberSources) result.add(m);
    } else {
      result.add(sel);
    }
  }
  return Array.from(result);
}
// KNOWN_FF14_ITEMS above only covers a small hand-picked set. Resolving a
// manually-typed item name against just that list meant most real items
// (anything outside that ~100-item list) silently fell back to a random
// fake itemId, which then could never match a real recipe material. This
// index covers every item in the game with a Japanese name (~50,000
// entries) and is only fetched the first time it's actually needed.
type FullItemEntry = [number, string, string, number | null]; // [itemId, ja, en, iconNum]
let fullItemIndexPromise: Promise<FullItemEntry[]> | null = null;
let fullItemByNameLower: Map<string, FullItemEntry> | null = null;

async function loadFullItemIndex(): Promise<FullItemEntry[]> {
  if (!fullItemIndexPromise) {
    fullItemIndexPromise = import('../data/itemNameIndex.json').then((mod) => {
      const list = (mod.default || mod) as unknown as FullItemEntry[];
      fullItemByNameLower = new Map(list.map((e) => [e[1].toLowerCase(), e]));
      return list;
    });
  }
  return fullItemIndexPromise;
}

/**
 * Resolves a manually-typed item name against the FULL official item
 * database (lazy-loaded on first call), not just the small hand-picked
 * KNOWN_FF14_ITEMS list. Falls back to an exact-match search only (no fuzzy
 * substring matching) to avoid false positives across 50,000+ items.
 * Returns undefined if genuinely not found -- callers should treat that as
 * "could not verify this item" rather than inventing a fake id.
 */
export async function resolveItemInfoFull(
  name: string
): Promise<{ itemId: number; name: string; enName: string; icon: string } | undefined> {
  const clean = name.trim();
  if (!clean) return undefined;

  // KNOWN_FF14_ITEMS first (already includes hand-verified icon strings).
  const known = resolveItemInfo(clean);
  if (known) {
    return { itemId: known.itemId, name: known.name, enName: known.enName, icon: known.icon };
  }

  await loadFullItemIndex();
  const entry = fullItemByNameLower?.get(clean.toLowerCase());
  if (!entry) return undefined;

  const [itemId, ja, en, iconNum] = entry;
  return {
    itemId,
    name: ja,
    enName: en,
    icon: iconNum ? String(iconNum) : '',
  };
}

// Preset 1: Patch 7.2 最新戦闘新式 & 宝薬G3 (リアルな実用ストック)
export const PRESET_PATCH_72: InventorySyncData = {
  timestamp: Date.now(),
  character: '複数キャラ (Hikari & Moja)',
  selectedCharacter: 'ALL',
  selectedCharacters: ['ALL'],
  characters: ['Hikari Light', 'Moja Kun'],
  inventories: [
    // Hikari Light 手持ち (中間素材・霊砂・クリスタル)
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 49214, name: 'スーパージュラルミンインゴット', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 49217, name: 'オルコ・リネン', quantity: 3, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 46246, name: '紫電の霊砂', quantity: 6, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 44051, name: '大聖水', quantity: 4, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 45989, name: '多色錬金薬', quantity: 3, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 18, name: 'ライトニングクラスター', quantity: 120, isHq: false },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 16, name: 'ウィンドクラスター', quantity: 95, isHq: false },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 15, name: 'アイスクラスター', quantity: 80, isHq: false },

    // Hikari Light のリテイナー Nana (7.2 採集素材・末端素材)
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49208, name: '高密度軽銀鉱', quantity: 18, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49211, name: 'オルコ亜麻', quantity: 24, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44145, name: 'プルスサウルスの粗皮', quantity: 12, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44039, name: 'ウィンドパセリ', quantity: 15, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44034, name: 'ヤクテル天然水', quantity: 30, isHq: false },
    { source: 'Hikari Light', itemId: 44071, name: 'タンブルクラブの枯草', location: 'Retainer: Nana', locationType: 'Retainer', quantity: 20, isHq: false },

    // Hikari Light のリテイナー Bob (7.2 特殊中間素材・錬金薬)
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49215, name: 'ローズガーネット', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49216, name: 'マストドンレザー', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49218, name: '剛力の宝水G4', quantity: 3, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49221, name: '知力の宝水G4', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44033, name: 'サンダーヤードシルク', quantity: 4, isHq: true },

    // サブキャラ Moja Kun の手持ち & リテイナー (分散所持の例)
    { source: 'Moja Kun', location: 'Player (手持ち)', locationType: 'Player', itemId: 49214, name: 'スーパージュラルミンインゴット', quantity: 3, isHq: true },
    { source: 'Moja Kun', location: 'Retainer: Choco', locationType: 'Retainer', itemId: 49208, name: '高密度軽銀鉱', quantity: 25, isHq: false },
    { source: 'Moja Kun', location: 'Retainer: Choco', locationType: 'Retainer', itemId: 46246, name: '紫電の霊砂', quantity: 10, isHq: true },

    // FCチェスト (共有交換素材・クリスタル)
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49224, name: '被膜形成材', quantity: 20, isHq: false },
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49227, name: 'トライヨラの染料', quantity: 16, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 49212, name: 'ガーデン・ソフトウォーター', quantity: 25, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 46246, name: '紫電の霊砂', quantity: 4, isHq: false },

    // チョコボかばん (クリスタル・霊砂)
    { source: 'Hikari Light', location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 12, name: 'ライトニングクリスタル', quantity: 450, isHq: false },
    { source: 'Hikari Light', location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 13, name: 'ウォータークリスタル', quantity: 380, isHq: false },
    { source: 'Hikari Light', location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 8, name: 'ファイアクリスタル', quantity: 500, isHq: false },
    { source: 'Hikari Light', location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 10, name: 'ウィンドクリスタル', quantity: 420, isHq: false },
    { source: 'Hikari Light', location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 44035, name: '黄金の霊砂', quantity: 8, isHq: true },
  ],
};

// Preset 2: Patch 7.05 新式・飯薬ストック
export const PRESET_PATCH_705: InventorySyncData = {
  timestamp: Date.now(),
  character: 'Hikari Light@Bahamut (Patch 7.05)',
  inventories: [
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44147, name: 'マルエージングインゴット', quantity: 3, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44148, name: 'スターリングシルバーインゴット', quantity: 2, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44151, name: 'プルスサウルスレザー', quantity: 2, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44035, name: '黄金の霊砂', quantity: 12, isHq: true },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44135, name: '混鉄鉱', quantity: 30, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44136, name: '真銀鉱', quantity: 24, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44174, name: 'ロイヤルロブスター', quantity: 16, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 43985, name: 'ヤースラニガーリック', quantity: 20, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 43977, name: '高山食塩', quantity: 18, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44170, name: 'ラムプレスチキン', quantity: 14, isHq: false },
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 44152, name: '剛力の宝水G2', quantity: 4, isHq: true },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 8, name: 'ファイアクリスタル', quantity: 450, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 13, name: 'ウォータークリスタル', quantity: 500, isHq: false },
  ],
};

// Preset 3: クラフターガチ勢 潤沢ストック
export const PRESET_FULL_STOCK: InventorySyncData = {
  timestamp: Date.now(),
  character: 'Master Crafter@Bahamut (Full Stock)',
  inventories: [
    // 7.2 Intermediates
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49214, name: 'スーパージュラルミンインゴット', quantity: 10, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49215, name: 'ローズガーネット', quantity: 10, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49217, name: 'オルコ・リネン', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49216, name: 'マストドンレザー', quantity: 8, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44033, name: 'サンダーヤードシルク', quantity: 8, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49218, name: '剛力の宝水G4', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49221, name: '知力の宝水G4', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49219, name: '眼力の宝水G4', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49220, name: '活力の宝水G4', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44051, name: '大聖水', quantity: 20, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 45989, name: '多色錬金薬', quantity: 20, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 46246, name: '紫電の霊砂', quantity: 30, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44035, name: '黄金の霊砂', quantity: 40, isHq: true },

    // Retainer 1 (Raw Mats)
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49208, name: '高密度軽銀鉱', quantity: 99, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49211, name: 'オルコ亜麻', quantity: 99, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44145, name: 'プルスサウルスの粗皮', quantity: 60, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44039, name: 'ウィンドパセリ', quantity: 50, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44040, name: 'コザマル・カモミール', quantity: 50, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44041, name: 'ウィンドローレル', quantity: 50, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44042, name: 'ユーカリ', quantity: 50, isHq: false },

    // Retainer 2 (Food & Intermediate)
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44174, name: 'ロイヤルロブスター', quantity: 40, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 43985, name: 'ヤースラニガーリック', quantity: 60, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 43977, name: '高山食塩', quantity: 80, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 27835, name: 'リトルレモン', quantity: 40, isHq: false },

    // FC Chest
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49224, name: '被膜形成材', quantity: 60, isHq: false },
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49227, name: 'トライヨラの染料', quantity: 60, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 49212, name: 'ガーデン・ソフトウォーター', quantity: 50, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 44034, name: 'ヤクテル天然水', quantity: 60, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 44071, name: 'タンブルクラブの枯草', quantity: 50, isHq: false },

    // Saddlebag (Crystals & Clusters maxed)
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 8, name: 'ファイアクリスタル', quantity: 999, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 10, name: 'ウィンドクリスタル', quantity: 999, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 11, name: 'アースクリスタル', quantity: 999, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 12, name: 'ライトニングクリスタル', quantity: 999, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 13, name: 'ウォータークリスタル', quantity: 999, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 14, name: 'ファイアクラスター', quantity: 500, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 16, name: 'ウィンドクラスター', quantity: 500, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 18, name: 'ライトニングクラスター', quantity: 500, isHq: false },
  ],
};

// Default sample data points to modern Patch 7.2 stock
export const SAMPLE_INVENTORY_DATA: InventorySyncData = PRESET_PATCH_72;

/**
 * Load stored inventory from localStorage safely
 */
export function loadStoredInventory(): InventorySyncData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return safeJsonParse<InventorySyncData | null>(raw, null);
  } catch {
    return null;
  }
}

/**
 * Save inventory to localStorage safely
 */
export function saveStoredInventory(data: InventorySyncData | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save inventory to localStorage:', e);
  }
}

/**
 * Extract item location type
 */
function normalizeLocationType(loc: string): InventoryLocationType {
  const l = loc.toLowerCase();
  if (l.includes('retainer') || l.includes('リテイナー') || l.includes('market')) return 'Retainer';
  if (l.includes('fc') || l.includes('chest') || l.includes('カンパニー') || l.includes('チェスト') || l.includes('free company')) return 'FC_Chest';
  if (l.includes('saddlebag') || l.includes('chocobo') || l.includes('チョコボ') || l.includes('かばん')) return 'Saddlebag';
  if (l.includes('armory') || l.includes('armoury') || l.includes('アーマリー') || l.includes('equipped') || l.includes('armoire') || l.includes('glamour')) return 'Armoury';
  return 'Player';
}

/**
 * Helper to build inventory sync data with character list
 */
function buildSyncResult(
  items: InventoryItemLocation[],
  defaultCharacter = 'Imported Inventory'
): InventorySyncData {
  const charSet = new Set<string>();
  for (const item of items) {
    if (item.source && item.source.trim()) {
      charSet.add(item.source.trim());
    }
  }
  const characters = Array.from(charSet);
  let characterName = defaultCharacter;
  if (characters.length === 1) {
    characterName = characters[0];
  } else if (characters.length > 1) {
    characterName = `複数キャラ (${characters.length}名)`;
  }

  return {
    timestamp: Date.now(),
    character: characterName,
    selectedCharacter: 'ALL',
    selectedCharacters: ['ALL'],
    characters,
    inventories: items,
  };
}

/**
 * Comprehensive parser for:
 * 1. Standard sync JSON { character, inventories: [...] }
 * 2. Flat array of items [ { id, name, type, "quantity/total quantity available", source, "inventory location" } ]
 * 3. Allagan Tools nested dumps: { "Inventory": [...], "Retainers": { ... }, "FreeCompany": [...] } or { "Bags": [...] }
 * 4. Teamcraft exports / key-value dicts: { "49214": 5 } or { "タングステンインゴット": 3 }
 * 5. Plaintext / CSV / TSV format:
 *    タングステンインゴット, 5, Retainer: Nana, Moja Kun
 *    49214, 10
 *    コチニールクロス x3
 */
/** Splits one CSV line into fields, respecting double-quoted fields that may contain commas. */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Dedicated parser for Allagan Tools' real CSV export
 * (header: Icon,Name,Type,Quantity/Total Quantity Available,Source,Inventory Location).
 *
 * Columns are located by NAME (not fixed position) so it's robust to the
 * Icon column being empty/reordered. Each item name is resolved against the
 * full official item database (async, lazy-loaded) -- rows that genuinely
 * can't be resolved are skipped rather than assigned a fabricated itemId,
 * since a wrong itemId would silently corrupt cost/material calculations
 * elsewhere in the app.
 */
export async function parseAllaganToolsCsv(
  input: string
): Promise<{ success: boolean; data?: InventorySyncData; error?: string; unresolvedNames?: string[] }> {
  const text = input.replace(/^\uFEFF/, '');
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) {
    return { success: false, error: 'CSVデータが空か、ヘッダー行しかありません。' };
  }

  const header = splitCsvLine(rawLines[0]).map((h) => h.trim().toLowerCase());
  const findCol = (candidates: string[]): number => {
    for (const c of candidates) {
      const i = header.indexOf(c);
      if (i !== -1) return i;
    }
    return -1;
  };

  const nameIdx = findCol(['name']);
  const typeIdx = findCol(['type']);
  const qtyIdx = findCol(['quantity/total quantity available', 'quantity', 'quantity/total quantity  available']);
  const sourceIdx = findCol(['source']);
  const locIdx = findCol(['inventory location', 'location']);

  if (nameIdx === -1 || qtyIdx === -1) {
    return {
      success: false,
      error: 'CSVのヘッダーに Name / Quantity 列が見つかりませんでした。Allagan Tools の「Copy List Contents > CSV Format」で出力した形式であることを確認してください。',
    };
  }

  const items: InventoryItemLocation[] = [];
  const unresolvedNames = new Set<string>();

  for (let i = 1; i < rawLines.length; i++) {
    const parts = splitCsvLine(rawLines[i]);
    const name = (parts[nameIdx] || '').trim();
    if (!name) continue;

    const qtyRaw = (parts[qtyIdx] || '').trim();
    const qty = parseInt(qtyRaw.replace(/[^0-9]/g, ''), 10) || 0;
    if (qty <= 0) continue;

    const type = typeIdx !== -1 ? (parts[typeIdx] || '').trim().toUpperCase() : '';
    const source = sourceIdx !== -1 ? (parts[sourceIdx] || '').trim() : '';
    const location = locIdx !== -1 ? (parts[locIdx] || '').trim() : 'Player';

    const meta = await resolveItemInfoFull(name);
    if (!meta) {
      unresolvedNames.add(name);
      continue;
    }

    items.push({
      location: location || 'Player',
      locationType: normalizeLocationType(location),
      itemId: meta.itemId,
      name: meta.name,
      quantity: qty,
      isHq: type === 'HQ',
      source: source || undefined,
    });
  }

  if (items.length === 0) {
    return {
      success: false,
      error: `有効なアイテムが見つかりませんでした（${unresolvedNames.size}件の名前を解決できず除外しました）。`,
      unresolvedNames: Array.from(unresolvedNames),
    };
  }

  return {
    success: true,
    data: buildSyncResult(items, 'Allagan Tools CSV Import'),
    unresolvedNames: unresolvedNames.size > 0 ? Array.from(unresolvedNames) : undefined,
  };
}

/** True if the input's first line looks like Allagan Tools' real CSV export header. */
export function looksLikeAllaganToolsCsv(input: string): boolean {
  const firstLine = input.replace(/^\uFEFF/, '').split(/\r?\n/)[0] || '';
  const lower = firstLine.toLowerCase();
  return lower.includes('name') && (lower.includes('quantity') || lower.includes('inventory location'));
}

/**
 * Async front door: routes to the dedicated Allagan Tools CSV parser when
 * the input is detected as that format, otherwise falls back to the
 * synchronous parseInventoryJson (JSON / simple text formats).
 */
export async function parseInventoryInputAsync(
  input: string
): Promise<{ success: boolean; data?: InventorySyncData; error?: string; unresolvedNames?: string[] }> {
  if (looksLikeAllaganToolsCsv(input)) {
    return parseAllaganToolsCsv(input);
  }
  return parseInventoryJson(input);
}

export function parseInventoryJson(input: string): { success: boolean; data?: InventorySyncData; error?: string } {
  if (!input || !input.trim()) {
    return { success: false, error: '入力データが空です。JSONまたはテキストを入力してください。' };
  }

  const trimmed = input.trim();

  // Try JSON Parse first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);

      // 1. Standard format: { timestamp, character, inventories: [...] }
      if (parsed && Array.isArray(parsed.inventories)) {
        const items: InventoryItemLocation[] = [];
        for (const raw of parsed.inventories) {
          if (!raw) continue;
          let id = Number(raw.itemId || raw.id || raw.ItemId || raw.item_id);
          let name = String(raw.name || raw.Name || raw.item_name || '');

          if (!id && name) {
            const meta = resolveItemInfo(name);
            if (meta) {
              id = meta.itemId;
              name = meta.name;
            }
          }
          if (id && !name) {
            const meta = resolveItemInfo(id);
            name = meta ? meta.name : `Item #${id}`;
          }

          if (!id) continue;

          const loc = String(raw.location || raw.Location || raw['inventory location'] || raw.container || raw.bag || 'Player');
          const source = String(raw.source || raw.Source || raw.character || raw.Character || raw.owner || raw.Owner || parsed.character || '').trim();
          const qty = Math.max(0, Number(raw.quantity || raw.Quantity || raw['quantity/total quantity available'] || raw.count || raw.Count || raw.amount || raw.Amount) || 1);
          const isHq = raw.type === 'HQ' || Boolean(raw.isHq || raw.hq || raw.IsHq || raw.HQ);

          items.push({
            location: loc,
            locationType: normalizeLocationType(loc),
            itemId: id,
            name: name || `Item #${id}`,
            quantity: qty,
            isHq,
            source: source || undefined,
          });
        }

        if (items.length > 0) {
          const syncRes = buildSyncResult(items, parsed.character || 'Imported Character');
          if (parsed.selectedCharacter) {
            syncRes.selectedCharacter = parsed.selectedCharacter;
          }
          return {
            success: true,
            data: syncRes,
          };
        }
      }

      // 2. Direct Array format: [ { id, name, "inventory location", source, "quantity/total quantity available", type: "HQ"/"NQ" } ]
      if (Array.isArray(parsed)) {
        const items: InventoryItemLocation[] = [];
        for (const raw of parsed) {
          if (!raw) continue;
          let id = Number(raw.itemId || raw.id || raw.ItemId || raw.item_id);
          let name = String(raw.name || raw.Name || raw.item_name || '');

          if (!id && name) {
            const meta = resolveItemInfo(name);
            if (meta) {
              id = meta.itemId;
              name = meta.name;
            }
          }
          if (id && !name) {
            const meta = resolveItemInfo(id);
            name = meta ? meta.name : `Item #${id}`;
          }

          if (!id) continue;

          const loc = String(raw['inventory location'] || raw.location || raw.Location || raw.container || raw.bag || 'Player');
          const source = String(raw.source || raw.Source || raw.character || raw.Character || raw.owner || raw.Owner || '').trim();
          const qty = Math.max(
            0,
            Number(
              raw['quantity/total quantity available'] !== undefined
                ? raw['quantity/total quantity available']
                : (raw.quantity || raw.Quantity || raw.count || raw.Count || raw.amount || raw.Amount)
            ) || 1
          );
          const isHq = raw.type === 'HQ' || Boolean(raw.isHq || raw.hq || raw.IsHq || raw.HQ);

          items.push({
            location: loc,
            locationType: normalizeLocationType(loc),
            itemId: id,
            name: name || `Item #${id}`,
            quantity: qty,
            isHq,
            source: source || undefined,
          });
        }

        if (items.length > 0) {
          return {
            success: true,
            data: buildSyncResult(items, 'Dalamud / Allagan Tools Export'),
          };
        }
      }

      // 3. Allagan Tools Bag Dump: { "CharacterName": "...", "Bags": [ { "Slots": [ { ItemId, Count, IsHq } ] } ] }
      if (parsed && Array.isArray(parsed.Bags)) {
        const items: InventoryItemLocation[] = [];
        const charName = parsed.CharacterName || 'Allagan Tools Export';
        for (const bag of parsed.Bags) {
          const bagName = bag.BagType !== undefined ? `Bag #${bag.BagType}` : (bag.Name || 'Inventory');
          const slots = bag.Slots || bag.Items || [];
          for (const slot of slots) {
            const id = Number(slot.ItemId || slot.itemId || slot.id);
            if (!id) continue;
            const meta = resolveItemInfo(id);
            items.push({
              location: bagName,
              locationType: normalizeLocationType(bagName),
              itemId: id,
              name: meta ? meta.name : `Item #${id}`,
              quantity: Math.max(0, Number(slot.Count || slot.quantity || slot.amount) || 1),
              isHq: Boolean(slot.IsHq || slot.isHq || slot.hq),
              source: charName,
            });
          }
        }
        if (items.length > 0) {
          return {
            success: true,
            data: buildSyncResult(items, charName),
          };
        }
      }

      // 4. Nested Container Object: { "Player": [...], "Retainers": { "Nana": [...] } }
      if (typeof parsed === 'object') {
        const items: InventoryItemLocation[] = [];
        const rootCharacter = parsed.CharacterName || parsed.character || parsed.Character || '';

        const walkObject = (obj: any, currentContainer: string, currentSource: string) => {
          if (!obj || typeof obj !== 'object') return;

          if (Array.isArray(obj)) {
            for (const entry of obj) {
              if (typeof entry === 'object' && entry !== null) {
                let id = Number(entry.itemId || entry.id || entry.ItemId);
                let name = String(entry.name || entry.Name || '');
                if (!id && name) {
                  const meta = resolveItemInfo(name);
                  if (meta) {
                    id = meta.itemId;
                    name = meta.name;
                  }
                }
                if (id && !name) {
                  const meta = resolveItemInfo(id);
                  name = meta ? meta.name : `Item #${id}`;
                }
                if (id) {
                  const src = String(entry.source || entry.Source || entry.character || currentSource || '').trim();
                  const loc = String(entry['inventory location'] || entry.location || currentContainer || 'Player');
                  items.push({
                    location: loc,
                    locationType: normalizeLocationType(loc),
                    itemId: id,
                    name: name || `Item #${id}`,
                    quantity: Math.max(0, Number(entry['quantity/total quantity available'] || entry.quantity || entry.count || entry.amount || entry.Count) || 1),
                    isHq: entry.type === 'HQ' || Boolean(entry.isHq || entry.hq || entry.IsHq),
                    source: src || undefined,
                  });
                }
              }
            }
          } else {
            // Nested subcontainers or Key-Value map
            for (const [key, val] of Object.entries(obj)) {
              if (typeof val === 'number') {
                // Key-value pair like { "49214": 5 } or { "タングステンインゴット": 3 }
                let id = Number(key);
                let name = '';
                if (!id || isNaN(id)) {
                  const meta = resolveItemInfo(key);
                  if (meta) {
                    id = meta.itemId;
                    name = meta.name;
                  }
                } else {
                  const meta = resolveItemInfo(id);
                  name = meta ? meta.name : `Item #${id}`;
                }
                if (id) {
                  items.push({
                    location: currentContainer || 'Player',
                    locationType: normalizeLocationType(currentContainer || 'Player'),
                    itemId: id,
                    name: name || `Item #${id}`,
                    quantity: Math.max(0, val),
                    isHq: false,
                    source: currentSource || undefined,
                  });
                }
              } else if (typeof val === 'object' && val !== null) {
                // Check if val is item object with quantity: { "49214": { "quantity": 5, "hq": true } }
                if ('quantity' in val || 'count' in val || 'amount' in val || 'Count' in val) {
                  let id = Number(key);
                  let name = '';
                  if (!id || isNaN(id)) {
                    const meta = resolveItemInfo(key);
                    if (meta) {
                      id = meta.itemId;
                      name = meta.name;
                    }
                  } else {
                    const meta = resolveItemInfo(id);
                    name = meta ? meta.name : `Item #${id}`;
                  }
                  if (id) {
                    const v: any = val;
                    const src = String(v.source || v.character || currentSource || '').trim();
                    items.push({
                      location: currentContainer || 'Player',
                      locationType: normalizeLocationType(currentContainer || 'Player'),
                      itemId: id,
                      name: name || `Item #${id}`,
                      quantity: Math.max(0, Number(v.quantity || v.count || v.amount || v.Count) || 1),
                      isHq: v.type === 'HQ' || Boolean(v.isHq || v.hq || v.HQ),
                      source: src || undefined,
                    });
                    continue;
                  }
                }
                const nextContainer = currentContainer ? `${currentContainer} > ${key}` : key;
                const nextSource = currentSource || (key.length > 2 && !key.startsWith('Bag') && !key.startsWith('Slot') ? key : '');
                walkObject(val, nextContainer, nextSource);
              }
            }
          }
        };

        walkObject(parsed, '', rootCharacter);

        if (items.length > 0) {
          return {
            success: true,
            data: buildSyncResult(items, rootCharacter || 'Dalamud Object Export'),
          };
        }
      }
    } catch {
      // Fall through to text/csv parser
    }
  }

  // 5. Plaintext / CSV / TSV parser fallback
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: InventoryItemLocation[] = [];

  for (const line of lines) {
    // Format: "Name / ID, Quantity, Location, Character/Source"
    let parts = line.split(/[,\t|]/).map((p) => p.trim());
    if (parts.length >= 2) {
      let rawIdentifier = parts[0];
      let rawQty = parts[1];
      let rawLoc = parts[2] || 'Player';
      let rawSource = parts[3] || '';

      let id = Number(rawIdentifier);
      let name = '';
      if (!id || isNaN(id)) {
        const meta = resolveItemInfo(rawIdentifier);
        if (meta) {
          id = meta.itemId;
          name = meta.name;
        }
      } else {
        const meta = resolveItemInfo(id);
        name = meta ? meta.name : `Item #${id}`;
      }

      const qty = parseInt(rawQty.replace(/[^0-9]/g, '')) || 0;
      if (id && qty > 0) {
        items.push({
          location: rawLoc,
          locationType: normalizeLocationType(rawLoc),
          itemId: id,
          name: name || `Item #${id}`,
          quantity: qty,
          isHq: rawQty.toLowerCase().includes('hq'),
          source: rawSource || undefined,
        });
        continue;
      }
    }

    // Pattern like "タングステンインゴット x5 (Moja Kun)" or "タングステンインゴット : 5"
    const match = line.match(/^(.+?)(?:\s*[xX:：\s]\s*|\s+)(\d+)(?:\s*個|\s*HQ|\s*hq|\s*NQ)?(?:\s*\((.*?)\))?$/);
    if (match) {
      const rawName = match[1].trim();
      const qty = parseInt(match[2]);
      const locOrSrc = match[3] || 'Player';

      let id = Number(rawName);
      let name = '';
      if (!id || isNaN(id)) {
        const meta = resolveItemInfo(rawName);
        if (meta) {
          id = meta.itemId;
          name = meta.name;
        }
      } else {
        const meta = resolveItemInfo(id);
        name = meta ? meta.name : `Item #${id}`;
      }

      if (id && qty > 0) {
        items.push({
          location: locOrSrc,
          locationType: normalizeLocationType(locOrSrc),
          itemId: id,
          name: name || `Item #${id}`,
          quantity: qty,
          isHq: line.toLowerCase().includes('hq'),
          source: locOrSrc !== 'Player' ? locOrSrc : undefined,
        });
      }
    }
  }

  if (items.length > 0) {
    return {
      success: true,
      data: buildSyncResult(items, 'Text/CSV Import'),
    };
  }

  return {
    success: false,
    error: '有効なインベントリ形式（JSON、Allagan Tools、Teamcraft、CSV、アイテム名と個数）を認識できませんでした。',
  };
}

/**
 * Helper to filter items based on selected character / source (supports multi-character filtering)
 */
export function getFilteredInventoryItems(
  syncData: InventorySyncData | null,
  characterFilter?: string | string[]
): InventoryItemLocation[] {
  if (!syncData || !syncData.inventories) return [];

  let activeFilters: string[] = [];

  if (characterFilter !== undefined) {
    if (Array.isArray(characterFilter)) {
      activeFilters = characterFilter.filter((c) => c && c !== 'ALL');
    } else if (characterFilter === 'ALL' || !characterFilter) {
      activeFilters = [];
    } else {
      activeFilters = [characterFilter];
    }
  } else if (syncData.selectedCharacters && syncData.selectedCharacters.length > 0) {
    if (syncData.selectedCharacters.includes('ALL')) {
      activeFilters = [];
    } else {
      activeFilters = syncData.selectedCharacters.filter((c) => c && c !== 'ALL');
    }
  } else if (syncData.selectedCharacter && syncData.selectedCharacter !== 'ALL') {
    activeFilters = [syncData.selectedCharacter];
  }

  // If no filters (or 'ALL' is selected), return all items
  if (activeFilters.length === 0) {
    return syncData.inventories;
  }

  return syncData.inventories.filter((inv) => {
    if (!inv.source) return true;
    return activeFilters.includes(inv.source);
  });
}

/**
 * Character stock breakdown item
 */
export interface CharacterStockDetail {
  characterName: string;
  totalQuantity: number;
  locations: InventoryItemLocation[];
}

/**
 * Group stock by character / owner to see who owns how many
 */
export function getItemStockByCharacter(
  itemId: number,
  syncData: InventorySyncData | null,
  characterFilter?: string | string[]
): CharacterStockDetail[] {
  const items = getFilteredInventoryItems(syncData, characterFilter).filter((inv) => inv.itemId === itemId);
  if (items.length === 0) return [];

  const charMap = new Map<string, { total: number; locations: InventoryItemLocation[] }>();

  for (const item of items) {
    const char = item.source?.trim() || '共通 / 所持元未指定';
    if (!charMap.has(char)) {
      charMap.set(char, { total: 0, locations: [] });
    }
    const entry = charMap.get(char)!;
    entry.total += item.quantity;
    entry.locations.push(item);
  }

  return Array.from(charMap.entries()).map(([characterName, data]) => ({
    characterName,
    totalQuantity: data.total,
    locations: data.locations,
  }));
}

/**
 * Get total quantity owned across selected inventory locations
 */
export function getItemStockTotal(
  itemId: number,
  syncData: InventorySyncData | null,
  characterFilter?: string | string[]
): number {
  const items = getFilteredInventoryItems(syncData, characterFilter);
  return items
    .filter((inv) => inv.itemId === itemId)
    .reduce((sum, inv) => sum + inv.quantity, 0);
}

/**
 * Get item breakdown locations
 */
export function getItemStockBreakdown(
  itemId: number,
  syncData: InventorySyncData | null,
  characterFilter?: string | string[]
): InventoryItemLocation[] {
  const items = getFilteredInventoryItems(syncData, characterFilter);
  return items.filter((inv) => inv.itemId === itemId);
}

/**
 * Generate in-game chat withdrawal instruction string
 */
export function generateWithdrawalList(
  itemsNeeded: { name: string; needed: number; locations: InventoryItemLocation[] }[]
): string {
  const instructions: string[] = [];

  for (const item of itemsNeeded) {
    let remaining = item.needed;
    for (const loc of item.locations) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, loc.quantity);
      if (take > 0 && loc.locationType !== 'Player') {
        const sourcePrefix = loc.source ? `【${loc.source}】` : '';
        instructions.push(`・${sourcePrefix}${loc.location} から 「${item.name}」 を ${take}個 引き出す`);
        remaining -= take;
      }
    }
  }

  if (instructions.length === 0) {
    return '手持ちまたはFCチェストからの引き出し対象はありません（手持ちのみで充足しています）';
  }

  return [
    `【FF14 Eorzean Crafter】素材引き出しリスト`,
    `----------------------------------------`,
    ...instructions,
    `----------------------------------------`,
    `https://clafter.eorzeanfishing.com`,
  ].join('\n');
}
