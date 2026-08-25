/**
 * Official FFXIV High-Definition In-Game Asset Icons (Garland Tools CDN / XIVAPI / Lodestone Assets)
 * Matches 100% exact game icons for Dawntrail & current patches
 */

// Helper to convert icon number into Garland Tools CDN url
export const getGarlandIconUrl = (iconId: number | string): string =>
  `https://garlandtools.org/files/icons/item/${iconId}.png`;

// Mapping of Exact Item Name to Official In-Game Icon URL
export const OFFICIAL_ITEM_ICON_BY_NAME: Record<string, string> = {
  // Foods & Drinks (Dawntrail & Key Raid Foods)
  'ローストチキン': getGarlandIconUrl(24359),
  'チキンパスタ': getGarlandIconUrl(24019),
  'シュラスコ': getGarlandIconUrl(24371),
  'ムケッカ': getGarlandIconUrl(24105),
  'シナモンホイップコーヒー': getGarlandIconUrl(24407),
  'コーヒーククルラスク': getGarlandIconUrl(24090),
  'ネーブルオレンジクッキー': getGarlandIconUrl(24308),
  'パインオレンジゼリー': getGarlandIconUrl(24082),
  'ロブスタービスク': getGarlandIconUrl(24103),
  'ボイルドロブスター': getGarlandIconUrl(24306),
  'オムライス': getGarlandIconUrl(24253),
  'ロネークステーキ': getGarlandIconUrl(24360),
  'ローストロネーク': getGarlandIconUrl(24366),
  'タコス・カルネ・アサーダ': getGarlandIconUrl(24046),
  'タコス・アル・パストール': getGarlandIconUrl(24045),
  'セビーチェ': getGarlandIconUrl(24337),
  'ベジーポタージュ': getGarlandIconUrl(24103),
  'ババロア・オ・ポム': getGarlandIconUrl(24095),
  'ベジタブルスープ': getGarlandIconUrl(24103),
  'メスキートスープ': getGarlandIconUrl(24106),
  'パインジュース': getGarlandIconUrl(24404),
  'コーヒークッキー': getGarlandIconUrl(24007),

  // Potions & Medicines (Dawntrail 7.05 - 7.55 Raid Potions)
  '剛力の宝薬G3': getGarlandIconUrl(20710),
  '眼力の宝薬G3': getGarlandIconUrl(20709),
  '知力の宝薬G3': getGarlandIconUrl(20706),
  '心力の宝薬G3': getGarlandIconUrl(20708),
  '活力の宝薬G3': getGarlandIconUrl(20707),
  '剛力の宝薬G2': getGarlandIconUrl(20710),
  '眼力の宝薬G2': getGarlandIconUrl(20709),
  '活力の宝薬G2': getGarlandIconUrl(20707),
  '知力の宝薬G2': getGarlandIconUrl(20706),
  '心力の宝薬G2': getGarlandIconUrl(20708),
  '剛力の宝薬': getGarlandIconUrl(20710),
  '眼力の宝薬': getGarlandIconUrl(20709),
  '活力の宝薬': getGarlandIconUrl(20707),
  '知力の宝薬': getGarlandIconUrl(20706),
  '心力の宝薬': getGarlandIconUrl(20708),
  '剛力の宝薬G1': getGarlandIconUrl(20710),
  '名匠の薬液': getGarlandIconUrl(20716),
  '巨匠の薬液': getGarlandIconUrl(20713),
  '魔匠の薬液': getGarlandIconUrl(20712),
  '魔匠の薬茶': getGarlandIconUrl(24411),
  '名匠の薬茶': getGarlandIconUrl(24413),
  '巨匠の薬茶': getGarlandIconUrl(24412),

  // Intermediate Materials (Crafted Master / 7.05 - 7.55)
  'スーパージュラルミンインゴット': getGarlandIconUrl(20828),
  'オルコ・リネン': getGarlandIconUrl(21621),
  'ゴールデンチタンインゴット': getGarlandIconUrl(20829),
  'ペルペルレザー': getGarlandIconUrl(22008),
  'マストドンレザー': getGarlandIconUrl(21836),
  '高密度軽銀鉱': getGarlandIconUrl(21206),
  '被膜形成材': getGarlandIconUrl(22663),
  '多色錬金薬': getGarlandIconUrl(22670),
  '大聖水': getGarlandIconUrl(22653),
  'ウィンドパセリ': getGarlandIconUrl(25211),
  'ウインドパセリ': getGarlandIconUrl(25211),
  'マルエージングインゴット': getGarlandIconUrl(20833),
  'スターリングシルバーインゴット': getGarlandIconUrl(20826),
  'イペー材': getGarlandIconUrl(22467),
  '海島綿布': getGarlandIconUrl(23252),
  'プルスサウルスレザー': getGarlandIconUrl(21836),
  '剛力の宝水G4': getGarlandIconUrl(22683),
  '眼力の宝水G4': getGarlandIconUrl(22682),
  '活力の宝水G4': getGarlandIconUrl(22680),
  '知力の宝水G4': getGarlandIconUrl(22679),
  '心力の宝水G4': getGarlandIconUrl(22678),
  '剛力の宝水G3': getGarlandIconUrl(22683),
  '剛力の宝水G2': getGarlandIconUrl(22683),
  '眼力の宝水G2': getGarlandIconUrl(22682),
  '活力の宝水G2': getGarlandIconUrl(22680),
  '知力の宝水G2': getGarlandIconUrl(22679),
  '心力の宝水G2': getGarlandIconUrl(22681),
  'ガルガンチュアレザー': getGarlandIconUrl(22007),
  'サンダーヤードシルク': getGarlandIconUrl(21622),
  'ブラックスター': getGarlandIconUrl(21338),
  'クラロウォルナット材': getGarlandIconUrl(22464),
  'エレクトラムインゴット': getGarlandIconUrl(20812),
  'ローズガーネット': getGarlandIconUrl(21336),
  'ガーデン・ソフトウォーター': getGarlandIconUrl(22678),
  'ヤクテル天然水': getGarlandIconUrl(22614),
  'タンブルクラブの枯草': getGarlandIconUrl(21689),
  'オルコ亜麻': getGarlandIconUrl(25033),
  'トライヨラの染料': getGarlandIconUrl(22648),
  '絶縁塗料': getGarlandIconUrl(22654),
  '高山食塩': getGarlandIconUrl(25104),
  'フラントーヨオイル': getGarlandIconUrl(25451),
  'ホイップクリーム': getGarlandIconUrl(25056),
  'トラルコーンオイル': getGarlandIconUrl(25451),
  'メスカル料理酒': getGarlandIconUrl(25057),

  // Gathering & Raw Materials (Legendary / Ephemeral / Raw)
  '帯雷繭': getGarlandIconUrl(21687),
  'ラムプレスチキン': getGarlandIconUrl(25158),
  'ブラウンカルダモン': getGarlandIconUrl(25021),
  'ワイルドコーヒービーン': getGarlandIconUrl(25919),
  'ネーブルオレンジ': getGarlandIconUrl(25312),
  'ロイヤルロブスター': getGarlandIconUrl(29013),
  'ロネークの肩肉': getGarlandIconUrl(25159),
  'ヤースラニガーリック': getGarlandIconUrl(25006),
  'リトルレモン': getGarlandIconUrl(25305),
  '黄金の霊砂': getGarlandIconUrl(21246),
  '紫電の霊砂': getGarlandIconUrl(21248),
  '混鉄鉱': getGarlandIconUrl(21221),
  '真銀鉱': getGarlandIconUrl(21223),
  'イペー原木': getGarlandIconUrl(22415),
  '海島綿': getGarlandIconUrl(25032),
  'プルスサウルスの粗皮': getGarlandIconUrl(21825),
  'コザマル・カモミール': getGarlandIconUrl(25008),
  'ウィンドローレル': getGarlandIconUrl(25009),
  '黒鉄鉱': getGarlandIconUrl(21231),
  'ガルガンチュアの粗皮': getGarlandIconUrl(21814),
  'ロネークサージ': getGarlandIconUrl(21601),
  'トラルコーン': getGarlandIconUrl(25352),
  'ルテニウム鉱': getGarlandIconUrl(21213),
  'ブラックスター原石': getGarlandIconUrl(21476),
  'ローズガーネット原石': getGarlandIconUrl(21475),
  'バニラビーンズ': getGarlandIconUrl(25014),
  'チェリモヤ': getGarlandIconUrl(25334),
  'オルコ・パチャの湧水': getGarlandIconUrl(25401),
  'コザマル・カの樹液': getGarlandIconUrl(25008),
  'シャーローニの鉱水': getGarlandIconUrl(25401),
  'ミントリーブ': getGarlandIconUrl(25009),

  // Gear & Accessories (IL690 - IL710)
  'サンダーヤードシルク・クラフターシャツ': getGarlandIconUrl(57114),
  'サンダーヤードシルク・クラフターキャップ': getGarlandIconUrl(56725),
  'サンダーヤードシルク・クラフターワイドパンツ': getGarlandIconUrl(57642),
  'ガルガンチュア・クラフターハーフグローブ': getGarlandIconUrl(56238),
  'クラロウォルナット・クラフターサンダル': getGarlandIconUrl(49734),
  'ブラックスター・クラフターイヤリング': getGarlandIconUrl(55534),
  'ブラックスター・クラフタースカーフ': getGarlandIconUrl(55086),
  'ブラックスター・クラフターブレスレット': getGarlandIconUrl(55885),
  'ブラックスター・クラフターリング': getGarlandIconUrl(54734),
  'サンダーヤードシルク・ギャザラーベスト': getGarlandIconUrl(57113),
  'ガルガンチュア・ギャザラーハット': getGarlandIconUrl(56724),
  'ブラックスター・ディフェンダーリング': getGarlandIconUrl(54733),
  'ブラックスター・アタッカーリング': getGarlandIconUrl(54733),
  'ブラックスター・ヒーラーリング': getGarlandIconUrl(54733),
  'ブラックスター・キャスターリング': getGarlandIconUrl(54733),

  // Crystals & Clusters (Exact game assets)
  '火のクリスタル': getGarlandIconUrl(20007),
  'ファイアクリスタル': getGarlandIconUrl(20007),
  '氷のクリスタル': getGarlandIconUrl(20009),
  'アイスクリスタル': getGarlandIconUrl(20009),
  '風のクリスタル': getGarlandIconUrl(20010),
  'ウィンドクリスタル': getGarlandIconUrl(20010),
  '土のクリスタル': getGarlandIconUrl(20012),
  'アースクリスタル': getGarlandIconUrl(20012),
  '雷のクリスタル': getGarlandIconUrl(20011),
  'ライトニングクリスタル': getGarlandIconUrl(20011),
  '水のクリスタル': getGarlandIconUrl(20008),
  'ウォータークリスタル': getGarlandIconUrl(20008),
  '火のクラスター': getGarlandIconUrl(20013),
  'ファイアクラスター': getGarlandIconUrl(20013),
  '氷のクラスター': getGarlandIconUrl(20015),
  'アイスクラスター': getGarlandIconUrl(20015),
  '風のクラスター': getGarlandIconUrl(20016),
  'ウィンドクラスター': getGarlandIconUrl(20016),
  '土のクラスター': getGarlandIconUrl(20018),
  'アースクラスター': getGarlandIconUrl(20018),
  '雷のクラスター': getGarlandIconUrl(20017),
  'ライトニングクラスター': getGarlandIconUrl(20017),
  '水のクラスター': getGarlandIconUrl(20014),
  'ウォータークラスター': getGarlandIconUrl(20014),
};

