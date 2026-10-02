import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiEye, FiAlertCircle } from "react-icons/fi";

const PER_PAGE = 15;

export default function ReturnOrders() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const router = useRouter();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_return_orders");
      setOrders(Array.isArray(res.data?.orderList) ? res.data.orderList : []);
    } catch { setOrders([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetch(); }, [ready, fetch]);

  const getName = (o) => o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "—";

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || String(o.id).includes(q) || getName(o).toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!ready) return null;

  return (
    <AdminLayout title="Return Orders">
      <Head><title>Return Orders — C&W Admin</title></Head>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
          <FiAlertCircle size={17} className="text-orange-500" />
        </div>
        <p className="text-xs text-gray-400">Orders returned or under return review</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search return orders..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <p className="text-sm text-gray-400 font-medium self-center whitespace-nowrap">{filtered.length} orders</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">
            {orders.length === 0 ? "No return orders." : "No results found."}
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Order</th>
                    <th className="px-5 py-3.5 text-left">Customer</th>
                    <th className="px-5 py-3.5 text-left">Amount</th>
                    <th className="px-5 py-3.5 text-left">Return Reason</th>
                    <th className="px-5 py-3.5 text-left">Date</th>
                    <th className="px-5 py-3.5 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-700">#{o.id}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800">{getName(o)}</p>
                        <p className="text-xs text-gray-400">{o.customer?.email || ""}</p>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">₹{parseFloat(o.pay_amt || 0).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">
                        {o.order_return?.reason || o.return_reason || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => router.push(`/orders/view?id=${o.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#203466]/10 text-[#203466] text-xs font-semibold hover:bg-[#203466]/20">
                          <FiEye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden divide-y divide-gray-50">
              {paginated.map((o) => (
                <div key={o.id} className="px-4 py-3.5" onClick={() => router.push(`/orders/view?id=${o.id}`)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-gray-700 text-sm">#{o.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 font-semibold">Returned</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{getName(o)}</p>
                  {(o.order_return?.reason || o.return_reason) && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{o.order_return?.reason || o.return_reason}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-semibold text-gray-800 text-sm">₹{parseFloat(o.pay_amt || 0).toLocaleString("en-IN")}</span>
                    <span className="text-xs text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""}</span>
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
    </AdminLayout>
  );
}
