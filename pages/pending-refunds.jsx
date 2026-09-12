import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiRotateCcw, FiCheck } from "react-icons/fi";

export default function PendingRefunds() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const isCancelled = (o) => (o.order_status?.status_description || "").toLowerCase().includes("cancel");

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_orders");
      const orders = Array.isArray(res.data?.orderList) ? res.data.orderList : [];
      const pending = [];
      orders.forEach((o) => {
        if (!isCancelled(o)) return;
        (o.order_payments || [])
          .filter((p) => p.payment_method !== "COD" && p.payment_status === "completed" && p.refund_status !== "refunded")
          .forEach((p) => pending.push({ ...p, order: o }));
      });
      setRows(pending);
    } catch { setRows([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchRefunds(); }, [ready, fetchRefunds]);

  const markRefunded = async (orderId) => {
    setBusyId(orderId);
    try {
      await api("post", `/mark_refund_completed/${orderId}`);
      setRows((prev) => prev.filter((r) => r.order_id !== orderId));
    } catch {}
    setBusyId(null);
  };

  const getName = (o) => o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "—";

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || String(r.order_id).includes(q) || getName(r.order).toLowerCase().includes(q);
  });

  if (!ready) return null;

  return (
    <AdminLayout title="Pending Refunds">
      <Head><title>Pending Refunds — C&W Admin</title></Head>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
          <FiRotateCcw size={17} className="text-orange-500" />
        </div>
        <p className="text-xs text-gray-400">Cancelled orders with a completed online payment awaiting manual refund</p>
      </div>

      <div className="relative mb-5">
        <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID or customer..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No pending refunds — all caught up.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-5 py-3.5 text-left">Order</th>
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Method</th>
                  <th className="px-5 py-3.5 text-left">Amount</th>
                  <th className="px-5 py-3.5 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-700">#{r.order_id}</td>
                    <td className="px-5 py-3.5 text-gray-700">{getName(r.order)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{r.payment_method}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800">₹{parseFloat(r.payment_amount || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5">
                      <button
                        disabled={busyId === r.order_id}
                        onClick={() => markRefunded(r.order_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50">
                        <FiCheck size={12} /> Mark Refunded
                      </button>
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
