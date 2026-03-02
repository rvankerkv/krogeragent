import { app, HttpRequest, InvocationContext } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "../../shared/auth/requireUser";
import { db } from "../../shared/db/cosmosClient";
import { Recipe } from "../../shared/models/index";
import { errorResponse, json } from "../../shared/http";
import { readJson, requiredString } from "../../shared/validation/index";

app.http("recipes-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "recipes",
  handler: async (request: HttpRequest, context: InvocationContext) => {
    try {
      const user = requireUser(request);
      context.log("List recipes", { userId: user.userId });
      const recipes = await db.list<Recipe>("recipes", user.userId);
      return json(200, recipes);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("recipes-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "recipes",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<Partial<Recipe>>(request);
      const now = new Date().toISOString();
      const ingredientLines = Array.isArray(payload.ingredientLines)
        ? payload.ingredientLines
            .map((line) => ({
              ingredientId: String(line.ingredientId || "").trim(),
              quantity: Number(line.quantity ?? 0),
              unit: String(line.unit || "item").trim()
            }))
            .filter((line) => line.ingredientId && line.quantity > 0)
        : [];
      const ingredientIds = ingredientLines.length
        ? [...new Set(ingredientLines.map((line) => line.ingredientId))]
        : Array.isArray(payload.ingredientIds)
          ? payload.ingredientIds
          : [];
      const recipe: Recipe = {
        id: uuidv4(),
        userId: user.userId,
        name: requiredString(payload.name, "name"),
        ingredientIds,
        ingredientLines,
        instructions: Array.isArray(payload.instructions) ? payload.instructions : [],
        createdAt: now,
        updatedAt: now
      };
      const saved = await db.upsert("recipes", recipe);
      return json(201, saved);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("recipes-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "recipes/{id}",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const id = request.params.id;
      const existing = await db.getById<Recipe>("recipes", user.userId, id);
      if (!existing) return json(404, { error: "Recipe not found" });

      const payload = await readJson<Partial<Recipe>>(request);
      const ingredientLines = Array.isArray(payload.ingredientLines)
        ? payload.ingredientLines
            .map((line) => ({
              ingredientId: String(line.ingredientId || "").trim(),
              quantity: Number(line.quantity ?? 0),
              unit: String(line.unit || "item").trim()
            }))
            .filter((line) => line.ingredientId && line.quantity > 0)
        : existing.ingredientLines;
      const ingredientIds = ingredientLines?.length
        ? [...new Set(ingredientLines.map((line) => line.ingredientId))]
        : Array.isArray(payload.ingredientIds)
          ? payload.ingredientIds
          : existing.ingredientIds;
      const updated: Recipe = {
        ...existing,
        ...payload,
        ingredientLines,
        ingredientIds,
        id: existing.id,
        userId: existing.userId,
        updatedAt: new Date().toISOString()
      };
      const saved = await db.upsert("recipes", updated);
      return json(200, saved);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("recipes-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "recipes/{id}",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      await db.delete("recipes", user.userId, request.params.id);
      return json(200, { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  }
});

