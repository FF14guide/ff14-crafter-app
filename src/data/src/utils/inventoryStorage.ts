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
  { itemId: 8, name: 'ファイアクリスタル', enName: 'Fire Crystal', icon: '20001' },
  { itemId: 9, name: 'アイスクリスタル', enName: 'Ice Crystal', icon: '20002' },
  { itemId: 10, name: 'ウィンドクリスタル', enName: 'Wind Crystal', icon: '20003' },
  { itemId: 11, name: 'アースクリスタル', enName: 'Earth Crystal', icon: '20004' },
  { itemId: 12, name: 'ライトニングクリスタル', enName: 'Lightning Crystal', icon: '20005' },
  { itemId: 13, name: 'ウォータークリスタル', enName: 'Water Crystal', icon: '20006' },
  { itemId: 14, name: 'ファイアクラスター', enName: 'Fire Cluster', icon: '20007' },
  { itemId: 15, name: 'アイスクラスター', enName: 'Ice Cluster', icon: '20008' },
  { itemId: 16, name: 'ウィンドクラスター', enName: 'Wind Cluster', icon: '20009' },
  { itemId: 17, name: 'アースクラスター', enName: 'Earth Cluster', icon: '20010' },
  { itemId: 18, name: 'ライトニングクラスター', enName: 'Lightning Cluster', icon: '20011' },
  { itemId: 19, name: 'ウォータークラスター', enName: 'Water Cluster', icon: '20012' },

  // Patch 7.2 霊砂・素材 (Dawntrail 7.2)
  { itemId: 46246, name: '幻晃の霊砂', enName: 'Thundervale Aethersand', icon: '21248' },
  { itemId: 44035, name: '黄金の霊砂', enName: 'Mythbrine Aethersand', icon: '21246' },
  { itemId: 49208, name: 'フルグライト', enName: 'Fulgurite', icon: '21206' },
  { itemId: 49211, name: 'コーディア原木', enName: 'Cordia Log', icon: '25033' },
  { itemId: 49224, name: 'タングステン鉱', enName: 'Tungsten Ore', icon: '22663' },
  { itemId: 49227, name: 'コチニール染料', enName: 'Cochineal Pigment', icon: '22648' },
  { itemId: 49212, name: 'ガーデン・ソフトウォーター', enName: 'Garden Softwater', icon: '22678' },
  { itemId: 44034, name: 'ヤクテル天然水', enName: 'Yak T\'el Spring Water', icon: '22614' },
  { itemId: 44071, name: 'タンブルクラブの枯草', enName: 'Tumble Crab Grass', icon: '21689' },
  { itemId: 44039, name: 'ウィンドパセリ', enName: 'Wind Parsley', icon: '25211' },
  { itemId: 44040, name: 'マウンテンセージ', enName: 'Mountain Sage', icon: '25010' },
  { itemId: 44041, name: 'ウィンドローレル', enName: 'Wind Laurel', icon: '25008' },
  { itemId: 44042, name: 'ユーカリ', enName: 'Eucalyptus', icon: '25009' },
  { itemId: 44028, name: '帯雷繭', enName: 'Charged Cocoon', icon: '21620' },
  { itemId: 44006, name: 'ブラックスター原石', enName: 'Raw Black Star', icon: '21337' },
  { itemId: 44145, name: 'プルスサウルスの粗皮', enName: 'Purussaurus Skin', icon: '22009' },

  // Patch 7.2 中間素材
  { itemId: 49214, name: 'タングステンインゴット', enName: 'Tungsten Ingot', icon: '20828' },
  { itemId: 49215, name: 'ロードクロサイト', enName: 'Rhodochrosite', icon: '20829' },
  { itemId: 49217, name: 'コチニールクロス', enName: 'Cochineal Cloth', icon: '21621' },
  { itemId: 49213, name: 'コーディア材', enName: 'Cordia Lumber', icon: '22467' },
  { itemId: 49216, name: 'ペルペルレザー', enName: 'Pelupelu Leather', icon: '22008' },
  { itemId: 44033, name: 'サンダーヤードシルク', enName: 'Thunderyard Silk', icon: '21622' },
  { itemId: 44012, name: 'ブラックスター', enName: 'Black Star', icon: '21338' },
  { itemId: 49218, name: '剛力の宝水G3', enName: 'Grade 3 Infusion of Strength', icon: '22680' },
  { itemId: 49219, name: '眼力の宝水G3', enName: 'Grade 3 Infusion of Dexterity', icon: '22681' },
  { itemId: 49220, name: '活力の宝水G3', enName: 'Grade 3 Infusion of Vitality', icon: '22680' },
  { itemId: 49221, name: '知力の宝水G3', enName: 'Grade 3 Infusion of Intelligence', icon: '22679' },
  { itemId: 49222, name: '心力の宝水G3', enName: 'Grade 3 Infusion of Mind', icon: '22678' },
  { itemId: 44051, name: '大聖水', enName: 'Grand Holy Water', icon: '22653' },
  { itemId: 45989, name: '多色錬金薬', enName: 'Multicolor Alkahest', icon: '22670' },

  // Patch 7.2 宝薬G3
  { itemId: 45995, name: '剛力の宝薬G3', enName: 'Grade 3 Gemdraught of Strength', icon: '20710' },
  { itemId: 45996, name: '眼力の宝薬G3', enName: 'Grade 3 Gemdraught of Dexterity', icon: '20709' },
  { itemId: 45997, name: '活力の宝薬G3', enName: 'Grade 3 Gemdraught of Vitality', icon: '20707' },
  { itemId: 45998, name: '知力の宝薬G3', enName: 'Grade 3 Gemdraught of Intelligence', icon: '20706' },
  { itemId: 45999, name: '心力の宝薬G3', enName: 'Grade 3 Gemdraught of Mind', icon: '20708' },

  // Patch 7.2 戦闘新式 (セレモニアル IL740)
  { itemId: 49272, name: 'セレモニアル・ディフェンダーコート', enName: 'Ceremonial Coat of Fending', icon: '57321' },
  { itemId: 49277, name: 'セレモニアル・スレイヤーコート', enName: 'Ceremonial Coat of Maiming', icon: '57322' },
  { itemId: 49282, name: 'セレモニアル・ストライカーコート', enName: 'Ceremonial Coat of Striking', icon: '57325' },
  { itemId: 49292, name: 'セレモニアル・スカウトシャツ', enName: 'Ceremonial Shirt of Scouting', icon: '57327' },
  { itemId: 49302, name: 'セレモニアル・キャスターローブ', enName: 'Ceremonial Robe of Casting', icon: '57324' },
  { itemId: 49307, name: 'セレモニアル・アタッカーイヤリング', enName: 'Ceremonial Earrings of Slaying', icon: '55565' },
  { itemId: 49312, name: 'セレモニアル・アタッカーチョーカー', enName: 'Ceremonial Choker of Slaying', icon: '55110' },
  { itemId: 49322, name: 'セレモニアル・アタッカーリング', enName: 'Ceremonial Ring of Slaying', icon: '54761' },

  // Patch 7.05 中間素材・採集・飯薬
  { itemId: 44147, name: 'マルエージングインゴット', enName: 'Maraging Ingot', icon: '20833' },
  { itemId: 44148, name: 'スターリングシルバーインゴット', enName: 'Sterling Silver Ingot', icon: '20826' },
  { itemId: 44149, name: 'イペー材', enName: 'Ipe Lumber', icon: '22467' },
  { itemId: 44150, name: '海島綿布', enName: 'Sea Island Cotton Cloth', icon: '23252' },
  { itemId: 44151, name: 'プルスサウルスレザー', enName: 'Purussaurus Leather', icon: '21836' },
  { itemId: 44152, name: '剛力の宝水G2', enName: 'Grade 2 Infusion of Strength', icon: '22678' },
  { itemId: 44153, name: '眼力の宝水G2', enName: 'Grade 2 Infusion of Dexterity', icon: '22677' },
  { itemId: 44155, name: '知力の宝水G2', enName: 'Grade 2 Infusion of Intelligence', icon: '22676' },
  { itemId: 44135, name: '混鉄鉱', enName: 'Raw Hematite', icon: '21221' },
  { itemId: 44136, name: '真銀鉱', enName: 'Raw Sterling Silver', icon: '21223' },
  { itemId: 44137, name: 'イペー原木', enName: 'Ipe Log', icon: '22415' },
  { itemId: 44138, name: '海島綿', enName: 'Sea Island Cotton', icon: '25031' },
  { itemId: 44162, name: '剛力の宝薬G2', enName: 'Grade 2 Gemdraught of Strength', icon: '20710' },
  { itemId: 44163, name: '眼力の宝薬G2', enName: 'Grade 2 Gemdraught of Dexterity', icon: '20709' },
  { itemId: 44165, name: '知力の宝薬G2', enName: 'Grade 2 Gemdraught of Intelligence', icon: '20706' },
  { itemId: 44175, name: 'ローストチキン', enName: 'Roast Chicken', icon: '24359' },
  { itemId: 44178, name: 'ムケッカ', enName: 'Moqueca', icon: '24105' },
  { itemId: 44177, name: 'シュラスコ', enName: 'Churrasco', icon: '24371' },
  { itemId: 44180, name: 'コーヒーククルラスク', enName: 'Coffee Kukuru Rusk', icon: '24090' },
  { itemId: 44842, name: 'セビーチェ', enName: 'Ceviche', icon: '24337' },
  { itemId: 44174, name: 'ロイヤルロブスター', enName: 'Royal Lobster', icon: '28080' },
  { itemId: 44170, name: 'ラムプレスチキン', enName: 'Lampreys Chicken', icon: '28081' },
  { itemId: 43977, name: '高山食塩', enName: 'Alpine Salt', icon: '25104' },
  { itemId: 43985, name: 'ヤースラニガーリック', enName: 'Yyaslani Garlic', icon: '25006' },
  { itemId: 44106, name: 'ロネークの肩肉', enName: 'Rroneek Shoulder Meat', icon: '24087' },
  { itemId: 44171, name: 'ブラウンカルダモン', enName: 'Brown Cardamom', icon: '24086' },
  { itemId: 44172, name: 'ワイルドコーヒービーン', enName: 'Wild Coffee Beans', icon: '24085' },
  { itemId: 4833, name: 'ククルビーン', enName: 'Kukuru Bean', icon: '24084' },
  { itemId: 43975, name: 'トラルバター', enName: 'Tural Butter', icon: '24083' },
  { itemId: 43976, name: 'ココナッツミルク', enName: 'Coconut Milk', icon: '24082' },
  { itemId: 27838, name: 'フラントーヨオイル', enName: 'Frantoio Oil', icon: '24081' },
  { itemId: 27835, name: 'リトルレモン', enName: 'Little Lemon', icon: '25305' },
  { itemId: 19884, name: '魔匠の薬茶', enName: 'Cunning Craftsman Tea', icon: '24411' },

  // Patch 7.05 クラフター装備
  { itemId: 43315, name: 'サンダーヤードシルク・クラフターシャツ', enName: 'Thunderyard Silk Crafter Shirt', icon: '57114' },
  { itemId: 43316, name: 'ガルガンチュア・クラフターハーフグローブ', enName: 'Gargantua Crafter Halfgloves', icon: '56238' },
  { itemId: 43320, name: 'ブラックスター・クラフターリング', enName: 'Black Star Crafter Ring', icon: '54734' },
  { itemId: 44185, name: '収集用のウコギイヤリング', enName: 'Rarefied Ukogi Earring', icon: '55532' },
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

