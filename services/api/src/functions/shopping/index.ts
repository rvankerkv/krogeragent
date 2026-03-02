import { app, HttpRequest } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "../../shared/auth/requireUser";
import { db } from "../../shared/db/cosmosClient";
import { Mapping, PantryItem, Recipe, ShoppingList } from "../../shared/models/index";
import { errorResponse, json } from "../../shared/http";
import { readJson } from "../../shared/validation/index";
import { generateShoppingListItems } from "../../shared/logic/shoppingListGenerator";

app.http("shopping-generate", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "shopping/generate",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<{ recipeIds?: string[] }>(request);
      const recipes = await db.list<Recipe>("recipes", user.userId);
      const pantry = await db.list<PantryItem>("pantry", user.userId);
      const mappings = await db.list<Mapping>("mappings", user.userId);
      const recipeIds = payload.recipeIds?.length ? payload.recipeIds : recipes.map((r) => r.id);

      const ingredientUsage = recipes.flatMap((recipe) => {
        if (recipe.ingredientLines?.length) {
          return recipe.ingredientLines.map((line) => ({
            recipeId: recipe.id,
            ingredientId: line.ingredientId,
            quantity: Number(line.quantity || 0),
            unit: line.unit || "item"
          }));
        }
        return recipe.ingredientIds.map((ingredientId) => ({
          recipeId: recipe.id,
          ingredientId,
          quantity: 1,
          unit: "item"
        }));
      });

      const items = generateShoppingListItems(recipeIds, recipes, ingredientUsage, pantry, mappings);
      const now = new Date().toISOString();
      const shoppingList: ShoppingList = {
        id: uuidv4(),
        userId: user.userId,
        recipeIds,
        items,
        createdAt: now,
        updatedAt: now
      };

      await db.upsert("events", {
        id: shoppingList.id,
        userId: user.userId,
        eventType: "shopping.generated",
        payload: shoppingList,
        createdAt: now,
        updatedAt: now
      } as any);

      return json(200, shoppingList);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

