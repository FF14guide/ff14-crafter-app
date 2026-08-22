import React, { useState } from 'react';
import { Recipe, CraftJob, CRAFT_JOBS } from '../types/ff14';
import { Search, Sparkles, Plus, Play, ChevronRight, BarChart3, TreeDeciduous, Compass } from 'lucide-react';
import { ItemIcon } from './common/ItemIcon';

interface RecipeCatalogProps {
  recipes: Recipe[];
  currentPurpose: string;
  onChangePurpose: (purpose: string) => void;
  onSelectRecipeForWorkflow?: (recipe: Recipe) => void;
  onSelectRecipeForCost: (recipe: Recipe) => void;
  onSelectRecipeForTree: (recipe: Recipe) => void;
  onSelectRecipeForSim: (recipe: Recipe) => void;
  onAddToBatch: (recipe: Recipe) => void;
}

export const RecipeCatalog: React.FC<RecipeCatalogProps> = ({
  recipes,
  currentPurpose,
  onChangePurpose,
  onSelectRecipeForWorkflow,
  onSelectRecipeForCost,
  onSelectRecipeForTree,
  onSelectRecipeForSim,
  onAddToBatch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<CraftJob | 'ALL'>('ALL');

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) => {
    // Purpose filter
    if (currentPurpose === 'latestPatch') {
      if (recipe.patch !== '7.1' && recipe.patch !== '7.05' && recipe.stars < 2) return false;
    } else if (currentPurpose !== 'all') {
      if (recipe.category !== currentPurpose) return false;
    }

    // Job filter
    if (selectedJob !== 'ALL' && recipe.job !== selectedJob) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = recipe.name.toLowerCase().includes(q);
      const matchEn = recipe.enName.toLowerCase().includes(q);
      const matchJob = recipe.job.toLowerCase().includes(q);
      const matchPatch = recipe.patch.includes(q);
      if (!matchName && !matchEn && !matchJob && !matchPatch) return false;
    }

    return true;
  });

  const categories = [
    { id: 'latestPatch', label: '🔥 最新パッチ7.1/7.05', desc: '新式装備・高難易度レイド飯薬' },
    { id: 'foodPotion', label: '🍗 レイド飯・薬', desc: '最新飯・宝薬G2・薬茶' },
    { id: 'gear', label: '🛡️ 新式装備・防具', desc: 'IL710 ケツァルシリーズ等' },
    { id: 'intermediate', label: '🟫 中間素材', desc: '黄金のレザー・インゴット・布' },
    { id: 'collectibles', label: '📦 収集品 (橙貨/紫貨)', desc: 'クラフター貨幣集め用' },
    { id: 'housing', label: '⛲ ハウジング家具', desc: '庭具・調度品' },
    { id: 'all', label: '✨ すべてのレシピ', desc: '全カタログ' },
  ];

  return (
    <div className="space-y-6">
      {/* Purpose Filter Tabs */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">目的別レシピ選定 (Purpose Filter)</h2>
          </div>
          <span className="text-xs text-slate-400">該当レシピ: {filteredRecipes.length} 件</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {categories.map((cat) => {
            const isActive = currentPurpose === cat.id;
            return (
              <button
                key={cat.id}
                id={`filter-purpose-${cat.id}`}
                onClick={() => onChangePurpose(cat.id)}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-950/20 text-amber-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-xs font-semibold">{cat.label}</span>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{cat.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Job Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-recipe-input"
            type="text"
            placeholder="アイテム名 / 英語名 / パッチ検索 (例: ローストチキン, G2, ケツァル)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
        </div>

        {/* Job Icons filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedJob('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              selectedJob === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            全クラス
          </button>
          {(Object.keys(CRAFT_JOBS) as CraftJob[]).map((jobCode) => {
            const job = CRAFT_JOBS[jobCode];
            const isJobActive = selectedJob === jobCode;
            return (
              <button
                key={jobCode}
                id={`filter-job-${jobCode}`}
                onClick={() => setSelectedJob(jobCode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isJobActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={job.name}
              >
                <span>{job.icon}</span>
                <span className="font-rajdhani font-semibold">{jobCode}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe) => {
          const jobInfo = CRAFT_JOBS[recipe.job];
          return (
            <div
              key={recipe.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-black/40 group"
            >
              <div>
                {/* Card Top: Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-white flex items-center gap-1 font-rajdhani"
                      style={{ backgroundColor: `${jobInfo.color}CC` }}
                    >
                      <span>{jobInfo.icon}</span>
                      <span>{jobInfo.code}</span>
                      <span>Lv{recipe.level}</span>
                    </span>
                    {recipe.stars > 0 && (
                      <span className="text-amber-400 text-xs font-bold" title={`${recipe.stars}星レシピ`}>
                        {'★'.repeat(recipe.stars)}
                      </span>
                    )}
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-rajdhani">
                      Patch {recipe.patch}
                    </span>
                  </div>

                  {recipe.ilvl > 0 && (
                    <span className="text-[11px] text-amber-300/90 font-rajdhani font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      IL {recipe.ilvl}
                    </span>
                  )}
                </div>

                {/* Item Name & Official Icon */}
                <div className="flex items-start gap-2.5 my-2">
                  <ItemIcon
                    itemId={recipe.itemId}
                    icon={recipe.icon}
                    name={recipe.name}
                    size="lg"
                    className="shadow-inner border-slate-700 bg-slate-900"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {recipe.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-rajdhani line-clamp-1">{recipe.enName}</p>
                  </div>
                </div>

                {/* Description or Masterbook */}
                {recipe.description && (
                  <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-3 leading-relaxed">
                    {recipe.description}
                  </p>
                )}

                {/* Recipe Stats Requirements */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950/40 p-2 rounded-xl border border-slate-800/60 text-[11px] mb-3 font-rajdhani">
                  <div>
                    <span className="text-slate-400 block text-[10px]">耐久</span>
                    <span className="text-slate-200 font-semibold">{recipe.durability}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">必要工数</span>
                    <span className="text-amber-300 font-semibold">{recipe.difficulty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">最大品質</span>
                    <span className="text-sky-300 font-semibold">{recipe.maxQuality}</span>
                  </div>
                </div>

                {/* Materials preview */}
                <div className="space-y-1 mb-3">
                  <span className="text-[10px] text-slate-400 font-semibold block">必要素材 ({recipe.materials.length} 種):</span>
                  <div className="flex flex-wrap gap-1">
                    {recipe.materials.map((m) => (
                      <span
                        key={m.itemId}
                        className="text-[10px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/60 flex items-center gap-1.5"
                      >
                        <ItemIcon itemId={m.itemId} icon={m.icon} name={m.name} size="xs" />
                        <span>{m.name}</span>
                        <span className="text-amber-400 font-semibold font-rajdhani">x{m.amount}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                {onSelectRecipeForWorkflow && (
                  <button
                    id={`btn-workflow-${recipe.id}`}
                    onClick={() => onSelectRecipeForWorkflow(recipe)}
                    className="w-full bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-200 border border-amber-500/40 hover:border-amber-500/60 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="レストラネット風 製作ワークフローへ"
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>🧭 製作ワークフロー (ToDo) を開く</span>
                  </button>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    id={`btn-cost-${recipe.id}`}
                    onClick={() => onSelectRecipeForCost(recipe)}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    title="Universalis原価・利益計算"
                  >
                    <BarChart3 className="w-3 h-3 text-amber-400" />
                    <span>原価</span>
                  </button>

                  <button
                    id={`btn-tree-${recipe.id}`}
                    onClick={() => onSelectRecipeForTree(recipe)}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    title="素材集めツリー & 未知タイマー"
                  >
                    <TreeDeciduous className="w-3 h-3 text-emerald-400" />
                    <span>素材</span>
                  </button>

                  <button
                    id={`btn-sim-${recipe.id}`}
                    onClick={() => onSelectRecipeForSim(recipe)}
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    title="マクロ生成 & シミュレータ"
                  >
                    <Play className="w-3 h-3 text-indigo-300" />
                    <span>シミュ</span>
                  </button>

                  <button
                    id={`btn-add-batch-${recipe.id}`}
                    onClick={() => onAddToBatch(recipe)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 rounded-lg text-xs border border-slate-700 transition-all flex items-center justify-center"
                    title="製作計画リストに追加"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400 text-sm">該当するレシピが見つかりませんでした。</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedJob('ALL');
              onChangePurpose('latestPatch');
            }}
            className="mt-3 text-xs text-amber-400 hover:underline inline-flex items-center gap-1"
          >
            最新パッチレシピ一覧に戻る <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
