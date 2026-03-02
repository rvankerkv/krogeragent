const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const apiClient = {
  listRecipes: () => request<any[]>("/recipes"),
  createRecipe: (payload: any) => request<any>("/recipes", { method: "POST", body: JSON.stringify(payload) }),
  listIngredients: () => request<any[]>("/ingredients"),
  createIngredient: (payload: any) => request<any>("/ingredients", { method: "POST", body: JSON.stringify(payload) }),
  listMappings: () => request<any[]>("/mappings"),
  createMapping: (payload: any) => request<any>("/mappings", { method: "POST", body: JSON.stringify(payload) }),
  listPantry: () => request<any[]>("/pantry"),
  upsertPantry: (payload: any) => request<any>("/pantry", { method: "POST", body: JSON.stringify(payload) }),
  generateShoppingList: (payload: any) => request<any>("/shopping/generate", { method: "POST", body: JSON.stringify(payload) }),
  chatAgent: (payload: any) => request<any>("/agent/chat", { method: "POST", body: JSON.stringify(payload) }),
  importRecipeFromText: (payload: { text: string }) => request<any>("/agent/import-recipe", { method: "POST", body: JSON.stringify(payload) }),
  addToCart: (payload: any) => request<any>("/kroger/cart/add", { method: "POST", body: JSON.stringify(payload) })
};
