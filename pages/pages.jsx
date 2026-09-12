import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiPlus, FiX, FiEdit2, FiTrash2, FiFileText } from "react-icons/fi";

const PER_PAGE = 15;

function PageForm({ initial, onSave, onClose }) {
  const { api } = useAdmin();
  const [form, setForm] = useState({
    title: "", slug: "", content: "", meta_title: "", meta_description: "",
    ...(initial || {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title) return setError("Title is required");
    setSaving(true); setError("");
    try {
      const payload = { ...form, slug: form.slug || autoSlug(form.title) };
      if (initial) {
        await api("post", `/update_page/${initial.id}`, payload);
      } else {
        await api("post", "/create_page", payload);
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
      <form onSubmit={submit} className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">{initial ? "Edit" : "Add"} Page</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FiX size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Page Title *</label>
            <input type="text" value={form.title || ""} onChange={(e) => {
              setForm((f) => ({ ...f, title: e.target.value, slug: f.slug || autoSlug(e.target.value) }));
            }} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Slug</label>
            <input type="text" value={form.slug || ""} onChange={set("slug")} placeholder="auto-generated from title"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466] font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Content</label>
            <textarea value={form.content || ""} onChange={set("content")} rows={8}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466] resize-y" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Meta Title</label>
              <input type="text" value={form.meta_title || ""} onChange={set("meta_title")}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Meta Description</label>
              <input type="text" value={form.meta_description || ""} onChange={set("meta_description")}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 bg-[#203466] hover:bg-[#152548] text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Update" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Pages() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_all_pages");
      setItems(Array.isArray(res.data?.pages) ? res.data.pages : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetch(); }, [ready, fetch]);

  const toggleStatus = async (id, current) => {
    const next = current == 1 ? 0 : 1;
    await api("get", `/update_page_status/${id}/${next}`);
    setItems((prev) => prev.map((p) => p.id === id ? { ...p, status: next } : p));
  };

  const remove = async (id) => {
    if (!confirm("Delete this page?")) return;
    await api("delete", `/delete_page/${id}`);
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return !q || (p.title || "").toLowerCase().includes(q) || (p.slug || "").toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!ready) return null;

  return (
    <AdminLayout title="Pages">
      <Head><title>Pages — C&W Admin</title></Head>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search pages..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors whitespace-nowrap">
          <FiPlus size={16} /> Add Page
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">{items.length === 0 ? "No pages yet." : "No results found."}</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Title</th>
                    <th className="px-5 py-3.5 text-left">Slug</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-left">Updated</th>
                    <th className="px-5 py-3.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <FiFileText size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-800">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">/{p.slug}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleStatus(p.id, p.status)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${p.status == 1 ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                          {p.status == 1 ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {p.updated_at ? new Date(p.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditing(p); setFormOpen(true); }}
                            className="w-8 h-8 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center hover:bg-[#203466]/20">
                            <FiEdit2 size={13} />
                          </button>
                          <button onClick={() => remove(p.id)}
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
              {paginated.map((p) => (
                <div key={p.id} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <FiFileText size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{p.title}</p>
                    <p className="text-xs text-gray-400 font-mono">/{p.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleStatus(p.id, p.status)}
                      className={`text-xs px-2 py-1 rounded-lg font-semibold ${p.status == 1 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.status == 1 ? "Live" : "Draft"}
                    </button>
                    <button onClick={() => { setEditing(p); setFormOpen(true); }} className="w-7 h-7 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center"><FiEdit2 size={12} /></button>
                    <button onClick={() => remove(p.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
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
        <PageForm initial={editing} onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={() => { setFormOpen(false); setEditing(null); fetch(); }} />
      )}
    </AdminLayout>
  );
}
