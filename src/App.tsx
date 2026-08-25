import * as React from 'react';
import { useState, useEffect, useRef, ReactNode, ErrorInfo } from 'react';
import { Recipe, CrafterStats, BatchCraftItem, InventorySyncData } from './types/ff14';
import { RECIPES_DATABASE } from './data/recipes';
import { Header, MainTabType } from './components/Header';
import { RecipeCatalog } from './components/RecipeCatalog';
import { LegacyRecipeBrowser } from './components/LegacyRecipeBrowser';
import { CostProfitCalculator } from './components/CostProfitCalculator';
import { MaterialTreeGathering } from './components/MaterialTreeGathering';
import { CraftingSimulatorView } from './components/CraftingSimulatorView';
import { CraftingBatchPlanner } from './components/CraftingBatchPlanner';
import { MacroPresetsModal, MacroPreset } from './components/MacroPresetsModal';
import { RestanetCraftingWorkflow } from './components/craft/RestanetCraftingWorkflow';
import { InventorySyncModal } from './components/inventory/InventorySyncModal';
import { ItemIcon } from './components/common/ItemIcon';
import { loadStoredInventory, saveStoredInventory, SAMPLE_INVENTORY_DATA } from './utils/inventoryStorage';
import { getSafeUrlParams, updateUrlQueryParam, pushUrlState, safeJsonParse } from './utils/jsonSafe';
import { Sparkles, AlertCircle, RefreshCw, Compass } from 'lucide-react';

