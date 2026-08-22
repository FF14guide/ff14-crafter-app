import { InventorySyncData, InventoryItemLocation, InventoryLocationType } from '../types/ff14';
import { safeJsonParse } from './jsonSafe';

const STORAGE_KEY = 'eorzean_crafter_inventory_sync';

export const SAMPLE_INVENTORY_DATA: InventorySyncData = {
  timestamp: Date.now(),
  character: 'Hikari Light@Bahamut (Mana)',
  inventories: [
    // プレイヤー手持ち
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44320, name: 'エレクトロインゴット', quantity: 2, isHq: true },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44410, name: 'エレクトロピン原木', quantity: 12, isHq: false },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44105, name: '火のクリスタル', quantity: 240, isHq: false },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44117, name: 'アースクリスタル', quantity: 180, isHq: false },
    { location: 'Player (手持ち)', locationType: 'Player', itemId: 44104, name: '黄金の霊砂', quantity: 4, isHq: true },

    // リテイナー Nana (素材庫)
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44320, name: 'エレクトロインゴット', quantity: 2, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44321, name: 'ローズガーネット', quantity: 3, isHq: true },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44412, name: 'ローズガーネット原石', quantity: 18, isHq: false },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44301, name: 'ガルガンチュアレザー', quantity: 2, isHq: true },
    { location: 'Retainer: Nana', locationType: 'Retainer', itemId: 44302, name: 'サンダーヤードクロス', quantity: 1, isHq: true },

    // リテイナー Bob (中間素材)
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44303, name: 'オルコ・ブラスインゴット', quantity: 2, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44401, name: 'ガルガンチュアの粗皮', quantity: 14, isHq: false },
    { location: 'Retainer: Bob', locationType: 'Retainer', itemId: 44402, name: 'サンダーヤード繭', quantity: 8, isHq: false },

    // FCチェスト (Tab 1: 共有素材)
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 44411, name: '絶縁塗料', quantity: 6, isHq: false },
    { location: 'FC_Chest: Tab1', locationType: 'FC_Chest', itemId: 44112, name: 'トラルの研磨剤', quantity: 8, isHq: false },
    { location: 'FC_Chest: Tab2', locationType: 'FC_Chest', itemId: 44322, name: '紫電の霊砂', quantity: 2, isHq: false },

    // チョコボかばん
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 44118, name: '風のクリスタル', quantity: 450, isHq: false },
    { location: 'Saddlebag (かばん)', locationType: 'Saddlebag', itemId: 44106, name: '水のクリスタル', quantity: 380, isHq: false },
  ],
};

/**
 * Load stored inventory from localStorage safely
 */
export function loadStoredInventory(): InventorySyncData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return safeJsonParse<InventorySyncData | null>(raw, null);
  } catch {
    return null;
  }
}

/**
 * Save inventory to localStorage safely
 */
export function saveStoredInventory(data: InventorySyncData | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save inventory to localStorage:', e);
  }
}

/**
 * Parse raw input string from clipboard, file upload, or Allagan Tools / Teamcraft format
 */
