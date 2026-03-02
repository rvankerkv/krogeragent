import { app, HttpRequest } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "../../shared/auth/requireUser.js";
import { db } from "../../shared/db/cosmosClient.js";
import { Ingredient } from "../../shared/models/index.js";
import { errorResponse, json } from "../../shared/http.js";
import { readJson, requiredString } from "../../shared/validation/index.js";

app.http("ingredients-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "ingredients",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const ingredients = await db.list<Ingredient>("ingredients", user.userId);
      return json(200, ingredients);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("ingredients-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "ingredients",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<Partial<Ingredient>>(request);
      const now = new Date().toISOString();
      const ingredient: Ingredient = {
        id: uuidv4(),
        userId: user.userId,
        name: requiredString(payload.name, "name"),
        defaultUnit: requiredString(payload.defaultUnit ?? "item", "defaultUnit"),
        createdAt: now,
        updatedAt: now
      };
      const saved = await db.upsert("ingredients", ingredient);
      return json(201, saved);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("ingredients-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "ingredients/{id}",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const existing = await db.getById<Ingredient>("ingredients", user.userId, request.params.id);
      if (!existing) return json(404, { error: "Ingredient not found" });
      const payload = await readJson<Partial<Ingredient>>(request);
      const updated: Ingredient = {
        ...existing,
        ...payload,
        id: existing.id,
        userId: existing.userId,
        updatedAt: new Date().toISOString()
      };
      const saved = await db.upsert("ingredients", updated);
      return json(200, saved);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("ingredients-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "ingredients/{id}",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      await db.delete("ingredients", user.userId, request.params.id);
      return json(200, { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  }
});