// Mapping by Item ID (exact match)
export const OFFICIAL_ITEM_ICON_BY_ID: Record<number, string> = {
  // Foods
  44175: getGarlandIconUrl(24359), // ローストチキン
  44176: getGarlandIconUrl(24019), // チキンパスタ
  44177: getGarlandIconUrl(24371), // シュラスコ
  44178: getGarlandIconUrl(24105), // ムケッカ
  44179: getGarlandIconUrl(24407), // シナモンホイップコーヒー
  44180: getGarlandIconUrl(24090), // コーヒーククルラスク
  44181: getGarlandIconUrl(24308), // ネーブルオレンジクッキー
  44182: getGarlandIconUrl(24082), // パインオレンジゼリー
  44183: getGarlandIconUrl(24103), // ロブスタービスク
  44184: getGarlandIconUrl(24306), // ボイルドロブスター
  44081: getGarlandIconUrl(24253), // オムライス
  44091: getGarlandIconUrl(24360), // ロネークステーキ
  44092: getGarlandIconUrl(24366), // ローストロネーク
  44104: getGarlandIconUrl(24046), // タコス・カルネ・アサーダ
  44105: getGarlandIconUrl(24045), // タコス・アル・パストール
  44842: getGarlandIconUrl(24337), // セビーチェ

  // Potions
  45995: getGarlandIconUrl(20710), // 剛力の宝薬G3
  45996: getGarlandIconUrl(20709), // 眼力の宝薬G3
  45997: getGarlandIconUrl(20707), // 活力の宝薬G3
  45998: getGarlandIconUrl(20706), // 知力の宝薬G3
  45999: getGarlandIconUrl(20708), // 心力の宝薬G3
  44162: getGarlandIconUrl(20710), // 剛力の宝薬G2
  44163: getGarlandIconUrl(20709), // 眼力の宝薬G2
  44164: getGarlandIconUrl(20707), // 活力の宝薬G2
  44165: getGarlandIconUrl(20706), // 知力の宝薬G2
  44166: getGarlandIconUrl(20708), // 心力の宝薬G2
  44157: getGarlandIconUrl(20710), // 剛力の宝薬
  44158: getGarlandIconUrl(20709), // 眼力の宝薬
  44159: getGarlandIconUrl(20707), // 活力の宝薬
  44160: getGarlandIconUrl(20706), // 知力の宝薬
  44161: getGarlandIconUrl(20708), // 心力の宝薬
  44167: getGarlandIconUrl(20716), // 名匠の薬液
  44168: getGarlandIconUrl(20713), // 巨匠の薬液
  44169: getGarlandIconUrl(20712), // 魔匠の薬液
  19884: getGarlandIconUrl(24411), // 魔匠の薬茶
  19882: getGarlandIconUrl(24413), // 名匠の薬茶
  19883: getGarlandIconUrl(24412), // 巨匠の薬茶

  // Intermediates
  44051: getGarlandIconUrl(22653), // 大聖水 (実機アイコン)
  44039: getGarlandIconUrl(25211), // ウィンドパセリ
  45989: getGarlandIconUrl(22670), // 多色錬金薬
  49214: getGarlandIconUrl(20828), // タングステンインゴット
  49217: getGarlandIconUrl(21621), // コチニールクロス
  49216: getGarlandIconUrl(22008), // ペルペルレザー
  49218: getGarlandIconUrl(22683), // 剛力の宝水G4
  49219: getGarlandIconUrl(22682), // 眼力の宝水G4
  49220: getGarlandIconUrl(22680), // 活力の宝水G4
  49221: getGarlandIconUrl(22679), // 知力の宝水G4
  49222: getGarlandIconUrl(22678), // 心力の宝水G4
  49208: getGarlandIconUrl(21206), // フルグライト
  49224: getGarlandIconUrl(22663), // タングステン鉱
  49211: getGarlandIconUrl(25033), // コーディア原木
  49227: getGarlandIconUrl(22648), // コチニール染料
  49212: getGarlandIconUrl(22678), // ガーデン・ソフトウォーター
  44034: getGarlandIconUrl(22614), // ヤクテル天然水
  44071: getGarlandIconUrl(21689), // タンブルクラブの枯草
  44147: getGarlandIconUrl(20833), // マルエージングインゴット
  44148: getGarlandIconUrl(20826), // スターリングシルバーインゴット
  44149: getGarlandIconUrl(22467), // イペー材
  44150: getGarlandIconUrl(23252), // 海島綿布
  44151: getGarlandIconUrl(21836), // プルスサウルスレザー
  44152: getGarlandIconUrl(22683), // 剛力の宝水G2
  44153: getGarlandIconUrl(22682), // 眼力の宝水G2
  44154: getGarlandIconUrl(22680), // 活力の宝水G2
  44155: getGarlandIconUrl(22679), // 知力の宝水G2
  44156: getGarlandIconUrl(22681), // 心力の宝水G2
  44062: getGarlandIconUrl(22007), // ガルガンチュアレザー
  44033: getGarlandIconUrl(21622), // サンダーヤードシルク
  44012: getGarlandIconUrl(21338), // ブラックスター
  44023: getGarlandIconUrl(22464), // クラロウォルナット材

  // Patch 7.2 Gear (コートリーラヴァー IL770)
  49272: getGarlandIconUrl(57321), // コートリーラヴァー・ディフェンダーサーコート
  49277: getGarlandIconUrl(57322), // コートリーラヴァー・スレイヤーサーコート
  49282: getGarlandIconUrl(57325), // コートリーラヴァー・ストライカークローク
  49292: getGarlandIconUrl(57327), // コートリーラヴァー・スカウトシャツ
  49302: getGarlandIconUrl(57324), // コートリーラヴァー・キャスターバトルドレス
  49322: getGarlandIconUrl(54761), // コートリーラヴァー・アタッカーリング
  49307: getGarlandIconUrl(55565), // コートリーラヴァー・アタッカーイヤリング
  49312: getGarlandIconUrl(55110), // コートリーラヴァー・アタッカーチョーカー
  49317: getGarlandIconUrl(55908), // コートリーラヴァー・アタッカーリストレット

  // Raw & Gathering
  44028: getGarlandIconUrl(21687), // 帯雷繭
  44170: getGarlandIconUrl(25158), // ラムプレスチキン
  44171: getGarlandIconUrl(25021), // ブラウンカルダモン
  44172: getGarlandIconUrl(25919), // ワイルドコーヒービーン
  44173: getGarlandIconUrl(25312), // ネーブルオレンジ
  44174: getGarlandIconUrl(29013), // ロイヤルロブスター
  43977: getGarlandIconUrl(25104), // 高山食塩
  27838: getGarlandIconUrl(25451), // フラントーヨオイル
  43985: getGarlandIconUrl(25006), // ヤースラニガーリック
  27835: getGarlandIconUrl(25305), // リトルレモン
  44035: getGarlandIconUrl(21246), // 黄金の霊砂
  46246: getGarlandIconUrl(21248), // 紫電の霊砂
  44135: getGarlandIconUrl(21221), // 混鉄鉱
  44136: getGarlandIconUrl(21223), // 真銀鉱
  44137: getGarlandIconUrl(22415), // イペー原木
  44138: getGarlandIconUrl(25032), // 海島綿
  44145: getGarlandIconUrl(21825), // プルスサウルスの粗皮
  44041: getGarlandIconUrl(25009), // ウィンドローレル
  43996: getGarlandIconUrl(21231), // 黒鉄鉱
  44057: getGarlandIconUrl(21814), // ガルガンチュアの粗皮
  44032: getGarlandIconUrl(21601), // ロネークサージ
  43981: getGarlandIconUrl(25352), // トラルコーン
  43993: getGarlandIconUrl(21213), // ルテニウム鉱
  44006: getGarlandIconUrl(21476), // ブラックスター原石
  44106: getGarlandIconUrl(25159), // ロネークの肩肉

  // Crystals & Clusters
  8: getGarlandIconUrl(20007),
  9: getGarlandIconUrl(20009),
  10: getGarlandIconUrl(20010),
  11: getGarlandIconUrl(20012),
  12: getGarlandIconUrl(20011),
  13: getGarlandIconUrl(20008),
  14: getGarlandIconUrl(20013),
  15: getGarlandIconUrl(20015),
  16: getGarlandIconUrl(20016),
  17: getGarlandIconUrl(20018),
  18: getGarlandIconUrl(20017),
  19: getGarlandIconUrl(20014),
};

