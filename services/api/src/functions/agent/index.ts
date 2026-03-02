import { app, HttpRequest } from "@azure/functions";
import { requireUser } from "../../shared/auth/requireUser.js";
import { db } from "../../shared/db/cosmosClient.js";
import { Ingredient, Mapping, PantryItem, Recipe } from "../../shared/models/index.js";
import { errorResponse, json } from "../../shared/http.js";
import { readJson } from "../../shared/validation/index.js";
import { generateShoppingListItems } from "../../shared/logic/shoppingListGenerator.js";

type ToolResult = {
  message: string;
  shoppingList?: any;
  suggestedActions?: string[];
};

async function generateList(userId: string): Promise<any> {
  const recipes = await db.list<Recipe>("recipes", userId);
  const pantry = await db.list<PantryItem>("pantry", userId);
  const mappings = await db.list<Mapping>("mappings", userId);
  const ingredientUsage = recipes.flatMap((recipe) =>
    recipe.ingredientIds.map((ingredientId) => ({ recipeId: recipe.id, ingredientId, quantity: 1, unit: "item" }))
  );
  const items = generateShoppingListItems(
    recipes.map((r) => r.id),
    recipes,
    ingredientUsage,
    pantry,
    mappings
  );
  return { recipeIds: recipes.map((r) => r.id), items };
}

async function runTools(userId: string, message: string): Promise<ToolResult> {
  const lower = message.toLowerCase();
  if (lower.includes("shopping")) {
    const shoppingList = await generateList(userId);
    if (!shoppingList.items.length) {
      return {
        message: "I could not build a shopping list yet. Do you want to add recipes or ingredient mappings first?",
        suggestedActions: ["Create recipe", "Create mapping", "Show ingredients"]
      };
    }
    return {
      message: "Shopping list generated from your recipes and pantry.",
      shoppingList,
      suggestedActions: ["Add to cart", "Show missing mappings"]
    };
  }

  if (lower.includes("missing mapping") || lower.includes("mapping")) {
    const ingredients = await db.list<Ingredient>("ingredients", userId);
    const mappings = await db.list<Mapping>("mappings", userId);
    const mappedIds = new Set(mappings.map((m) => m.ingredientId));
    const missing = ingredients.filter((i) => !mappedIds.has(i.id));
    const names = missing.map((m) => m.name).slice(0, 8);
    return {
      message: names.length
        ? `Missing mappings for: ${names.join(", ")}. Please provide real UPCs or product IDs; I will not invent UPCs.`
        : "No missing ingredient mappings were found.",
      suggestedActions: names.length ? ["Create mapping", "Generate shopping list"] : ["Generate shopping list"]
    };
  }

  if (lower.includes("cart")) {
    return {
      message: "I can add mapped items to cart. Please confirm I should call addToCart with your current shopping list.",
      suggestedActions: ["Confirm add to cart", "Generate shopping list"]
    };
  }

  const recipes = await db.list<Recipe>("recipes", userId);
  return {
    message: recipes.length
      ? "I can generate a shopping list, check missing mappings, or prepare add-to-cart."
      : "I do not see any recipes yet. What recipe should I create first?",
    suggestedActions: recipes.length ? ["Generate shopping list", "Show missing mappings"] : ["Create recipe", "Create ingredient"]
  };
}

app.http("agent-chat", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "agent/chat",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<{ message?: string }>(request);
      const message = payload.message?.trim();
      if (!message) return json(400, { error: "message is required" });
      const result = await runTools(user.userId, message);
      return json(200, result);
    } catch (e) {
      return errorResponse(e);
    }
  }
});
