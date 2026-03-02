import { useState } from "react";

type Props = {
  recipes: any[];
  onCreate: (recipe: { name: string; ingredientIds: string[]; instructions: string[] }) => Promise<void>;
};

export function RecipesPage({ recipes, onCreate }: Props) {
  const [name, setName] = useState("");
  const [ingredientIds, setIngredientIds] = useState("");
  const [instructions, setInstructions] = useState("");

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Recipes</h2>
      <form
        className="space-y-2 rounded-xl bg-white p-4 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          await onCreate({
            name,
            ingredientIds: ingredientIds.split(",").map((v) => v.trim()).filter(Boolean),
            instructions: instructions.split("\n").map((v) => v.trim()).filter(Boolean)
          });
          setName("");
          setIngredientIds("");
          setInstructions("");
        }}
      >
        <input className="w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name" />
        <input
          className="w-full rounded border p-2"
          value={ingredientIds}
          onChange={(e) => setIngredientIds(e.target.value)}
          placeholder="Ingredient IDs (comma-separated)"
        />
        <textarea
          className="w-full rounded border p-2"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instructions (one per line)"
        />
        <button className="rounded bg-brand-500 px-4 py-2 text-white">Create Recipe</button>
      </form>
      <ul className="space-y-2">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="rounded-xl bg-white p-3 shadow">
            <p className="font-medium">{recipe.name}</p>
            <p className="text-xs text-slate-500">Ingredients: {(recipe.ingredientIds || []).join(", ") || "none"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
