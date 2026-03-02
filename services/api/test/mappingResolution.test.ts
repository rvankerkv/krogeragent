import { describe, expect, it } from "vitest";
import { resolveMapping } from "../src/shared/logic/mappingResolution.js";

describe("mapping resolution", () => {
  it("prefers mapping with upc when multiple mappings exist", () => {
    const mapping = resolveMapping("ing-1", [
      { id: "m1", userId: "u1", ingredientId: "ing-1", upc: "", productId: "a", brand: "", size: "", createdAt: "", updatedAt: "" },
      { id: "m2", userId: "u1", ingredientId: "ing-1", upc: "123456789012", productId: "b", brand: "", size: "", createdAt: "", updatedAt: "" }
    ]);

    expect(mapping?.id).toBe("m2");
  });
});
