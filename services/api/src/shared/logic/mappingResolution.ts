import { Mapping } from "../models/index";

export function resolveMapping(ingredientId: string, mappings: Mapping[]): Mapping | null {
  const exact = mappings.find((m) => m.ingredientId === ingredientId && Boolean(m.upc));
  if (exact) return exact;
  return mappings.find((m) => m.ingredientId === ingredientId) || null;
}

