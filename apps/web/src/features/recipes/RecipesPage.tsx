import { useState } from "react";

type Ingredient = {
  id: string;
  name: string;
  defaultUnit: string;
};

type IngredientLineInput = {
  id: string;
  quantity: string;
  unit: string;
  ingredientId: string;
  newIngredientName: string;
};

type Props = {
  recipes: any[];
  ingredients: Ingredient[];
  onCreateIngredient: (payload: { name: string; defaultUnit: string }) => Promise<Ingredient>;
  onCreateRecipe: (payload: {
    name: string;
    ingredientIds: string[];
    ingredientLines: Array<{ ingredientId: string; quantity: number; unit: string }>;
    instructions: string[];
  }) => Promise<void>;
  onImportRecipe: (text: string) => Promise<void>;
};

function emptyLine(): IngredientLineInput {
  return {
    id: crypto.randomUUID(),
    quantity: "1",
    unit: "item",
    ingredientId: "",
    newIngredientName: ""
  };
}

export function RecipesPage({ recipes, ingredients, onCreateIngredient, onCreateRecipe, onImportRecipe }: Props) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [lines, setLines] = useState<IngredientLineInput[]>([emptyLine()]);
  const [pastedRecipe, setPastedRecipe] = useState("");
  const [busy, setBusy] = useState(false);
  const ingredientNameById = new Map(ingredients.map((i) => [i.id, i.name]));

  const updateLine = (id: string, patch: Partial<IngredientLineInput>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Recipes + Ingredients</h2>

      <form
        className="space-y-2 rounded-xl bg-white p-4 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const resolved = [];
            for (const line of lines) {
              const quantity = Number(line.quantity || 0);
              if (quantity <= 0) continue;

              let ingredientId = line.ingredientId;
              if (!ingredientId && line.newIngredientName.trim()) {
                const created = await onCreateIngredient({
                  name: line.newIngredientName.trim(),
                  defaultUnit: line.unit || "item"
                });
                ingredientId = created.id;
              }
              if (!ingredientId) continue;
              resolved.push({
                ingredientId,
                quantity,
                unit: line.unit || "item"
              });
            }

            await onCreateRecipe({
              name,
              ingredientIds: [...new Set(resolved.map((r) => r.ingredientId))],
              ingredientLines: resolved,
              instructions: instructions.split("\n").map((v) => v.trim()).filter(Boolean)
            });
            setName("");
            setInstructions("");
            setLines([emptyLine()]);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input className="w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name" required />

        <div className="space-y-2 rounded border bg-slate-50 p-2">
          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-2">
              <input
                className="col-span-2 rounded border p-2 text-sm"
                value={line.quantity}
                onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                placeholder="1"
              />
              <input
                className="col-span-2 rounded border p-2 text-sm"
                value={line.unit}
                onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                placeholder="lb"
              />
              <select
                className="col-span-4 rounded border p-2 text-sm"
                value={line.ingredientId}
                onChange={(e) => updateLine(line.id, { ingredientId: e.target.value, newIngredientName: "" })}
              >
                <option value="">Select existing</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <input
                className="col-span-3 rounded border p-2 text-sm"
                value={line.newIngredientName}
                onChange={(e) => updateLine(line.id, { newIngredientName: e.target.value, ingredientId: "" })}
                placeholder="or add new"
              />
              <button
                type="button"
                className="col-span-1 rounded bg-red-100 text-xs"
                onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== line.id) : prev))}
              >
                X
              </button>
            </div>
          ))}
          <button type="button" className="rounded bg-slate-200 px-3 py-1 text-xs" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            Add Ingredient Row
          </button>
        </div>

        <textarea
          className="w-full rounded border p-2"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instructions (one per line)"
        />
        <button disabled={busy} className="rounded bg-brand-500 px-4 py-2 text-white">
          {busy ? "Saving..." : "Create Recipe"}
        </button>
      </form>

      <div className="space-y-2 rounded-xl bg-white p-4 shadow">
        <p className="text-sm font-medium">Paste Recipe (agent-assisted import)</p>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={8}
          value={pastedRecipe}
          onChange={(e) => setPastedRecipe(e.target.value)}
          placeholder={"Recipe: Chicken Stir Fry\nIngredients:\n1 lb chicken breast\n2 cup broccoli\nInstructions:\nCook chicken\nAdd broccoli"}
        />
        <button
          disabled={!pastedRecipe.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onImportRecipe(pastedRecipe);
              setPastedRecipe("");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded bg-slate-700 px-4 py-2 text-white"
        >
          Import From Text
        </button>
      </div>

      <ul className="space-y-2">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="rounded-xl bg-white p-3 shadow">
            <p className="font-medium">{recipe.name}</p>
            <div className="mt-1 space-y-1 text-xs text-slate-600">
              {(recipe.ingredientLines?.length
                ? recipe.ingredientLines
                : (recipe.ingredientIds || []).map((ingredientId: string) => ({ ingredientId, quantity: 1, unit: "item" }))
              ).map((line: any, idx: number) => (
                <p key={`${recipe.id}-${idx}`}>{line.quantity} {line.unit} | {ingredientNameById.get(line.ingredientId) || line.ingredientId}</p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
