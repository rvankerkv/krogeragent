import { useState } from "react";

type Props = {
  ingredients: any[];
  onCreate: (ingredient: { name: string; defaultUnit: string }) => Promise<void>;
};

export function IngredientsPage({ ingredients, onCreate }: Props) {
  const [name, setName] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("item");

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Ingredients</h2>
      <form
        className="space-y-2 rounded-xl bg-white p-4 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          await onCreate({ name, defaultUnit });
          setName("");
          setDefaultUnit("item");
        }}
      >
        <input className="w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ingredient name" />
        <input
          className="w-full rounded border p-2"
          value={defaultUnit}
          onChange={(e) => setDefaultUnit(e.target.value)}
          placeholder="Default unit"
        />
        <button className="rounded bg-brand-500 px-4 py-2 text-white">Create Ingredient</button>
      </form>
      <ul className="space-y-2">
        {ingredients.map((ingredient) => (
          <li key={ingredient.id} className="rounded-xl bg-white p-3 shadow">
            <p className="font-medium">{ingredient.name}</p>
            <p className="text-xs text-slate-500">Unit: {ingredient.defaultUnit}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}