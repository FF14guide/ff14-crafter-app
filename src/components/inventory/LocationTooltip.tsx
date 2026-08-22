import React, { useState } from 'react';
import { InventoryItemLocation } from '../../types/ff14';
import { Box, User, Shield, Backpack, Check, Sparkles } from 'lucide-react';

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
        return <Backpack className="w-3.5 h-3.5 text-amber-400" />;
      case 'Retainer':
        return <User className="w-3.5 h-3.5 text-sky-400" />;
      case 'FC_Chest':
        return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Saddlebag':
        return <Box className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Box className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

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
        title="クリックで所持場所の内訳を表示"
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
          className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="text-xs font-bold text-slate-100 truncate">{itemName}</span>
            <span className="text-[10px] text-amber-400 font-rajdhani font-bold">
              計 {totalOwned} 個
            </span>
          </div>

          {breakdown.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-1 text-center">
              インベントリ未所持 (0個)
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {breakdown.map((loc, idx) => (
                <div
                  key={`${loc.location}_${idx}`}
                  className="flex items-center justify-between text-xs bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80"
                >
                  <div className="flex items-center gap-1.5 text-slate-300">
                    {getLocationIcon(loc.locationType)}
                    <span className="text-[11px] truncate max-w-[120px]">{loc.location}</span>
                    {loc.isHq && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1 rounded border border-amber-500/30">
                        HQ
                      </span>
                    )}
                  </div>
                  <span className="font-rajdhani font-bold text-slate-200">
                    x{loc.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}

          {requiredAmount !== undefined && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 flex justify-between text-[11px]">
              <span className="text-slate-400">必要数: {requiredAmount}個</span>
              <span className={totalOwned >= requiredAmount ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {totalOwned >= requiredAmount ? '充足 (手持ち・保管庫にあり)' : `不足: ${requiredAmount - totalOwned}個`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
