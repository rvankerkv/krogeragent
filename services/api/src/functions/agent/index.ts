import { app, HttpRequest } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "../../shared/auth/requireUser";
import { db } from "../../shared/db/cosmosClient";
import { Ingredient, Mapping, PantryItem, Recipe } from "../../shared/models/index";
import { errorResponse, json } from "../../shared/http";
import { readJson } from "../../shared/validation/index";
import { generateShoppingListItems } from "../../shared/logic/shoppingListGenerator";

type ToolResult = {
  message: string;
  shoppingList?: any;
  suggestedActions?: string[];
};

async function generateList(userId: string): Promise<any> {
  const recipes = await db.list<Recipe>("recipes", userId);
  const pantry = await db.list<PantryItem>("pantry", userId);
  const mappings = await db.list<Mapping>("mappings", userId);
  const ingredientUsage = recipes.flatMap((recipe) => {
    if (recipe.ingredientLines?.length) {
      return recipe.ingredientLines.map((line) => ({
        recipeId: recipe.id,
        ingredientId: line.ingredientId,
        quantity: Number(line.quantity || 0),
        unit: line.unit || "item"
      }));
    }
    return recipe.ingredientIds.map((ingredientId) => ({ recipeId: recipe.id, ingredientId, quantity: 1, unit: "item" }));
  });
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

function parseIngredientLine(line: string): { quantity: number; unit: string; name: string } | null {
  const cleaned = line.replace(/^[-*]\s*/, "").trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s+([a-zA-Z]+)\s+(.+)$/);
  if (!match) {
    return { quantity: 1, unit: "item", name: cleaned };
  }
  const qtyRaw = match[1];
  const quantity = qtyRaw.includes("/") ? Number(qtyRaw.split("/")[0]) / Number(qtyRaw.split("/")[1]) : Number(qtyRaw);
  return {
    quantity: Number.isFinite(quantity) ? quantity : 1,
    unit: match[2].toLowerCase(),
    name: match[3].trim()
  };
}

function parsePastedRecipe(text: string): { name: string; ingredients: Array<{ quantity: number; unit: string; name: string }>; instructions: string[] } {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!rawLines.length) throw new Error("Recipe text is empty");

  const name = rawLines[0].replace(/^recipe\s*:\s*/i, "").trim();
  const ingredients: Array<{ quantity: number; unit: string; name: string }> = [];
  const instructions: string[] = [];

  let section: "ingredients" | "instructions" | "unknown" = "unknown";
  for (const line of rawLines.slice(1)) {
    const lower = line.toLowerCase();
    if (lower === "ingredients" || lower === "ingredients:") {
      section = "ingredients";
      continue;
    }
    if (lower === "instructions" || lower === "instructions:" || lower === "directions" || lower === "directions:") {
      section = "instructions";
      continue;
    }

    if (section === "ingredients") {
      const parsed = parseIngredientLine(line);
      if (parsed) ingredients.push(parsed);
      continue;
    }

    if (section === "instructions") {
      instructions.push(line.replace(/^\d+\.\s*/, "").trim());
      continue;
    }

    const parsed = parseIngredientLine(line);
    if (parsed && ingredients.length < 20) {
      ingredients.push(parsed);
    } else {
      instructions.push(line);
    }
  }

  return {
    name: name || "Imported Recipe",
    ingredients,
    instructions: instructions.filter(Boolean)
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

app.http("agent-import-recipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "agent/import-recipe",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<{ text?: string }>(request);
      const text = payload.text?.trim();
      if (!text) return json(400, { error: "text is required" });

      const parsed = parsePastedRecipe(text);
      const existingIngredients = await db.list<Ingredient>("ingredients", user.userId);
      const now = new Date().toISOString();
      const ingredientIds: string[] = [];
      const createdIngredients: Ingredient[] = [];

      for (const item of parsed.ingredients) {
        const existing = existingIngredients.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          ingredientIds.push(existing.id);
          continue;
        }
        const created: Ingredient = {
          id: uuidv4(),
          userId: user.userId,
          name: item.name,
          defaultUnit: item.unit || "item",
          createdAt: now,
          updatedAt: now
        };
        await db.upsert("ingredients", created);
        existingIngredients.push(created);
        createdIngredients.push(created);
        ingredientIds.push(created.id);
      }

      const recipe: Recipe = {
        id: uuidv4(),
        userId: user.userId,
        name: parsed.name,
        ingredientIds: [...new Set(ingredientIds)],
        ingredientLines: parsed.ingredients
          .map((item, idx) => ({
            ingredientId: ingredientIds[idx],
            quantity: Number(item.quantity || 1),
            unit: item.unit || "item"
          }))
          .filter((line) => Boolean(line.ingredientId)),
        instructions: parsed.instructions,
        createdAt: now,
        updatedAt: now
      };
      await db.upsert("recipes", recipe);

      return json(201, {
        message: "Recipe imported by agent parser.",
        recipe,
        createdIngredients
      });
    } catch (e) {
      return errorResponse(e);
    }
  }
});