export function parseInventoryJson(input: string): { success: boolean; data?: InventorySyncData; error?: string } {
  try {
    const parsed = JSON.parse(input.trim());

    // Format 1: Standard format { timestamp, character, inventories: [...] }
    if (parsed && Array.isArray(parsed.inventories)) {
      const items: InventoryItemLocation[] = [];
      for (const raw of parsed.inventories) {
        if (!raw || typeof raw.itemId !== 'number') continue;
        const loc = String(raw.location || 'Player');
        let locType: InventoryLocationType = 'Player';
        if (loc.toLowerCase().includes('retainer')) locType = 'Retainer';
        else if (loc.toLowerCase().includes('fc') || loc.toLowerCase().includes('chest')) locType = 'FC_Chest';
        else if (loc.toLowerCase().includes('saddlebag') || loc.toLowerCase().includes('chocobo')) locType = 'Saddlebag';

        items.push({
          location: loc,
          locationType: locType,
          itemId: raw.itemId,
          name: String(raw.name || `Item #${raw.itemId}`),
          quantity: Math.max(0, Number(raw.quantity) || 1),
          isHq: Boolean(raw.isHq || raw.hq),
        });
      }

      return {
        success: true,
        data: {
          timestamp: parsed.timestamp || Date.now(),
          character: parsed.character || 'Imported Character',
          inventories: items,
        },
      };
    }

    // Format 2: Direct Array of items [{ itemId, name, quantity, location }]
    if (Array.isArray(parsed)) {
      const items: InventoryItemLocation[] = [];
      for (const raw of parsed) {
        if (!raw || (!raw.itemId && !raw.id && !raw.ItemId)) continue;
        const id = Number(raw.itemId || raw.id || raw.ItemId);
        const loc = String(raw.location || raw.Location || raw.container || 'Player');
        let locType: InventoryLocationType = 'Player';
        if (loc.toLowerCase().includes('retainer')) locType = 'Retainer';
        else if (loc.toLowerCase().includes('fc') || loc.toLowerCase().includes('chest')) locType = 'FC_Chest';
        else if (loc.toLowerCase().includes('saddlebag') || loc.toLowerCase().includes('chocobo')) locType = 'Saddlebag';

        items.push({
          location: loc,
          locationType: locType,
          itemId: id,
          name: String(raw.name || raw.Name || `Item #${id}`),
          quantity: Math.max(0, Number(raw.quantity || raw.Quantity || raw.count || raw.amount) || 1),
          isHq: Boolean(raw.isHq || raw.hq || raw.HQ),
        });
      }

      return {
        success: true,
        data: {
          timestamp: Date.now(),
          character: 'Dalamud Import',
          inventories: items,
        },
      };
    }

    // Format 3: Allagan Tools or nested container map { "Player": [...], "Retainers": { ... } }
    if (typeof parsed === 'object') {
      const items: InventoryItemLocation[] = [];
      for (const [containerName, containerItems] of Object.entries(parsed)) {
        if (Array.isArray(containerItems)) {
          for (const raw of containerItems as any[]) {
            const id = Number(raw.itemId || raw.id || raw.ItemId);
            if (!id) continue;
            let locType: InventoryLocationType = 'Player';
            if (containerName.toLowerCase().includes('retainer')) locType = 'Retainer';
            else if (containerName.toLowerCase().includes('fc')) locType = 'FC_Chest';
            else if (containerName.toLowerCase().includes('saddlebag')) locType = 'Saddlebag';

            items.push({
              location: containerName,
              locationType: locType,
              itemId: id,
              name: String(raw.name || raw.Name || `Item #${id}`),
              quantity: Math.max(0, Number(raw.quantity || raw.count || raw.amount) || 1),
              isHq: Boolean(raw.isHq || raw.hq),
            });
          }
        }
      }

      if (items.length > 0) {
        return {
          success: true,
          data: {
            timestamp: Date.now(),
            character: 'Allagan Tools Export',
            inventories: items,
          },
        };
      }
    }

    return {
      success: false,
      error: '有効なインベントリJSON形式を認識できませんでした。Dalamud / Allagan Tools等のJSONをご確認ください。',
    };
  } catch (e: any) {
    return {
      success: false,
      error: `JSON解析エラー: ${e?.message || '構文が不正です'}`,
    };
  }
}

/**
 * Get total quantity owned across all inventory locations
 */
export function getItemStockTotal(itemId: number, syncData: InventorySyncData | null): number {
  if (!syncData || !syncData.inventories) return 0;
  return syncData.inventories
    .filter((inv) => inv.itemId === itemId)
    .reduce((sum, inv) => sum + inv.quantity, 0);
}

/**
 * Get item breakdown locations
 */
export function getItemStockBreakdown(itemId: number, syncData: InventorySyncData | null): InventoryItemLocation[] {
  if (!syncData || !syncData.inventories) return [];
  return syncData.inventories.filter((inv) => inv.itemId === itemId);
}

/**
 * Generate in-game chat withdrawal instruction string
 */
export function generateWithdrawalList(
  itemsNeeded: { name: string; needed: number; locations: InventoryItemLocation[] }[]
): string {
  const instructions: string[] = [];

  for (const item of itemsNeeded) {
    let remaining = item.needed;
    for (const loc of item.locations) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, loc.quantity);
      if (take > 0 && loc.locationType !== 'Player') {
        instructions.push(`・${loc.location} から 「${item.name}」 を ${take}個 引き出す`);
        remaining -= take;
      }
    }
  }

  if (instructions.length === 0) {
    return '手持ちまたはFCチェストからの引き出し対象はありません（手持ちのみで充足しています）';
  }

  return [
    `【FF14 Eorzean Crafter】素材引き出しリスト`,
    `----------------------------------------`,
    ...instructions,
    `----------------------------------------`,
    `https://clafter.eorzeanfishing.com`,
  ].join('\n');
}
