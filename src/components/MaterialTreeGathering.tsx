import React, { useState, useEffect } from 'react';
import { Recipe } from '../types/ff14';
import { TIMED_GATHERING_NODES } from '../data/gatheringNodes';
import { calculateEorzeaTime, getRealSecondsUntilETHour, formatRealTimeRemaining } from '../utils/eorzeaTime';
import { ItemIcon } from './common/ItemIcon';
import { Clock, MapPin, CheckSquare, Square, Copy, Check, Sparkles, Compass, AlertCircle, ArrowRight } from 'lucide-react';

interface MaterialTreeGatheringProps {
  recipe: Recipe;
  batchCount?: number;
  onNavigateToSim: (recipe: Recipe) => void;
}

export const MaterialTreeGathering: React.FC<MaterialTreeGatheringProps> = ({
  recipe,
  batchCount = 1,
  onNavigateToSim,
}) => {
  const [et, setEt] = useState(calculateEorzeaTime());
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setEt(calculateEorzeaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleCheck = (itemId: number) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Find relevant gathering nodes for this recipe's materials
  const relevantMaterialNames = recipe.materials.map((m) => m.name);
  const matchedNodes = TIMED_GATHERING_NODES.filter((node) =>
    relevantMaterialNames.some((name) => node.itemName.includes(name) || name.includes(node.itemName))
  );

  // Other general 7.x timed nodes
  const otherNodes = TIMED_GATHERING_NODES.filter((node) => !matchedNodes.some((m) => m.id === node.id));

  // Copy shopping list
  const handleCopyList = () => {
    const lines = [
      `【FF14 Eorzean Crafter】素材チェックリスト`,
      `製作対象: ${recipe.name} x${batchCount}セット (${recipe.job} Lv${recipe.level})`,
      `----------------------------------------`,
      ...recipe.materials.map((m) => {
        const isChecked = checkedItems[m.itemId] ? ' [済]' : ' [未]';
        return `・${m.name} x${m.amount * batchCount}個 (${m.sourceType})${isChecked}`;
      }),
      `----------------------------------------`,
      `https://clafter.eorzeanfishing.com`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ItemIcon itemId={recipe.itemId} icon={recipe.icon} name={recipe.name} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">{recipe.name} の素材集め & 採集ツリー</h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/40">
                {batchCount} 回製作分
              </span>
            </div>
            <p className="text-xs text-slate-400">
              必要な一次素材・刻限/伝説素材の採集場所、ET出現時間、テレポ先を網羅
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyList}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition-all font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copied ? 'コピー完了！' : '素材リストをコピー'}</span>
          </button>

          <button
            onClick={() => onNavigateToSim(recipe)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-xs border border-indigo-500/40 font-medium transition-all"
          >
            <span>製作シミュレータへ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Materials Checklist Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>素材調達チェックリスト</span>
          </h3>
          <span className="text-xs text-slate-400">
            完了: {Object.values(checkedItems).filter(Boolean).length} / {recipe.materials.length} 種
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recipe.materials.map((mat) => {
            const totalAmount = mat.amount * batchCount;
            const isChecked = !!checkedItems[mat.itemId];

            return (
              <div
                key={mat.itemId}
                onClick={() => toggleCheck(mat.itemId)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isChecked
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-400'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button className="text-slate-400 hover:text-emerald-400 transition-colors">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                  <ItemIcon itemId={mat.itemId} icon={mat.icon} name={mat.name} size="sm" />
                  <div>
                    <div className={`text-xs font-semibold ${isChecked ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {mat.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                          mat.sourceType === 'gathering'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : mat.sourceType === 'reduction'
                            ? 'bg-purple-500/20 text-purple-300'
                            : mat.sourceType === 'tomestone'
                            ? 'bg-amber-500/20 text-amber-300'
                            : mat.sourceType === 'subcraft'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {mat.sourceType === 'gathering'
                          ? '🌲 採集'
                          : mat.sourceType === 'reduction'
                          ? '✨ 霊砂・精選'
                          : mat.sourceType === 'tomestone'
                          ? '🪙 トームストーン'
                          : mat.sourceType === 'subcraft'
                          ? '🔨 中間素材'
                          : '🛒 店売り/他'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-rajdhani">
                  <div className="text-sm font-bold text-amber-300">
                    x{totalAmount} <span className="text-xs text-slate-400 font-normal">個</span>
                  </div>
                  <div className="text-[10px] text-slate-400">(1回あたり x{mat.amount})</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timed Gathering Nodes Table / Schedule */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              未知・伝説・刻限 採集アラーム (ET {et.timeString})
            </h3>
          </div>
          <span className="text-xs text-slate-400">現在 Patch 7.x 黄金のレガシー伝説ノード</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {[...matchedNodes, ...otherNodes].map((node) => {
            // Calculate if currently active or countdown
            const currentHour = et.hours;
            let isActive = false;
            let nextSpawnHour = node.spawnHours[0];
            let minDiff = 999;

            for (const hour of node.spawnHours) {
              const endHour = (hour + node.durationHours) % 24;
              if (endHour > hour) {
                if (currentHour >= hour && currentHour < endHour) {
                  isActive = true;
                }
              } else {
                if (currentHour >= hour || currentHour < endHour) {
                  isActive = true;
                }
              }

              let diff = hour - currentHour;
              if (diff < 0) diff += 24;
              if (diff < minDiff) {
                minDiff = diff;
                nextSpawnHour = hour;
              }
            }

            const realSecsLeft = isActive ? 0 : getRealSecondsUntilETHour(nextSpawnHour, currentHour, et.minutes);

            return (
              <div
                key={node.id}
                className={`p-4 flex flex-wrap items-center justify-between gap-4 transition-colors ${
                  isActive ? 'bg-amber-950/20 border-l-4 border-l-amber-500' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ItemIcon
                    itemId={node.itemId}
                    icon={node.itemIcon}
                    name={node.itemName}
                    size="lg"
                    className="shrink-0 rounded-xl border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{node.itemName}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-rajdhani font-bold px-1.5 py-0.2 rounded border border-slate-700">
                        {node.job} Lv{node.level}
                      </span>
                      {node.slot && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20">
                          {node.slot}段目
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{node.zone} ({node.coordinates})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-sky-400" />
                        <span>最寄り: {node.nearestAetheryte}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spawn Time & Countdown */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-bold font-rajdhani text-slate-300">
                      ET {node.spawnHours.map((h) => `${h}:00`).join(' / ')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      必要技術力: {node.perceptionReq}
                    </div>
                  </div>

                  <div className="min-w-[110px] text-right">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 animate-pulse">
                        <Sparkles className="w-3 h-3" />
                        <span>採集可能！</span>
                      </span>
                    ) : (
                      <span className="text-xs font-rajdhani font-semibold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        あと {formatRealTimeRemaining(realSecsLeft)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
