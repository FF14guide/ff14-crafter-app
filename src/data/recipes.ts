import { Recipe } from '../types/ff14';

export const RECIPES_DATABASE: Recipe[] = [
  // ================= 7.1 / 7.05 レイド用 飯・薬 (Food & Potions) =================
  {
    id: 'food_roast_chicken',
    itemId: 44021,
    name: 'ローストチキン',
    enName: 'Roast Chicken',
    icon: '🍗',
    category: 'foodPotion',
    patch: '7.1',
    job: 'CUL',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 80,
    maxQuality: 14800,
    difficulty: 6600,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 3,
    canHq: true,
    masterBook: '調理師秘伝書:第11巻',
    defaultSellingPrice: 4200,
    description: 'VIT +10% (Max 212), クリティカル +10% (Max 168), 意思力 +10% (Max 101)',
    materials: [
      { itemId: 44101, name: 'ヤクのモモ肉', amount: 2, sourceType: 'gathering', defaultPriceNQ: 1200, defaultPriceHQ: 2000 },
      { itemId: 44102, name: 'ウィンドローレル', amount: 1, sourceType: 'gathering', defaultPriceNQ: 800, defaultPriceHQ: 1400 },
      { itemId: 44103, name: 'ヤクのミルク', amount: 1, sourceType: 'vendor', defaultPriceNQ: 300 },
      { itemId: 44104, name: '黄金の霊砂', amount: 1, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44105, name: '火のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44106, name: '水のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'food_baked_darkhorse',
    itemId: 44022,
    name: 'ベイクド・ダークホース',
    enName: 'Baked Dark Horse',
    icon: '🥩',
    category: 'foodPotion',
    patch: '7.1',
    job: 'CUL',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 80,
    maxQuality: 14800,
    difficulty: 6600,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 3,
    canHq: true,
    masterBook: '調理師秘伝書:第11巻',
    defaultSellingPrice: 4500,
    description: 'VIT +10% (Max 212), ダイレクトヒット +10% (Max 168), 意思力 +10% (Max 101)',
    materials: [
      { itemId: 44107, name: 'ダークホースのヒレ肉', amount: 2, sourceType: 'gathering', defaultPriceNQ: 1400, defaultPriceHQ: 2200 },
      { itemId: 44108, name: '高地パプリカ', amount: 1, sourceType: 'gathering', defaultPriceNQ: 900, defaultPriceHQ: 1500 },
      { itemId: 44109, name: 'オリーブオイル', amount: 1, sourceType: 'vendor', defaultPriceNQ: 250 },
      { itemId: 44104, name: '黄金の霊砂', amount: 1, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44105, name: '火のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44106, name: '水のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'potion_grade2_str',
    itemId: 44030,
    name: '剛力の宝薬G2',
    enName: 'Grade 2 Gemdraught of Strength',
    icon: '🧪',
    category: 'foodPotion',
    patch: '7.1',
    job: 'ALC',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 80,
    maxQuality: 14800,
    difficulty: 6600,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 3,
    canHq: true,
    masterBook: '錬金術師秘伝書:第11巻',
    defaultSellingPrice: 3800,
    description: '一定時間、自身の「STR」を10%上昇させる (HQ時 最大+385 / 効果時間 30秒)',
    materials: [
      { itemId: 44110, name: 'マウンテンセージ', amount: 2, sourceType: 'gathering', defaultPriceNQ: 1100, defaultPriceHQ: 1800 },
      { itemId: 44111, name: 'オルコ・パチャの湧水', amount: 1, sourceType: 'gathering', defaultPriceNQ: 900, defaultPriceHQ: 1500 },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44104, name: '黄金の霊砂', amount: 1, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44113, name: '雷のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44106, name: '水のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'potion_grade2_dex',
    itemId: 44031,
    name: '眼力の宝薬G2',
    enName: 'Grade 2 Gemdraught of Dexterity',
    icon: '🧪',
    category: 'foodPotion',
    patch: '7.1',
    job: 'ALC',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 80,
    maxQuality: 14800,
    difficulty: 6600,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 3,
    canHq: true,
    masterBook: '錬金術師秘伝書:第11巻',
    defaultSellingPrice: 3800,
    description: '一定時間、自身の「DEX」を10%上昇させる (HQ時 最大+385 / 効果時間 30秒)',
    materials: [
      { itemId: 44110, name: 'マウンテンセージ', amount: 2, sourceType: 'gathering', defaultPriceNQ: 1100, defaultPriceHQ: 1800 },
      { itemId: 44114, name: 'コザマル・カの樹液', amount: 1, sourceType: 'gathering', defaultPriceNQ: 900, defaultPriceHQ: 1500 },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44104, name: '黄金の霊砂', amount: 1, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44113, name: '雷のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44106, name: '水のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'potion_grade2_int',
    itemId: 44032,
    name: '知力の宝薬G2',
    enName: 'Grade 2 Gemdraught of Intelligence',
    icon: '🧪',
    category: 'foodPotion',
    patch: '7.1',
    job: 'ALC',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 80,
    maxQuality: 14800,
    difficulty: 6600,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 3,
    canHq: true,
    masterBook: '錬金術師秘伝書:第11巻',
    defaultSellingPrice: 3800,
    description: '一定時間、自身の「INT」を10%上昇させる (HQ時 最大+385 / 効果時間 30秒)',
    materials: [
      { itemId: 44110, name: 'マウンテンセージ', amount: 2, sourceType: 'gathering', defaultPriceNQ: 1100, defaultPriceHQ: 1800 },
      { itemId: 44115, name: 'シャーローニの鉱水', amount: 1, sourceType: 'gathering', defaultPriceNQ: 900, defaultPriceHQ: 1500 },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44104, name: '黄金の霊砂', amount: 1, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44113, name: '雷のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44106, name: '水のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'tea_craftsman',
    itemId: 44035,
    name: '魔匠の薬茶',
    enName: 'Cunning Craftsman Tea',
    icon: '🍵',
    category: 'foodPotion',
    patch: '7.0',
    job: 'ALC',
    level: 100,
    stars: 1,
    ilvl: 690,
    durability: 80,
    maxQuality: 11200,
    difficulty: 5400,
    suggestedCraftsmanship: 4500,
    suggestedControl: 4200,
    yields: 3,
    canHq: true,
    defaultSellingPrice: 2200,
    description: 'クラフター用薬茶: CP +6% (HQ時 最大+27)',
    materials: [
      { itemId: 44116, name: 'ミントリーブ', amount: 2, sourceType: 'gathering', defaultPriceNQ: 400 },
      { itemId: 44111, name: 'オルコ・パチャの湧水', amount: 1, sourceType: 'gathering', defaultPriceNQ: 900 },
      { itemId: 44113, name: '雷のクリスタル', amount: 6, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44106, name: '水のクリスタル', amount: 6, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },

  // ================= 7.1 / 7.05 新式装備 & 武器 (Crafted Gear & Weapons) =================
  {
    id: 'gear_courtly_flower_partisan',
    itemId: 44250,
    name: 'コートリーフラワー・パルチザン',
    enName: 'Courtly Flower Partisan',
    icon: '🔱',
    category: 'gear',
    patch: '7.1',
    job: 'BSM',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 70,
    maxQuality: 16200,
    difficulty: 7800,
    suggestedCraftsmanship: 4950,
    suggestedControl: 4550,
    yields: 1,
    canHq: true,
    masterBook: '鍛冶師秘伝書:第11巻',
    defaultSellingPrice: 165000,
    description: 'Patch 7.1 竜騎士主武器 IL720 (高難易度レイド・極対応)',
    materials: [
      { itemId: 44320, name: 'エレクトロインゴット', amount: 4, sourceType: 'subcraft', isSubCraft: true, subRecipeId: 'sub_electro_ingot', defaultPriceNQ: 12000, defaultPriceHQ: 18500 },
      { itemId: 44321, name: 'ローズガーネット', amount: 4, sourceType: 'subcraft', isSubCraft: true, subRecipeId: 'sub_rose_garnet', defaultPriceNQ: 11000, defaultPriceHQ: 17000 },
      { itemId: 44322, name: '紫電の霊砂', amount: 2, sourceType: 'reduction', defaultPriceNQ: 4500, defaultPriceHQ: 6800 },
      { itemId: 44117, name: 'アースクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44105, name: '火のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'gear_quetzal_coat_fending',
    itemId: 44200,
    name: 'ケツァル・ディフェンダーコート',
    enName: 'Quetzalcoatl Coat of Fending',
    icon: '🛡️',
    category: 'gear',
    patch: '7.05',
    job: 'LTW',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 70,
    maxQuality: 15600,
    difficulty: 7500,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '革細工師秘伝書:第11巻',
    defaultSellingPrice: 128000,
    description: 'Patch 7.05 レイド新式胴防具 (タンク用 IL710)',
    materials: [
      { itemId: 44301, name: 'ガルガンチュアレザー', amount: 2, sourceType: 'subcraft', defaultPriceNQ: 14000, defaultPriceHQ: 22000 },
      { itemId: 44302, name: 'サンダーヤードクロス', amount: 1, sourceType: 'subcraft', defaultPriceNQ: 12000, defaultPriceHQ: 19000 },
      { itemId: 44303, name: 'オルコ・ブラスインゴット', amount: 1, sourceType: 'subcraft', defaultPriceNQ: 11000, defaultPriceHQ: 18000 },
      { itemId: 44104, name: '黄金の霊砂', amount: 2, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44117, name: 'アースクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44118, name: '風のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'gear_quetzal_coat_striking',
    itemId: 44201,
    name: 'ケツァル・ストライカーコート',
    enName: 'Quetzalcoatl Coat of Striking',
    icon: '🥋',
    category: 'gear',
    patch: '7.05',
    job: 'LTW',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 70,
    maxQuality: 15600,
    difficulty: 7500,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '革細工師秘伝書:第11巻',
    defaultSellingPrice: 135000,
    description: 'Patch 7.05 レイド新式胴防具 (ストライカー用 IL710)',
    materials: [
      { itemId: 44301, name: 'ガルガンチュアレザー', amount: 2, sourceType: 'subcraft', defaultPriceNQ: 14000, defaultPriceHQ: 22000 },
      { itemId: 44302, name: 'サンダーヤードクロス', amount: 1, sourceType: 'subcraft', defaultPriceNQ: 12000, defaultPriceHQ: 19000 },
      { itemId: 44304, name: 'エレクトラムインゴット', amount: 1, sourceType: 'subcraft', defaultPriceNQ: 9000, defaultPriceHQ: 16000 },
      { itemId: 44104, name: '黄金の霊砂', amount: 2, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44117, name: 'アースクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44118, name: '風のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'gear_quetzal_blade',
    itemId: 44210,
    name: 'ケツァル・ロングソード',
    enName: 'Quetzalcoatl Longsword',
    icon: '⚔️',
    category: 'gear',
    patch: '7.05',
    job: 'BSM',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 70,
    maxQuality: 15600,
    difficulty: 7500,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '鍛冶師秘伝書:第11巻',
    defaultSellingPrice: 98000,
    description: 'Patch 7.05 ナイト主武器 IL710',
    materials: [
      { itemId: 44305, name: 'ブラックインゴット', amount: 2, sourceType: 'subcraft', defaultPriceNQ: 13000, defaultPriceHQ: 21000 },
      { itemId: 44301, name: 'ガルガンチュアレザー', amount: 1, sourceType: 'subcraft', defaultPriceNQ: 14000, defaultPriceHQ: 22000 },
      { itemId: 44104, name: '黄金の霊砂', amount: 2, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44105, name: '火のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44117, name: 'アースクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'gear_quetzal_ring_aiming',
    itemId: 44220,
    name: 'ケツァル・レンジャーリング',
    enName: 'Quetzalcoatl Ring of Aiming',
    icon: '💍',
    category: 'gear',
    patch: '7.05',
    job: 'GSM',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 70,
    maxQuality: 15600,
    difficulty: 7500,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '彫金師秘伝書:第11巻',
    defaultSellingPrice: 65000,
    description: 'Patch 7.05 レンジャー指輪 IL710',
    materials: [
      { itemId: 44306, name: 'ラザハンキャッツアイ', amount: 2, sourceType: 'subcraft', defaultPriceNQ: 12500, defaultPriceHQ: 20000 },
      { itemId: 44303, name: 'オルコ・ブラスインゴット', amount: 1, sourceType: 'subcraft', defaultPriceNQ: 11000, defaultPriceHQ: 18000 },
      { itemId: 44104, name: '黄金の霊砂', amount: 1, sourceType: 'reduction', defaultPriceNQ: 2800, defaultPriceHQ: 3800 },
      { itemId: 44118, name: '風のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 },
      { itemId: 44105, name: '火のクリスタル', amount: 8, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },

  // ================= 中間素材 (Intermediate Materials) =================
  {
    id: 'sub_electro_ingot',
    itemId: 44320,
    name: 'エレクトロインゴット',
    enName: 'Electro Ingot',
    icon: '⚡',
    category: 'intermediate',
    patch: '7.1',
    job: 'BSM',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 40,
    maxQuality: 8600,
    difficulty: 4100,
    suggestedCraftsmanship: 4950,
    suggestedControl: 4550,
    yields: 1,
    canHq: true,
    masterBook: '鍛冶師秘伝書:第11巻',
    defaultSellingPrice: 18500,
    materials: [
      {
        itemId: 44410,
        name: 'エレクトロピン原木',
        amount: 4,
        sourceType: 'gathering',
        defaultPriceNQ: 1400,
        defaultPriceHQ: 2400,
        gatheringInfo: {
          location: 'サカ・トラル (X:22.4, Y:15.8)',
          zone: 'ヤクテル樹海',
          nodeType: 'legendary',
          spawnTimes: [10, 22],
          slot: 6,
          perceptionReq: 4480,
          job: 'BTN'
        }
      },
      { itemId: 44411, name: '絶縁塗料', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2800 },
      { itemId: 44105, name: '火のクリスタル', amount: 5, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'sub_rose_garnet',
    itemId: 44321,
    name: 'ローズガーネット',
    enName: 'Rose Garnet',
    icon: '💎',
    category: 'intermediate',
    patch: '7.1',
    job: 'GSM',
    level: 100,
    stars: 2,
    ilvl: 720,
    durability: 40,
    maxQuality: 8600,
    difficulty: 4100,
    suggestedCraftsmanship: 4950,
    suggestedControl: 4550,
    yields: 1,
    canHq: true,
    masterBook: '彫金師秘伝書:第11巻',
    defaultSellingPrice: 17000,
    materials: [
      {
        itemId: 44412,
        name: 'ローズガーネット原石',
        amount: 3,
        sourceType: 'gathering',
        defaultPriceNQ: 1200,
        defaultPriceHQ: 2100,
        gatheringInfo: {
          location: 'オルコ・パチャ (X:14.2, Y:30.5)',
          zone: 'オルコ・パチャ',
          nodeType: 'legendary',
          spawnTimes: [2, 14],
          slot: 2,
          perceptionReq: 4480,
          job: 'MIN'
        }
      },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44118, name: '風のクリスタル', amount: 5, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'sub_gargantua_leather',
    itemId: 44301,
    name: 'ガルガンチュアレザー',
    enName: 'Gargantua Leather',
    icon: '🟫',
    category: 'intermediate',
    patch: '7.05',
    job: 'LTW',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 40,
    maxQuality: 8200,
    difficulty: 3900,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '革細工師秘伝書:第11巻',
    defaultSellingPrice: 22000,
    materials: [
      { itemId: 44401, name: 'ガルガンチュアの粗皮', amount: 4, sourceType: 'monster', defaultPriceNQ: 2800 },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44117, name: 'アースクリスタル', amount: 5, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'sub_thunderyard_cloth',
    itemId: 44302,
    name: 'サンダーヤードクロス',
    enName: 'Thunderyard Cloth',
    icon: '🧵',
    category: 'intermediate',
    patch: '7.05',
    job: 'WVR',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 40,
    maxQuality: 8200,
    difficulty: 3900,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '裁縫師秘伝書:第11巻',
    defaultSellingPrice: 19000,
    materials: [
      { itemId: 44402, name: 'サンダーヤード繭', amount: 4, sourceType: 'gathering', defaultPriceNQ: 1900, defaultPriceHQ: 3200 },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44113, name: '雷のクリスタル', amount: 5, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'sub_orqo_brass',
    itemId: 44303,
    name: 'オルコ・ブラスインゴット',
    enName: 'Orqo Brass Ingot',
    icon: '🪙',
    category: 'intermediate',
    patch: '7.05',
    job: 'GSM',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 40,
    maxQuality: 8200,
    difficulty: 3900,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '彫金師秘伝書:第11巻',
    defaultSellingPrice: 18000,
    materials: [
      { itemId: 44403, name: 'オルコ・ブラス鉱', amount: 4, sourceType: 'gathering', defaultPriceNQ: 1800, defaultPriceHQ: 3000 },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44118, name: '風のクリスタル', amount: 5, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'sub_black_ingot',
    itemId: 44305,
    name: 'ブラックインゴット',
    enName: 'Black Ingot',
    icon: '⬛',
    category: 'intermediate',
    patch: '7.05',
    job: 'BSM',
    level: 100,
    stars: 2,
    ilvl: 710,
    durability: 40,
    maxQuality: 8200,
    difficulty: 3900,
    suggestedCraftsmanship: 4900,
    suggestedControl: 4500,
    yields: 1,
    canHq: true,
    masterBook: '鍛冶師秘伝書:第11巻',
    defaultSellingPrice: 21000,
    materials: [
      { itemId: 44404, name: '黒鉄鉱', amount: 4, sourceType: 'gathering', defaultPriceNQ: 2100, defaultPriceHQ: 3500 },
      { itemId: 44112, name: 'トラルの研磨剤', amount: 1, sourceType: 'tomestone', defaultPriceNQ: 2200 },
      { itemId: 44105, name: '火のクリスタル', amount: 5, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },

  // ================= 収集品・紫貨・橙貨 (Collectibles & Scrips) =================
  {
    id: 'col_tural_rare_relic',
    itemId: 44501,
    name: '収集用のトラル・アンティーククロック',
    enName: 'Rarefied Tural Antique Clock',
    icon: '🕰️',
    category: 'collectibles',
    patch: '7.0',
    job: 'GSM',
    level: 100,
    stars: 0,
    ilvl: 690,
    durability: 80,
    maxQuality: 10800,
    difficulty: 4900,
    suggestedCraftsmanship: 4300,
    suggestedControl: 4000,
    yields: 1,
    canHq: false,
    defaultSellingPrice: 0,
    description: 'クラフター橙貨 / 紫貨 取引納品用収集品 (品質に応じて最大144橙貨獲得)',
    materials: [
      { itemId: 44403, name: 'オルコ・ブラス鉱', amount: 2, sourceType: 'gathering', defaultPriceNQ: 1800 },
      { itemId: 44405, name: 'トラルクリスタル', amount: 1, sourceType: 'gathering', defaultPriceNQ: 600 },
      { itemId: 44118, name: '風のクリスタル', amount: 6, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },
  {
    id: 'col_tural_tome',
    itemId: 44502,
    name: '収集用のトラル・レザーバインダー',
    enName: 'Rarefied Tural Leather Binder',
    icon: '📖',
    category: 'collectibles',
    patch: '7.0',
    job: 'LTW',
    level: 100,
    stars: 0,
    ilvl: 690,
    durability: 80,
    maxQuality: 10800,
    difficulty: 4900,
    suggestedCraftsmanship: 4300,
    suggestedControl: 4000,
    yields: 1,
    canHq: false,
    defaultSellingPrice: 0,
    description: 'クラフター橙貨 / 紫貨 取引納品用収集品 (品質に応じて最大144橙貨獲得)',
    materials: [
      { itemId: 44401, name: 'ガルガンチュアの粗皮', amount: 2, sourceType: 'monster', defaultPriceNQ: 2800 },
      { itemId: 44406, name: 'コザマル・コットン', amount: 1, sourceType: 'gathering', defaultPriceNQ: 500 },
      { itemId: 44117, name: 'アースクリスタル', amount: 6, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  },

  // ================= ハウジング家具 (Housing) =================
  {
    id: 'housing_tural_fountain',
    itemId: 44601,
    name: 'トラル・ストーンファウンテン',
    enName: 'Tural Stone Fountain',
    icon: '⛲',
    category: 'housing',
    patch: '7.1',
    job: 'ARM',
    level: 100,
    stars: 1,
    ilvl: 690,
    durability: 80,
    maxQuality: 9200,
    difficulty: 4600,
    suggestedCraftsmanship: 4400,
    suggestedControl: 4100,
    yields: 1,
    canHq: false,
    defaultSellingPrice: 85000,
    description: '庭具: トラル様式の荘厳な石造り噴水',
    materials: [
      { itemId: 44407, name: 'コザマル・ストーン', amount: 6, sourceType: 'gathering', defaultPriceNQ: 1200 },
      { itemId: 44303, name: 'オルコ・ブラスインゴット', amount: 2, sourceType: 'subcraft', defaultPriceNQ: 18000 },
      { itemId: 44111, name: 'オルコ・パチャの湧水', amount: 4, sourceType: 'gathering', defaultPriceNQ: 900 },
      { itemId: 44106, name: '水のクリスタル', amount: 10, sourceType: 'gathering', defaultPriceNQ: 50 }
    ]
  }
];

/**
 * Filter recipes by purpose / category safely
 */
export function getRecipesByPurpose(purpose?: string): Recipe[] {
  if (!purpose || purpose === 'all') {
    return RECIPES_DATABASE;
  }
  
  if (purpose === 'latestPatch') {
    return RECIPES_DATABASE.filter(r => r.patch === '7.1' || r.patch === '7.05' || r.stars >= 2);
  }
  
  if (purpose === 'foodPotion') {
    return RECIPES_DATABASE.filter(r => r.category === 'foodPotion');
  }
  
  if (purpose === 'gear') {
    return RECIPES_DATABASE.filter(r => r.category === 'gear');
  }
  
  if (purpose === 'intermediate') {
    return RECIPES_DATABASE.filter(r => r.category === 'intermediate');
  }
  
  if (purpose === 'collectibles') {
    return RECIPES_DATABASE.filter(r => r.category === 'collectibles');
  }
  
  if (purpose === 'housing') {
    return RECIPES_DATABASE.filter(r => r.category === 'housing');
  }
  
  return RECIPES_DATABASE;
}
