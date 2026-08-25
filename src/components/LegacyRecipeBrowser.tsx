import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, CraftJob, CRAFT_JOBS } from '../types/ff14';
import { Search, Plus, History, Loader2, ChevronLeft, ChevronRightIcon as ChevronRight } from 'lucide-react';
import { ItemIcon } from './common/ItemIcon';
import { JobIcon } from './common/JobIcon';
import { Expansion, ALL_EXPANSIONS, EXPANSION_LABELS, loadExpansionRecipes } from '../utils/legacyRecipeLoader';

interface LegacyRecipeBrowserProps {
  onAddToBatch: (recipe: Recipe) => void;
  onSelectRecipeForCost: (recipe: Recipe) => void;
  onSelectRecipeForSim: (recipe: Recipe) => void;
}

const PAGE_SIZE = 30;

export const LegacyRecipeBrowser: React.FC<LegacyRecipeBrowserProps> = ({
  onAddToBatch,
  onSelectRecipeForCost,
  onSelectRecipeForSim,
}) => {
  const [expansion, setExpansion] = useState<Expansion>('DT');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<CraftJob | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);
    loadExpansionRecipes(expansion).then((data) => {
      if (!cancelled) {
        setRecipes(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [expansion]);

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      if (selectedJob !== 'ALL' && recipe.job !== selectedJob) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !recipe.name.toLowerCase().includes(q) &&
          !recipe.enName.toLowerCase().includes(q) &&
          !recipe.job.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [recipes, selectedJob, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedJob]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = (recipe: Recipe) => {
    onAddToBatch(recipe);
    setAddedIds((prev) => new Set(prev).add(recipe.id));
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3 px-1">
          <History className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-200">歴代レシピ (過去拡張パッケージ)</h2>
          <span className="text-[11px] text-slate-500">
            採集元・秘伝書等の詳細情報は簡略化されています。マケボ価格は「製作計画」に追加後に自動取得されます。
          </span>
        </div>

        {/* Expansion selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
          {ALL_EXPANSIONS.map((exp) => (
            <button
              key={exp}
              onClick={() => setExpansion(exp)}
              className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                expansion === exp
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-semibold font-rajdhani">{exp}</span>
              <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{EXPANSION_LABELS[exp]}</span>
            </button>
          ))}
        </div>

        {/* Search & job filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="アイテム名 / 英語名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
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
            {(Object.keys(CRAFT_JOBS) as CraftJob[]).map((jobCode) => (
              <button
                key={jobCode}
                onClick={() => setSelectedJob(jobCode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                  selectedJob === jobCode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <JobIcon job={jobCode} size="xs" />
                <span className="font-rajdhani font-semibold">{jobCode}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 ml-auto">該当: {filtered.length.toLocaleString()} 件</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-16">
          <Loader2 className="w-4 h-4 animate-spin" />
          {EXPANSION_LABELS[expansion]} のレシピを読み込み中...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pageItems.map((recipe) => {
              const jobInfo = CRAFT_JOBS[recipe.job];
              const isAdded = addedIds.has(recipe.id);
              return (
                <div
                  key={recipe.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col gap-2 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon itemId={recipe.itemId} icon={recipe.icon} name={recipe.name} size="md" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">{recipe.name}</div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span
                          className="px-1 py-0.5 rounded font-rajdhani font-semibold text-white"
                          style={{ backgroundColor: `${jobInfo.color}CC` }}
                        >
                          {jobInfo.code} Lv{recipe.level}
                        </span>
                        {recipe.stars > 0 && <span className="text-amber-400">{'★'.repeat(recipe.stars)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {recipe.materials.slice(0, 4).map((m) => (
                      <span
                        key={m.itemId}
                        className="text-[9px] bg-slate-800/70 text-slate-300 px-1 py-0.5 rounded border border-slate-700/50 flex items-center gap-1"
                      >
                        <span>{m.name}</span>
                        <span className="text-amber-400 font-rajdhani">x{m.amount}</span>
                      </span>
                    ))}
                    {recipe.materials.length > 4 && (
                      <span className="text-[9px] text-slate-500">+{recipe.materials.length - 4}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-auto pt-1">
                    <button
                      onClick={() => onSelectRecipeForCost(recipe)}
                      className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                    >
                      原価
                    </button>
                    <button
                      onClick={() => onSelectRecipeForSim(recipe)}
                      className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                    >
                      シミュ
                    </button>
                    <button
                      onClick={() => handleAdd(recipe)}
                      disabled={isAdded}
                      className={`px-2 py-1 rounded-lg text-[10px] border transition-all flex items-center gap-1 ${
                        isAdded
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                      title="製作計画リストに追加"
                    >
                      <Plus className="w-3 h-3" />
                      {isAdded ? '追加済' : '計画へ'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">該当するレシピが見つかりませんでした。</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-rajdhani">
                {page + 1} / {totalPages} ページ
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