// Error Boundary to prevent crashes
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SafeErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Eorzean Crafter ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.search = '';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">クエリまたはデータの読み込みを復旧しました</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              URLパラメータまたはレスポンス解析で構文エラーを検知しましたが、安全にリカバリーしました。
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-semibold rounded-xl text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>最新パッチトップ画面に戻る</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTabType>('workflow');
  const [selectedWorldOrDc, setSelectedWorldOrDc] = useState<string>('Mana');
  const [currentPurpose, setCurrentPurpose] = useState<string>('latestPatch');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(RECIPES_DATABASE[0]);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);

  // Inventory Sync Data
  const [inventoryData, setInventoryData] = useState<InventorySyncData | null>(() => {
    const loaded = loadStoredInventory();
    return loaded || SAMPLE_INVENTORY_DATA;
  });

  const handleSaveInventory = (data: InventorySyncData | null) => {
    setInventoryData(data);
    saveStoredInventory(data);
  };

  // Default Stats for Dawntrail Level 100 Crafter (HQ raid food active)
  const [crafterStats, setCrafterStats] = useState<CrafterStats>({
    craftsmanship: 4950,
    control: 4550,
    cp: 685,
    level: 100,
    specialist: false,
    foodBuff: {
      name: 'ローストチキンHQ',
      craftsmanshipBonus: 94,
      controlBonus: 0,
      cpBonus: 86,
    },
  });

  // Batch Plan List with local persistence
  const [batchItems, setBatchItems] = useState<BatchCraftItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eorzean_crafter_batch');
      if (saved) {
        const parsed = safeJsonParse<BatchCraftItem[]>(saved, []);
        // The stored value embeds a full snapshot of each recipe object,
        // which can go stale after a data fix ships (item names, materials,
        // icons, etc. would otherwise stay frozen at whatever they looked
        // like when the item was added to the batch). Re-hydrate every
        // entry against the current RECIPES_DATABASE by id so batch items
        // always reflect the latest recipe data; drop any whose recipe no
        // longer exists.
        const rehydrated = parsed
          .map((item) => {
            if (item.recipe?.id?.startsWith('legacy_')) {
              // Legacy (historical) recipes aren't part of the actively-curated
              // RECIPES_DATABASE, so there's nothing to refresh them against —
              // keep the stored snapshot as-is.
              return item;
            }
            const current = RECIPES_DATABASE.find((r) => r.id === item.recipe?.id);
            return current ? { ...item, recipe: current } : null;
          })
          .filter((item): item is BatchCraftItem => item !== null);
        return rehydrated;
      }
    }
    return [
      { id: 'b1', recipe: RECIPES_DATABASE[0], quantity: 30, targetHQ: true },
      { id: 'b2', recipe: RECIPES_DATABASE[2], quantity: 30, targetHQ: true },
    ];
  });

  // Save batch items to local storage
  useEffect(() => {
    try {
      localStorage.setItem('eorzean_crafter_batch', JSON.stringify(batchItems));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [batchItems]);

  // Guards against the popstate handler's own state updates re-triggering
  // a pushState (which would create a duplicate/looping history entry).
  const isHandlingPopState = React.useRef(false);

  // Handle URL Search Params on initial mount (?purpose=latestPatch, etc.)
  useEffect(() => {
    const params = getSafeUrlParams();
    if (params.purpose) {
      setCurrentPurpose(params.purpose);
    }
    if (params.itemId) {
      const found = RECIPES_DATABASE.find((r) => r.itemId === parseInt(params.itemId!));
      if (found) {
        setSelectedRecipe(found);
      }
    }
    if (params.tab) {
      setActiveTab(params.tab as MainTabType);
    }
    // Establish a baseline history entry carrying the initial tab so the
    // very first Back press has something of ours to land on.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (!url.searchParams.get('tab')) {
        url.searchParams.set('tab', params.tab || 'workflow');
        window.history.replaceState({ tab: params.tab || 'workflow' }, '', url.toString());
      }
    }
  }, []);

  // Respond to the browser's Back/Forward buttons by restoring the tab and
  // recipe that were active at that point in history, instead of letting the
  // browser fall through to whatever page was open before this site.
  useEffect(() => {
    const handlePopState = () => {
      isHandlingPopState.current = true;
      const params = getSafeUrlParams();
      if (params.tab) {
        setActiveTab(params.tab as MainTabType);
      }
      if (params.itemId) {
        const found = RECIPES_DATABASE.find((r) => r.itemId === parseInt(params.itemId!));
        if (found) setSelectedRecipe(found);
      }
      // Release the guard after this render cycle so subsequent user-driven
      // navigation still pushes new history entries normally.
      setTimeout(() => {
        isHandlingPopState.current = false;
      }, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /** Switches the active tab and pushes a real history entry for it, so the
   * browser Back button returns to the previous in-app tab rather than
   * leaving the site. Skipped while we're already responding to a
   * popstate event to avoid pushing a duplicate entry. */
  const navigateToTab = (tab: MainTabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (!isHandlingPopState.current) {
      pushUrlState({ tab });
    }
  };

  /** Selects a recipe and switches tab in one step, pushing a single
   * combined history entry. */
  const navigateToRecipe = (recipe: Recipe, tab: MainTabType) => {
    setSelectedRecipe(recipe);
    setActiveTab(tab);
    if (!isHandlingPopState.current) {
      pushUrlState({ tab, itemId: String(recipe.itemId) });
    }
  };

  const handleChangePurpose = (purpose: string) => {
    setCurrentPurpose(purpose);
    updateUrlQueryParam('purpose', purpose);
  };

  const handleSelectRecipeForWorkflow = (recipe: Recipe) => {
    navigateToRecipe(recipe, 'workflow');
  };

  const handleSelectRecipeForCost = (recipe: Recipe) => {
    navigateToRecipe(recipe, 'costProfit');
  };

  const handleSelectRecipeForTree = (recipe: Recipe) => {
    navigateToRecipe(recipe, 'gatheringTree');
  };

  const handleSelectRecipeForSim = (recipe: Recipe) => {
    navigateToRecipe(recipe, 'simulator');
  };

  const handleAddToBatch = (recipe: Recipe) => {
    setBatchItems((prev) => {
      const existing = prev.find((item) => item.recipe.id === recipe.id);
      if (existing) {
        return prev.map((item) =>
          item.recipe.id === recipe.id ? { ...item, quantity: item.quantity + (recipe.yields || 1) * 3 } : item
        );
      }
      return [
        ...prev,
        {
          id: `batch_${Date.now()}_${recipe.id}`,
          recipe,
          quantity: (recipe.yields || 1) * 3,
          targetHQ: true,
        },
      ];
    });
  };

  const handleUpdateBatchQuantity = (id: string, quantity: number) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
    );
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBatchAll = () => {
    setBatchItems([]);
  };

  const handleApplyPreset = (preset: MacroPreset) => {
    // Navigate to simulator tab with preset loaded
    navigateToTab('simulator');
  };

  return (
    <SafeErrorBoundary>
      <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex flex-col">
        {/* Header */}
        <Header
          activeTab={activeTab}
          onSelectTab={navigateToTab}
          selectedWorldOrDc={selectedWorldOrDc}
          onSelectWorldOrDc={setSelectedWorldOrDc}
          batchCount={batchItems.length}
          inventoryData={inventoryData}
          onOpenInventorySync={() => setIsInventoryModalOpen(true)}
        />

        {/* Quick Recipe Switcher Bar when on Workflow */}
        {activeTab === 'workflow' && (
          <div className="border-b border-slate-800/80 bg-slate-950/60 px-4 py-2">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">現在選択中のレシピ:</span>
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ItemIcon itemId={selectedRecipe.itemId} icon={selectedRecipe.icon} name={selectedRecipe.name} size="xs" />
                  <span>{selectedRecipe.name}</span>
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                  Patch {selectedRecipe.patch} / {selectedRecipe.job}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">クイック切替:</span>
                <select
                  aria-label="レシピ切り替え"
                  value={selectedRecipe.id}
                  onChange={(e) => {
                    const found = RECIPES_DATABASE.find((r) => r.id === e.target.value);
                    if (found) setSelectedRecipe(found);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {RECIPES_DATABASE.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.patch}] {r.name} ({r.job} IL{r.ilvl})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          {activeTab === 'workflow' && (
            <RestanetCraftingWorkflow
              recipe={selectedRecipe}
              stats={crafterStats}
              inventoryData={inventoryData}
              selectedWorldOrDc={selectedWorldOrDc}
              onChangeStats={setCrafterStats}
              onOpenInventorySync={() => setIsInventoryModalOpen(true)}
              onNavigateToSim={handleSelectRecipeForSim}
            />
          )}

          {activeTab === 'recipeCatalog' && (
            <RecipeCatalog
              recipes={RECIPES_DATABASE}
              currentPurpose={currentPurpose}
              onChangePurpose={handleChangePurpose}
              onSelectRecipeForWorkflow={handleSelectRecipeForWorkflow}
              onSelectRecipeForCost={handleSelectRecipeForCost}
              onSelectRecipeForTree={handleSelectRecipeForTree}
              onSelectRecipeForSim={handleSelectRecipeForSim}
              onAddToBatch={handleAddToBatch}
              selectedWorldOrDc={selectedWorldOrDc}
            />
          )}

          {activeTab === 'legacyRecipes' && (
            <LegacyRecipeBrowser
              onAddToBatch={handleAddToBatch}
              onSelectRecipeForCost={handleSelectRecipeForCost}
              onSelectRecipeForSim={handleSelectRecipeForSim}
              selectedWorldOrDc={selectedWorldOrDc}
            />
          )}

          {activeTab === 'costProfit' && (
            <CostProfitCalculator
              recipe={selectedRecipe}
              selectedWorldOrDc={selectedWorldOrDc}
              onNavigateToSim={handleSelectRecipeForSim}
              onNavigateToTree={handleSelectRecipeForTree}
            />
          )}

          {activeTab === 'gatheringTree' && (
            <MaterialTreeGathering
              recipe={selectedRecipe}
              batchCount={1}
              onNavigateToSim={handleSelectRecipeForSim}
            />
          )}

          {activeTab === 'simulator' && (
            <CraftingSimulatorView
              recipe={selectedRecipe}
              stats={crafterStats}
              onChangeStats={setCrafterStats}
              onOpenPresets={() => setIsPresetsOpen(true)}
            />
          )}

          {activeTab === 'batchPlanner' && (
            <CraftingBatchPlanner
              batchItems={batchItems}
              crafterStats={crafterStats}
              inventoryData={inventoryData}
              selectedWorldOrDc={selectedWorldOrDc}
              onChangeStats={setCrafterStats}
              onUpdateQuantity={handleUpdateBatchQuantity}
              onRemoveItem={handleRemoveBatchItem}
              onClearAll={handleClearBatchAll}
              onSelectRecipeForSim={handleSelectRecipeForSim}
              onAddToBatch={handleAddToBatch}
              onOpenInventorySync={() => setIsInventoryModalOpen(true)}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-cinzel text-slate-300 font-bold">Eorzean Crafter</span>
              <span>- FF14 クラフター総合支援ツール (Patch 7.1)</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <a
                href="https://eorzeanfishing.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 transition-colors"
              >
                eorzeanfishing.com
              </a>
              <span>FINAL FANTASY XIV © SQUARE ENIX</span>
            </div>
          </div>
        </footer>

        {/* Inventory Sync Modal */}
        <InventorySyncModal
          isOpen={isInventoryModalOpen}
          onClose={() => setIsInventoryModalOpen(false)}
          syncData={inventoryData}
          onSaveSyncData={handleSaveInventory}
          activeRecipe={selectedRecipe}
        />

        {/* Macro Presets Modal */}
        <MacroPresetsModal
          isOpen={isPresetsOpen}
          onClose={() => setIsPresetsOpen(false)}
          onApplyPreset={handleApplyPreset}
        />
      </div>
    </SafeErrorBoundary>
  );
}

