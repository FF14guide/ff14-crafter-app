import React from 'react';
import { X, Sparkles, Check, Play, FileCode } from 'lucide-react';

export interface MacroPreset {
  id: string;
  name: string;
  category: '7.1新式' | '中間素材' | '飯薬' | '収集品' | '下位レシピ';
  durability: number;
  minCraftsmanship: number;
  minControl: number;
  minCp: number;
  skills: string[];
  description: string;
}

export const MACRO_PRESETS: MacroPreset[] = [
  {
    id: 'preset_74_gear_2macro',
    name: '【7.4/7.55新式装備 70耐久】確信スタート安定HQ 2マクロ (IL770 コートリーラヴァー対応)',
    category: '7.1新式',
    durability: 70,
    minCraftsmanship: 5620,
    minControl: 5080,
    minCp: 690,
    description: 'パッチ7.4/7.55対応。確信スタート、マニピュレーションと下地加工でインナー10スタックを安全に積み、ビエルゴ下地作業で100%HQ完成。',
    skills: [
      'muscle_memory',
      'manipulation',
      'waste_not_2',
      'veneration',
      'groundwork',
      'groundwork',
      'innovation',
      'preparatory_touch',
      'preparatory_touch',
      'preparatory_touch',
      'preparatory_touch',
      'great_strides',
      'byregot_blessing',
      'groundwork',
    ],
  },
  {
    id: 'preset_food_potion_80',
    name: '【7.4/7.55レイド飯・薬G3 70/80耐久】低CP 2マクロ',
    category: '飯薬',
    durability: 80,
    minCraftsmanship: 5380,
    minControl: 4650,
    minCp: 640,
    description: '真価スタートでインナースタックを素早く稼ぎ、高品質を逃さずビエルゴフィニッシュ。',
    skills: [
      'reflect',
      'manipulation',
      'waste_not_2',
      'innovation',
      'preparatory_touch',
      'preparatory_touch',
      'preparatory_touch',
      'innovation',
      'prudent_touch',
      'prudent_touch',
      'great_strides',
      'byregot_blessing',
      'veneration',
      'groundwork',
      'groundwork',
    ],
  },
  {
    id: 'preset_subcraft_40',
    name: '【中間素材 40耐久】35秒高速ワンポチマクロ',
    category: '中間素材',
    durability: 40,
    minCraftsmanship: 4700,
    minControl: 4300,
    minCp: 560,
    description: '長期倹約＋下地加工3回から一気に完成させる中間素材量産用ワンポチマクロ。',
    skills: [
      'reflect',
      'waste_not_2',
      'innovation',
      'preparatory_touch',
      'preparatory_touch',
      'preparatory_touch',
      'great_strides',
      'byregot_blessing',
      'veneration',
      'groundwork',
      'groundwork',
    ],
  },
  {
    id: 'preset_collectible_80',
    name: '【Lv100 橙貨・紫貨収集品】満額安定 1マクロ',
    category: '収集品',
    durability: 80,
    minCraftsmanship: 4400,
    minControl: 4100,
    minCp: 590,
    description: '貨幣納品用の収集価値最大化マクロ。',
    skills: [
      'reflect',
      'waste_not_2',
      'innovation',
      'preparatory_touch',
      'preparatory_touch',
      'preparatory_touch',
      'preparatory_touch',
      'great_strides',
      'byregot_blessing',
      'veneration',
      'groundwork',
      'groundwork',
    ],
  },
  {
    id: 'preset_trained_eye',
    name: '【下位レシピ即完】匠の技 2手ワンポチ',
    category: '下位レシピ',
    durability: 40,
    minCraftsmanship: 3500,
    minControl: 3500,
    minCp: 250,
    description: 'Lv90以下の過去レシピ用。匠の技＋下地作業で瞬時に100%HQ完成。',
    skills: ['trained_eye', 'groundwork'],
  },
];

interface MacroPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: MacroPreset) => void;
}

export const MacroPresetsModal: React.FC<MacroPresetsModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100">高効率クラフトマクロ集 (7.1最新版)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset List */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {MACRO_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">{preset.name}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.2 rounded border border-amber-500/40">
                    {preset.category}
                  </span>
                </div>

                <button
                  onClick={() => {
                    onApplyPreset(preset);
                    onClose();
                  }}
                  className="px-3 py-1 bg-amber-500 text-slate-950 font-semibold rounded-lg text-xs hover:bg-amber-400 transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>このマクロを適用</span>
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-2 leading-relaxed">{preset.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-[11px] font-rajdhani text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span>推奨作業: <b className="text-amber-300">{preset.minCraftsmanship}</b></span>
                <span>推奨加工: <b className="text-sky-300">{preset.minControl}</b></span>
                <span>必要CP: <b className="text-emerald-300">{preset.minCp}</b></span>
                <span>手数: <b className="text-slate-200">{preset.skills.length}手</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
