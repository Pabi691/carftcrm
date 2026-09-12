import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiPlus, FiX, FiEdit2, FiTrash2 } from "react-icons/fi";

const PER_PAGE = 20;

function SizeForm({ initial, onSave, onClose }) {
  const { api } = useAdmin();
  const [form, setForm] = useState({
    size_name: initial?.size_name || "",
    size_code: initial?.size_code || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.size_name || !form.size_code) return setError("Size name and code are required");
    setSaving(true); setError("");
    try {
      if (initial) {
        await api("post", `/update_size/${initial.id}`, { size_name: form.size_name, size_code: form.size_code });
      } else {
        await api("post", "/create_size", { size_name: form.size_name, size_code: form.size_code });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message ? JSON.stringify(err.response.data.message) : "Save failed");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{initial ? "Edit" : "Add"} Size</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FiX size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Size Name *</label>
            <input type="text" value={form.size_name} onChange={set("size_name")} placeholder="e.g. Small, Medium, XL"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Size Code *</label>
            <input type="text" value={form.size_code} onChange={set("size_code")} placeholder="e.g. S, M, XL, 42"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]" />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 bg-[#203466] hover:bg-[#152548] text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Sizes() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_all_sizes");
      setItems(Array.isArray(res.data?.sizes) ? res.data.sizes : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetch(); }, [ready, fetch]);

  const remove = async (id) => {
    if (!confirm("Delete this size?")) return;
    await api("get", `/delete_size/${id}`);
    setItems((prev) => prev.filter((s) => s.id !== id));
  };

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    return !q || (s.size_name || "").toLowerCase().includes(q) || (s.size_code || "").toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!ready) return null;

  return (
    <AdminLayout title="Sizes">
      <Head><title>Sizes — C&W Admin</title></Head>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search sizes..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors whitespace-nowrap">
          <FiPlus size={16} /> Add Size
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">{items.length === 0 ? "No sizes yet." : "No results found."}</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Size Name</th>
                    <th className="px-5 py-3.5 text-left">Code</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-bold flex-shrink-0">
                            {(s.size_code || s.size_name || "S")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{s.size_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-600">{s.size_code}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${s.status == 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {s.status == 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditing(s); setFormOpen(true); }}
                            className="w-8 h-8 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center hover:bg-[#203466]/20">
                            <FiEdit2 size={13} />
                          </button>
                          <button onClick={() => remove(s.id)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden divide-y divide-gray-50">
              {paginated.map((s) => (
                <div key={s.id} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                    {s.size_code || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{s.size_name}</p>
                    <p className="text-xs text-gray-400">Code: {s.size_code}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setEditing(s); setFormOpen(true); }} className="w-7 h-7 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center"><FiEdit2 size={12} /></button>
                    <button onClick={() => remove(s.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><FiChevronLeft size={15} /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40"><FiChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {formOpen && (
        <SizeForm initial={editing} onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={() => { setFormOpen(false); setEditing(null); fetch(); }} />
      )}
    </AdminLayout>
  );
}
