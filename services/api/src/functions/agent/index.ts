import { app, HttpRequest } from "@azure/functions";
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

const vulgarFractionMap: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅐": 1 / 7,
  "⅑": 1 / 9,
  "⅒": 0.1,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875
};

function parseNumberToken(token: string): number | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (vulgarFractionMap[trimmed] !== undefined) return vulgarFractionMap[trimmed];
  if (/^\d+\/\d+$/.test(trimmed)) {
    const [a, b] = trimmed.split("/").map(Number);
    return b ? a / b : null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseQuantityExpression(input: string): number | null {
  const tokens = input.trim().split(/\s+/);
  if (!tokens.length) return null;
  if (tokens.length >= 2) {
    const first = parseNumberToken(tokens[0]);
    const second = parseNumberToken(tokens[1]);
    if (first !== null && second !== null && !tokens[0].includes(".")) {
      return first + second;
    }
  }
  return parseNumberToken(tokens[0]);
}

function normalizeUnit(unitRaw: string): string {
  const unit = unitRaw.toLowerCase().replace(/\./g, "");
  if (unit === "grams" || unit === "gram") return "g";
  if (unit === "kilograms" || unit === "kilogram") return "kg";
  if (unit === "ounces" || unit === "ounce") return "oz";
  if (unit === "pounds" || unit === "pound") return "lb";
  if (unit === "tablespoons" || unit === "tablespoon") return "tbsp";
  if (unit === "teaspoons" || unit === "teaspoon") return "tsp";
  if (unit === "cups" || unit === "cup") return "cup";
  return unit;
}

function isLikelyHeaderLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (lower === "ingredients" || lower === "ingredients:" || lower === "instructions" || lower === "instructions:" || lower === "directions" || lower === "directions:") {
    return true;
  }
  if (!lower.endsWith(":")) return false;
  const stem = lower.slice(0, -1).trim();
  const words = stem.split(/\s+/).filter(Boolean);
  if (words.length > 4) return false;
  return !/\d/.test(stem);
}

function parseIngredientLine(line: string): { quantity: number; unit: string; name: string } | null {
  const cleaned = line.replace(/^[-*]\s*/, "").trim();
  if (!cleaned) return null;

  if (isLikelyHeaderLine(cleaned)) return null;

  const gramPriorityMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*g(?:ram|rams)?\b\s*(?:\([^)]*\))?\s*(.+)$/i);
  if (gramPriorityMatch) {
    return {
      quantity: Number(gramPriorityMatch[1]),
      unit: "g",
      name: gramPriorityMatch[2].trim()
    };
  }

  const leadingMeasureMatch = cleaned.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*([a-zA-Z]+)\b\s*(.+)$/);
  if (!leadingMeasureMatch) {
    return { quantity: 1, unit: "item", name: cleaned };
  }

  const quantity = parseQuantityExpression(leadingMeasureMatch[1]);
  const unit = normalizeUnit(leadingMeasureMatch[2]);
  const name = leadingMeasureMatch[3].trim();
  return {
    quantity: quantity && quantity > 0 ? quantity : 1,
    unit: unit || "item",
    name: name || cleaned
  };
}

function parsePastedRecipe(text: string): { name: string; ingredients: Array<{ quantity: number; unit: string; name: string }>; instructions: string[] } {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!rawLines.length) throw new Error("Recipe text is empty");

  const first = rawLines[0].replace(/^recipe\s*:\s*/i, "").trim();
  const name = isLikelyHeaderLine(first) ? "" : first;
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

    if (isLikelyHeaderLine(line)) continue;

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
    name: name || `Imported Recipe ${new Date().toISOString().slice(0, 10)}`,
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
      const ingredientLookup = new Map(existingIngredients.map((i) => [i.name.toLowerCase(), i]));

      const preview = parsed.ingredients.map((line) => {
        const existing = ingredientLookup.get(line.name.toLowerCase());
        return {
          quantity: line.quantity,
          unit: line.unit,
          ingredientName: line.name,
          ingredientId: existing?.id || null
        };
      });

      return json(200, {
        message: "Recipe parsed. Review and confirm before saving.",
        recipeName: parsed.name,
        instructions: parsed.instructions,
        ingredientLines: preview
      });
    } catch (e) {
      return errorResponse(e);
    }
  }
});

