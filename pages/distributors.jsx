import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiPlus, FiX, FiEdit2, FiTrash2 } from "react-icons/fi";

const PER_PAGE = 15;

function DistributorForm({ initial, onSave, onClose }) {
  const { api } = useAdmin();
  const [form, setForm]     = useState({ name: "", email: "", mobile_no: "", password: "", ...(initial || {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return setError("Name is required");
    setSaving(true);
    setError("");
    try {
      const payload = { name: form.name, email: form.email, mobile_no: form.mobile_no };
      if (form.password) payload.password = form.password;
      if (initial) {
        await api("post", `/update_distributor/${initial.id}`, payload);
      } else {
        await api("post", "/create_distributor", { ...payload, password: form.password });
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
      <form onSubmit={submit} className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{initial ? "Edit" : "Add"} Distributor</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <FiX size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {[
            { key: "name",      label: "Full Name *", type: "text" },
            { key: "email",     label: "Email",       type: "email" },
            { key: "mobile_no", label: "Mobile",      type: "tel" },
            { key: "password",  label: initial ? "New Password (leave blank to keep)" : "Password *", type: "password" },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">{label}</label>
              <input type={type} value={form[key] || ""} onChange={set(key)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-[#203466] hover:bg-[#152548] text-white rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Distributors() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_distributors");
      setItems(Array.isArray(res.data?.distributors) ? res.data.distributors : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetch(); }, [ready, fetch]);

  const toggleStatus = async (id, current) => {
    const next = current == 1 ? 0 : 1;
    await api("get", `/update_distributor_status/${id}/${next}`);
    setItems((prev) => prev.map((d) => d.id === id ? { ...d, status: next } : d));
  };

  const remove = async (id) => {
    if (!confirm("Delete this distributor?")) return;
    await api("delete", `/delete_distributor/${id}`);
    setItems((prev) => prev.filter((d) => d.id !== id));
  };

  const filtered = items.filter((d) => {
    const q = search.toLowerCase();
    return !q || (d.name || "").toLowerCase().includes(q) || (d.email || "").toLowerCase().includes(q) || (d.mobile_no || "").includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!ready) return null;

  return (
    <AdminLayout title="Distributors">
      <Head><title>Distributors — C&W Admin</title></Head>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search distributors..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-[#203466]/20 whitespace-nowrap">
          <FiPlus size={16} /> Add Distributor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            {items.length === 0 ? "No distributors yet. Add one to get started." : "No results found."}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Name</th>
                    <th className="px-5 py-3.5 text-left">Email</th>
                    <th className="px-5 py-3.5 text-left">Mobile</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-left">Joined</th>
                    <th className="px-5 py-3.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 text-xs font-bold flex-shrink-0">
                            {(d.name?.[0] || "D").toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{d.email || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-500">{d.mobile_no || "—"}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleStatus(d.id, d.status)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors
                            ${d.status == 1 ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                          {d.status == 1 ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditing(d); setFormOpen(true); }}
                            className="w-8 h-8 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center hover:bg-[#203466]/20 transition-colors">
                            <FiEdit2 size={13} />
                          </button>
                          <button onClick={() => remove(d.id)}
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
              {paginated.map((d) => (
                <div key={d.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold flex-shrink-0">
                      {(d.name?.[0] || "D").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{d.name}</p>
                      <p className="text-xs text-gray-400 truncate">{d.email || d.mobile_no || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleStatus(d.id, d.status)}
                        className={`text-xs px-2 py-1 rounded-lg font-semibold ${d.status == 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {d.status == 1 ? "Active" : "Off"}
                      </button>
                      <button onClick={() => { setEditing(d); setFormOpen(true); }} className="w-7 h-7 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center"><FiEdit2 size={12} /></button>
                      <button onClick={() => remove(d.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                    </div>
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
        <DistributorForm initial={editing} onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={() => { setFormOpen(false); setEditing(null); fetch(); }} />
      )}
    </AdminLayout>
  );
}
