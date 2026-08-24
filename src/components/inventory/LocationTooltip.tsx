import React, { useState } from 'react';
import { InventoryItemLocation } from '../../types/ff14';
import { Box, User, Shield, Backpack, Check, Users } from 'lucide-react';

interface LocationTooltipProps {
  itemId: number;
  itemName: string;
  totalOwned: number;
  requiredAmount?: number;
  breakdown: InventoryItemLocation[];
  compact?: boolean;
}

export const LocationTooltip: React.FC<LocationTooltipProps> = ({
  itemName,
  totalOwned,
  requiredAmount,
  breakdown,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isSufficient = requiredAmount !== undefined ? totalOwned >= requiredAmount : totalOwned > 0;
  const isPartial = requiredAmount !== undefined && totalOwned > 0 && totalOwned < requiredAmount;

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'Player':
        return <Backpack className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'Retainer':
        return <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'FC_Chest':
        return <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
      case 'Saddlebag':
        return <Box className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  // Group breakdown items by character / source
  const characterGroups = React.useMemo(() => {
    const map = new Map<string, { total: number; items: InventoryItemLocation[] }>();

    for (const item of breakdown) {
      const charName = item.source?.trim() || '共通 / 未指定';
      if (!map.has(charName)) {
        map.set(charName, { total: 0, items: [] });
      }
      const group = map.get(charName)!;
      group.total += item.quantity;
      group.items.push(item);
    }

    return Array.from(map.entries()).map(([charName, data]) => ({
      character: charName,
      total: data.total,
      items: data.items,
    }));
  }, [breakdown]);

  return (
    <div className="relative inline-block text-left">
      {/* Badge button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-rajdhani font-semibold border transition-all cursor-pointer ${
          isSufficient
            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
            : isPartial
            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
            : 'bg-slate-900/70 text-slate-400 border-slate-700/60 hover:bg-slate-800'
        }`}
        title="クリックで所持キャラクター・保管場所の内訳を表示"
      >
        <span className="text-[10px]">所持:</span>
        <span className="font-bold">{totalOwned}</span>
        {requiredAmount !== undefined && (
          <span className="text-[10px] opacity-75">/ {requiredAmount}</span>
        )}
        {isSufficient && <Check className="w-3 h-3 text-emerald-400 ml-0.5" />}
      </button>

      {/* Popover Breakdown Tooltip */}
      {isOpen && (
        <div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-slate-900/98 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-100 truncate pr-2">{itemName}</span>
            <span className="text-xs text-amber-400 font-rajdhani font-bold shrink-0">
              合計 {totalOwned} 個
            </span>
          </div>

          {/* Quick Character Summary if multiple characters */}
          {characterGroups.length > 1 && (
            <div className="mb-2.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium mb-1">
                <Users className="w-3 h-3" />
                <span>キャラクター別所持内訳:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {characterGroups.map((group) => (
                  <div
                    key={group.character}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 px-1.5 py-0.5 rounded text-[10px]"
                  >
                    <span className="text-slate-300 font-medium truncate max-w-[90px]">
                      {group.character}
                    </span>
                    <span className="font-rajdhani font-bold text-amber-300">
                      {group.total}個
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {breakdown.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-2 text-center">
              選択中のキャラクターに所持品はありません (0個)
            </p>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-0.5 custom-scrollbar">
              {characterGroups.map((group) => (
                <div
                  key={group.character}
                  className="bg-slate-950/70 rounded-lg p-2 border border-slate-800/90"
                >
                  {/* Character Section Header */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 border-b border-slate-800/80 pb-1 mb-1.5">
                    <span className="flex items-center gap-1 text-amber-300 truncate">
                      👤 {group.character}
                    </span>
                    <span className="font-rajdhani font-bold text-slate-200">
                      計 {group.total} 個
                    </span>
                  </div>

                  {/* Locations list under this character */}
                  <div className="space-y-1">
                    {group.items.map((loc, idx) => {
                      const isRetainer =
                        loc.locationType === 'Retainer' ||
                        loc.location.toLowerCase().includes('retainer') ||
                        loc.location.includes('リテイナー');

                      return (
                        <div
                          key={`${loc.location}_${idx}`}
                          className="flex items-center justify-between text-xs bg-slate-900/90 px-2 py-1 rounded border border-slate-800/60"
                        >
                          <div className="flex items-center gap-1.5 text-slate-300 min-w-0 pr-2">
                            {getLocationIcon(loc.locationType)}
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <span className="text-[11px] text-slate-200 truncate">
                                {loc.location}
                              </span>
                              {isRetainer && (
                                <span className="text-[9px] text-sky-400/90 font-medium px-1 py-0.2 rounded bg-sky-500/10 border border-sky-500/20 shrink-0">
                                  {group.character}のリテイナー
                                </span>
                              )}
                              {loc.isHq && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1 rounded border border-amber-500/30 shrink-0">
                                  HQ
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-rajdhani font-bold text-slate-200 shrink-0">
                            x{loc.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Requirement Status */}
          {requiredAmount !== undefined && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 flex justify-between items-center text-[11px]">
              <span className="text-slate-400">必要数: {requiredAmount}個</span>
              <span
                className={
                  totalOwned >= requiredAmount
                    ? 'text-emerald-400 font-bold'
                    : 'text-rose-400 font-bold'
                }
              >
                {totalOwned >= requiredAmount
                  ? '充足 (所持品で対応可能)'
                  : `不足: ${requiredAmount - totalOwned}個`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
