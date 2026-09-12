import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiX, FiUser, FiPlus, FiShoppingBag, FiMapPin, FiRefreshCw } from "react-icons/fi";

const PER_PAGE = 15;

const STATUS_COLOR = {
  pending:    "bg-yellow-50 text-yellow-700",
  processing: "bg-blue-50 text-blue-700",
  shipped:    "bg-purple-50 text-purple-700",
  delivered:  "bg-green-50 text-green-700",
  cancelled:  "bg-red-50 text-red-600",
};

function getOrderStatusLabel(order) {
  const s = order?.order_status;
  if (!s) return "";
  if (typeof s === "object") return s.status_description || "";
  if (typeof s === "string") return s;
  return "";
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────
function AddCustomerForm({ onClose, onSaved }) {
  const { api } = useAdmin();
  const [form, setForm] = useState({ name: "", email: "", mobile_no: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.mobile_no || !form.password)
      return setError("All fields are required");
    setSaving(true); setError("");
    try {
      const res = await api("post", "/create_customer_admin", form);
      if (!res.data?.status) return setError(res.data?.message || "Failed to create customer");
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create customer");
    }
    setSaving(false);
  };

  const INPUT = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Add Customer</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FiX size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {[
            { key: "name",      label: "Full Name *",  type: "text",     ph: "Enter full name" },
            { key: "email",     label: "Email *",      type: "email",    ph: "Email address" },
            { key: "mobile_no", label: "Mobile *",     type: "tel",      ph: "10-digit mobile" },
            { key: "password",  label: "Password *",   type: "password", ph: "Min 6 characters" },
          ].map(({ key, label, type, ph }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={set(key)} placeholder={ph} className={INPUT} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 bg-[#203466] hover:bg-[#152548] text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {saving ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Customer Detail Panel ────────────────────────────────────────────────────
function CustomerPanel({ customer, onClose, onStatusChange, onRoleChange }) {
  const { api } = useAdmin();
  const [detail, setDetail]     = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [tab, setTab]           = useState("info");
  const [changingRole, setChangingRole] = useState(false);
  const [roleMsg, setRoleMsg]   = useState("");

  const load = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const res = await api("get", `/getCustomerById/${customer.id}`);
      setDetail(res.data?.customerData || null);
    } catch { setDetail(null); }
    setLoadingDetail(false);
  }, [api, customer.id]);

  useEffect(() => { load(); }, [load]);

  const currentRole = detail?.user?.role || "customer";
  const isDistributor = currentRole === "distributor";

  const handleRoleChange = async () => {
    const newRole = isDistributor ? "customer" : "distributor";
    if (!confirm(`Change this account to ${newRole}?`)) return;
    setChangingRole(true); setRoleMsg("");
    try {
      const res = await api("get", `/change_customer_role/${customer.id}/${newRole}`);
      if (res.data?.status) {
        setRoleMsg(res.data.message);
        await load();
        onRoleChange?.();
      } else {
        setRoleMsg(res.data?.message || "Failed.");
      }
    } catch { setRoleMsg("Failed to change role."); }
    setChangingRole(false);
  };

  const TABS = [
    { key: "info",    label: "Profile",  icon: <FiUser size={13} /> },
    { key: "orders",  label: `Orders${detail?.orders?.length ? ` (${detail.orders.length})` : ""}`, icon: <FiShoppingBag size={13} /> },
    { key: "address", label: "Address",  icon: <FiMapPin size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#203466]/10 flex items-center justify-center text-[#203466] font-bold">
              {(customer.first_name?.[0] || "C").toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{customer.first_name} {customer.last_name}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDistributor ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                  {isDistributor ? "Distributor" : "Customer"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${customer.is_active == 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {customer.is_active == 1 ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <FiX size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-0 border-b border-gray-100 flex-shrink-0">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap
                ${tab === t.key ? "border-[#203466] text-[#203466]" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {loadingDetail ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : !detail ? (
            <p className="text-center text-gray-400 text-sm py-10">Could not load customer details.</p>
          ) : (
            <>
              {/* ── Profile Tab ── */}
              {tab === "info" && (
                <div className="space-y-4">
                  {/* Role action */}
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Account Role</p>
                      <p className="font-bold text-gray-800 mt-0.5">{isDistributor ? "Distributor" : "Customer"}</p>
                    </div>
                    <button onClick={handleRoleChange} disabled={changingRole}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50
                        ${isDistributor ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-orange-50 text-orange-600 hover:bg-orange-100"}`}>
                      <FiRefreshCw size={12} className={changingRole ? "animate-spin" : ""} />
                      {changingRole ? "Changing..." : isDistributor ? "Make Customer" : "Make Distributor"}
                    </button>
                  </div>
                  {roleMsg && <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">{roleMsg}</p>}

                  {/* Info rows */}
                  {[
                    ["Email",       detail.email || detail.user?.email],
                    ["Mobile",      detail.mobile_number || detail.user?.mobile_no],
                    ["Alt Mobile",  detail.alt_mob_number],
                    ["Gender",      detail.gender],
                    ["Date of Birth", detail.dob],
                    ["City",        detail.city],
                    ["State",       detail.state],
                    ["Zip Code",    detail.zip_code],
                    ["Country",     detail.country],
                    ["Member Since", detail.user?.created_at ? new Date(detail.user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null],
                  ].map(([label, value]) => value ? (
                    <div key={label} className="flex justify-between items-start text-sm border-b border-gray-50 py-2.5">
                      <span className="text-gray-400 flex-shrink-0 w-32">{label}</span>
                      <span className="font-medium text-gray-800 text-right break-all">{value}</span>
                    </div>
                  ) : null)}

                  {/* Status toggle */}
                  <div className="pt-2 flex gap-2">
                    <button onClick={() => { onStatusChange(customer.id, customer.is_active); onClose(); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors
                        ${customer.is_active == 1 ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                      {customer.is_active == 1 ? "Deactivate Account" : "Activate Account"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Orders Tab ── */}
              {tab === "orders" && (
                <div>
                  {(!detail.orders || detail.orders.length === 0) ? (
                    <div className="py-12 text-center">
                      <FiShoppingBag size={32} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm">No orders yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detail.orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {order.bill_no ? `#${order.bill_no}` : `Order #${order.id}`}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(() => { const s = getOrderStatusLabel(order); return (
                              <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize ${STATUS_COLOR[s.toLowerCase()] || "bg-gray-100 text-gray-500"}`}>
                                {s || "—"}
                              </span>
                            ); })()}
                            <span className="font-bold text-gray-800 text-sm">
                              {order.pay_amt ? `₹${parseFloat(order.pay_amt).toLocaleString("en-IN")}` : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Address Tab ── */}
              {tab === "address" && (
                <div className="space-y-3">
                  {/* Shipping addresses from ecom_customer_shipping_addresses */}
                  {(detail.shipping_addresses || []).length > 0 ? (
                    (detail.shipping_addresses).map((addr, i) => (
                      <div key={addr.id || i} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                            {addr.address_label || `Address ${i + 1}`}
                          </p>
                          {addr.is_default == 1 && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#203466]/10 text-[#203466] rounded-full font-semibold">Default</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-1">{addr.full_name}</p>
                        <p className="text-sm text-gray-600">
                          {[addr.address_line_1, addr.address_line_2, addr.city, addr.state, addr.zip_code, addr.country]
                            .filter(Boolean).join(", ")}
                        </p>
                        {addr.mobile_number && (
                          <p className="text-xs text-gray-400 mt-1">📞 {addr.mobile_number}</p>
                        )}
                      </div>
                    ))
                  ) : (detail.address_line_1 || detail.city) ? (
                    /* Fallback: address fields on ecom_customers row */
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Primary Address</p>
                      <p className="text-sm text-gray-800 font-medium">
                        {[detail.address_line_1, detail.address_line_2, detail.city, detail.state, detail.zip_code, detail.country]
                          .filter(Boolean).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <FiMapPin size={32} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm">No address saved yet.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Customers() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState(null);
  const [addOpen, setAddOpen]     = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_all_customers");
      setCustomers(Array.isArray(res.data?.customers) ? res.data.customers : []);
    } catch { setCustomers([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetch(); }, [ready, fetch]);

  const toggleStatus = async (id, current) => {
    const next = current == 1 ? 0 : 1;
    await api("get", `/update_customer_status/${id}/${next}`);
    setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, is_active: next } : c));
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q
      || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
      || (c.email || "").toLowerCase().includes(q)
      || (c.mobile_number || "").includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!ready) return null;

  return (
    <AdminLayout title="Customers">
      <Head><title>Customers — C&W Admin</title></Head>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email or mobile..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400 font-medium whitespace-nowrap">{filtered.length} customers</p>
          <button onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors whitespace-nowrap">
            <FiPlus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No customers found</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Customer</th>
                    <th className="px-5 py-3.5 text-left">Mobile</th>
                    <th className="px-5 py-3.5 text-left">Gender</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-left">Joined</th>
                    <th className="px-5 py-3.5 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#203466]/10 flex items-center justify-center text-[#203466] text-xs font-bold flex-shrink-0">
                            {(c.first_name?.[0] || "C").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{c.mobile_number || "—"}</td>
                      <td className="px-5 py-3.5 text-gray-600 capitalize">{c.gender || "—"}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => toggleStatus(c.id, c.is_active)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors
                            ${c.is_active == 1 ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                          {c.is_active == 1 ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setSelected(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#203466]/10 text-[#203466] text-xs font-semibold hover:bg-[#203466]/20 transition-colors">
                          <FiUser size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="lg:hidden divide-y divide-gray-50">
              {paginated.map((c) => (
                <div key={c.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#203466]/10 flex items-center justify-center text-[#203466] text-sm font-bold flex-shrink-0">
                      {(c.first_name?.[0] || "C").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      {c.mobile_number && <p className="text-xs text-gray-400 mt-0.5">{c.mobile_number}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleStatus(c.id, c.is_active)}
                        className={`text-xs px-2 py-1 rounded-lg font-semibold ${c.is_active == 1 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {c.is_active == 1 ? "Active" : "Off"}
                      </button>
                      <button onClick={() => setSelected(c)} className="w-8 h-8 rounded-lg bg-[#203466]/10 text-[#203466] flex items-center justify-center">
                        <FiUser size={14} />
                      </button>
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
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40">
              <FiChevronLeft size={15} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-40">
              <FiChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {addOpen && (
        <AddCustomerForm
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); fetch(); }}
        />
      )}

      {/* Customer Detail Panel */}
      {selected && (
        <CustomerPanel
          customer={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(id, current) => toggleStatus(id, current)}
          onRoleChange={() => fetch()}
        />
      )}
    </AdminLayout>
  );
}
