import { CrafterStats, Recipe } from '../types/ff14';

export interface GeneratedMacro {
  macro1: string[];
  macro2?: string[];
  estimatedTimeSeconds: number;
  totalCpCost: number;
}

/**
 * Generate in-game macros formatted with /ac, <wait.x>, and sound cues
 */
export function generateGameMacro(
  recipe: Recipe,
  stats: CrafterStats
): GeneratedMacro {
  const is40Durability = recipe.durability <= 40;

  if (is40Durability) {
    // 40 Durability Intermediate Material (35s 1-Macro)
    const macro1 = [
      '/ac 真価 <wait.3>',
      '/ac 長期倹約 <wait.2>',
      '/ac イノベーション <wait.2>',
      '/ac 下地加工 <wait.3>',
      '/ac 下地加工 <wait.3>',
      '/ac 下地加工 <wait.3>',
      '/ac グレートストライド <wait.2>',
      '/ac ビエルゴの祝福 <wait.3>',
      '/ac ヴェネレーション <wait.2>',
      '/ac 下地作業 <wait.3>',
      '/ac 下地作業 <wait.3>',
      '/echo 中間素材の製作が完了しました！ <se.1>',
    ];

    return {
      macro1,
      estimatedTimeSeconds: 32,
      totalCpCost: 520,
    };
  }

  // 70 / 80 Durability Finished Item (2-Macro HQ Safe)
  const macro1 = [
    '/ac 確信 <wait.3>',
    '/ac マニピュレーション <wait.2>',
    '/ac 長期倹約 <wait.2>',
    '/ac ヴェネレーション <wait.2>',
    '/ac 下地作業 <wait.3>',
    '/ac 下地作業 <wait.3>',
    '/ac イノベーション <wait.2>',
    '/ac 下地加工 <wait.3>',
    '/ac 下地加工 <wait.3>',
    '/ac 下地加工 <wait.3>',
    '/ac 下地加工 <wait.3>',
    '/ac マニピュレーション <wait.2>',
    '/ac イノベーション <wait.2>',
    '/ac 匠の絶技 <wait.3>',
    '/echo マクロ1終了 ➔ マクロ2へ <se.6>',
  ];

  const macro2 = [
    '/ac 倹約加工 <wait.3>',
    '/ac グレートストライド <wait.2>',
    '/ac ビエルゴの祝福 <wait.3>',
    '/ac ヴェネレーション <wait.2>',
    '/ac 下地作業 <wait.3>',
    '/ac 下地作業 <wait.3>',
    '/echo 【完成】製作が完了しました！HQ完成！ <se.1>',
  ];

  return {
    macro1,
    macro2,
    estimatedTimeSeconds: 58,
    totalCpCost: 654,
  };
}
