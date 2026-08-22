import { Recipe, MaterialRequirement, InventorySyncData } from '../types/ff14';
import { RECIPES_DATABASE } from '../data/recipes';
import { getItemStockTotal, getItemStockBreakdown } from './inventoryStorage';

export interface RecipeTreeNode {
  recipe?: Recipe;
  material: MaterialRequirement;
  totalNeeded: number;
  ownedTotal: number;
  shortage: number;
  isSubCraft: boolean;
  children: RecipeTreeNode[];
  depth: number;
}

export interface IntermediateCraftRequirement {
  recipe: Recipe;
  subRecipeId: string;
  neededTotal: number;
  ownedTotal: number;
  craftsNeeded: number; // how many times to execute the craft
  yieldPerCraft: number;
}

export interface RawShortageMaterial {
  itemId: number;
  name: string;
  neededTotal: number;
  ownedTotal: number;
  shortage: number;
  sourceType: string;
  gatheringInfo?: MaterialRequirement['gatheringInfo'];
  marketPriceNQ: number;
  totalMarketCost: number;
}

/**
 * Find sub recipe by ID or itemId from database
 */
export function findSubRecipe(subRecipeId?: string, itemId?: number): Recipe | undefined {
  if (subRecipeId) {
    const found = RECIPES_DATABASE.find((r) => r.id === subRecipeId);
    if (found) return found;
  }
  if (itemId) {
    return RECIPES_DATABASE.find((r) => r.itemId === itemId && r.category === 'intermediate');
  }
  return undefined;
}

/**
 * Build recursive recipe tree node
 */
export function buildRecipeTree(
  rootRecipe: Recipe,
  targetQuantity: number,
  inventoryData: InventorySyncData | null,
  depth = 0
): RecipeTreeNode {
  const yieldCount = rootRecipe.yields || 1;
  const craftRuns = Math.ceil(targetQuantity / yieldCount);

  const rootMaterial: MaterialRequirement = {
    itemId: rootRecipe.itemId,
    name: rootRecipe.name,
    amount: targetQuantity,
    sourceType: 'subcraft',
    icon: rootRecipe.icon,
  };

  const ownedRoot = getItemStockTotal(rootRecipe.itemId, inventoryData);
  const shortageRoot = Math.max(0, targetQuantity - ownedRoot);

  const children: RecipeTreeNode[] = rootRecipe.materials.map((mat) => {
    const totalNeededForThis = mat.amount * craftRuns;
    const subRecipe = findSubRecipe(mat.subRecipeId, mat.itemId);
    const owned = getItemStockTotal(mat.itemId, inventoryData);
    const shortage = Math.max(0, totalNeededForThis - owned);

    if (subRecipe && mat.sourceType === 'subcraft') {
      const subYield = subRecipe.yields || 1;
      const subRuns = Math.ceil(shortage / subYield);

      const subChildren: RecipeTreeNode[] = subRecipe.materials.map((subMat) => {
        const subMatNeeded = subMat.amount * subRuns;
        const subMatOwned = getItemStockTotal(subMat.itemId, inventoryData);
        const subMatShortage = Math.max(0, subMatNeeded - subMatOwned);
        const deepSubRecipe = findSubRecipe(subMat.subRecipeId, subMat.itemId);

        return {
          recipe: deepSubRecipe,
          material: subMat,
          totalNeeded: subMatNeeded,
          ownedTotal: subMatOwned,
          shortage: subMatShortage,
          isSubCraft: Boolean(deepSubRecipe),
          children: [],
          depth: depth + 2,
        };
      });

      return {
        recipe: subRecipe,
        material: mat,
        totalNeeded: totalNeededForThis,
        ownedTotal: owned,
        shortage: shortage,
        isSubCraft: true,
        children: subChildren,
        depth: depth + 1,
      };
    }

    return {
      material: mat,
      totalNeeded: totalNeededForThis,
      ownedTotal: owned,
      shortage: shortage,
      isSubCraft: false,
      children: [],
      depth: depth + 1,
    };
  });

  return {
    recipe: rootRecipe,
    material: rootMaterial,
    totalNeeded: targetQuantity,
    ownedTotal: ownedRoot,
    shortage: shortageRoot,
    isSubCraft: true,
    children,
    depth,
  };
}

/**
 * Calculate intermediate craft execution list
 */
