export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recipe extends BaseEntity {
  name: string;
  ingredientIds: string[];
  ingredientLines?: Array<{
    ingredientId: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
}

export interface Ingredient extends BaseEntity {
  name: string;
  defaultUnit: string;
}

export interface Mapping extends BaseEntity {
  ingredientId: string;
  upc: string;
  productId: string;
  brand: string;
  size: string;
  notes?: string;
}

export interface PantryItem extends BaseEntity {
  ingredientId: string;
  quantity: number;
  unit: string;
  lastUpdatedAt: string;
}

export interface MealPlan extends BaseEntity {
  date: string;
  recipeIds: string[];
}

export interface ShoppingListItem {
  ingredientId: string;
  quantity: number;
  unit: string;
  upc?: string;
  productId?: string;
  mappingMissing?: boolean;
}

export interface ShoppingList extends BaseEntity {
  recipeIds: string[];
  items: ShoppingListItem[];
}

