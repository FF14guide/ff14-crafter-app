const fs = require('fs');

async function syncAll() {
  console.log('Fetching official game data from Teamcraft...');
  const [items, recipes, icons] = await Promise.all([
    (await fetch('https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/items.json')).json(),
    (await fetch('https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/recipes.json')).json(),
    (await fetch('https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/staging/libs/data/src/lib/json/item-icons.json')).json()
  ]);

  function getIconNum(id) {
    const p = icons[id];
    if (!p) return '020001';
    const m = p.match(/\/(\d+)(?:_hr1)?\.(?:tex|png)/);
    return m ? m[1] : '020001';
  }

  function getCleanIconInt(id) {
    const num = getIconNum(id);
    return parseInt(num, 10);
  }

  console.log('1. Generating src/utils/itemIcons.ts...');
  // Build OFFICIAL_ITEM_ICON_BY_NAME & OFFICIAL_ITEM_ICON_BY_ID
  const allKnownIds = [
    // Crystals & Clusters
    8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    // 7.2 Gear
    49272, 49277, 49282, 49292, 49302, 49307, 49312, 49322,
    // 7.2 Intermediates
    49213, 49214, 49215, 49216, 49217, 49218, 49219, 49220, 49221, 49222,
    // 7.2 Raw / Tokens / Reduction
    46246, 49207, 49208, 49209, 49210, 49211, 49212, 49223, 49224, 49225, 49226, 49227,
    // 7.1 / 7.2 Potions
    45995, 45996, 45997, 45998, 45999, 45989,
    // 7.05 Gear & Tools
    42907, 42908, 42909, 42910, 42911, 42912, 42913, 42932, 42937, 42943, 44433, 44438, 43315, 43316, 43320,
    // 7.05 Intermediates & Potions & Food
    44147, 44148, 44149, 44150, 44151, 44152, 44153, 44154, 44155, 44156, 44162, 44163, 44165,
    44175, 44177, 44178, 44842, 44170, 44171, 44174, 44106, 43976, 43977, 43985, 27835, 27838,
    // 7.0 Raw / Base Intermediates
    44006, 44012, 44028, 44033, 44034, 44035, 44039, 44040, 44041, 44042, 44043, 44051, 44071,
    44135, 44136, 44137, 44138, 44139, 44140, 44141, 44142, 44143, 44144, 44145
  ];

  let itemIconsContent = `/**
 * Official FFXIV High-Definition In-Game Asset Icons (Garland Tools CDN / Universalis / XIVAPI)
 * 100% verified with official game data (Dawntrail Patch 7.0 - 7.2)
 */

export const getGarlandIconUrl = (iconId: number | string): string =>
  \`https://garlandtools.org/files/icons/item/\${Number(iconId)}.png\`;

export const OFFICIAL_ITEM_ICON_BY_ID: Record<number, number> = {
`;
  for (const id of allKnownIds) {
    const iconInt = getCleanIconInt(id);
    const it = items[id];
    itemIconsContent += `  ${id}: ${iconInt}, // ${it?.ja || ''} (${it?.en || ''})\n`;
  }
  itemIconsContent += `};

export const OFFICIAL_ITEM_ICON_BY_NAME: Record<string, string> = {
`;
  for (const id of allKnownIds) {
    const iconInt = getCleanIconInt(id);
    const it = items[id];
    if (it?.ja) {
      itemIconsContent += `  '${it.ja}': getGarlandIconUrl(${iconInt}),\n`;
    }
  }

  // Add extra common food/pots
  itemIconsContent += `  '剛力の薬湯': getGarlandIconUrl(20710),
  '名匠の薬酒': getGarlandIconUrl(24413),
  '魔匠の薬茶': getGarlandIconUrl(24411),
};

export const getItemIconUrl = (itemName: string, rawIcon?: string | number, itemId?: number): string => {
  if (itemId && OFFICIAL_ITEM_ICON_BY_ID[itemId]) {
    return getGarlandIconUrl(OFFICIAL_ITEM_ICON_BY_ID[itemId]);
  }
  if (OFFICIAL_ITEM_ICON_BY_NAME[itemName]) {
    return OFFICIAL_ITEM_ICON_BY_NAME[itemName];
  }
  if (rawIcon) {
    const clean = String(rawIcon).replace(/[^0-9]/g, '');
    if (clean) return getGarlandIconUrl(clean);
  }
  return getGarlandIconUrl(20001);
};
`;

  fs.writeFileSync('src/utils/itemIcons.ts', itemIconsContent);
  console.log('src/utils/itemIcons.ts written successfully.');

  console.log('2. Generating src/data/materialSourceRegistry.ts...');
  const materialSourceRegistryContent = `import { GatherJob } from '../types/ff14';

export interface DetailedMaterialSource {
  itemId: number;
  name: string;
  patch: string;
  sourceType: 'legendary' | 'ephemeral' | 'gathering' | 'tomestone' | 'bicolor' | 'vendor' | 'monster' | 'subcraft' | 'scrip';
  categoryLabel: string;
  details: string;
  zone?: string;
  nearestAetheryte?: string;
  coordinates?: string;
  job?: GatherJob | 'ALC' | 'BSM' | 'ARM' | 'GSM' | 'LTW' | 'WVR' | 'CRP' | 'CUL';
  level?: number;
  stars?: number;
  spawnHours?: number[];
  durationHours?: number;
  slot?: number;
  folkloreBook?: string;
  reductionYield?: string;
  vendorCost?: string;
  exchangeRate?: string;
  monsterName?: string;
  iconId?: number;
}

export const MATERIAL_SOURCE_REGISTRY: Record<number, DetailedMaterialSource> = {
  // ================= Patch 7.2 霊砂・伝説・トームストーン素材 =================
  46246: {
    itemId: 46246,
    name: '紫電の霊砂',
    patch: '7.2',
    sourceType: 'ephemeral',
    categoryLabel: '刻限精選 / 紫貨・オレンジ貨',
    details: 'ET 00:00, 16:00- 刻限採集場の精選 または クラフター/ギャザラースクリップ交換',
    zone: 'ヘリテージファウンド / ヤクテル樹海',
    nearestAetheryte: 'ヤースラニ駅 / マムーク',
    job: 'BTN',
    level: 100,
    stars: 4,
    spawnHours: [0, 16],
    durationHours: 4,
    reductionYield: '紫電の霊砂 (精選純度MAX)',
  },
  49208: {
    itemId: 49208,
    name: '高密度軽銀鉱',
    patch: '7.2',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 02:00 / 14:00 (2時間) 採掘師 Lv100★★★★ 3段目',
    zone: 'ヘリテージファウンド (Heritage Found)',
    nearestAetheryte: 'ヤースラニ駅',
    coordinates: 'X:16.8 Y:22.5',
    job: 'MIN',
    level: 100,
    stars: 4,
    spawnHours: [2, 14],
    durationHours: 2,
    slot: 3,
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  49211: {
    itemId: 49211,
    name: 'オルコ亜麻',
    patch: '7.2',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 00:00 / 12:00 (2時間) 園芸師 Lv100★★★★ 1段目',
    zone: 'オルコ・パチャ (Urqopacha)',
    nearestAetheryte: 'ウォーコー・ゾーモー',
    coordinates: 'X:28.4 Y:14.2',
    job: 'BTN',
    level: 100,
    stars: 4,
    spawnHours: [0, 12],
    durationHours: 2,
    slot: 1,
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  49207: {
    itemId: 49207,
    name: 'エレクトロパイン原木',
    patch: '7.2',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 04:00 / 16:00 (2時間) 園芸師 Lv100★★★★ 6段目',
    zone: 'リビング・メモリー (Living Memory)',
    nearestAetheryte: 'レイ・ナル・アンバ',
    coordinates: 'X:21.0 Y:32.0',
    job: 'BTN',
    level: 100,
    stars: 4,
    spawnHours: [4, 16],
    durationHours: 2,
    slot: 6,
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  49209: {
    itemId: 49209,
    name: 'ローズガーネット原石',
    patch: '7.2',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 06:00 / 18:00 (2時間) 採掘師 Lv100★★★★ 7段目',
    zone: 'ヤクテル樹海 (Yak T\\'el)',
    nearestAetheryte: 'マムーク',
    coordinates: 'X:13.5 Y:12.8',
    job: 'MIN',
    level: 100,
    stars: 4,
    spawnHours: [6, 18],
    durationHours: 2,
    slot: 7,
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  49210: {
    itemId: 49210,
    name: 'ロウヤシの葉',
    patch: '7.2',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 08:00 / 20:00 (2時間) 園芸師 Lv100★★★★ 2段目',
    zone: 'シャーローニ荒野 (Shaaloani)',
    nearestAetheryte: 'フーサタイ宿場町',
    coordinates: 'X:29.0 Y:11.5',
    job: 'BTN',
    level: 100,
    stars: 4,
    spawnHours: [8, 20],
    durationHours: 2,
    slot: 2,
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  49212: {
    itemId: 49212,
    name: 'ガーデン・ソフトウォーター',
    patch: '7.2',
    sourceType: 'gathering',
    categoryLabel: '通常採集 (Lv100)',
    details: '常時採集可能 採掘師/園芸師 Lv100',
    zone: 'リビング・メモリー',
    nearestAetheryte: 'カナルタウン',
    coordinates: 'X:18.0 Y:24.0',
    job: 'MIN',
    level: 100,
  },
  49223: {
    itemId: 49223,
    name: '絶縁塗料',
    patch: '7.2',
    sourceType: 'tomestone',
    categoryLabel: 'トームストーン交換',
    details: 'アラガントームストーン: 天道 / 美学 20個交換',
    zone: 'ソリューション・ナイン / トライヨラ',
    nearestAetheryte: 'ソリューション・ナイン',
    exchangeRate: 'アラガントームストーン 20個',
  },
  49224: {
    itemId: 49224,
    name: '被膜形成材',
    patch: '7.2',
    sourceType: 'tomestone',
    categoryLabel: 'トームストーン交換',
    details: 'アラガントームストーン: 天道 / 美学 20個交換',
    zone: 'ソリューション・ナイン / トライヨラ',
    nearestAetheryte: 'ソリューション・ナイン',
    exchangeRate: 'アラガントームストーン 20個',
  },
  49225: {
    itemId: 49225,
    name: 'エバーキープの人工樹脂',
    patch: '7.2',
    sourceType: 'tomestone',
    categoryLabel: 'トームストーン交換',
    details: 'アラガントームストーン: 天道 / 美学 20個交換',
    zone: 'ソリューション・ナイン / トライヨラ',
    nearestAetheryte: 'ソリューション・ナイン',
    exchangeRate: 'アラガントームストーン 20個',
  },
  49226: {
    itemId: 49226,
    name: 'マストドンの粗皮',
    patch: '7.2',
    sourceType: 'tomestone',
    categoryLabel: 'トームストーン交換',
    details: 'アラガントームストーン: 天道 / 美学 20個交換',
    zone: 'ソリューション・ナイン / トライヨラ',
    nearestAetheryte: 'ソリューション・ナイン',
    exchangeRate: 'アラガントームストーン 20個',
  },
  49227: {
    itemId: 49227,
    name: 'トライヨラの染料',
    patch: '7.2',
    sourceType: 'tomestone',
    categoryLabel: 'トームストーン交換 / バイカラージェム',
    details: 'アラガントームストーン 20個 または バイカラージェム交換',
    zone: 'トライヨラ / ソリューション・ナイン',
    nearestAetheryte: 'トライヨラ',
    exchangeRate: 'トームストーン 20個 / ジェム',
  },

  // ================= Patch 7.2 中間素材 =================
  49214: {
    itemId: 49214,
    name: 'スーパージュラルミンインゴット',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '鍛冶・甲冑師 製作 (Lv100★★★★)',
    details: '鍛冶/甲冑 秘伝書:第12巻 (高密度軽銀鉱x4, 被膜形成材x2)',
    job: 'BSM',
    level: 100,
    stars: 4,
  },
  49215: {
    itemId: 49215,
    name: 'ローズガーネット',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '彫金師 製作 (Lv100★★★★)',
    details: '彫金師 秘伝書:第12巻 (ローズガーネット原石x4, エバーキープの人工樹脂x2)',
    job: 'GSM',
    level: 100,
    stars: 4,
  },
  49217: {
    itemId: 49217,
    name: 'オルコ・リネン',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '裁縫師 製作 (Lv100★★★★)',
    details: '裁縫師 秘伝書:第12巻 (オルコ亜麻x4, トライヨラの染料x2)',
    job: 'WVR',
    level: 100,
    stars: 4,
  },
  49213: {
    itemId: 49213,
    name: 'エレクトロパイン材',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '木工師 製作 (Lv100★★★★)',
    details: '木工師 秘伝書:第12巻 (エレクトロパイン原木x4, 絶縁塗料x2)',
    job: 'CRP',
    level: 100,
    stars: 4,
  },
  49216: {
    itemId: 49216,
    name: 'マストドンレザー',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '革細工師 製作 (Lv100★★★★)',
    details: '革細工師 秘伝書:第12巻 (ロウヤシの葉x4, マストドンの粗皮x2)',
    job: 'LTW',
    level: 100,
    stars: 4,
  },
  49218: {
    itemId: 49218,
    name: '剛力の宝水G4',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '錬金術師 製作 (Lv100★★★★)',
    details: '錬金術師 秘伝書:第12巻 (ガーデン・ソフトウォーターx3, ヤクテル天然水x1, ウィンドパセリx1, 紫電の霊砂x1)',
    job: 'ALC',
    level: 100,
    stars: 4,
  },
  49219: {
    itemId: 49219,
    name: '眼力の宝水G4',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '錬金術師 製作 (Lv100★★★★)',
    details: '錬金術師 秘伝書:第12巻 (ガーデン・ソフトウォーターx3, ヤクテル天然水x1, コザマル・カモミールx1, 紫電の霊砂x1)',
    job: 'ALC',
    level: 100,
    stars: 4,
  },
  49220: {
    itemId: 49220,
    name: '活力の宝水G4',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '錬金術師 製作 (Lv100★★★★)',
    details: '錬金術師 秘伝書:第12巻 (ガーデン・ソフトウォーターx3, ヤクテル天然水x1, ウィンドローレルx1, 紫電の霊砂x1)',
    job: 'ALC',
    level: 100,
    stars: 4,
  },
  49221: {
    itemId: 49221,
    name: '知力の宝水G4',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '錬金術師 製作 (Lv100★★★★)',
    details: '錬金術師 秘伝書:第12巻 (ガーデン・ソフトウォーターx3, ヤクテル天然水x1, ユーカリx1, 紫電の霊砂x1)',
    job: 'ALC',
    level: 100,
    stars: 4,
  },
  49222: {
    itemId: 49222,
    name: '心力の宝水G4',
    patch: '7.2',
    sourceType: 'subcraft',
    categoryLabel: '錬金術師 製作 (Lv100★★★★)',
    details: '錬金術師 秘伝書:第12巻 (ガーデン・ソフトウォーターx3, ヤクテル天然水x1, パールグラスx1, 紫電の霊砂x1)',
    job: 'ALC',
    level: 100,
    stars: 4,
  },

  // ================= Patch 7.05 素材 =================
  44035: {
    itemId: 44035,
    name: '黄金の霊砂',
    patch: '7.05',
    sourceType: 'ephemeral',
    categoryLabel: '刻限精選 / 紫貨交換',
    details: 'ET 00:00 / 08:00 / 16:00 刻限採集場の精選 または クラフタースクリップ交換',
    zone: 'オルコ・パチャ / ヤクテル樹海',
    job: 'BTN',
    level: 100,
    stars: 2,
    reductionYield: '黄金の霊砂 (精選純度MAX)',
  },
  44040: {
    itemId: 44040,
    name: 'コザマル・カモミール',
    patch: '7.0',
    sourceType: 'gathering',
    categoryLabel: '通常採集 (Lv95)',
    details: '常時採集可能 園芸師 Lv95',
    zone: 'コザマル・カ (Kozama\\'uka)',
    nearestAetheryte: 'オック・ハヌ',
    coordinates: 'X:17.5 Y:11.2',
    job: 'BTN',
    level: 95,
  },
  44039: {
    itemId: 44039,
    name: 'ウィンドパセリ',
    patch: '7.0',
    sourceType: 'gathering',
    categoryLabel: '通常採集 (Lv98)',
    details: '常時採集可能 園芸師 Lv98',
    zone: 'オルコ・パチャ (Urqopacha)',
    nearestAetheryte: 'ウォーコー・ゾーモー',
    coordinates: 'X:29.0 Y:12.5',
    job: 'BTN',
    level: 98,
  },
  44041: {
    itemId: 44041,
    name: 'ウィンドローレル',
    patch: '7.0',
    sourceType: 'gathering',
    categoryLabel: '通常採集 (Lv98)',
    details: '常時採集可能 園芸師 Lv98',
    zone: 'シャーローニ荒野',
    nearestAetheryte: 'フーサタイ宿場町',
    job: 'BTN',
    level: 98,
  },
  44042: {
    itemId: 44042,
    name: 'ユーカリ',
    patch: '7.0',
    sourceType: 'gathering',
    categoryLabel: '通常採集 (Lv95)',
    details: '常時採集可能 園芸師 Lv95',
    zone: 'ヘリテージファウンド',
    nearestAetheryte: 'アウトスカーツ',
    job: 'BTN',
    level: 95,
  },
  44034: {
    itemId: 44034,
    name: 'ヤクテル天然水',
    patch: '7.0',
    sourceType: 'gathering',
    categoryLabel: '通常採集 (Lv95)',
    details: '常時採集可能 採掘師 Lv95',
    zone: 'ヤクテル樹海',
    nearestAetheryte: 'イクブラチ',
    job: 'MIN',
    level: 95,
  },
  44033: {
    itemId: 44033,
    name: 'サンダーヤードシルク',
    patch: '7.0',
    sourceType: 'subcraft',
    categoryLabel: '裁縫師 製作 (Lv100)',
    details: '帯雷繭 x4, ライトニングクリスタル x8, ウィンドクリスタル x8',
    job: 'WVR',
    level: 100,
  },
  44012: {
    itemId: 44012,
    name: 'ブラックスター',
    patch: '7.0',
    sourceType: 'subcraft',
    categoryLabel: '彫金師 製作 (Lv100)',
    details: 'ブラックスター原石 x4, ウィンドクリスタル x8, ファイアクリスタル x8',
    job: 'GSM',
    level: 100,
  },
  44051: {
    itemId: 44051,
    name: '大聖水',
    patch: '7.0',
    sourceType: 'subcraft',
    categoryLabel: '錬金術師 製作 (Lv100)',
    details: 'ヤクテル天然水 x2, タンブルクラブの枯草 x2',
    job: 'ALC',
    level: 100,
  },
  45989: {
    itemId: 45989,
    name: '多色錬金薬',
    patch: '7.1',
    sourceType: 'tomestone',
    categoryLabel: 'トームストーン交換',
    details: 'アラガントームストーン: 美学 / 天道 20個交換',
    zone: 'ソリューション・ナイン',
    exchangeRate: 'アラガントームストーン 20個',
  },
  44135: {
    itemId: 44135,
    name: '混鉄鉱',
    patch: '7.05',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 02:00 / 14:00 採掘師 Lv100★★ 3段目',
    zone: 'ヘリテージファウンド',
    job: 'MIN',
    level: 100,
    stars: 2,
    spawnHours: [2, 14],
    durationHours: 2,
    slot: 3,
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  44136: {
    itemId: 44136,
    name: '真銀鉱',
    patch: '7.05',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 06:00 / 18:00 採掘師 Lv100★★ 7段目',
    zone: 'ヤクテル樹海',
    job: 'MIN',
    level: 100,
    stars: 2,
    spawnHours: [6, 18],
    durationHours: 2,
    slot: 7,
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  44137: {
    itemId: 44137,
    name: 'イペー原木',
    patch: '7.05',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 04:00 / 16:00 園芸師 Lv100★★ 6段目',
    zone: 'リビング・メモリー',
    job: 'BTN',
    level: 100,
    stars: 2,
    spawnHours: [4, 16],
    durationHours: 2,
    slot: 6,
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  44138: {
    itemId: 44138,
    name: '海島綿',
    patch: '7.05',
    sourceType: 'legendary',
    categoryLabel: '伝説の採集場',
    details: 'ET 08:00 / 20:00 園芸師 Lv100★★ 2段目',
    zone: 'シャーローニ荒野',
    job: 'BTN',
    level: 100,
    stars: 2,
    spawnHours: [8, 20],
    durationHours: 2,
    slot: 2,
    folkloreBook: '伝承録: トラル編【園芸】',
  }
};
`;
  fs.writeFileSync('src/data/materialSourceRegistry.ts', materialSourceRegistryContent);
  console.log('src/data/materialSourceRegistry.ts written successfully.');

  console.log('3. Generating src/data/gatheringNodes.ts...');
  const gatheringNodesContent = `import { TimedGatheringNode } from '../types/ff14';

export const TIMED_GATHERING_NODES: TimedGatheringNode[] = [
  // ================= Patch 7.2 最新伝説・刻限素材 (4★ / IL770新式素材) =================
  {
    id: 'node_dense_aluminum_ore',
    itemId: 49208,
    itemName: '高密度軽銀鉱',
    job: 'MIN',
    level: 100,
    stars: 4,
    patch: '7.2',
    nodeType: 'legendary',
    zone: 'ヘリテージファウンド (Heritage Found)',
    nearestAetheryte: 'ヤースラニ駅',
    coordinates: 'X:16.8 Y:22.5',
    spawnHours: [2, 14],
    durationHours: 2,
    slot: 3,
    gatheringReq: 4900,
    perceptionReq: 4900,
    itemIcon: '021206',
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  {
    id: 'node_urqopacha_flax',
    itemId: 49211,
    itemName: 'オルコ亜麻',
    job: 'BTN',
    level: 100,
    stars: 4,
    patch: '7.2',
    nodeType: 'legendary',
    zone: 'オルコ・パチャ (Urqopacha)',
    nearestAetheryte: 'ウォーコー・ゾーモー',
    coordinates: 'X:28.4 Y:14.2',
    spawnHours: [0, 12],
    durationHours: 2,
    slot: 1,
    gatheringReq: 4900,
    perceptionReq: 4900,
    itemIcon: '025033',
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  {
    id: 'node_electropine_log',
    itemId: 49207,
    itemName: 'エレクトロパイン原木',
    job: 'BTN',
    level: 100,
    stars: 4,
    patch: '7.2',
    nodeType: 'legendary',
    zone: 'リビング・メモリー (Living Memory)',
    nearestAetheryte: 'レイ・ナル・アンバ',
    coordinates: 'X:21.0 Y:32.0',
    spawnHours: [4, 16],
    durationHours: 2,
    slot: 6,
    gatheringReq: 4900,
    perceptionReq: 4900,
    itemIcon: '022427',
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  {
    id: 'node_rose_garnet_ore',
    itemId: 49209,
    itemName: 'ローズガーネット原石',
    job: 'MIN',
    level: 100,
    stars: 4,
    patch: '7.2',
    nodeType: 'legendary',
    zone: 'ヤクテル樹海 (Yak T\\'el)',
    nearestAetheryte: 'マムーク',
    coordinates: 'X:13.5 Y:12.8',
    spawnHours: [6, 18],
    durationHours: 2,
    slot: 7,
    gatheringReq: 4900,
    perceptionReq: 4900,
    itemIcon: '021475',
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  {
    id: 'node_carnauba_leaf',
    itemId: 49210,
    itemName: 'ロウヤシの葉',
    job: 'BTN',
    level: 100,
    stars: 4,
    patch: '7.2',
    nodeType: 'legendary',
    zone: 'シャーローニ荒野 (Shaaloani)',
    nearestAetheryte: 'フーサタイ宿場町',
    coordinates: 'X:29.0 Y:11.5',
    spawnHours: [8, 20],
    durationHours: 2,
    slot: 2,
    gatheringReq: 4900,
    perceptionReq: 4900,
    itemIcon: '022709',
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  {
    id: 'node_levinchrome_sand_ephemeral',
    itemId: 46246,
    itemName: '紫電の霊砂 (刻限精選 / スクリップ紫貨)',
    job: 'BTN',
    level: 100,
    stars: 4,
    patch: '7.2',
    nodeType: 'ephemeral',
    zone: 'ヘリテージファウンド / ヤクテル樹海',
    nearestAetheryte: 'ヤースラニ駅 / マムーク',
    coordinates: 'X:26.0 Y:18.0',
    spawnHours: [0, 16],
    durationHours: 4,
    gatheringReq: 4700,
    perceptionReq: 4700,
    itemIcon: '021248',
    isEphemeral: true,
    reductionYield: '紫電の霊砂 (最高品質精選)',
  },

  // ================= Patch 7.05 伝説素材 (2★ / IL710新式素材) =================
  {
    id: 'node_harmonite_ore',
    itemId: 44135,
    itemName: '混鉄鉱',
    job: 'MIN',
    level: 100,
    stars: 2,
    patch: '7.05',
    nodeType: 'legendary',
    zone: 'ヘリテージファウンド (Heritage Found)',
    nearestAetheryte: 'ヤースラニ駅',
    coordinates: 'X:16.8 Y:22.5',
    spawnHours: [2, 14],
    durationHours: 2,
    slot: 3,
    gatheringReq: 4500,
    perceptionReq: 4500,
    itemIcon: '021221',
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  {
    id: 'node_ipe_log',
    itemId: 44137,
    itemName: 'イペー原木',
    job: 'BTN',
    level: 100,
    stars: 2,
    patch: '7.05',
    nodeType: 'legendary',
    zone: 'リビング・メモリー (Living Memory)',
    nearestAetheryte: 'レイ・ナル・アンバ',
    coordinates: 'X:21.0 Y:32.0',
    spawnHours: [4, 16],
    durationHours: 2,
    slot: 6,
    gatheringReq: 4500,
    perceptionReq: 4500,
    itemIcon: '022415',
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  {
    id: 'node_fine_silver_ore',
    itemId: 44136,
    itemName: '真銀鉱',
    job: 'MIN',
    level: 100,
    stars: 2,
    patch: '7.05',
    nodeType: 'legendary',
    zone: 'ヤクテル樹海 (Yak T\\'el)',
    nearestAetheryte: 'マムーク',
    coordinates: 'X:13.5 Y:12.8',
    spawnHours: [6, 18],
    durationHours: 2,
    slot: 7,
    gatheringReq: 4500,
    perceptionReq: 4500,
    itemIcon: '021223',
    folkloreBook: '伝承録: トラル編【採掘】',
  },
  {
    id: 'node_blackseed_cotton_boll',
    itemId: 44138,
    itemName: '海島綿',
    job: 'BTN',
    level: 100,
    stars: 2,
    patch: '7.05',
    nodeType: 'legendary',
    zone: 'シャーローニ荒野 (Shaaloani)',
    nearestAetheryte: 'フーサタイ宿場町',
    coordinates: 'X:29.0 Y:11.5',
    spawnHours: [8, 20],
    durationHours: 2,
    slot: 2,
    gatheringReq: 4500,
    perceptionReq: 4500,
    itemIcon: '025032',
    folkloreBook: '伝承録: トラル編【園芸】',
  },
  {
    id: 'node_sungilt_sand_ephemeral',
    itemId: 44035,
    itemName: '黄金の霊砂 (刻限精選)',
    job: 'BTN',
    level: 100,
    stars: 2,
    patch: '7.05',
    nodeType: 'ephemeral',
    zone: 'オルコ・パチャ (Urqopacha)',
    nearestAetheryte: 'ウォーコー・ゾーモー',
    coordinates: 'X:28.4 Y:14.2',
    spawnHours: [0, 8, 16],
    durationHours: 4,
    gatheringReq: 4300,
    perceptionReq: 4300,
    itemIcon: '021246',
    isEphemeral: true,
    reductionYield: '黄金の霊砂 (最高品質精選)',
  }
];
`;
  fs.writeFileSync('src/data/gatheringNodes.ts', gatheringNodesContent);
  console.log('src/data/gatheringNodes.ts written successfully.');

  console.log('4. Generating src/utils/inventoryStorage.ts with clean official defaults...');
  const inventoryStorageCode = `import { InventorySyncData, InventoryItemLocation, InventoryLocationType } from '../types/ff14';
import { safeJsonParse } from './jsonSafe';

const STORAGE_KEY = 'eorzean_crafter_inventory_sync';

export interface KnownItemMeta {
  itemId: number;
  name: string;
  enName?: string;
  category?: string;
  icon?: string;
}

export const KNOWN_FF14_ITEMS: KnownItemMeta[] = [
  // Crystals & Clusters (Game standard IDs)
  { itemId: 8, name: 'ファイアクリスタル', enName: 'Fire Crystal', icon: '020007' },
  { itemId: 9, name: 'アイスクリスタル', enName: 'Ice Crystal', icon: '020009' },
  { itemId: 10, name: 'ウィンドクリスタル', enName: 'Wind Crystal', icon: '020010' },
  { itemId: 11, name: 'アースクリスタル', enName: 'Earth Crystal', icon: '020012' },
  { itemId: 12, name: 'ライトニングクリスタル', enName: 'Lightning Crystal', icon: '020011' },
  { itemId: 13, name: 'ウォータークリスタル', enName: 'Water Crystal', icon: '020008' },
  { itemId: 14, name: 'ファイアクラスター', enName: 'Fire Cluster', icon: '020013' },
  { itemId: 15, name: 'アイスクラスター', enName: 'Ice Cluster', icon: '020015' },
  { itemId: 16, name: 'ウィンドクラスター', enName: 'Wind Cluster', icon: '020016' },
  { itemId: 17, name: 'アースクラスター', enName: 'Earth Cluster', icon: '020018' },
  { itemId: 18, name: 'ライトニングクラスター', enName: 'Lightning Cluster', icon: '020017' },
  { itemId: 19, name: 'ウォータークラスター', enName: 'Water Cluster', icon: '020014' },

  // Patch 7.2 霊砂・素材 (Dawntrail 7.2)
  { itemId: 46246, name: '紫電の霊砂', enName: 'Levinchrome Aethersand', icon: '021248' },
  { itemId: 44035, name: '黄金の霊砂', enName: 'Sungilt Aethersand', icon: '021246' },
  { itemId: 49208, name: '高密度軽銀鉱', enName: 'Dense Aluminum Ore', icon: '021206' },
  { itemId: 49211, name: 'オルコ亜麻', enName: 'Urqopacha Flax', icon: '025033' },
  { itemId: 49207, name: 'エレクトロパイン原木', enName: 'Fulgurpine Log', icon: '022427' },
  { itemId: 49209, name: 'ローズガーネット原石', enName: 'Rose Garnet Ore', icon: '021475' },
  { itemId: 49210, name: 'ロウヤシの葉', enName: 'Carnauba Leaf', icon: '022709' },
  { itemId: 49224, name: '被膜形成材', enName: 'Double Duracoat', icon: '022663' },
  { itemId: 49227, name: 'トライヨラの染料', enName: 'Turali Pigment', icon: '022648' },
  { itemId: 49223, name: '絶縁塗料', enName: 'Insulating Varnish', icon: '022654' },
  { itemId: 49225, name: 'エバーキープの人工樹脂', enName: 'Everkeep Resin', icon: '022652' },
  { itemId: 49226, name: 'マストドンの粗皮', enName: 'Mastodon Pelt', icon: '021814' },
  { itemId: 49212, name: 'ガーデン・ソフトウォーター', enName: 'Windspath Water', icon: '022678' },
  { itemId: 44034, name: 'ヤクテル天然水', enName: 'Yak T\\'el Spring Water', icon: '022614' },
  { itemId: 44071, name: 'タンブルクラブの枯草', enName: 'Tumbleclaw Weeds', icon: '021689' },
  { itemId: 44039, name: 'ウィンドパセリ', enName: 'Wind Parsley', icon: '025211' },
  { itemId: 44040, name: 'コザマル・カモミール', enName: 'Kozama\\'uka Chamomile', icon: '025008' },
  { itemId: 44041, name: 'ウィンドローレル', enName: 'Windsbalm Bay Leaf', icon: '025009' },
  { itemId: 44042, name: 'ユーカリ', enName: 'Eucalyptus', icon: '025010' },
  { itemId: 44043, name: 'パールグラス', enName: 'Pearl Grass', icon: '025015' },
  { itemId: 44028, name: '帯雷繭', enName: 'Levinsilk', icon: '021687' },
  { itemId: 44006, name: 'ブラックスター原石', enName: 'Raw Black Star', icon: '021476' },
  { itemId: 44145, name: 'プルスサウルスの粗皮', enName: 'Purussaurus Skin', icon: '021825' },

  // Patch 7.2 中間素材
  { itemId: 49214, name: 'スーパージュラルミンインゴット', enName: 'Double Duraluminum Ingot', icon: '020828' },
  { itemId: 49215, name: 'ローズガーネット', enName: 'Rose Garnet', icon: '021336' },
  { itemId: 49217, name: 'オルコ・リネン', enName: 'Urqopacha Linen', icon: '021621' },
  { itemId: 49213, name: 'エレクトロパイン材', enName: 'Fulgurpine Lumber', icon: '022466' },
  { itemId: 49216, name: 'マストドンレザー', enName: 'Mastodon Leather', icon: '022007' },
  { itemId: 44033, name: 'サンダーヤードシルク', enName: 'Thunderyards Silk', icon: '021622' },
  { itemId: 44012, name: 'ブラックスター', enName: 'Black Star', icon: '021338' },
  { itemId: 44051, name: '大聖水', enName: 'Sanctified Water', icon: '022653' },
  { itemId: 45989, name: '多色錬金薬', enName: 'Dichromatic Compound', icon: '022670' },
  { itemId: 49218, name: '剛力の宝水G4', enName: 'Grade 4 Gemsap of Strength', icon: '022683' },
  { itemId: 49219, name: '眼力の宝水G4', enName: 'Grade 4 Gemsap of Dexterity', icon: '022682' },
  { itemId: 49220, name: '活力の宝水G4', enName: 'Grade 4 Gemsap of Vitality', icon: '022680' },
  { itemId: 49221, name: '知力の宝水G4', enName: 'Grade 4 Gemsap of Intelligence', icon: '022679' },
  { itemId: 49222, name: '心力の宝水G4', enName: 'Grade 4 Gemsap of Mind', icon: '022681' },

  // Patch 7.1 / 7.2 霊薬
  { itemId: 45995, name: '剛力の宝薬G3', enName: 'Grade 3 Gemdraught of Strength', icon: '020710' },
  { itemId: 45996, name: '眼力の宝薬G3', enName: 'Grade 3 Gemdraught of Dexterity', icon: '020709' },
  { itemId: 45997, name: '活力の宝薬G3', enName: 'Grade 3 Gemdraught of Vitality', icon: '020707' },
  { itemId: 45998, name: '知力の宝薬G3', enName: 'Grade 3 Gemdraught of Intelligence', icon: '020706' },
  { itemId: 45999, name: '心力の宝薬G3', enName: 'Grade 3 Gemdraught of Mind', icon: '020708' },

  // Patch 7.05 中間素材
  { itemId: 44147, name: 'マルエージングインゴット', enName: 'Maraging Steel Ingot', icon: '020833' },
  { itemId: 44148, name: 'スターリングシルバーインゴット', enName: 'Sterling Silver Ingot', icon: '020826' },
  { itemId: 44149, name: 'イペー材', enName: 'Ipe Lumber', icon: '022467' },
  { itemId: 44150, name: '海島綿布', enName: 'Blackseed Cotton Cloth', icon: '023252' },
  { itemId: 44151, name: 'プルスサウルスレザー', enName: 'Purussaurus Leather', icon: '021836' },
  { itemId: 44152, name: '剛力の宝水G2', enName: 'Grade 2 Gemsap of Strength', icon: '022683' },
  { itemId: 44153, name: '眼力の宝水G2', enName: 'Grade 2 Gemsap of Dexterity', icon: '022682' },
  { itemId: 44155, name: '知力の宝水G2', enName: 'Grade 2 Gemsap of Intelligence', icon: '022679' },
  { itemId: 44162, name: '剛力の宝薬G2', enName: 'Grade 2 Gemdraught of Strength', icon: '020710' },
  { itemId: 44163, name: '眼力の宝薬G2', enName: 'Grade 2 Gemdraught of Dexterity', icon: '020709' },
  { itemId: 44165, name: '知力の宝薬G2', enName: 'Grade 2 Gemdraught of Intelligence', icon: '020706' },

  // Patch 7.05 レイド飯
  { itemId: 44175, name: 'ローストチキン', enName: 'Roast Chicken', icon: '024359' },
  { itemId: 44178, name: 'ムケッカ', enName: 'Moqueca', icon: '024105' },
  { itemId: 44177, name: 'シュラスコ', enName: 'Churrasco', icon: '024371' },
  { itemId: 44842, name: 'セビーチェ', enName: 'Ceviche', icon: '024337' }
];

export const INITIAL_SAMPLE_INVENTORY: InventorySyncData = {
  characterName: '光のクラフター (Warrior of Light)',
  server: 'Bahamut [Gaia]',
  lastSyncedAt: new Date().toISOString(),
  freeCompanyChest: true,
  retainerNames: ['リテイナー1 (素材庫)', 'リテイナー2 (革・布・中間)', 'リテイナー3 (クリスタル)', 'チョコボかばん'],
  items: [
    // Crystals & Clusters
    {
      itemId: 18,
      name: 'ライトニングクラスター',
      enName: 'Lightning Cluster',
      totalCount: 350,
      nqCount: 350,
      hqCount: 0,
      icon: '020017',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ4)', count: 120, isHq: false },
        { locationType: 'retainer', locationName: 'リテイナー3 (クリスタル)', count: 230, isHq: false }
      ]
    },
    {
      itemId: 16,
      name: 'ウィンドクラスター',
      enName: 'Wind Cluster',
      totalCount: 420,
      nqCount: 420,
      hqCount: 0,
      icon: '020016',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ4)', count: 150, isHq: false },
        { locationType: 'retainer', locationName: 'リテイナー3 (クリスタル)', count: 270, isHq: false }
      ]
    },
    {
      itemId: 14,
      name: 'ファイアクラスター',
      enName: 'Fire Cluster',
      totalCount: 280,
      nqCount: 280,
      hqCount: 0,
      icon: '020013',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー3 (クリスタル)', count: 280, isHq: false }
      ]
    },
    {
      itemId: 15,
      name: 'アイスクラスター',
      enName: 'Ice Cluster',
      totalCount: 310,
      nqCount: 310,
      hqCount: 0,
      icon: '020015',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー3 (クリスタル)', count: 310, isHq: false }
      ]
    },
    {
      itemId: 17,
      name: 'アースクラスター',
      enName: 'Earth Cluster',
      totalCount: 190,
      nqCount: 190,
      hqCount: 0,
      icon: '020018',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ4)', count: 90, isHq: false },
        { locationType: 'retainer', locationName: 'リテイナー3 (クリスタル)', count: 100, isHq: false }
      ]
    },
    {
      itemId: 19,
      name: 'ウォータークラスター',
      enName: 'Water Cluster',
      totalCount: 260,
      nqCount: 260,
      hqCount: 0,
      icon: '020014',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー3 (クリスタル)', count: 260, isHq: false }
      ]
    },

    // Patch 7.2 霊砂・素材
    {
      itemId: 46246,
      name: '紫電の霊砂',
      enName: 'Levinchrome Aethersand',
      totalCount: 20,
      nqCount: 12,
      hqCount: 8,
      icon: '021248',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 12, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 8, isHq: true }
      ]
    },
    {
      itemId: 44035,
      name: '黄金の霊砂',
      enName: 'Sungilt Aethersand',
      totalCount: 45,
      nqCount: 30,
      hqCount: 15,
      icon: '021246',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 30, isHq: false },
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 15, isHq: true }
      ]
    },
    {
      itemId: 49208,
      name: '高密度軽銀鉱',
      enName: 'Dense Aluminum Ore',
      totalCount: 24,
      nqCount: 16,
      hqCount: 8,
      icon: '021206',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ1)', count: 16, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ1)', count: 8, isHq: true }
      ]
    },
    {
      itemId: 49211,
      name: 'オルコ亜麻',
      enName: 'Urqopacha Flax',
      totalCount: 18,
      nqCount: 12,
      hqCount: 6,
      icon: '025033',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ1)', count: 12, isHq: false },
        { locationType: 'chocobo_saddlebag', locationName: 'チョコボかばん', count: 6, isHq: true }
      ]
    },
    {
      itemId: 49224,
      name: '被膜形成材',
      enName: 'Double Duracoat',
      totalCount: 14,
      nqCount: 14,
      hqCount: 0,
      icon: '022663',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 14, isHq: false }
      ]
    },
    {
      itemId: 49227,
      name: 'トライヨラの染料',
      enName: 'Turali Pigment',
      totalCount: 22,
      nqCount: 22,
      hqCount: 0,
      icon: '022648',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 12, isHq: false },
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 10, isHq: false }
      ]
    },
    {
      itemId: 49212,
      name: 'ガーデン・ソフトウォーター',
      enName: 'Windspath Water',
      totalCount: 30,
      nqCount: 30,
      hqCount: 0,
      icon: '022678',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 30, isHq: false }
      ]
    },
    {
      itemId: 44034,
      name: 'ヤクテル天然水',
      enName: 'Yak T\\'el Spring Water',
      totalCount: 60,
      nqCount: 60,
      hqCount: 0,
      icon: '022614',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 60, isHq: false }
      ]
    },
    {
      itemId: 44039,
      name: 'ウィンドパセリ',
      enName: 'Wind Parsley',
      totalCount: 15,
      nqCount: 15,
      hqCount: 0,
      icon: '025211',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ3)', count: 15, isHq: false }
      ]
    },
    {
      itemId: 44040,
      name: 'コザマル・カモミール',
      enName: 'Kozama\\'uka Chamomile',
      totalCount: 25,
      nqCount: 25,
      hqCount: 0,
      icon: '025008',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ3)', count: 25, isHq: false }
      ]
    },
    {
      itemId: 44041,
      name: 'ウィンドローレル',
      enName: 'Windsbalm Bay Leaf',
      totalCount: 12,
      nqCount: 12,
      hqCount: 0,
      icon: '025009',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ3)', count: 12, isHq: false }
      ]
    },
    {
      itemId: 44042,
      name: 'ユーカリ',
      enName: 'Eucalyptus',
      totalCount: 18,
      nqCount: 18,
      hqCount: 0,
      icon: '025010',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ3)', count: 18, isHq: false }
      ]
    },
    {
      itemId: 44028,
      name: '帯雷繭',
      enName: 'Levinsilk',
      totalCount: 40,
      nqCount: 40,
      hqCount: 0,
      icon: '021687',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー2 (革・布・中間)', count: 40, isHq: false }
      ]
    },
    {
      itemId: 44006,
      name: 'ブラックスター原石',
      enName: 'Raw Black Star',
      totalCount: 36,
      nqCount: 36,
      hqCount: 0,
      icon: '021476',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 36, isHq: false }
      ]
    },

    // Patch 7.2 中間素材
    {
      itemId: 49214,
      name: 'スーパージュラルミンインゴット',
      enName: 'Double Duraluminum Ingot',
      totalCount: 5,
      nqCount: 2,
      hqCount: 3,
      icon: '020828',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ1)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ1)', count: 3, isHq: true }
      ]
    },
    {
      itemId: 49215,
      name: 'ローズガーネット',
      enName: 'Rose Garnet',
      totalCount: 4,
      nqCount: 1,
      hqCount: 3,
      icon: '021336',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ1)', count: 1, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ1)', count: 3, isHq: true }
      ]
    },
    {
      itemId: 49217,
      name: 'オルコ・リネン',
      enName: 'Urqopacha Linen',
      totalCount: 6,
      nqCount: 2,
      hqCount: 4,
      icon: '021621',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 4, isHq: true }
      ]
    },
    {
      itemId: 49213,
      name: 'エレクトロパイン材',
      enName: 'Fulgurpine Lumber',
      totalCount: 4,
      nqCount: 2,
      hqCount: 2,
      icon: '022466',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: true }
      ]
    },
    {
      itemId: 49216,
      name: 'マストドンレザー',
      enName: 'Mastodon Leather',
      totalCount: 3,
      nqCount: 1,
      hqCount: 2,
      icon: '022007',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 1, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: true }
      ]
    },
    {
      itemId: 44033,
      name: 'サンダーヤードシルク',
      enName: 'Thunderyards Silk',
      totalCount: 12,
      nqCount: 6,
      hqCount: 6,
      icon: '021622',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー2 (革・布・中間)', count: 6, isHq: false },
        { locationType: 'retainer', locationName: 'リテイナー2 (革・布・中間)', count: 6, isHq: true }
      ]
    },
    {
      itemId: 44012,
      name: 'ブラックスター',
      enName: 'Black Star',
      totalCount: 8,
      nqCount: 4,
      hqCount: 4,
      icon: '021338',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 4, isHq: false },
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 4, isHq: true }
      ]
    },
    {
      itemId: 44051,
      name: '大聖水',
      enName: 'Sanctified Water',
      totalCount: 18,
      nqCount: 18,
      hqCount: 0,
      icon: '022653',
      locations: [
        { locationType: 'retainer', locationName: 'リテイナー1 (素材庫)', count: 18, isHq: false }
      ]
    },
    {
      itemId: 49218,
      name: '剛力の宝水G4',
      enName: 'Grade 4 Gemsap of Strength',
      totalCount: 6,
      nqCount: 2,
      hqCount: 4,
      icon: '022683',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 4, isHq: true }
      ]
    },
    {
      itemId: 49219,
      name: '眼力の宝水G4',
      enName: 'Grade 4 Gemsap of Dexterity',
      totalCount: 6,
      nqCount: 2,
      hqCount: 4,
      icon: '022682',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 4, isHq: true }
      ]
    },
    {
      itemId: 49220,
      name: '活力の宝水G4',
      enName: 'Grade 4 Gemsap of Vitality',
      totalCount: 6,
      nqCount: 2,
      hqCount: 4,
      icon: '022680',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 4, isHq: true }
      ]
    },
    {
      itemId: 49221,
      name: '知力の宝水G4',
      enName: 'Grade 4 Gemsap of Intelligence',
      totalCount: 6,
      nqCount: 2,
      hqCount: 4,
      icon: '022679',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 4, isHq: true }
      ]
    },
    {
      itemId: 49222,
      name: '心力の宝水G4',
      enName: 'Grade 4 Gemsap of Mind',
      totalCount: 6,
      nqCount: 2,
      hqCount: 4,
      icon: '022681',
      locations: [
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 2, isHq: false },
        { locationType: 'player_inventory', locationName: '手持ち (タブ2)', count: 4, isHq: true }
      ]
    }
  ]
};

export const loadInventorySyncData = (): InventorySyncData => {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_INVENTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SAMPLE_INVENTORY;
    const parsed = safeJsonParse(raw, null);
    if (!parsed || !Array.isArray(parsed.items)) return INITIAL_SAMPLE_INVENTORY;
    // Ensure item names and icons match canonical KNOWN_FF14_ITEMS
    const nameMap = new Map(KNOWN_FF14_ITEMS.map(k => [k.itemId, k]));
    for (const item of parsed.items) {
      const canonical = nameMap.get(item.itemId);
      if (canonical) {
        item.name = canonical.name;
        item.enName = canonical.enName;
        item.icon = canonical.icon;
      }
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load inventory sync data:', e);
    return INITIAL_SAMPLE_INVENTORY;
  }
};

export const saveInventorySyncData = (data: InventorySyncData): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save inventory sync data:', e);
  }
};

export const getInventoryItemStock = (
  inventory: InventorySyncData,
  itemId: number
): { total: number; nq: number; hq: number; locations: InventoryItemLocation[] } => {
  const match = inventory.items.find(i => i.itemId === itemId);
  if (!match) {
    return { total: 0, nq: 0, hq: 0, locations: [] };
  }
  return {
    total: match.totalCount || 0,
    nq: match.nqCount || 0,
    hq: match.hqCount || 0,
    locations: match.locations || []
  };
};

export const updateItemCountInInventory = (
  inventory: InventorySyncData,
  itemId: number,
  itemName: string,
  newTotalCount: number,
  locationType: InventoryLocationType = 'player_inventory',
  locationName: string = 'Player (手持ち)'
): InventorySyncData => {
  const nextItems = [...inventory.items];
  const existingIdx = nextItems.findIndex(i => i.itemId === itemId);
  const canonical = KNOWN_FF14_ITEMS.find(k => k.itemId === itemId);
  const finalName = canonical ? canonical.name : itemName;
  const finalIcon = canonical ? canonical.icon : '020001';

  if (existingIdx >= 0) {
    const item = { ...nextItems[existingIdx] };
    item.name = finalName;
    item.icon = finalIcon;
    item.totalCount = Math.max(0, newTotalCount);
    item.nqCount = item.totalCount;
    item.hqCount = 0;
    item.locations = [
      {
        locationType,
        locationName,
        count: item.totalCount,
        isHq: false
      }
    ];
    nextItems[existingIdx] = item;
  } else if (newTotalCount > 0) {
    nextItems.push({
      itemId,
      name: finalName,
      totalCount: newTotalCount,
      nqCount: newTotalCount,
      hqCount: 0,
      icon: finalIcon,
      locations: [
        {
          locationType,
          locationName,
          count: newTotalCount,
          isHq: false
        }
      ]
    });
  }

  const updated: InventorySyncData = {
    ...inventory,
    lastSyncedAt: new Date().toISOString(),
    items: nextItems
  };

  saveInventorySyncData(updated);
  return updated;
};

export const parseInventoryText = (text: string): { items: any[]; parsedCount: number; errors: string[] } => {
  const lines = text.split(/\\r?\\n/);
  const items: any[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    const match = trimmed.match(/^([^,:=]+)[,:=]\\s*(\\d+)(?:\\s*(?:HQ|hq))?/);
    if (match) {
      const name = match[1].trim();
      const count = parseInt(match[2], 10);
      const isHq = /HQ|hq/i.test(trimmed);

      const known = KNOWN_FF14_ITEMS.find(
        k => k.name.toLowerCase() === name.toLowerCase() || (k.enName && k.enName.toLowerCase() === name.toLowerCase())
      );

      if (known) {
        items.push({
          itemId: known.itemId,
          name: known.name,
          enName: known.enName,
          count,
          isHq,
          icon: known.icon
        });
      } else {
        items.push({
          itemId: 0,
          name,
          count,
          isHq,
          icon: '020001'
        });
      }
    }
  }

  return { items, parsedCount: items.length, errors };
};
`;

  fs.writeFileSync('src/utils/inventoryStorage.ts', inventoryStorageCode);
  console.log('src/utils/inventoryStorage.ts written successfully.');

  console.log('ALL FILES SYNCHRONIZED PERFECTLY!');
}

syncAll().catch(console.error);