export function getIntermediateCraftsNeeded(
  rootRecipe: Recipe,
  targetQuantity: number,
  inventoryData: InventorySyncData | null
): IntermediateCraftRequirement[] {
  const yieldCount = rootRecipe.yields || 1;
  const craftRuns = Math.ceil(targetQuantity / yieldCount);
  const result: IntermediateCraftRequirement[] = [];

  for (const mat of rootRecipe.materials) {
    const subRecipe = findSubRecipe(mat.subRecipeId, mat.itemId);
    if (subRecipe && mat.sourceType === 'subcraft') {
      const neededTotal = mat.amount * craftRuns;
      const ownedTotal = getItemStockTotal(mat.itemId, inventoryData);
      const shortage = Math.max(0, neededTotal - ownedTotal);
      const subYield = subRecipe.yields || 1;
      const craftsNeeded = Math.ceil(shortage / subYield);

      if (craftsNeeded > 0) {
        result.push({
          recipe: subRecipe,
          subRecipeId: subRecipe.id,
          neededTotal,
          ownedTotal,
          craftsNeeded,
          yieldPerCraft: subYield,
        });
      }
    }
  }

  return result;
}

/**
 * Calculate raw material shortages taking into account owned intermediate items
 */
export function getRawShortages(
  rootRecipe: Recipe,
  targetQuantity: number,
  inventoryData: InventorySyncData | null
): RawShortageMaterial[] {
  const yieldCount = rootRecipe.yields || 1;
  const craftRuns = Math.ceil(targetQuantity / yieldCount);
  const shortagesMap: Record<number, RawShortageMaterial> = {};

  for (const mat of rootRecipe.materials) {
    const subRecipe = findSubRecipe(mat.subRecipeId, mat.itemId);
    const owned = getItemStockTotal(mat.itemId, inventoryData);
    const needed = mat.amount * craftRuns;
    const intermediateShortage = Math.max(0, needed - owned);

    if (subRecipe && mat.sourceType === 'subcraft') {
      // Need to craft `intermediateShortage` of this subcraft
      if (intermediateShortage > 0) {
        const subYield = subRecipe.yields || 1;
        const subRuns = Math.ceil(intermediateShortage / subYield);

        for (const subMat of subRecipe.materials) {
          const subNeeded = subMat.amount * subRuns;
          const subOwned = getItemStockTotal(subMat.itemId, inventoryData);
          const subShortage = Math.max(0, subNeeded - subOwned);

          if (!shortagesMap[subMat.itemId]) {
            shortagesMap[subMat.itemId] = {
              itemId: subMat.itemId,
              name: subMat.name,
              neededTotal: subNeeded,
              ownedTotal: subOwned,
              shortage: subShortage,
              sourceType: subMat.sourceType,
              gatheringInfo: subMat.gatheringInfo,
              marketPriceNQ: subMat.defaultPriceNQ || 1000,
              totalMarketCost: subShortage * (subMat.defaultPriceNQ || 1000),
            };
          } else {
            shortagesMap[subMat.itemId].neededTotal += subNeeded;
            shortagesMap[subMat.itemId].shortage = Math.max(
              0,
              shortagesMap[subMat.itemId].neededTotal - shortagesMap[subMat.itemId].ownedTotal
            );
            shortagesMap[subMat.itemId].totalMarketCost =
              shortagesMap[subMat.itemId].shortage * shortagesMap[subMat.itemId].marketPriceNQ;
          }
        }
      }
    } else {
      // Direct raw material
      const matShortage = Math.max(0, needed - owned);
      if (!shortagesMap[mat.itemId]) {
        shortagesMap[mat.itemId] = {
          itemId: mat.itemId,
          name: mat.name,
          neededTotal: needed,
          ownedTotal: owned,
          shortage: matShortage,
          sourceType: mat.sourceType,
          gatheringInfo: mat.gatheringInfo,
          marketPriceNQ: mat.defaultPriceNQ || 1000,
          totalMarketCost: matShortage * (mat.defaultPriceNQ || 1000),
        };
      } else {
        shortagesMap[mat.itemId].neededTotal += needed;
        shortagesMap[mat.itemId].shortage = Math.max(
          0,
          shortagesMap[mat.itemId].neededTotal - shortagesMap[mat.itemId].ownedTotal
        );
        shortagesMap[mat.itemId].totalMarketCost =
          shortagesMap[mat.itemId].shortage * shortagesMap[mat.itemId].marketPriceNQ;
      }
    }
  }

  return Object.values(shortagesMap);
}
