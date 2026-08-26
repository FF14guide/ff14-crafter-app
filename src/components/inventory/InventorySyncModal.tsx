import React, { useState, useRef, useEffect } from 'react';
import { InventorySyncData, InventoryItemLocation, InventoryLocationType, Recipe } from '../../types/ff14';
import {
  parseInventoryJson,
  parseInventoryInputAsync,
  SAMPLE_INVENTORY_DATA,
  PRESET_PATCH_72,
  PRESET_PATCH_705,
  PRESET_FULL_STOCK,
  KNOWN_FF14_ITEMS,
  resolveItemInfo,
  resolveItemInfoFull,
  getItemStockTotal,
  CharacterGroup,
  loadCharacterGroups,
  saveCharacterGroups,
  expandGroupSelectionToSources,
} from '../../utils/inventoryStorage';
import {
  linkInventoryFile,
  getLinkedFileInfo,
  readLinkedFile,
  writeLinkedFile,
  unlinkInventoryFile,
  isFileSystemAccessSupported,
} from '../../utils/fileHandleStorage';
import { ItemIcon } from '../common/ItemIcon';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Trash2,
  Key,
  Layers,
  Copy,
  Plus,
  Search,
  CheckCircle2,
  ClipboardPaste,
  FileUp,
  Package,
  Boxes,
  HelpCircle,
  Save,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Link2,
  Unlink,
} from 'lucide-react';

interface InventorySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncData: InventorySyncData | null;
  onSaveSyncData: (data: InventorySyncData | null) => void;
  activeRecipe?: Recipe;
}

