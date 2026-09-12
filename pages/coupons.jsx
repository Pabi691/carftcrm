import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiPlus, FiX, FiEdit2, FiTrash2, FiGift } from "react-icons/fi";

const PER_PAGE = 15;

function CouponForm({ initial, onSave, onClose }) {
  const { api } = useAdmin();
  const [form, setForm] = useState({
    coupon_code: "", visibility: "public", discount_type: "Percentage", discount_value: "", minimum_order_value: "",
    maximum_discount: "", usage_limit: "", start_date: "", end_date: "", description: "",
    ...(initial || {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.coupon_code || !form.discount_value) return setError("Code and discount value are required");
    if (!form.description) return setError("Description is required");
    if (!form.start_date || !form.end_date) return setError("Start and end date are required");
    setSaving(true); setError("");
    try {
      const res = initial
        ? await api("post", `/update_coupon/${initial.id}`, form)
        : await api("post", "/create_coupon", form);
      if (!res.data?.status) {
        const validationErrors = res.data?.response;
        setError(
          validationErrors
            ? Object.values(validationErrors).flat().join(" ")
            : (res.data?.message || "Save failed")
        );
        setSaving(false);
        return;
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
      <form onSubmit={submit} className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">{initial ? "Edit" : "Add"} Coupon</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FiX size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {[
            { key: "coupon_code",          label: "Coupon Code *",       type: "text",   placeholder: "e.g. SAVE10" },
            { key: "description",          label: "Description *",       type: "text",   placeholder: "Shown to customers" },
            { key: "discount_value",       label: "Discount Value *",    type: "number", placeholder: "e.g. 10" },
            { key: "minimum_order_value",  label: "Min Order Value",     type: "number", placeholder: "e.g. 500" },
            { key: "maximum_discount",     label: "Max Discount Cap",    type: "number", placeholder: "e.g. 200" },
            { key: "usage_limit",          label: "Usage Limit",         type: "number", placeholder: "Leave blank for unlimited" },
            { key: "start_date",           label: "Start Date *",        type: "date" },
            { key: "end_date",             label: "End Date *",          type: "date" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">{label}</label>
              <input type={type} value={form[key] || ""} onChange={set(key)} placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Discount Type</label>
              <select value={form.discount_type || "Percentage"} onChange={set("discount_type")}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466] bg-white">
                <option value="Percentage">Percentage (%)</option>
                <option value="Fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Visibility</label>
              <select value={form.visibility || "public"} onChange={set("visibility")}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466] bg-white">
                <option value="public">Public — shown to all customers</option>
                <option value="private">Private — code only, not listed</option>
              </select>
            </div>
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

export default function Coupons() {
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
      const res = await api("get", "/get_all_coupons");
      setItems(Array.isArray(res.data?.coupons) ? res.data.coupons : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetch(); }, [ready, fetch]);

  const toggleStatus = async (id, current) => {
    const next = current == 1 ? 0 : 1;
    await api("get", `/update_coupon_status/${id}/${next}`);
    setItems((prev) => prev.map((c) => c.id === id ? { ...c, is_active: next } : c));
  };

  const remove = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    await api("get", `/delete_coupon/${id}`);
    setItems((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return !q || (c.coupon_code || "").toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!ready) return null;

  return (
    <AdminLayout title="Coupons">
      <Head><title>Coupons — C&W Admin</title></Head>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search coupons..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors whitespace-nowrap">
          <FiPlus size={16} /> Add Coupon
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">{items.length === 0 ? "No coupons yet." : "No results found."}</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Code</th>
                    <th className="px-5 py-3.5 text-left">Visibility</th>
                    <th className="px-5 py-3.5 text-left">Discount</th>
                    <th className="px-5 py-3.5 text-left">Min Order</th>
                    <th className="px-5 py-3.5 text-left">Expires</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <FiGift size={14} className="text-[#203466]" />
                          <span className="font-mono font-bold text-gray-800">{c.coupon_code}</span>
                        </div>
                        {c.description && <p className="text-xs text-gray-400 mt-0.5 ml-5">{c.description}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${c.visibility === "private" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                          {c.visibility === "private" ? "Private" : "Public"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">
                        {c.discount_type === "Percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{c.minimum_order_value ? `₹${c.minimum_order_value}` : "—"}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {c.end_date ? new Date(c.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "No expiry"}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleStatus(c.id, c.is_active)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${c.is_active == 1 ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                          {c.is_active == 1 ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditing(c); setFormOpen(true); }}
                            className="w-8 h-8 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center hover:bg-[#203466]/20">
                            <FiEdit2 size={13} />
                          </button>
                          <button onClick={() => remove(c.id)}
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
              {paginated.map((c) => (
                <div key={c.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#203466]/10 flex items-center justify-center flex-shrink-0">
                      <FiGift size={18} className="text-[#203466]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-mono font-bold text-gray-800">{c.coupon_code}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${c.visibility === "private" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                          {c.visibility === "private" ? "Private" : "Public"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {c.discount_type === "Percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                        {c.minimum_order_value ? ` · Min ₹${c.minimum_order_value}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleStatus(c.id, c.is_active)}
                        className={`text-xs px-2 py-1 rounded-lg font-semibold ${c.is_active == 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {c.is_active == 1 ? "Active" : "Off"}
                      </button>
                      <button onClick={() => { setEditing(c); setFormOpen(true); }} className="w-7 h-7 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center"><FiEdit2 size={12} /></button>
                      <button onClick={() => remove(c.id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
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
        <CouponForm initial={editing} onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={() => { setFormOpen(false); setEditing(null); fetch(); }} />
      )}
    </AdminLayout>
  );
}
