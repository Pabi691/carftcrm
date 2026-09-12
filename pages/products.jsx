import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

const PER_PAGE_OPTIONS = [15, 25, 50, 100];

export default function Products() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const router = useRouter();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(15);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_products");
      setItems(Array.isArray(res.data?.productList) ? res.data.productList : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetch(); }, [ready, fetch]);

  const remove = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api("get", `/delete_product/${id}`);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete product.";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const getCategoryName = (p) => {
    if (Array.isArray(p.product_categories) && p.product_categories.length > 0) {
      return p.product_categories.map((c) => c.category_name).filter(Boolean).join(", ") || "—";
    }
    return "—";
  };

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return !q || (p.prod_name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  if (!ready) return null;

  return (
    <AdminLayout title="Products">
      <Head><title>Products — C&W Admin</title></Head>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <div className="flex items-center gap-2">
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white text-gray-600">
            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button onClick={() => router.push("/products/create")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-[#203466]/20 whitespace-nowrap">
            <FiPlus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            {items.length === 0 ? "No products yet. Add one to get started." : "No results found."}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Product</th>
                    <th className="px-5 py-3.5 text-left">SKU</th>
                    <th className="px-5 py-3.5 text-left">Category</th>
                    <th className="px-5 py-3.5 text-left">Price</th>
                    <th className="px-5 py-3.5 text-left">Stock</th>
                    <th className="px-5 py-3.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.primary_img ? (
                            <img src={p.primary_img} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">
                              {(p.prod_name?.[0] || "P").toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-gray-800 line-clamp-2 max-w-[220px]">{p.prod_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{p.sku || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{getCategoryName(p)}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">
                        {p.sale_price != null && p.sale_price !== ""
                          ? `₹${parseFloat(p.sale_price).toLocaleString("en-IN")}`
                          : p.regular_price != null && p.regular_price !== ""
                          ? `₹${parseFloat(p.regular_price).toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                          p.stock_qty > 10 ? "bg-green-50 text-green-700" :
                          p.stock_qty > 0  ? "bg-yellow-50 text-yellow-700" :
                          "bg-red-50 text-red-600"
                        }`}>
                          {p.stock_qty ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => router.push(`/products/${p.id}/edit`)}
                            className="w-8 h-8 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center hover:bg-[#203466]/20 transition-colors">
                            <FiEdit2 size={13} />
                          </button>
                          <button onClick={() => remove(p.id)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="lg:hidden divide-y divide-gray-50">
              {paginated.map((p) => (
                <div key={p.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {p.primary_img ? (
                      <img src={p.primary_img} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                        {(p.prod_name?.[0] || "P").toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm line-clamp-1">{p.prod_name}</p>
                      <p className="text-xs text-gray-400">{getCategoryName(p)} • {p.sku || ""}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">
                        {p.sale_price != null && p.sale_price !== ""
                          ? `₹${parseFloat(p.sale_price).toLocaleString("en-IN")}`
                          : p.regular_price != null && p.regular_price !== ""
                          ? `₹${parseFloat(p.regular_price).toLocaleString("en-IN")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => router.push(`/products/${p.id}/edit`)} className="w-8 h-8 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center"><FiEdit2 size={13} /></button>
                      <button onClick={() => remove(p.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-gray-400">
          {filtered.length > 0 ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} of ${filtered.length} products` : ""}
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><FiChevronLeft size={15} /></button>
            <span className="flex items-center text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><FiChevronRight size={15} /></button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