export const InventorySyncModal: React.FC<InventorySyncModalProps> = ({
  isOpen,
  onClose,
  syncData,
  onSaveSyncData,
  activeRecipe,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'presets' | 'manager' | 'filelink'>('paste');
  const [jsonInput, setJsonInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessInfo, setParseSuccessInfo] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manager Tab States
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [characterFilter, setCharacterFilter] = useState<string>('ALL');
  const [editingInventories, setEditingInventories] = useState<InventoryItemLocation[]>([]);
  const [selectedCharsOnImport, setSelectedCharsOnImport] = useState<string[]>(['ALL']);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemLoc, setNewItemLoc] = useState('Player (手持ち)');
  const [newItemSource, setNewItemSource] = useState('');
  const [newItemHq, setNewItemHq] = useState(false);

  // Character Groups (link retainers/alts under one owning character;
  // persisted per-browser/PC via localStorage)
  const [characterGroups, setCharacterGroups] = useState<CharacterGroup[]>([]);
  const [isGroupPanelOpen, setIsGroupPanelOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupMembersDraft, setGroupMembersDraft] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setCharacterGroups(loadCharacterGroups());
    }
  }, [isOpen]);

  const persistGroups = (groups: CharacterGroup[]) => {
    setCharacterGroups(groups);
    saveCharacterGroups(groups);
  };

  const startNewGroup = () => {
    setEditingGroupId('__new__');
    setGroupNameDraft('');
    setGroupMembersDraft(new Set());
    setIsGroupPanelOpen(true);
  };

  const startEditGroup = (group: CharacterGroup) => {
    setEditingGroupId(group.id);
    setGroupNameDraft(group.displayName);
    setGroupMembersDraft(new Set(group.memberSources));
    setIsGroupPanelOpen(true);
  };

  const toggleGroupMemberDraft = (source: string) => {
    setGroupMembersDraft((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  const handleSaveGroup = () => {
    if (!groupNameDraft.trim() || groupMembersDraft.size === 0) return;
    const members = Array.from(groupMembersDraft);
    if (editingGroupId === '__new__') {
      const newGroup: CharacterGroup = {
        id: `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        displayName: groupNameDraft.trim(),
        memberSources: members,
      };
      persistGroups([...characterGroups, newGroup]);
      showToast(`👥 グループ「${newGroup.displayName}」を作成しました`);
    } else if (editingGroupId) {
      const updated = characterGroups.map((g) =>
        g.id === editingGroupId ? { ...g, displayName: groupNameDraft.trim(), memberSources: members } : g
      );
      persistGroups(updated);
      showToast(`👥 グループ「${groupNameDraft.trim()}」を更新しました`);
    }
    setIsGroupPanelOpen(false);
    setEditingGroupId(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    persistGroups(characterGroups.filter((g) => g.id !== groupId));
    showToast('グループを削除しました');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Linked local file (File System Access API) state
  const [linkedFileName, setLinkedFileName] = useState<string | null>(null);
  const [fileLinkBusy, setFileLinkBusy] = useState(false);
  const [fileLinkError, setFileLinkError] = useState<string | null>(null);
  const fsaSupported = isFileSystemAccessSupported();

  useEffect(() => {
    if (!isOpen) return;
    getLinkedFileInfo().then((info) => setLinkedFileName(info?.name || null));
  }, [isOpen]);

  const handleLinkFile = async () => {
    setFileLinkError(null);
    setFileLinkBusy(true);
    try {
      const info = await linkInventoryFile();
      if (info) {
        setLinkedFileName(info.name);
        showToast(`📎「${info.name}」をリンクしました。次回以降はワンクリックで再読込できます。`);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setFileLinkError('ファイルの選択に失敗しました。');
      }
    } finally {
      setFileLinkBusy(false);
    }
  };

  const handleReloadLinkedFile = async () => {
    setFileLinkError(null);
    setFileLinkBusy(true);
    try {
      const text = await readLinkedFile();
      if (!text) {
        setFileLinkError('リンクされたファイルがありません。');
        return;
      }
      const result = await parseInventoryInputAsync(text);
      if (result.success && result.data) {
        onSaveSyncData(result.data);
        setEditingInventories(result.data.inventories);
        showToast(`🔄 リンクファイルから ${result.data.inventories.length} 件を再読み込みしました！`);
      } else {
        setFileLinkError(result.error || 'ファイルの解析に失敗しました。');
      }
    } catch (err) {
      setFileLinkError((err as Error)?.message || 'ファイルの読み込みに失敗しました。');
    } finally {
      setFileLinkBusy(false);
    }
  };

  const handleSaveTextToLinkedFile = async () => {
    if (!jsonInput.trim()) {
      setFileLinkError('保存するテキストがありません（①のテキスト欄に貼り付けてください）。');
      return;
    }
    setFileLinkError(null);
    setFileLinkBusy(true);
    try {
      await writeLinkedFile(jsonInput);
      showToast('💾 現在のテキストをリンクファイルに保存しました。');
    } catch (err) {
      setFileLinkError((err as Error)?.message || 'ファイルへの書き込みに失敗しました。');
    } finally {
      setFileLinkBusy(false);
    }
  };

  const handleUnlinkFile = async () => {
    await unlinkInventoryFile();
    setLinkedFileName(null);
    showToast('リンクを解除しました。');
  };

  // Sync editing inventories with props syncData
  useEffect(() => {
    if (syncData?.inventories) {
      setEditingInventories([...syncData.inventories]);
    } else {
      setEditingInventories([]);
    }
  }, [syncData, isOpen]);

  // Detected characters from current editing inventories or syncData
  const availableCharacters = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of editingInventories) {
      if (item.source && item.source.trim()) {
        set.add(item.source.trim());
      }
    }
    if (syncData?.characters) {
      for (const c of syncData.characters) {
        if (c && c.trim()) set.add(c.trim());
      }
    }
    return Array.from(set);
  }, [editingInventories, syncData]);

  // Real storage locations already seen in synced data (actual retainer
  // names, FC chest tabs, etc.), so manual additions can pick from the
  // person's own real locations instead of hardcoded placeholder names.
  const availableLocations = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of editingInventories) {
      if (item.location && item.location.trim()) set.add(item.location.trim());
    }
    return Array.from(set).sort();
  }, [editingInventories]);

  // Active selected characters list (multi-select)
  const activeSelectedCharacters = React.useMemo(() => {
    if (syncData?.selectedCharacters && syncData.selectedCharacters.length > 0) {
      return syncData.selectedCharacters;
    }
    if (syncData?.selectedCharacter && syncData.selectedCharacter !== 'ALL') {
      return [syncData.selectedCharacter];
    }
    return ['ALL'];
  }, [syncData]);

  const groupedSourceSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const g of characterGroups) for (const m of g.memberSources) set.add(m);
    return set;
  }, [characterGroups]);

  const ungroupedCharacters = React.useMemo(
    () => availableCharacters.filter((c) => !groupedSourceSet.has(c)),
    [availableCharacters, groupedSourceSet]
  );

  // Check preview characters when input text changes (async: may need to
  // resolve names against the full item database for CSV input)
  const [previewData, setPreviewData] = useState<InventorySyncData | null>(null);
  useEffect(() => {
    if (!jsonInput.trim() || jsonInput.length < 5) {
      setPreviewData(null);
      return;
    }
    let cancelled = false;
    parseInventoryInputAsync(jsonInput)
      .then((res) => {
        if (!cancelled) setPreviewData(res.success && res.data ? res.data : null);
      })
      .catch(() => {
        if (!cancelled) setPreviewData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [jsonInput]);

  // Toast auto-hide
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Toggle active character (or entire character group) in multi-select
  const handleToggleActiveCharacter = (charName: string) => {
    if (!syncData) return;

    let nextSelected: string[];
    if (charName === 'ALL') {
      nextSelected = ['ALL'];
    } else {
      const withoutAll = activeSelectedCharacters.filter((c) => c !== 'ALL');
      if (withoutAll.includes(charName)) {
        nextSelected = withoutAll.filter((c) => c !== charName);
        if (nextSelected.length === 0) {
          nextSelected = ['ALL'];
        }
      } else {
        nextSelected = [...withoutAll, charName];
      }
    }

    const updated: InventorySyncData = {
      ...syncData,
      selectedCharacters: nextSelected,
      selectedCharacter: nextSelected.includes('ALL') || nextSelected.length === 0 ? 'ALL' : nextSelected[0],
    };
    onSaveSyncData(updated);

    if (nextSelected.includes('ALL')) {
      showToast('🌐 全キャラクターの所持品を合算計算します');
    } else {
      showToast(`👥 計算対象: ${nextSelected.join(', ')} (${nextSelected.length}名)`);
    }
  };

  // Toggle an entire character group (its member sources move together)
  const handleToggleGroup = (group: CharacterGroup) => {
    if (!syncData) return;
    const withoutAll = activeSelectedCharacters.filter((c) => c !== 'ALL');
    const allMembersSelected = group.memberSources.every((m) => withoutAll.includes(m));

    let nextSelected: string[];
    if (allMembersSelected) {
      nextSelected = withoutAll.filter((c) => !group.memberSources.includes(c));
      if (nextSelected.length === 0) nextSelected = ['ALL'];
    } else {
      nextSelected = Array.from(new Set([...withoutAll, ...group.memberSources]));
    }

    const updated: InventorySyncData = {
      ...syncData,
      selectedCharacters: nextSelected,
      selectedCharacter: nextSelected.includes('ALL') || nextSelected.length === 0 ? 'ALL' : nextSelected[0],
    };
    onSaveSyncData(updated);

    if (nextSelected.includes('ALL')) {
      showToast('🌐 全キャラクターの所持品を合算計算します');
    } else {
      showToast(`👥 「${group.displayName}」を${allMembersSelected ? '除外' : '含めて'}計算します`);
    }
  };

  // Import Action
  const [isImporting, setIsImporting] = useState(false);
  const handleImportJson = async () => {
    setParseError(null);
    setParseSuccessInfo(null);

    if (!jsonInput.trim()) {
      setParseError('JSONまたはテキストデータを入力してください。');
      return;
    }

    setIsImporting(true);
    const result = await parseInventoryInputAsync(jsonInput);
    setIsImporting(false);

    if (result.success && result.data) {
      if (selectedCharsOnImport.length > 0 && !selectedCharsOnImport.includes('ALL')) {
        result.data.selectedCharacters = selectedCharsOnImport;
        result.data.selectedCharacter = selectedCharsOnImport[0];
      } else {
        result.data.selectedCharacters = ['ALL'];
        result.data.selectedCharacter = 'ALL';
      }
      onSaveSyncData(result.data);
      setEditingInventories(result.data.inventories);
      const charCount = result.data.characters?.length || 1;
      const unresolvedNote = result.unresolvedNames?.length
        ? `（${result.unresolvedNames.length}件は名前を認識できず除外）`
        : '';
      showToast(
        charCount > 1
          ? `🎉 ${result.data.inventories.length} 件のアイテム（${charCount}キャラクター）を一括反映しました！${unresolvedNote}`
          : `🎉 ${result.data.inventories.length} 件のアイテム所持数を一括反映しました！${unresolvedNote}`
      );
      setJsonInput('');
      onClose();
    } else {
      setParseError(result.error || 'データの解析に失敗しました。');
    }
  };

  // Clipboard Paste Action
  const handlePasteFromClipboard = async () => {
    setParseError(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setJsonInput(text);
          setIsImporting(true);
          const result = await parseInventoryInputAsync(text);
          setIsImporting(false);
          if (result.success && result.data) {
            setParseSuccessInfo(`✅ ${result.data.inventories.length} 件のアイテムが検出されました。「一括反映する」を押して完了してください。`);
          } else {
            setParseError(result.error || null);
          }
        } else {
          setParseError('クリップボードが空です。');
        }
      } else {
        setParseError('ブラウザのセキュリティ設定によりクリップボードの直接読み取りができません。テキストエリアに直接貼り付け（Ctrl+V）してください。');
      }
    } catch {
      setParseError('クリップボードの読み取り権限がありませんでした。テキストエリアにCtrl+Vで貼り付けてください。');
    }
  };

  // File Upload Handling
  const handleFileUpload = (file: File) => {
    setParseError(null);
    setParseSuccessInfo(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (content) {
        setJsonInput(content);
        setIsImporting(true);
        const result = await parseInventoryInputAsync(content);
        setIsImporting(false);
        if (result.success && result.data) {
          const unresolvedNote = result.unresolvedNames?.length
            ? `（${result.unresolvedNames.length}件は名前を認識できず除外）`
            : '';
          setParseSuccessInfo(`📁 ファイル「${file.name}」から ${result.data.inventories.length} 件のアイテムを検出しました！${unresolvedNote}`);
        } else {
          setParseError(result.error || 'ファイルの解析に失敗しました。');
        }
      }
    };
    reader.onerror = () => {
      setParseError('ファイルの読み込み中にエラーが発生しました。');
    };
    reader.readAsText(file);
  };

  // Presets Handlers
  const handleApplyPreset = (preset: InventorySyncData, label: string) => {
    onSaveSyncData(preset);
    setEditingInventories(preset.inventories);
    setParseError(null);
    showToast(`⚡ プリセット「${label}」を反映しました！`);
    onClose();
  };

  const handleClear = () => {
    onSaveSyncData(null);
    setEditingInventories([]);
    setJsonInput('');
    setParseError(null);
    showToast('所持品データをクリアしました（所持数0にリセット）。');
  };

  // Manager: Update specific item quantity
  const handleUpdateItemQty = (index: number, newQty: number) => {
    const updated = [...editingInventories];
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index] = { ...updated[index], quantity: newQty };
    }
    setEditingInventories(updated);
  };

  // Manager: Remove item
  const handleRemoveItem = (index: number) => {
    const updated = [...editingInventories];
    updated.splice(index, 1);
    setEditingInventories(updated);
  };

  // Manager: Add manual item
  const [isResolvingItem, setIsResolvingItem] = useState(false);
  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsResolvingItem(true);
    const meta = await resolveItemInfoFull(newItemName.trim());
    setIsResolvingItem(false);

    let itemId: number;
    let name: string;
    if (meta) {
      itemId = meta.itemId;
      name = meta.name;
    } else {
      // Genuinely not found in the official database (typo, or a name that
      // doesn't exist). We still let the person add it -- e.g. for tracking
      // a custom/renamed thing -- but a random itemId would silently break
      // recipe-material matching elsewhere in the app, so we're upfront
      // about it instead.
      itemId = Math.floor(Math.random() * 90000) + 10000;
      name = newItemName.trim();
      showToast(`⚠️「${name}」は公式データベースで見つかりませんでした。この項目は原価計算等の自動照合には使われません。`);
    }

    let locType: InventoryLocationType = 'Player';
    const locLower = newItemLoc.toLowerCase();
    if (locLower.includes('retainer') || locLower.includes('リテイナー')) locType = 'Retainer';
    else if (locLower.includes('fc') || locLower.includes('chest') || locLower.includes('チェスト')) locType = 'FC_Chest';
    else if (locLower.includes('saddlebag') || locLower.includes('かばん')) locType = 'Saddlebag';

    const newItem: InventoryItemLocation = {
      itemId,
      name,
      quantity: Math.max(1, newItemQty),
      location: newItemLoc,
      locationType: locType,
      source: newItemSource.trim() || (syncData?.selectedCharacter && syncData.selectedCharacter !== 'ALL' ? syncData.selectedCharacter : undefined),
      isHq: newItemHq,
    };

    const updated = [newItem, ...editingInventories];
    setEditingInventories(updated);
    setNewItemName('');
    setNewItemQty(1);
    if (meta) {
      showToast(`「${name}」を所持リストに追加しました`);
    }
  };

  // Save Manager Changes
  const handleSaveManagerChanges = () => {
    const newSyncData: InventorySyncData = {
      timestamp: Date.now(),
      character: syncData?.character || 'Custom Managed Inventory',
      selectedCharacter: syncData?.selectedCharacter || 'ALL',
      characters: availableCharacters,
      inventories: editingInventories,
    };
    onSaveSyncData(newSyncData);
    showToast(`💾 所持品リスト (${editingInventories.length}品) を保存・一括反映しました！`);
    onClose();
  };

  // Filtered inventories in Manager tab
  const filteredInventories = editingInventories.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.itemId).includes(searchQuery) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.source && item.source.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLoc =
      locationFilter === 'ALL' ||
      (locationFilter === 'Player' && item.locationType === 'Player') ||
      (locationFilter === 'Retainer' && item.locationType === 'Retainer') ||
      (locationFilter === 'FC_Chest' && item.locationType === 'FC_Chest') ||
      (locationFilter === 'Saddlebag' && item.locationType === 'Saddlebag');

    const matchesChar =
      characterFilter === 'ALL' ||
      (item.source && item.source === characterFilter);

    return matchesSearch && matchesLoc && matchesChar;
  });

  // Calculate matched items count for active recipe
  let activeRecipeMatched = 0;
  let activeRecipeTotalMats = 0;
  if (activeRecipe) {
    activeRecipeTotalMats = activeRecipe.materials.length;
    activeRecipeMatched = activeRecipe.materials.filter(
      (m) => getItemStockTotal(m.itemId, syncData) > 0
    ).length;
  }


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                FF14 ゲーム内所持品・チェスト一括反映
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  Dalamud / Allagan Tools
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                手持ち・全リテイナー・FCチェスト・チョコボかばんの素材所持数を一括反映し、必要製作数を自動控除します
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

        {/* Current Sync Status Badge Bar with Character Selector */}
        <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">現在の反映状態:</span>
              {syncData && syncData.inventories.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  同期中: {syncData.inventories.length} 件のアイテム
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                  未同期 (所持数 0 として全素材を新規計算)
                </span>
              )}
            </div>

            {/* Character Selector multi-select buttons if characters are available */}
            {availableCharacters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-amber-500/40 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 shrink-0">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>所持キャラクター選択 (複数選択可):</span>
                </span>
                
                {/* ALL Button */}
                <button
                  type="button"
                  onClick={() => handleToggleActiveCharacter('ALL')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                    activeSelectedCharacters.includes('ALL')
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                  title="全キャラクターの所持数を合算して計算"
                >
                  <span>🌐 全キャラ合算</span>
                  <span className="font-rajdhani font-bold opacity-80">({syncData?.inventories.length || 0})</span>
                </button>

                {/* Character Group Buttons (linked retainers/alts) */}
                {characterGroups.map((group) => {
                  const count = syncData?.inventories.filter((i) => i.source && group.memberSources.includes(i.source)).length || 0;
                  const isDirectlySelected =
                    !activeSelectedCharacters.includes('ALL') &&
                    group.memberSources.every((m) => activeSelectedCharacters.includes(m));

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleToggleGroup(group)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                        isDirectlySelected
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow'
                          : activeSelectedCharacters.includes('ALL')
                          ? 'bg-slate-950/80 text-amber-200/90 border-amber-500/30 hover:border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                      title={`「${group.displayName}」(${group.memberSources.join(', ')}) を計算対象に含める / 除外する`}
                    >
                      <span>🧑‍🤝‍🧑 {group.displayName}</span>
                      <span className="font-rajdhani font-bold opacity-80">({count}品)</span>
                      {isDirectlySelected && <Check className="w-3 h-3 text-slate-950 ml-0.5" />}
                    </button>
                  );
                })}

                {/* Individual (ungrouped) Character Buttons */}
                {ungroupedCharacters.map((char) => {
                  const count = syncData?.inventories.filter((i) => i.source === char).length || 0;
                  const isDirectlySelected = activeSelectedCharacters.includes(char) && !activeSelectedCharacters.includes('ALL');

                  return (
                    <button
                      key={char}
                      type="button"
                      onClick={() => handleToggleActiveCharacter(char)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                        isDirectlySelected
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow'
                          : activeSelectedCharacters.includes('ALL')
                          ? 'bg-slate-950/80 text-amber-200/90 border-amber-500/30 hover:border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                      title={`クリックで「${char}」を計算対象に含める / 除外する`}
                    >
                      <span>👤 {char}</span>
                      <span className="font-rajdhani font-bold opacity-80">({count}品)</span>
                      {isDirectlySelected && <Check className="w-3 h-3 text-slate-950 ml-0.5" />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={startNewGroup}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-medium border border-dashed border-slate-600 text-slate-400 hover:text-amber-300 hover:border-amber-500/50 transition-all flex items-center gap-1"
                  title="キャラクターとリテイナーを紐づけるグループを作成"
                >
                  <Plus className="w-3 h-3" />
                  <span>グループ作成</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {characterGroups.length > 0 && (
              <button
                onClick={() => setIsGroupPanelOpen((v) => !v)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
              >
                <Boxes className="w-3 h-3" />
                <span>グループ管理 ({characterGroups.length})</span>
              </button>
            )}
            {syncData && (
              <button
                onClick={handleClear}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span>クリア (0個にリセット)</span>
              </button>
            )}
          </div>
        </div>

        {/* Character Group Management Panel */}
        {isGroupPanelOpen && (
          <div className="bg-slate-950/95 border-b border-amber-500/30 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                キャラクターグループ管理（このPCに保存されます）
              </span>
              <button
                onClick={() => {
                  setIsGroupPanelOpen(false);
                  setEditingGroupId(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing groups list */}
            {characterGroups.length > 0 && !editingGroupId && (
              <div className="space-y-1.5">
                {characterGroups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{g.displayName}</span>
                      <span className="text-slate-500 ml-2">{g.memberSources.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEditGroup(g)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded text-[11px]"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={startNewGroup}
                  className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  新しいグループを作成
                </button>
              </div>
            )}

            {/* Create / Edit group form */}
            {editingGroupId && (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={groupNameDraft}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  placeholder="グループ名 (例: Moja Kun とそのリテイナー)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <div className="text-[11px] text-slate-400">紐づけるキャラクター/リテイナー名を選択:</div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {availableCharacters.map((c) => {
                    const isChecked = groupMembersDraft.has(c);
                    const belongsToOtherGroup = characterGroups.some(
                      (g) => g.id !== editingGroupId && g.memberSources.includes(c)
                    );
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={belongsToOtherGroup}
                        onClick={() => toggleGroupMemberDraft(c)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                          isChecked
                            ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                            : belongsToOtherGroup
                            ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                        title={belongsToOtherGroup ? '既に別のグループに所属しています' : undefined}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveGroup}
                    disabled={!groupNameDraft.trim() || groupMembersDraft.size === 0}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>保存</span>
                  </button>
                  <button
                    onClick={() => setEditingGroupId(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4 pt-2 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'paste'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>① 一括貼り付け / ファイル読込</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>② ワンタップ・プリセット</span>
          </button>

          <button
            onClick={() => setActiveTab('manager')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'manager'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>③ 所持品マネージャー ({editingInventories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('filelink')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'filelink'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>④ ファイル連携 (ワンクリック再読込)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: PASTE / FILE IMPORT */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              {/* Instructions Guide */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="font-bold text-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    Allagan Tools 等からのエクスポート・貼り付け手順
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">JSON / CSV / TSV / テキスト対応</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] pl-1">
                  <li>ゲーム内で Dalamud プラグイン「<b>Allagan Tools</b>」を開く</li>
                  <li>
                    インベントリ一覧から「<b>Export to JSON</b>」または「<b>クリップボードにコピー</b>」を実行
                  </li>
                  <li>
                    下の枠に貼り付け（または「クリップボードから読み込み」）して「<b>プラグイン所持数を一括反映する</b>」を押す
                  </li>
                </ol>
                <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5 flex flex-wrap gap-2">
                  <span>💡 対応形式: Allagan Tools JSON / Teamcraft Export / CSV (アイテム名, 個数, 保管場所) / 簡易テキスト</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-200">
                  インベントリデータ入力枠:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>クリップボードから読込</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,.csv,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>ファイル選択 (.json / .csv)</span>
                  </button>
                </div>
              </div>

              {/* Text Area / Drag & Drop Target */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className={`relative rounded-xl transition-all ${
                  isDragOver ? 'ring-2 ring-amber-400 bg-amber-500/10' : ''
                }`}
              >
                <textarea
                  rows={8}
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setParseError(null);
                    setParseSuccessInfo(null);
                  }}
                  placeholder={`【例1: Allagan Tools JSON】\n{\n  "character": "Hikari@Bahamut",\n  "inventories": [\n    { "location": "Player", "itemId": 49214, "name": "タングステンインゴット", "quantity": 2 },\n    { "location": "Retainer: Nana", "itemId": 46246, "name": "幻晃の霊砂", "quantity": 6 }\n  ]\n}\n\n【例2: 簡易テキスト/CSV】\nタングステンインゴット, 5, Retainer: Nana\nコチニールクロス, 3, Player\n幻晃の霊砂 x10`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/80 resize-none leading-relaxed"
                />
              </div>

              {/* Multi-character detection preview box */}
              {previewData && previewData.characters && previewData.characters.length > 0 && (
                <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5" />
                      検出されたキャラクター ({previewData.characters.length}名 / 計 {previewData.inventories.length}品):
                    </span>
                    <span className="text-[10px] text-slate-400">反映対象のキャラを複数選択可能</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCharsOnImport(['ALL'])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        selectedCharsOnImport.includes('ALL')
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      🌐 全キャラ合算 ({previewData.inventories.length}品)
                    </button>
                    {previewData.characters.map((char) => {
                      const count = previewData.inventories.filter((i) => i.source === char).length;
                      const isSelected = selectedCharsOnImport.includes(char) && !selectedCharsOnImport.includes('ALL');

                      return (
                        <button
                          key={char}
                          type="button"
                          onClick={() => {
                            if (selectedCharsOnImport.includes('ALL')) {
                              setSelectedCharsOnImport([char]);
                            } else if (selectedCharsOnImport.includes(char)) {
                              const next = selectedCharsOnImport.filter((c) => c !== char);
                              setSelectedCharsOnImport(next.length === 0 ? ['ALL'] : next);
                            } else {
                              setSelectedCharsOnImport([...selectedCharsOnImport, char]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          <span>👤 {char}</span>
                          <span className="font-rajdhani opacity-80 font-bold">({count}品)</span>
                          {isSelected && <Check className="w-3 h-3 text-slate-950 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Feedback messages */}
              {parseError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {parseSuccessInfo && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{parseSuccessInfo}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  ※ 反映後、ワークフロー・原価計算・バッチ計画へ即時反映されます
                </span>
                <button
                  type="button"
                  onClick={handleImportJson}
                  disabled={isImporting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 disabled:cursor-wait text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Upload className={`w-4 h-4 ${isImporting ? 'animate-pulse' : ''}`} />
                  <span>{isImporting ? '解析中...' : 'プラグイン所持数を一括反映する'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-slate-100 mb-1 flex items-center gap-1.5 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  ワンタップ・プリセットデータ反映
                </p>
                <p className="text-[11px] text-slate-400">
                  プラグイン未導入時や動作テスト用に、各パッチの代表的な所持品ストックをワンクリックで読み込めます。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Preset 1: Patch 7.2 */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition-all group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Patch 7.2 戦闘新式・宝薬G3セット
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                        推奨
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      タングステンインゴット、コチニールクロス、幻晃の霊砂、フルグライト、大聖水、多色錬金薬、各種クラスターを各保管庫にストック。
                    </p>
                    <div className="text-[10px] text-slate-500">
                      登録品目: 27種 / 手持ち・リテイナー2名・FC・かばん
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyPreset(PRESET_PATCH_72, 'Patch 7.2 戦闘新式・宝薬G3セット')}
                    className="mt-4 w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all group-hover:bg-amber-500 group-hover:text-slate-950"
                  >
                    <span>このプリセットを一括反映</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Preset 2: Patch 7.05 */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-sky-400" />
                        Patch 7.05 新式・飯薬セット
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        7.05
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      マルエージングインゴット、スターリングシルバー、黄金の霊砂、ロイヤルロブスター、高山食塩などのストック。
                    </p>
                    <div className="text-[10px] text-slate-500">
                      登録品目: 13種 / 手持ち・リテイナー・かばん
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyPreset(PRESET_PATCH_705, 'Patch 7.05 新式・飯薬セット')}
                    className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>このプリセットを一括反映</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Preset 3: Full Crafter Stock */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        クラフターガチ勢 潤沢ストック
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                        大量在庫
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      全中間素材10個以上、クリスタル各999個、霊砂各30個以上。ほぼ全ての素材が揃った状態を再現。
                    </p>
                    <div className="text-[10px] text-slate-500">
                      登録品目: 35種 / 全ストレージ満載
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyPreset(PRESET_FULL_STOCK, 'クラフターガチ勢 潤沢ストック')}
                    className="mt-4 w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>このプリセットを一括反映</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Preset 4: Reset to Zero */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        全所持数をクリア (0個)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      すべての所持品・チェストデータを初期化し、全素材を新規調達・製作する前提で計算します。
                    </p>
                  </div>
                  <button
                    onClick={handleClear}
                    className="mt-4 w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>所持数をクリアする</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY MANAGER & MANUAL EDITING */}
          {activeTab === 'manager' && (
            <div className="space-y-4">
              {/* Add Item Form */}
              <form
                onSubmit={handleAddManualItem}
                className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center gap-2 text-xs"
              >
                <div className="flex-1 min-w-[180px]">
                  <input
                    type="text"
                    placeholder="アイテム名 (例: タングステンインゴット)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min={1}
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 text-center focus:outline-none focus:border-amber-500"
                    placeholder="個数"
                  />
                </div>
                <div className="w-40">
                  <input
                    type="text"
                    list="locations-datalist"
                    value={newItemLoc}
                    onChange={(e) => setNewItemLoc(e.target.value)}
                    placeholder="保管場所 (例: Player, Retainer: ○○)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="locations-datalist">
                    {(availableLocations.length > 0
                      ? availableLocations
                      : ['Player (手持ち)', 'FC_Chest: Tab1', 'Saddlebag (かばん)']
                    ).map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                {availableCharacters.length > 0 && (
                  <div className="w-32">
                    <input
                      type="text"
                      list="characters-datalist"
                      placeholder="キャラ名"
                      value={newItemSource}
                      onChange={(e) => setNewItemSource(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="characters-datalist">
                      {availableCharacters.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                )}
                <label className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={newItemHq}
                    onChange={(e) => setNewItemHq(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0"
                  />
                  HQ
                </label>
                <button
                  type="submit"
                  disabled={isResolvingItem}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-wait text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isResolvingItem ? '検索中...' : '追加'}</span>
                </button>
              </form>

              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="所持品を検索..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
                  />
                </div>

                {/* Character Filter */}
                {availableCharacters.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">キャラ:</span>
                    <select
                      value={characterFilter}
                      onChange={(e) => setCharacterFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                    >
                      <option value="ALL">全キャラ ({editingInventories.length})</option>
                      {availableCharacters.map((c) => (
                        <option key={c} value={c}>
                          {c} ({editingInventories.filter((i) => i.source === c).length})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1 text-xs">
                  {['ALL', 'Player', 'Retainer', 'FC_Chest', 'Saddlebag'].map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocationFilter(loc)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        locationFilter === loc
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {loc === 'ALL'
                        ? 'すべて'
                        : loc === 'Player'
                        ? '手持ち'
                        : loc === 'Retainer'
                        ? 'リテイナー'
                        : loc === 'FC_Chest'
                        ? 'FC'
                        : 'かばん'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-slate-950/50">
                {filteredInventories.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    該当する所持品データがありません
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2.5 pl-3">アイテム名</th>
                        {availableCharacters.length > 0 && <th className="p-2.5">キャラ</th>}
                        <th className="p-2.5">保管場所</th>
                        <th className="p-2.5 text-center">所持数</th>
                        <th className="p-2.5 text-center">品質</th>
                        <th className="p-2.5 pr-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredInventories.map((item, idx) => (
                        <tr key={`${item.itemId}-${item.location}-${item.source || ''}-${idx}`} className="hover:bg-slate-900/40">
                          <td className="p-2.5 pl-3">
                            <div className="flex items-center gap-2">
                              <ItemIcon itemId={item.itemId} name={item.name} size="sm" />
                              <span className="font-medium text-slate-200">{item.name}</span>
                            </div>
                          </td>
                          {availableCharacters.length > 0 && (
                            <td className="p-2.5">
                              {item.source ? (
                                <span className="text-[10px] bg-amber-500/10 text-amber-300 font-medium px-2 py-0.5 rounded border border-amber-500/20">
                                  {item.source}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">-</span>
                              )}
                            </td>
                          )}
                          <td className="p-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded inline-block w-fit">
                                {item.location}
                              </span>
                              {item.locationType === 'Retainer' && item.source && (
                                <span className="text-[10px] text-amber-300/80 font-medium">
                                  👤 {item.source} のリテイナー
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                                className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                                className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-amber-300 font-bold"
                              />
                              <button
                                onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                                className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            {item.isHq ? (
                              <span className="text-amber-400 font-bold text-[11px]">HQ</span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">NQ</span>
                            )}
                          </td>
                          <td className="p-2.5 pr-3 text-right">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Save changes button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveManagerChanges}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>変更を保存して一括反映</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LINKED LOCAL FILE (real File System Access API feature) */}
          {activeTab === 'filelink' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="font-semibold text-slate-100 mb-1 flex items-center gap-1.5 text-amber-300">
                  <Link2 className="w-3.5 h-3.5" />
                  ローカルファイル連携（ワンクリック再読込）
                </div>
                <p className="text-[11px] text-slate-400">
                  このサイトにはサーバーが無いため、ゲームから自動でデータを受け取ることはできません
                  （Dalamud側にも、ウェブサイトへ自動送信する仕組みは現状ありません）。
                  代わりに、お使いのブラウザの「ファイルシステムアクセス」機能を使い、一度選んだファイルを
                  次回以降ワンクリックで再読み込みできるようにします。ファイルの中身自体は、これまで通り
                  Allagan Tools でエクスポート → 保存、を都度行う必要があります。
                </p>
                {!fsaSupported && (
                  <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      お使いのブラウザはこの機能に対応していません（Chrome / Edge 等の Chromium系ブラウザが必要です。
                      Firefox / Safari では非対応）。①のタブから貼り付け/ファイル読込をご利用ください。
                    </span>
                  </p>
                )}
              </div>

              {fsaSupported && (
                <div className="space-y-3">
                  {linkedFileName ? (
                    <div className="bg-slate-950/60 border border-emerald-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-300">
                          リンク中: <span className="font-bold text-emerald-300">{linkedFileName}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleReloadLinkedFile}
                          disabled={fileLinkBusy}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${fileLinkBusy ? 'animate-spin' : ''}`} />
                          <span>今すぐ再読込</span>
                        </button>
                        <button
                          onClick={handleUnlinkFile}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-all"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                          <span>解除</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleLinkFile}
                      disabled={fileLinkBusy}
                      className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Link2 className="w-4 h-4 text-amber-400" />
                      <span>ファイルを選択してリンクする</span>
                    </button>
                  )}

                  {fileLinkError && (
                    <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
                      {fileLinkError}
                    </p>
                  )}

                  {linkedFileName && (
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-2">
                      <p className="font-semibold text-slate-300">おすすめの使い方:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>ゲーム内で Allagan Tools から JSON をコピー</li>
                        <li>①タブのテキスト欄に貼り付け</li>
                        <li>
                          下のボタンでリンク中のファイルに保存しておけば、次回このサイトを開いたときに
                          「今すぐ再読込」だけで最新データを反映できます
                        </li>
                      </ol>
                      <button
                        onClick={handleSaveTextToLinkedFile}
                        disabled={fileLinkBusy || !jsonInput.trim()}
                        className="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>①のテキスト内容をリンクファイルに保存</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer (Always shows matched status for active recipe) */}
        {activeRecipe && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">現在選択中のレシピ:</span>
              <span className="font-bold text-slate-200">{activeRecipe.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                素材 {activeRecipeMatched} / {activeRecipeTotalMats} 種が所持品と合致
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-all"
            >
              閉じる
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
