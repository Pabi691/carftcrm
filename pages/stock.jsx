import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiBox, FiAlertTriangle, FiCheck } from "react-icons/fi";

const LOW_STOCK_THRESHOLD = 5;

function StockCell({ id, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => setVal(value), [value]);

  if (!editing) {
    const low = Number(value) <= LOW_STOCK_THRESHOLD;
    return (
      <button
        onClick={() => setEditing(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
          ${value == 0 ? "bg-red-50 text-red-600" : low ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"}`}
      >
        {low && <FiAlertTriangle size={11} />}
        {value} in stock
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        autoFocus
        className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#203466]"
      />
      <button
        disabled={saving}
        onClick={async () => { setSaving(true); await onSave(id, val); setSaving(false); setEditing(false); }}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#203466] text-white disabled:opacity-50"
      >
        <FiCheck size={13} />
      </button>
    </div>
  );
}

export default function Stock() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_stock_report");
      setProducts(Array.isArray(res.data?.products) ? res.data.products : []);
    } catch { setProducts([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchStock(); }, [ready, fetchStock]);

  const updateProductStock = async (id, stock_qty) => {
    try {
      await api("post", `/update_product_stock/${id}`, { stock_qty });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock_qty } : p)));
    } catch {}
  };

  const updateVariationStock = async (productId, variation, stock_qty) => {
    try {
      await api("post", `/update_product_variation/${variation.id}`, {
        regular_price: variation.regular_price,
        sale_price: variation.sale_price,
        stock_qty,
      });
      setProducts((prev) => prev.map((p) => {
        if (p.id !== productId) return p;
        return { ...p, product_variations: p.product_variations.map((v) => (v.id === variation.id ? { ...v, stock_qty } : v)) };
      }));
    } catch {}
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || p.prod_name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    const matchesLow = !lowOnly || Number(p.stock_qty) <= LOW_STOCK_THRESHOLD ||
      (p.product_variations || []).some((v) => Number(v.stock_qty) <= LOW_STOCK_THRESHOLD);
    return matchesSearch && matchesLow;
  });

  if (!ready) return null;

  return (
    <AdminLayout title="Stock">
      <Head><title>Stock — C&W Admin</title></Head>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <FiBox size={17} className="text-[#203466]" />
        </div>
        <p className="text-xs text-gray-400">Inventory levels for all products and variations</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or SKU..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <button onClick={() => setLowOnly((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap
            ${lowOnly ? "bg-yellow-500 text-white border-yellow-500" : "bg-white text-gray-600 border-gray-200 hover:border-yellow-400"}`}>
          <FiAlertTriangle size={14} /> Low / Out of Stock
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-5 py-3.5 text-left">Product</th>
                  <th className="px-5 py-3.5 text-left">SKU</th>
                  <th className="px-5 py-3.5 text-left">Stock</th>
                  <th className="px-5 py-3.5 text-left">Variations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors align-top">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{p.prod_name}</td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{p.sku || "—"}</td>
                    <td className="px-5 py-3.5"><StockCell id={p.id} value={p.stock_qty} onSave={updateProductStock} /></td>
                    <td className="px-5 py-3.5">
                      {(p.product_variations || []).length === 0 ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {p.product_variations.map((v) => (
                            <div key={v.id} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-28 truncate">{v.color} / {v.size}</span>
                              <StockCell id={v.id} value={v.stock_qty} onSave={(_, val) => updateVariationStock(p.id, v, val)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
