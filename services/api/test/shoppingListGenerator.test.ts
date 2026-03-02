import { describe, expect, it } from "vitest";
import { generateShoppingListItems } from "../src/shared/logic/shoppingListGenerator";

describe("shopping list generator", () => {
  it("aggregates recipe ingredient usage and subtracts pantry", () => {
    const items = generateShoppingListItems(
      ["r1", "r2"],
      [
        { id: "r1", userId: "u1", name: "A", ingredientIds: ["i1", "i2"], instructions: [], createdAt: "", updatedAt: "" },
        { id: "r2", userId: "u1", name: "B", ingredientIds: ["i1"], instructions: [], createdAt: "", updatedAt: "" }
      ],
      [
        { recipeId: "r1", ingredientId: "i1", quantity: 2, unit: "item" },
        { recipeId: "r1", ingredientId: "i2", quantity: 1, unit: "item" },
        { recipeId: "r2", ingredientId: "i1", quantity: 3, unit: "item" }
      ],
      [{ id: "p1", userId: "u1", ingredientId: "i1", quantity: 1, unit: "item", lastUpdatedAt: "", createdAt: "", updatedAt: "" }],
      [{ id: "m1", userId: "u1", ingredientId: "i1", upc: "12345678", productId: "pid", brand: "", size: "", createdAt: "", updatedAt: "" }]
    );

    expect(items).toHaveLength(2);
    const i1 = items.find((i) => i.ingredientId === "i1");
    expect(i1?.quantity).toBe(4);
    expect(i1?.upc).toBe("12345678");
  });
});

