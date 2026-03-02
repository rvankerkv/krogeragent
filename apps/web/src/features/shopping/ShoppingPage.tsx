type Props = {
  shopping: any | null;
  onGenerate: () => Promise<void>;
  onAddToCart: () => Promise<void>;
};

export function ShoppingPage({ shopping, onGenerate, onAddToCart }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Shopping List</h2>
      <div className="flex gap-2">
        <button onClick={onGenerate} className="rounded bg-brand-500 px-4 py-2 text-white">Generate</button>
        <button onClick={onAddToCart} className="rounded bg-slate-700 px-4 py-2 text-white">Add To Kroger Cart</button>
      </div>
      <div className="rounded-xl bg-white p-4 shadow">
        {!shopping && <p className="text-sm text-slate-500">No shopping list generated yet.</p>}
        {shopping && (
          <ul className="space-y-2">
            {(shopping.items || []).map((item: any, idx: number) => (
              <li key={`${item.ingredientId}-${idx}`} className="border-b pb-2 text-sm">
                {item.ingredientId}: {item.quantity} {item.unit} {item.upc ? `(UPC ${item.upc})` : "(missing mapping)"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}