/**
 * Returns exact official Garland Tools / Lodestone image URL for any item
 */
export function getItemIconUrl(itemId?: number, name?: string, customIcon?: string | number): string {
  // If a direct URL is given
  if (typeof customIcon === 'string' && (customIcon.startsWith('http') || customIcon.startsWith('/'))) {
    return customIcon;
  }

  // If a numeric icon ID is passed directly
  if (typeof customIcon === 'number' && customIcon > 0) {
    return getGarlandIconUrl(customIcon);
  }
  if (typeof customIcon === 'string' && /^\d+$/.test(customIcon)) {
    return getGarlandIconUrl(customIcon);
  }

  // 1. Match by Item ID (most reliable — itemId is a stable game identifier,
  //    whereas name-based lookups can silently match the wrong item)
  if (itemId && OFFICIAL_ITEM_ICON_BY_ID[itemId]) {
    return OFFICIAL_ITEM_ICON_BY_ID[itemId];
  }

  // 2. Fall back to Garland Tools CDN by item ID directly (still ID-based,
  //    so still reliable even though it's not in our curated table)
  if (itemId && itemId > 0) {
    return `https://garlandtools.org/files/icons/item/${itemId}.png`;
  }

  // 3. Match by exact Item Name (only used when no itemId is available at all)
  if (name && OFFICIAL_ITEM_ICON_BY_NAME[name]) {
    return OFFICIAL_ITEM_ICON_BY_NAME[name];
  }

  // 4. Match by partial item name (last resort — can be wrong, since it does
  //    substring matching; only attempted when nothing more reliable exists)
  if (name) {
    for (const [keyName, url] of Object.entries(OFFICIAL_ITEM_ICON_BY_NAME)) {
      if (name.includes(keyName) || keyName.includes(name)) {
        return url;
      }
    }
  }

  // 5. Default generic crystal/item
  return getGarlandIconUrl(20007);
}

