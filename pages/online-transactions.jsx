import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiCreditCard } from "react-icons/fi";

const STATUS_STYLES = {
  completed: { bg: "bg-green-50", text: "text-green-700" },
  pending:   { bg: "bg-yellow-50", text: "text-yellow-700" },
  failed:    { bg: "bg-red-50", text: "text-red-700" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-500" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${s.bg} ${s.text}`}>{status}</span>;
}

export default function OnlineTransactions() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_orders");
      const orders = Array.isArray(res.data?.orderList) ? res.data.orderList : [];
      const rows = [];
      orders.forEach((o) => {
        (o.order_payments || [])
          .filter((p) => p.payment_method !== "COD")
          .forEach((p) => rows.push({ ...p, order: o }));
      });
      rows.sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at));
      setTransactions(rows);
    } catch { setTransactions([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchTransactions(); }, [ready, fetchTransactions]);

  const getName = (o) => o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "—";

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || String(t.order_id).includes(q) || getName(t.order).toLowerCase().includes(q) || (t.payment_reference || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || t.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!ready) return null;

  return (
    <AdminLayout title="Online Transactions">
      <Head><title>Online Transactions — C&W Admin</title></Head>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <FiCreditCard size={17} className="text-[#203466]" />
        </div>
        <p className="text-xs text-gray-400">Online (non-COD) payment reconciliation across all orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer, or reference..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-[#203466]">
          {["All", "pending", "completed", "failed", "cancelled"].map((s) => (
            <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                  <th className="px-5 py-3.5 text-left">Order</th>
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Method</th>
                  <th className="px-5 py-3.5 text-left">Reference</th>
                  <th className="px-5 py-3.5 text-left">Amount</th>
                  <th className="px-5 py-3.5 text-left">Status</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-700">#{t.order_id}</td>
                    <td className="px-5 py-3.5 text-gray-700">{getName(t.order)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{t.payment_method}</td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{t.payment_reference || "—"}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800">₹{parseFloat(t.payment_amount || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={t.payment_status} /></td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {t.payment_date ? new Date(t.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
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
