import { app, HttpRequest } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "../../shared/auth/requireUser";
import { db } from "../../shared/db/cosmosClient";
import { Mapping } from "../../shared/models/index";
import { errorResponse, json } from "../../shared/http";
import { readJson, requiredString } from "../../shared/validation/index";

function validateUpc(upc: string): string {
  const value = upc.trim();
  if (!value) return value;
  if (!/^\d{8,14}$/.test(value)) {
    throw new Error("upc must be 8-14 digits");
  }
  return value;
}

app.http("mappings-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "mappings",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const mappings = await db.list<Mapping>("mappings", user.userId);
      return json(200, mappings);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("mappings-create", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "mappings",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<Partial<Mapping>>(request);
      const now = new Date().toISOString();
      const mapping: Mapping = {
        id: uuidv4(),
        userId: user.userId,
        ingredientId: requiredString(payload.ingredientId, "ingredientId"),
        upc: validateUpc(String(payload.upc || "")),
        productId: String(payload.productId || "").trim(),
        brand: String(payload.brand || "").trim(),
        size: String(payload.size || "").trim(),
        notes: payload.notes ? String(payload.notes) : undefined,
        createdAt: now,
        updatedAt: now
      };
      const saved = await db.upsert("mappings", mapping);
      return json(201, saved);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("mappings-update", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "mappings/{id}",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const existing = await db.getById<Mapping>("mappings", user.userId, request.params.id);
      if (!existing) return json(404, { error: "Mapping not found" });
      const payload = await readJson<Partial<Mapping>>(request);
      const updated: Mapping = {
        ...existing,
        ...payload,
        upc: payload.upc === undefined ? existing.upc : validateUpc(String(payload.upc)),
        id: existing.id,
        userId: existing.userId,
        updatedAt: new Date().toISOString()
      };
      const saved = await db.upsert("mappings", updated);
      return json(200, saved);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("mappings-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "mappings/{id}",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      await db.delete("mappings", user.userId, request.params.id);
      return json(200, { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  }
});