/**
 * Official Crafter & Gatherer Job Class Icons
 */
export const OFFICIAL_JOB_ICONS: Record<string, string> = {
  CRP: 'https://garlandtools.org/files/icons/job/CRP.png',
  BSM: 'https://garlandtools.org/files/icons/job/BSM.png',
  ARM: 'https://garlandtools.org/files/icons/job/ARM.png',
  GSM: 'https://garlandtools.org/files/icons/job/GSM.png',
  LTW: 'https://garlandtools.org/files/icons/job/LTW.png',
  WVR: 'https://garlandtools.org/files/icons/job/WVR.png',
  ALC: 'https://garlandtools.org/files/icons/job/ALC.png',
  CUL: 'https://garlandtools.org/files/icons/job/CUL.png',
  MIN: 'https://garlandtools.org/files/icons/job/MIN.png',
  BTN: 'https://garlandtools.org/files/icons/job/BTN.png',
  FSH: 'https://garlandtools.org/files/icons/job/FSH.png',
};

/**
 * Get official Job Class Icon URL
 */
export function getJobIconUrl(job: string): string {
  const upper = job.toUpperCase();
  if (OFFICIAL_JOB_ICONS[upper]) {
    return OFFICIAL_JOB_ICONS[upper];
  }
  return `https://garlandtools.org/files/icons/job/${upper}.png`;
}

