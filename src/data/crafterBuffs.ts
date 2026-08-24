export interface FoodBuffOption {
  id: string;
  name: string;
  patch: string;
  craftsmanshipBonus: number;
  controlBonus: number;
  cpBonus: number;
  description: string;
}

export interface PotionBuffOption {
  id: string;
  name: string;
  patch: string;
  craftsmanshipBonus: number;
  controlBonus: number;
  cpBonus: number;
  description: string;
}

export const FOOD_BUFF_OPTIONS: FoodBuffOption[] = [
  {
    id: 'none',
    name: 'なし (食事バフ無効)',
    patch: '-',
    craftsmanshipBonus: 0,
    controlBonus: 0,
    cpBonus: 0,
    description: '食事を使用せずにクラフトします',
  },
  {
    id: 'roast_chicken_hq',
    name: '【7.4/7.2最新】ローストチキン HQ',
    patch: '7.2',
    craftsmanshipBonus: 105,
    controlBonus: 55,
    cpBonus: 92,
    description: 'CP+92 / 作業+105 / 加工+55 (最新新式・高難易度推奨)',
  },
  {
    id: 'vegetable_soup_hq',
    name: '【7.4/7.2最新】ベジタブルスープ HQ',
    patch: '7.2',
    craftsmanshipBonus: 60,
    controlBonus: 90,
    cpBonus: 92,
    description: 'CP+92 / 加工+90 / 作業+60 (品質・HQ重視型)',
  },
  {
    id: 'potaufeu_hq',
    name: '高原風ポトフ HQ',
    patch: '7.1',
    craftsmanshipBonus: 80,
    controlBonus: 80,
    cpBonus: 90,
    description: 'CP+90 / 作業+80 / 加工+80 (バランス型)',
  },
  {
    id: 'roast_alpaca_hq',
    name: 'ローストアルパカ HQ',
    patch: '7.0',
    craftsmanshipBonus: 0,
    controlBonus: 82,
    cpBonus: 86,
    description: 'CP+86 / 加工+82',
  },
  {
    id: 'macchiato_hq',
    name: 'マキアート HQ',
    patch: '7.0',
    craftsmanshipBonus: 88,
    controlBonus: 0,
    cpBonus: 86,
    description: 'CP+86 / 作業+88',
  },
  {
    id: 'ceviche_hq',
    name: 'セビーチェ HQ',
    patch: '7.0',
    craftsmanshipBonus: 100,
    controlBonus: 50,
    cpBonus: 0,
    description: '作業+100 / 加工+50',
  },
];

export const POTION_BUFF_OPTIONS: PotionBuffOption[] = [
  {
    id: 'none',
    name: 'なし (薬バフ無効)',
    patch: '-',
    craftsmanshipBonus: 0,
    controlBonus: 0,
    cpBonus: 0,
    description: '薬を使用せずにクラフトします',
  },
  {
    id: 'craftsman_draught_g4_hq',
    name: '【7.4/7.2最新】魔匠の薬液 HQ',
    patch: '7.2',
    craftsmanshipBonus: 0,
    controlBonus: 0,
    cpBonus: 27,
    description: 'CP+27 (高難易度新式・耐久40中間素材1ポチ化)',
  },
  {
    id: 'craftsman_draught_g3_hq',
    name: '魔匠の薬酒 HQ',
    patch: '7.0',
    craftsmanshipBonus: 0,
    controlBonus: 0,
    cpBonus: 21,
    description: 'CP+21',
  },
  {
    id: 'competent_draught_g4_hq',
    name: '名匠の薬液 HQ',
    patch: '7.2',
    craftsmanshipBonus: 90,
    controlBonus: 0,
    cpBonus: 0,
    description: '作業精度+90',
  },
  {
    id: 'innovative_draught_g4_hq',
    name: '巨匠の薬液 HQ',
    patch: '7.2',
    craftsmanshipBonus: 0,
    controlBonus: 65,
    cpBonus: 0,
    description: '加工精度+65',
  },
];
