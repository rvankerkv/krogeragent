import { describe, expect, it } from "vitest";
import { subtractPantry } from "../src/shared/logic/pantryMath";

describe("pantry subtraction", () => {
  it("never returns negative quantities", () => {
    const result = subtractPantry(
      [
        { ingredientId: "i1", quantity: 2, unit: "cup" },
        { ingredientId: "i2", quantity: 1, unit: "item" }
      ],
      [
        { id: "p1", userId: "u1", ingredientId: "i1", quantity: 5, unit: "cup", lastUpdatedAt: "", createdAt: "", updatedAt: "" },
        { id: "p2", userId: "u1", ingredientId: "i2", quantity: 0.25, unit: "item", lastUpdatedAt: "", createdAt: "", updatedAt: "" }
      ]
    );

    expect(result[0].quantity).toBe(0);
    expect(result[1].quantity).toBe(0.75);
  });
});

