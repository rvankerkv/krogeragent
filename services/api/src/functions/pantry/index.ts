import { app, HttpRequest } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "../../shared/auth/requireUser";
import { db } from "../../shared/db/cosmosClient";
import { PantryItem } from "../../shared/models/index";
import { errorResponse, json } from "../../shared/http";
import { readJson, requiredString } from "../../shared/validation/index";

app.http("pantry-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pantry",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const pantry = await db.list<PantryItem>("pantry", user.userId);
      return json(200, pantry);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("pantry-upsert", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "pantry",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<Partial<PantryItem>>(request);
      const ingredientId = requiredString(payload.ingredientId, "ingredientId");
      const quantity = Number(payload.quantity ?? 0);
      const unit = requiredString(payload.unit ?? "item", "unit");
      const now = new Date().toISOString();

      const pantry = await db.list<PantryItem>("pantry", user.userId);
      const existing = pantry.find((p) => p.ingredientId === ingredientId && p.unit === unit);

      const next: PantryItem = existing
        ? {
            ...existing,
            quantity,
            lastUpdatedAt: now,
            updatedAt: now
          }
        : {
            id: uuidv4(),
            userId: user.userId,
            ingredientId,
            quantity,
            unit,
            lastUpdatedAt: now,
            createdAt: now,
            updatedAt: now
          };

      const saved = await db.upsert("pantry", next);
      return json(200, saved);
    } catch (e) {
      return errorResponse(e);
    }
  }
});