// Preset 1: Patch 7.2 最新戦闘新式 & 宝薬G3 (リアルな実用ストック)
export const PRESET_PATCH_72: InventorySyncData = {
  timestamp: Date.now(),
  character: '複数キャラ (Hikari & Moja)',
  selectedCharacter: 'ALL',
  selectedCharacters: ['ALL'],
  characters: ['Hikari Light', 'Moja Kun'],
  inventories: [
    // Hikari Light 手持ち (中間素材・霊砂・クリスタル)
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 49214, name: 'タングステンインゴット', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 49217, name: 'コチニールクロス', quantity: 3, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 46246, name: '幻晃の霊砂', quantity: 6, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 44051, name: '大聖水', quantity: 4, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 45989, name: '多色錬金薬', quantity: 3, isHq: true },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 18, name: 'ライトニングクラスター', quantity: 120, isHq: false },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 16, name: 'ウィンドクラスター', quantity: 95, isHq: false },
    { source: 'Hikari Light', location: 'Player (手持ち)', locationType: 'Player', itemId: 15, name: 'アイスクラスター', quantity: 80, isHq: false },

    // Hikari Light のリテイナー Nana (7.2 採集素材・末端素材)
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49208, name: 'フルグライト', quantity: 18, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49211, name: 'コーディア原木', quantity: 24, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44145, name: 'プルスサウルスの粗皮', quantity: 12, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44039, name: 'ウィンドパセリ', quantity: 15, isHq: false },
    { source: 'Hikari Light', location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44034, name: 'ヤクテル天然水', quantity: 30, isHq: false },
    { source: 'Hikari Light', itemId: 44071, name: 'タンブルクラブの枯草', location: 'Retainer: Nana', locationType: 'Retainer', quantity: 20, isHq: false },

    // Hikari Light のリテイナー Bob (7.2 特殊中間素材・錬金薬)
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49215, name: 'ロードクロサイト', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49216, name: 'ペルペルレザー', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49218, name: '剛力の宝水G3', quantity: 3, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 49221, name: '知力の宝水G3', quantity: 2, isHq: true },
    { source: 'Hikari Light', location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44033, name: 'サンダーヤードシルク', quantity: 4, isHq: true },

    // サブキャラ Moja Kun の手持ち & リテイナー (分散所持の例)
    { source: 'Moja Kun', location: 'Player (手持ち)', locationType: 'Player', itemId: 49214, name: 'タングステンインゴット', quantity: 3, isHq: true },
    { source: 'Moja Kun', location: 'Retainer: Choco', locationType: 'Retainer', itemId: 49208, name: 'フルグライト', quantity: 25, isHq: false },
    { source: 'Moja Kun', location: 'Retainer: Choco', locationType: 'Retainer', itemId: 46246, name: '幻晃の霊砂', quantity: 10, isHq: true },

    // FCチェスト (共有交換素材・クリスタル)
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49224, name: 'タングステン鉱', quantity: 20, isHq: false },
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49227, name: 'コチニール染料', quantity: 16, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 49212, name: 'ガーデン・ソフトウォーター', quantity: 25, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 46246, name: '幻晃の霊砂', quantity: 4, isHq: false },

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
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49214, name: 'タングステンインゴット', quantity: 10, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49215, name: 'ロードクロサイト', quantity: 10, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49217, name: 'コチニールクロス', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49216, name: 'ペルペルレザー', quantity: 8, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44033, name: 'サンダーヤードシルク', quantity: 8, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49218, name: '剛力の宝水G3', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49221, name: '知力の宝水G3', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49219, name: '眼力の宝水G3', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 49220, name: '活力の宝水G3', quantity: 12, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44051, name: '大聖水', quantity: 20, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 45989, name: '多色錬金薬', quantity: 20, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 46246, name: '幻晃の霊砂', quantity: 30, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44035, name: '黄金の霊砂', quantity: 40, isHq: true },

    // Retainer 1 (Raw Mats)
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49208, name: 'フルグライト', quantity: 99, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 49211, name: 'コーディア原木', quantity: 99, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44145, name: 'プルスサウルスの粗皮', quantity: 60, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44039, name: 'ウィンドパセリ', quantity: 50, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44040, name: 'マウンテンセージ', quantity: 50, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44041, name: 'ウィンドローレル', quantity: 50, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44042, name: 'ユーカリ', quantity: 50, isHq: false },

    // Retainer 2 (Food & Intermediate)
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44174, name: 'ロイヤルロブスター', quantity: 40, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 43985, name: 'ヤースラニガーリック', quantity: 60, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 43977, name: '高山食塩', quantity: 80, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 27835, name: 'リトルレモン', quantity: 40, isHq: false },

    // FC Chest
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49224, name: 'タングステン鉱', quantity: 60, isHq: false },
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 49227, name: 'コチニール染料', quantity: 60, isHq: false },
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
