import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiCheckCircle, FiLink, FiCopy } from "react-icons/fi";

export default function DeliveredOrders() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [linkFor, setLinkFor] = useState({}); // order_item_id -> url
  const [busyId, setBusyId] = useState(null);

  const isDelivered = (o) => (o.order_status?.status_description || "").toLowerCase().includes("deliver");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_orders");
      const all = Array.isArray(res.data?.orderList) ? res.data.orderList : [];
      setOrders(all.filter(isDelivered));
    } catch { setOrders([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchOrders(); }, [ready, fetchOrders]);

  const generateLink = async (order, item) => {
    setBusyId(item.id);
    try {
      const res = await api("post", "/generate_review_link", {
        order_id: order.id,
        order_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
      });
      if (res.data?.status) {
        setLinkFor((prev) => ({ ...prev, [item.id]: res.data.review_url }));
      }
    } catch {}
    setBusyId(null);
  };

  const copyLink = (url) => {
    if (navigator?.clipboard) navigator.clipboard.writeText(url);
  };

  const getName = (o) => o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : "—";

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || String(o.id).includes(q) || getName(o).toLowerCase().includes(q);
  });

  if (!ready) return null;

  return (
    <AdminLayout title="Delivered Orders">
      <Head><title>Delivered Orders — C&W Admin</title></Head>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
          <FiCheckCircle size={17} className="text-green-600" />
        </div>
        <p className="text-xs text-gray-400">Generate a review-invite link to send customers after delivery</p>
      </div>

      <div className="relative mb-5">
        <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID or customer..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No delivered orders found</div>
        ) : (
          filtered.map((o) => (
            <div key={o.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-mono font-bold text-gray-700">#{o.id}</span>
                  <span className="text-gray-400 text-sm ml-2">{getName(o)}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                </span>
              </div>
              <div className="space-y-2">
                {(o.order_items || []).map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-gray-50/70 rounded-xl px-4 py-2.5">
                    <span className="flex-1 text-sm text-gray-700 truncate">{item.product_name}</span>
                    {linkFor[item.id] ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 max-w-[220px] truncate">{linkFor[item.id]}</code>
                        <button onClick={() => copyLink(linkFor[item.id])}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#203466]/10 text-[#203466] text-xs font-semibold hover:bg-[#203466]/20">
                          <FiCopy size={12} /> Copy
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={busyId === item.id}
                        onClick={() => generateLink(o, item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#203466]/10 text-[#203466] text-xs font-semibold hover:bg-[#203466]/20 disabled:opacity-50 whitespace-nowrap">
                        <FiLink size={12} /> Generate Review Link
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
