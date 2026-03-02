import { Mapping, PantryItem, Recipe, ShoppingListItem } from "../models/index.js";
import { resolveMapping } from "./mappingResolution.js";
import { subtractPantry } from "./pantryMath.js";

export type RecipeIngredientUsage = {
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
};

export function generateShoppingListItems(
  recipeIds: string[],
  recipes: Recipe[],
  ingredientUsage: RecipeIngredientUsage[],
  pantry: PantryItem[],
  mappings: Mapping[]
): ShoppingListItem[] {
  const selectedRecipes = recipes.filter((r) => recipeIds.includes(r.id));
  const selectedRecipeIds = new Set(selectedRecipes.map((r) => r.id));
  const usage = ingredientUsage.filter((u) => selectedRecipeIds.has(u.recipeId));

  const grouped = new Map<string, { ingredientId: string; quantity: number; unit: string }>();
  for (const u of usage) {
    const key = `${u.ingredientId}:${u.unit}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += u.quantity;
    } else {
      grouped.set(key, { ingredientId: u.ingredientId, quantity: u.quantity, unit: u.unit });
    }
  }

  const afterPantry = subtractPantry([...grouped.values()], pantry).filter((item) => item.quantity > 0);
  return afterPantry.map((item) => {
    const mapping = resolveMapping(item.ingredientId, mappings);
    return {
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      upc: mapping?.upc,
      productId: mapping?.productId,
      mappingMissing: !mapping?.upc
    };
  });
}
