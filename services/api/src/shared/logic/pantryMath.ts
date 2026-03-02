import { PantryItem } from "../models/index";

export function subtractPantry(required: { ingredientId: string; quantity: number; unit: string }[], pantry: PantryItem[]) {
  return required.map((r) => {
    const existing = pantry.find((p) => p.ingredientId === r.ingredientId && p.unit === r.unit);
    const available = existing?.quantity || 0;
    return {
      ...r,
      quantity: Math.max(0, Number((r.quantity - available).toFixed(4)))
    };
  });
}

