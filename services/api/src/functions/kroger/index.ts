import { app, HttpRequest } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import { requireUser } from "../../shared/auth/requireUser";
import { db } from "../../shared/db/cosmosClient";
import { errorResponse, json } from "../../shared/http";
import { readJson } from "../../shared/validation/index";

const authBase = "https://api.kroger.com/v1/connect/oauth2";

function mustEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function encryptTokenPlaceholder(token: object): string {
  // Placeholder only; replace with production encryption using Key Vault-backed key material.
  return Buffer.from(JSON.stringify(token), "utf8").toString("base64");
}

app.http("kroger-auth-start", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "kroger/auth/start",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const clientId = mustEnv("KROGER_CLIENT_ID");
      const redirectUri = mustEnv("KROGER_REDIRECT_URI");
      const state = Buffer.from(JSON.stringify({ userId: user.userId, nonce: uuidv4() }), "utf8").toString("base64url");
      const authorizeUrl = `${authBase}/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=cart.basic:write%20product.compact&state=${state}`;
      return json(200, { authorizeUrl });
    } catch (e) {
      return errorResponse(e);
    }
  }
});

app.http("kroger-auth-callback", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "kroger/auth/callback",
  handler: async (request: HttpRequest) => {
    try {
      const code = request.query.get("code");
      const state = request.query.get("state");
      if (!code || !state) return json(400, { error: "Missing code/state" });

      const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      const clientId = mustEnv("KROGER_CLIENT_ID");
      const clientSecret = mustEnv("KROGER_CLIENT_SECRET");
      const redirectUri = mustEnv("KROGER_REDIRECT_URI");

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      });

      const tokenResponse = await fetch(`${authBase}/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });

      if (!tokenResponse.ok) {
        const text = await tokenResponse.text();
        return json(502, { error: "Kroger token exchange failed", detail: text });
      }

      const tokenPayload = await tokenResponse.json();
      await db.upsert("events", {
        id: uuidv4(),
        userId: parsedState.userId,
        eventType: "kroger.oauth.token",
        encryptedToken: encryptTokenPlaceholder(tokenPayload),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

      return json(200, { ok: true, message: "Kroger connected." });
    } catch (e) {
      return errorResponse(e, 500);
    }
  }
});

app.http("kroger-cart-add", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "kroger/cart/add",
  handler: async (request: HttpRequest) => {
    try {
      const user = requireUser(request);
      const payload = await readJson<{ items: Array<{ upc?: string; productId?: string; quantity: number }> }>(request);
      const itemCount = payload.items?.length || 0;
      const mapped = (payload.items || []).filter((x) => x.upc || x.productId);

      // Scaffold behavior: capture request and return deep-link fallback.
      await db.upsert("events", {
        id: uuidv4(),
        userId: user.userId,
        eventType: "kroger.cart.add.requested",
        payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

      return json(200, {
        ok: true,
        itemCount,
        mappedItemCount: mapped.length,
        message: "Scaffolded cart integration recorded. Implement API call with stored token next.",
        deepLinkUrl: "https://www.kroger.com/cart"
      });
    } catch (e) {
      return errorResponse(e);
    }
  }
});

