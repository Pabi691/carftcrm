import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiChevronLeft, FiChevronRight, FiEye, FiUsers } from "react-icons/fi";

const TABS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
const PER_PAGE = 15;

// The real ecom_order_status_master rows (18 of them, confirmed from the DB)
// don't match these 6 tab names 1:1 — e.g. there's no status literally called
// "Pending" (it's "New Order") or "Returned" (it's "Return Requested" /
// "Return Accepted" / "Return  Collected" / "Return Received" / etc). Each tab
// buckets every real status that belongs to it. A couple of real rows also
// have stray whitespace ("Return  Collected" double space, "Order Cancelled "
// trailing space) — normalize() below collapses that before any comparison.
const TAB_GROUPS = {
  Pending:    ["New Order"],
  Processing: ["Processing", "Ready For Ship"],
  Shipped:    ["Shipped", "Out for Delivery"],
  Delivered:  ["Delivered", "Completed"],
  Cancelled:  ["Order Cancelled"],
  Returned:   ["Return Requested", "Return Accepted", "Return Collected", "Return Received", "Replace Requested", "Replace Accepted"],
};

const normalize = (s) => (s || "").trim().replace(/\s+/g, " ");

const STATUS_STYLES = {
  "New Order":          { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
  "Processing":         { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
  "Ready For Ship":     { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
  "Shipped":            { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  "Out for Delivery":   { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  "Delivered":          { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400" },
  "Completed":          { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400" },
  "Order Cancelled":    { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-400" },
  "Payment Failed":     { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-400" },
  "Return Requested":   { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Return Accepted":    { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Return Collected":   { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Return Received":    { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Replace Requested":  { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Replace Accepted":   { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "On Hold":            { bg: "bg-gray-50",   text: "text-gray-600",   dot: "bg-gray-400" },
  "Payment Processing": { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
  "Payment Refunded":   { bg: "bg-gray-50",   text: "text-gray-600",   dot: "bg-gray-400" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[normalize(status)] || { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {status}
    </span>
  );
}

// shiprocket_live_status is kept fresh by the /webhook/shiprocket endpoint
// (Shiprocket pushes it on every status change) and by the order detail
// page's "Check Live Status" button — so this reflects the real courier
// status (picked up / in transit / delivered / RTO / cancelled) whenever
// it's available, not just "did we successfully create the AWB".
function liveStatusStyle(label) {
  const l = label.toLowerCase();
  if (l.includes("cancel") || l.includes("rto")) return { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" };
  if (l.includes("deliver")) return { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" };
  if (l.includes("transit") || l.includes("pick") || l.includes("out for") || l.includes("shipped"))
    return { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-400" };
  return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" };
}

// Delhivery is the default courier, so its waybill is what this column shows;
// Shiprocket is only reported when an order went out that way instead.
function CourierBadge({ order }) {
  if (order.delhivery_awb) {
    return (
      <span title={`Delhivery AWB ${order.delhivery_awb}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Delhivery
      </span>
    );
  }
  if (!order.shiprocket_awb && !order.shiprocket_live_status && order.delhivery_status === "failed") {
    return (
      <span title={order.delhivery_last_error || "Delhivery assignment failed"}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Failed
      </span>
    );
  }
  return <ShiprocketBadge order={order} />;
}

function ShiprocketBadge({ order }) {
  if (order.shiprocket_live_status) {
    const s = liveStatusStyle(order.shiprocket_live_status);
    return (
      <span title={order.shiprocket_live_status_at ? `Updated ${new Date(order.shiprocket_live_status_at).toLocaleString("en-IN")}` : undefined}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${s.bg} ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {order.shiprocket_live_status}
      </span>
    );
  }
  if (order.shiprocket_awb) {
    return (
      <span title={`AWB ${order.shiprocket_awb} — no live status received yet`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Assigned
      </span>
    );
  }
  if (order.shiprocket_status === "failed") {
    return (
      <span title={order.shiprocket_last_error || "Shiprocket assignment failed"}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Failed
      </span>
    );
  }
  return <span className="text-xs text-gray-400">—</span>;
}

export default function Orders() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const router = useRouter();
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("All");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [distributorOnly, setDistributorOnly] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_orders");
      setOrders(Array.isArray(res.data?.orderList) ? res.data.orderList : []);
    } catch { setOrders([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchOrders(); }, [ready, fetchOrders]);

  const getStatus = (o) => normalize(o.order_status?.status_description) || "New Order";
  const getName   = (o) => o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "—";
  const getEmail  = (o) => o.customer?.email || "";
  const isDistributor = (o) => o.customer?.user?.role === "distributor";

  const distributorCount = orders.filter(isDistributor).length;

  // A tab matches if the order's real status is one of the statuses grouped
  // under that tab (see TAB_GROUPS) — not an exact string match against the
  // tab's own label, since none of the tab names except "Processing" and
  // "Shipped" are themselves real status values.
  const matchesTab = (o, t) => t === "All" || (TAB_GROUPS[t] || []).includes(getStatus(o));

  const filtered = orders.filter((o) => {
    const matchTab  = matchesTab(o, tab);
    const matchDist = !distributorOnly || isDistributor(o);
    const q = search.toLowerCase();
    return matchTab && matchDist && (!q || String(o.id).includes(q) || getName(o).toLowerCase().includes(q) || getEmail(o).toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (!ready) return null;

  return (
    <AdminLayout title="Orders">
      <Head><title>Orders — C&W Admin</title></Head>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by order ID or customer..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
        <button
          onClick={() => { setDistributorOnly((v) => !v); setPage(1); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap
            ${distributorOnly
              ? "bg-orange-500 text-white border-orange-500 shadow-sm"
              : "bg-white text-gray-600 border-gray-200 hover:border-orange-400 hover:text-orange-500"}`}>
          <FiUsers size={14} />
          Distributor Orders
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${distributorOnly ? "bg-white/20 text-white" : "bg-orange-50 text-orange-500"}`}>
            {distributorCount}
          </span>
        </button>
        <p className="text-sm text-gray-400 font-medium whitespace-nowrap">{filtered.length} orders</p>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-5 bg-white rounded-xl border border-gray-100 shadow-sm p-1">
        {TABS.map((t) => {
          const count = t === "All" ? orders.length : orders.filter((o) => matchesTab(o, t)).length;
          return (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                ${tab === t ? "bg-[#203466] text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
              {t}
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${tab === t ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : paginated.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No orders found</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                    <th className="px-5 py-3.5 text-left">Order</th>
                    <th className="px-5 py-3.5 text-left">Customer</th>
                    <th className="px-5 py-3.5 text-left">Amount</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-left">Courier</th>
                    <th className="px-5 py-3.5 text-left">Date</th>
                    <th className="px-5 py-3.5 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-gray-700">#{o.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{getName(o)}</p>
                          {isDistributor(o) && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-md font-bold uppercase tracking-wide">Distributor</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{getEmail(o)}</p>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">₹{parseFloat(o.pay_amt || 0).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={getStatus(o)} /></td>
                      <td className="px-5 py-3.5"><CourierBadge order={o} /></td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => router.push(`/orders/view?id=${o.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#203466]/10 text-[#203466] text-xs font-semibold hover:bg-[#203466]/20 transition-colors">
                          <FiEye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="lg:hidden divide-y divide-gray-50">
              {paginated.map((o) => (
                <div key={o.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-gray-700 text-sm">#{o.id}</span>
                    <div className="flex items-center gap-1.5">
                      <CourierBadge order={o} />
                      <StatusBadge status={getStatus(o)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{getName(o)}</p>
                    {isDistributor(o) && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-md font-bold uppercase tracking-wide flex-shrink-0">Dist.</span>
                    )}
                  </div>
                  {getEmail(o) && <p className="text-xs text-gray-400 truncate">{getEmail(o)}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-semibold text-gray-800 text-sm">₹{parseFloat(o.pay_amt || 0).toLocaleString("en-IN")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""}</span>
                      <button onClick={() => router.push(`/orders/view?id=${o.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#203466]/10 text-[#203466] text-xs font-semibold">
                        <FiEye size={12} /> View
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
          <p className="text-xs text-gray-400">Page {page} of {totalPages} — {filtered.length} orders</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <FiChevronLeft size={15} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <FiChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
