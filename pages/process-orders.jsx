import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiTruck, FiPackage, FiCheck } from "react-icons/fi";

export default function ProcessOrders() {
  const { ready } = useAuthGuard();
  const { api }   = useAdmin();

  const [orders, setOrders]         = useState([]);
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");

  // Selection + assignment state
  const [selected, setSelected]         = useState({}); // { [orderId]: sl_no }
  const [shippingProvider, setShippingProvider] = useState("shiprocket"); // only option for now
  const [orderStatus, setOrderStatus]   = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [msg, setMsg]                   = useState(null); // { text, ok }

  const load = useCallback(async () => {
    setLoading(true);
    setSelected({});
    try {
      const ordRes = await api("get", "/get_new_orders");
      const list = Array.isArray(ordRes.data?.orderList) ? ordRes.data.orderList : [];
      setOrders(list);
      setStatusList(Array.isArray(ordRes.data?.next_status_list) ? ordRes.data.next_status_list : []);
    } catch { setOrders([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const getName = (o) => `${o.first_name || ""} ${o.last_name || ""}`.trim() || "—";

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || String(o.id).includes(q) || getName(o).toLowerCase().includes(q) || String(o.mobile_number || "").includes(q);
  });

  // Checkbox logic
  const allChecked  = filtered.length > 0 && filtered.every((o) => selected[o.id] !== undefined);
  const someChecked = filtered.some((o) => selected[o.id] !== undefined);

  const toggleAll = () => {
    if (allChecked) {
      setSelected({});
    } else {
      const next = {};
      filtered.forEach((o, i) => { next[o.id] = i + 1; });
      setSelected(next);
    }
  };

  const toggleOne = (o) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[o.id] !== undefined) {
        delete next[o.id];
      } else {
        next[o.id] = Object.keys(next).length + 1;
      }
      return next;
    });
  };

  const selectedIds  = Object.keys(selected).map(Number);
  const canSubmit    = selectedIds.length > 0 && shippingProvider && orderStatus;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setMsg(null);
    try {
      const order_list = selectedIds.map((id) => ({ id, sl_no: selected[id] }));
      // Shiprocket is the only provider for now — routed to its own endpoint,
      // which creates the shipment and stores shiprocket_awb/status per order
      // (the same fields the automatic checkout-time attempt already uses).
      const res = await api("post", "/assign_shiprocket_to_orders", {
        order_list,
        order_status: parseInt(orderStatus),
      });
      if (res.data?.status) {
        setMsg({ text: res.data.message || "Orders assigned successfully!", ok: true });
        await load(); // refresh list
        setOrderStatus("");
      } else {
        setMsg({ text: res.data?.message || "Assignment failed.", ok: false });
      }
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "Something went wrong.", ok: false });
    }
    setSubmitting(false);
  };

  if (!ready) return null;

  const SELECT_CLS = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#203466] bg-white text-gray-800";

  return (
    <AdminLayout title="Process Orders">
      <Head><title>Process Orders — C&W Admin</title></Head>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FiTruck size={17} className="text-blue-600" />
        </div>
        <div>
          <p className="text-xs text-gray-400">Select orders, choose a shipping provider and new status, then submit.</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); }}
            placeholder="Search by order ID, customer name or mobile..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <p className="text-sm text-gray-400 font-medium self-center whitespace-nowrap">
          {filtered.length} orders · {selectedIds.length} selected
        </p>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl border mb-4 ${msg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"}`}>
          {msg.text}
        </div>
      )}

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            <FiPackage size={32} className="mx-auto text-gray-200 mb-3" />
            {orders.length === 0 ? "No new orders to process." : "No results found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-5 py-3.5 text-left w-10">
                    <input type="checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-[#203466] cursor-pointer" />
                  </th>
                  <th className="px-5 py-3.5 text-left">Order</th>
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Qty</th>
                  <th className="px-5 py-3.5 text-left">Amount</th>
                  <th className="px-5 py-3.5 text-left">Status</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((o) => {
                  const checked = selected[o.id] !== undefined;
                  return (
                    <tr key={o.id} onClick={() => toggleOne(o)}
                      className={`cursor-pointer transition-colors ${checked ? "bg-blue-50/60" : "hover:bg-gray-50/70"}`}>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(o)}
                          className="w-4 h-4 rounded accent-[#203466] cursor-pointer" />
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-700">
                        #{o.id}
                        {checked && (
                          <span className="ml-2 text-[10px] bg-[#203466] text-white rounded px-1.5 py-0.5 font-bold">#{selected[o.id]}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800">{getName(o)}</p>
                        {o.mobile_number && <p className="text-xs text-gray-400">{o.mobile_number}</p>}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-700">
                        {o.total_quantity ?? "—"}
                        {o.total_packet > 0 && <span className="ml-1 text-xs text-gray-400">({o.total_packet} pkt)</span>}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">
                        ₹{parseFloat(o.bill_amt || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-blue-50 text-blue-700">
                          {o.order_status_name || "Processing"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment bar — always visible */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-4">Assign Selected Orders</p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 font-semibold block mb-1">Shipping Provider</label>
            <select value={shippingProvider} onChange={(e) => setShippingProvider(e.target.value)} className={SELECT_CLS + " w-full"}>
              <option value="shiprocket">Shiprocket</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 font-semibold block mb-1">Update Order Status</label>
            <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className={SELECT_CLS + " w-full"}>
              <option value="">— Select New Status —</option>
              {statusList.map((s) => (
                <option key={s.id} value={s.id}>{s.status_description}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap self-end">
            <FiCheck size={15} />
            {submitting ? "Assigning…" : `Assign ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
          </button>
        </div>
        {!canSubmit && selectedIds.length > 0 && (
          <p className="text-xs text-amber-600 mt-2">Select a shipping provider and new order status to continue.</p>
        )}
        {selectedIds.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">Select at least one order from the table above.</p>
        )}
      </div>
    </AdminLayout>
  );
}