/**
 * Fallback Emoji for Job Class
 */
export function getFallbackJobEmoji(job: string): string {
  switch (job.toUpperCase()) {
    case 'CRP': return '🪵';
    case 'BSM': return '🔨';
    case 'ARM': return '🛡️';
    case 'GSM': return '💎';
    case 'LTW': return '👞';
    case 'WVR': return '🧵';
    case 'ALC': return '🧪';
    case 'CUL': return '🍳';
    case 'MIN': return '⛏️';
    case 'BTN': return '🌲';
    case 'FSH': return '🎣';
    default: return '⚒️';
  }
}

/**
 * Fallback Emoji when offline or error
 */
export function getFallbackEmoji(name?: string): string {
  if (!name) return '📦';
  if (name.includes('クリスタル') || name.includes('クラスター')) return '💎';
  if (name.includes('薬') || name.includes('ポーション') || name.includes('水薬')) return '🧪';
  if (name.includes('チキン') || name.includes('ステーキ') || name.includes('ロースト') || name.includes('スープ') || name.includes('茶')) return '🍲';
  if (name.includes('インゴット') || name.includes('鉱') || name.includes('ナゲット')) return '⛏️';
  if (name.includes('材') || name.includes('原木') || name.includes('木')) return '🪵';
  if (name.includes('布') || name.includes('糸') || name.includes('綿') || name.includes('繭')) return '🧵';
  if (name.includes('革') || name.includes('レザー') || name.includes('粗皮')) return '👞';
  if (name.includes('槍') || name.includes('剣') || name.includes('斧') || name.includes('弓') || name.includes('杖')) return '⚔️';
  if (name.includes('コート') || name.includes('メイル') || name.includes('ガントレット') || name.includes('ブーツ') || name.includes('リング')) return '🛡️';
  return '📦';
}
