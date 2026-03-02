import { useState } from "react";

type Props = {
  mappings: any[];
  onCreate: (mapping: {
    ingredientId: string;
    upc: string;
    productId: string;
    brand: string;
    size: string;
    notes?: string;
  }) => Promise<void>;
};

export function MappingsPage({ mappings, onCreate }: Props) {
  const [form, setForm] = useState({ ingredientId: "", upc: "", productId: "", brand: "", size: "", notes: "" });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Mappings</h2>
      <form
        className="space-y-2 rounded-xl bg-white p-4 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          await onCreate(form);
          setForm({ ingredientId: "", upc: "", productId: "", brand: "", size: "", notes: "" });
        }}
      >
        {Object.keys(form).map((key) => (
          <input
            key={key}
            className="w-full rounded border p-2"
            value={(form as any)[key]}
            onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            placeholder={key}
          />
        ))}
        <button className="rounded bg-brand-500 px-4 py-2 text-white">Create Mapping</button>
      </form>
      <ul className="space-y-2">
        {mappings.map((mapping) => (
          <li key={mapping.id} className="rounded-xl bg-white p-3 shadow">
            <p className="font-medium">Ingredient: {mapping.ingredientId}</p>
            <p className="text-xs text-slate-500">UPC: {mapping.upc || "n/a"}</p>
            <p className="text-xs text-slate-500">Product: {mapping.productId || "n/a"}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}