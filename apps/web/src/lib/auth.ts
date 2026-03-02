export type AuthUser = {
  userId?: string;
  userDetails?: string;
  identityProvider?: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/.auth/me");
    if (!res.ok) return null;
    const body = await res.json();
    const principal = body?.clientPrincipal;
    if (!principal) return null;
    return {
      userId: principal.userId,
      userDetails: principal.userDetails,
      identityProvider: principal.identityProvider
    };
  } catch {
    return null;
  }
}
