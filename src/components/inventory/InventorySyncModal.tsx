import React, { useState } from 'react';
import { InventorySyncData } from '../../types/ff14';
import { parseInventoryJson, SAMPLE_INVENTORY_DATA } from '../../utils/inventoryStorage';
import { X, Sparkles, Upload, FileText, Check, AlertCircle, Trash2, Key, RefreshCw, Layers, Copy } from 'lucide-react';

interface InventorySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncData: InventorySyncData | null;
  onSaveSyncData: (data: InventorySyncData | null) => void;
}

export const InventorySyncModal: React.FC<InventorySyncModalProps> = ({
  isOpen,
  onClose,
  syncData,
  onSaveSyncData,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'webhook'>('paste');
  const [jsonInput, setJsonInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const handleImportJson = () => {
    setParseError(null);
    if (!jsonInput.trim()) {
      setParseError('JSONテキストを入力してください。');
      return;
    }

    const result = parseInventoryJson(jsonInput);
    if (result.success && result.data) {
      onSaveSyncData(result.data);
      setJsonInput('');
      onClose();
    } else {
      setParseError(result.error || 'JSONの解析に失敗しました。');
    }
  };

  const handleLoadSample = () => {
    onSaveSyncData(SAMPLE_INVENTORY_DATA);
    setParseError(null);
    onClose();
  };

  const handleClear = () => {
    onSaveSyncData(null);
    setJsonInput('');
    setParseError(null);
  };

  const mockApiToken = 'eorzea_sync_tok_719a84b2c89f';
  const mockWebhookUrl = 'https://clafter.eorzeanfishing.com/api/sync-inventory';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                ゲーム内所持品・チェスト連携 (Dalamud Plugin)
              </h2>
              <p className="text-[11px] text-slate-400">
                プレイヤー手持ち・全リテイナー・FCチェスト・チョコボかばんの素材数を自動反映
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Sync Status Badge */}
        <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">現在のステータス:</span>
            {syncData ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                <Check className="w-3.5 h-3.5" />
                同期中: {syncData.character || 'キャラクター'} ({syncData.inventories.length} アイテム)
              </span>
            ) : (
              <span className="text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded text-[11px]">
                未同期 (所持数 0 として計算)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3 h-3" />
              <span>テスト用サンプル読込</span>
            </button>

            {syncData && (
              <button
                onClick={handleClear}
                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>解除</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4 pt-2">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'paste'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>【パターン1】JSON貼り付け / D&D (手軽・推奨)</span>
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'webhook'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>【パターン2】Webhook 自動同期 (Cloudflare)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'paste' ? (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed">
                <div className="font-semibold text-slate-100 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Allagan Tools プラグイン等からのインポート手順:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>ゲーム内で Dalamud プラグイン「Allagan Tools」を開く</li>
                  <li>インベントリ一覧から「Export to JSON」または「クリップボードにコピー」をクリック</li>
                  <li>下のテキストボックスに貼り付けて「インポートを反映」を押す</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  インベントリ JSON 貼り付け枠:
                </label>
                <textarea
                  rows={7}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{\n  "character": "YourName@Bahamut",\n  "inventories": [\n    { "location": "Player", "itemId": 44320, "name": "エレクトロインゴット", "quantity": 4 },\n    { "location": "Retainer: Nana", "itemId": 44410, "name": "エレクトロピン原木", "quantity": 16 }\n  ]\n}`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/80 resize-none"
                />
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-900/30 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>インポートを反映する</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed">
                <div className="font-semibold text-slate-100 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Cloudflare Workers Webhook 自動同期設定:
                </div>
                <p className="text-[11px] text-slate-400">
                  ゲーム内でリテイナーやFCチェストを開くたびに、Webhook経由で最新の所持品データがWebサイトに自動同期されます。
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Webhook エンドポイント URL:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={mockWebhookUrl}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(mockWebhookUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-all"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'コピー済' : 'URLコピー'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">認証トークン (X-User-Token ヘッダー):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={mockApiToken}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(mockApiToken);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-all"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? 'コピー済' : 'トークンコピー'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-300">
                <span className="font-semibold">💡 実装アドバイス:</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cloudflare Workers と D1 (SQLite) または KV により、完全サーバーレスでセキュアなリアルタイム在庫連携が可能です。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
