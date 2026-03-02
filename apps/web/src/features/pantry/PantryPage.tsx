import { useState } from "react";

type Props = {
  pantry: any[];
  onUpsert: (pantryItem: { ingredientId: string; quantity: number; unit: string }) => Promise<void>;
};

export function PantryPage({ pantry, onUpsert }: Props) {
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("item");

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Pantry</h2>
      <form
        className="space-y-2 rounded-xl bg-white p-4 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          await onUpsert({ ingredientId, quantity: Number(quantity), unit });
          setIngredientId("");
          setQuantity("0");
          setUnit("item");
        }}
      >
        <input className="w-full rounded border p-2" value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} placeholder="Ingredient ID" />
        <input className="w-full rounded border p-2" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" />
        <input className="w-full rounded border p-2" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
        <button className="rounded bg-brand-500 px-4 py-2 text-white">Save Pantry Item</button>
      </form>
      <ul className="space-y-2">
        {pantry.map((item) => (
          <li key={item.id} className="rounded-xl bg-white p-3 shadow">
            <p className="font-medium">{item.ingredientId}</p>
            <p className="text-xs text-slate-500">{item.quantity} {item.unit}</p>
            <p className="text-xs text-slate-500">Updated: {item.updatedAt || "n/a"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}