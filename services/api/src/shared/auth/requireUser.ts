import { HttpRequest } from "@azure/functions";

export type UserContext = {
  userId: string;
  userDetails?: string;
  roles: string[];
};

function decodePrincipal(encoded: string): any | null {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function requireUser(request: HttpRequest): UserContext {
  const principalHeader = request.headers.get("x-ms-client-principal");
  const principalId = request.headers.get("x-ms-client-principal-id");
  const fallbackUserId = principalId || request.headers.get("x-user-id");

  if (principalHeader) {
    const principal = decodePrincipal(principalHeader);
    if (principal?.userId) {
      return {
        userId: principal.userId,
        userDetails: principal.userDetails,
        roles: principal.userRoles || []
      };
    }
  }

  if (fallbackUserId) {
    return { userId: fallbackUserId, roles: ["authenticated"] };
  }

  throw new Error("Unauthorized: missing Static Web Apps user context");
}

