import { useEffect, useMemo, useState } from "react";
import { apiClient } from "./lib/apiClient";
import { getCurrentUser } from "./lib/auth";
import { RecipesPage } from "./features/recipes/RecipesPage";
import { MappingsPage } from "./features/mappings/MappingsPage";
import { PantryPage } from "./features/pantry/PantryPage";
import { ShoppingPage } from "./features/shopping/ShoppingPage";
import { AgentChatPage } from "./features/agentChat/AgentChatPage";

type Page = "recipes" | "mappings" | "pantry" | "shopping" | "agent";

const nav: { key: Page; label: string }[] = [
  { key: "recipes", label: "Recipes + Ingredients" },
  { key: "mappings", label: "Mappings" },
  { key: "pantry", label: "Pantry" },
  { key: "shopping", label: "Shopping" },
  { key: "agent", label: "Agent" }
];

export default function App() {
  const [userLabel, setUserLabel] = useState("Anonymous");
  const [page, setPage] = useState<Page>("recipes");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [pantry, setPantry] = useState<any[]>([]);
  const [shopping, setShopping] = useState<any | null>(null);

  const loadAll = async () => {
    const [r, i, m, p] = await Promise.all([
      apiClient.listRecipes(),
      apiClient.listIngredients(),
      apiClient.listMappings(),
      apiClient.listPantry()
    ]);
    setRecipes(r);
    setIngredients(i);
    setMappings(m);
    setPantry(p);
  };

  useEffect(() => {
    getCurrentUser().then((u) => setUserLabel(u?.userDetails || "Anonymous"));
    loadAll().catch(() => undefined);
  }, []);

  const content = useMemo(() => {
    if (page === "recipes") {
      return (
        <RecipesPage
          recipes={recipes}
          ingredients={ingredients}
          onCreateIngredient={async (payload) => {
            const created = await apiClient.createIngredient(payload);
            await loadAll();
            return created;
          }}
          onCreateRecipe={async (payload) => {
            await apiClient.createRecipe(payload);
            await loadAll();
          }}
          onImportRecipe={async (text) => {
            return await apiClient.importRecipeFromText({ text });
          }}
        />
      );
    }
    if (page === "mappings") {
      return <MappingsPage mappings={mappings} onCreate={async (payload) => { await apiClient.createMapping(payload); await loadAll(); }} />;
    }
    if (page === "pantry") {
      return <PantryPage pantry={pantry} onUpsert={async (payload) => { await apiClient.upsertPantry(payload); await loadAll(); }} />;
    }
    if (page === "shopping") {
      return (
        <ShoppingPage
          shopping={shopping}
          onGenerate={async () => {
            const next = await apiClient.generateShoppingList({ recipeIds: recipes.map((r) => r.id) });
            setShopping(next);
          }}
          onAddToCart={async () => {
            if (!shopping?.items?.length) return;
            await apiClient.addToCart({ items: shopping.items });
            alert("Cart add request submitted.");
          }}
        />
      );
    }
    return (
      <AgentChatPage
        onSend={async (message) => {
          const result = await apiClient.chatAgent({ message });
          if (result?.shoppingList) {
            setShopping(result.shoppingList);
          }
          return result.message || "No response";
        }}
      />
    );
  }, [page, recipes, ingredients, mappings, pantry, shopping]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-3 sm:p-6">
      <header className="mb-4 rounded-2xl bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Kroger Recipe Agent</h1>
        <p className="text-xs text-slate-500">Signed in: {userLabel}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {nav.map((item) => (
            <button
              key={item.key}
              className={page === item.key ? "rounded bg-brand-500 px-2 py-2 text-xs text-white" : "rounded bg-slate-200 px-2 py-2 text-xs"}
              onClick={() => setPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      {content}
    </div>
  );
}
