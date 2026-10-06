import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiArrowLeft, FiPackage, FiUser, FiMapPin, FiCreditCard, FiTruck, FiRefreshCw, FiFileText } from "react-icons/fi";

// Matches the real ecom_order_status_master rows (18 of them) — see the
// identical map + explanation in pages/orders.jsx. Two real rows have stray
// whitespace ("Return  Collected" double space, "Order Cancelled " trailing
// space), so normalize() collapses that before any lookup.
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
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {status || "Unknown"}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-800 text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function fmt(val) {
  const n = parseFloat(val);
  return isNaN(n) ? "—" : `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderDetail() {
  const { ready } = useAuthGuard();
  const { api }   = useAdmin();
  const router    = useRouter();
  const { id }    = router.query;

  const [order, setOrder]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [statusList, setStatusList] = useState([]);
  const [newStatus, setNewStatus]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState("");
  const [liveStatus, setLiveStatus] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError]     = useState("");
  const [dlvBusy, setDlvBusy]       = useState("");   // "create" | "track" | "label"
  const [dlvError, setDlvError]     = useState("");
  const [dlvMsg, setDlvMsg]         = useState("");
  const [dlvTrack, setDlvTrack]     = useState(null);

  useEffect(() => {
    if (!ready || !id) return;
    (async () => {
      setLoading(true);
      setError("");

      // Fetch order detail — primary call
      try {
        const res = await api("get", `/get_order_details/${id}`);
        if (res.data?.order_data) {
          setOrder(res.data.order_data);
          // Status list may come bundled with order detail
          if (Array.isArray(res.data.order_status_list)) {
            setStatusList(res.data.order_status_list);
          }
        } else {
          setError("Order not found or you don't have permission to view it.");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load order details. Please try again.");
      }

      // Fetch status list separately — non-blocking
      try {
        const sres = await api("get", "/get_order_status_master");
        if (Array.isArray(sres.data?.order_status_list)) {
          setStatusList(sres.data.order_status_list);
        }
      } catch { /* non-fatal — status list is optional */ }

      setLoading(false);
    })();
  }, [ready, id, api]);

  const checkLiveStatus = async () => {
    if (!order?.shiprocket_awb) return;
    setLiveLoading(true); setLiveError(""); setLiveStatus(null);
    try {
      const res = await api("get", `/shiprocketShipmentDetails/${order.shiprocket_awb}`);
      if (!res.data?.success) {
        setLiveError(res.data?.error || "Could not fetch live status.");
      } else {
        const track = res.data.data?.tracking_data;
        const current =
          track?.shipment_track?.[0]?.current_status ||
          track?.shipment_status ||
          null;
        setLiveStatus({ current, raw: res.data.data });
        // The backend just persisted this same value to shiprocket_live_status —
        // mirror it locally so this panel and the list badge agree immediately.
        if (current) {
          setOrder((o) => ({ ...o, shiprocket_live_status: current, shiprocket_live_status_at: new Date().toISOString() }));
        }
      }
    } catch (err) {
      setLiveError(err.response?.data?.message || "Could not fetch live status.");
    }
    setLiveLoading(false);
  };

  // Delhivery is the default courier; orders usually arrive here already
  // assigned. These cover a failed auto-assign and day-to-day tracking.
  const createDelhivery = async () => {
    setDlvBusy("create"); setDlvError(""); setDlvMsg("");
    try {
      const res = await api("get", `/createDelhiveryOrder/${order.id}`);
      if (res.data?.status && res.data?.waybill) {
        setOrder((o) => ({ ...o, delhivery_awb: res.data.waybill, delhivery_status: "created", delhivery_last_error: null }));
        setDlvMsg(res.data.message || "Shipment created.");
      } else {
        setDlvError(res.data?.message || "Delhivery did not return a waybill.");
      }
    } catch (err) {
      setDlvError(err.response?.data?.message || "Could not create the shipment.");
    }
    setDlvBusy("");
  };

  const trackDelhivery = async () => {
    if (!order?.delhivery_awb) return;
    setDlvBusy("track"); setDlvError(""); setDlvTrack(null);
    try {
      const res = await api("get", `/delhiveryTracking/${order.delhivery_awb}`);
      const shipment = res.data?.data?.ShipmentData?.[0]?.Shipment;
      if (shipment) {
        setDlvTrack({
          status: shipment.Status?.Status || "—",
          instructions: shipment.Status?.Instructions || "",
          location: shipment.Status?.StatusLocation || "",
          at: shipment.Status?.StatusDateTime || "",
        });
      } else {
        setDlvError("Delhivery has no tracking for this waybill yet.");
      }
    } catch (err) {
      setDlvError(err.response?.data?.message || "Could not fetch tracking.");
    }
    setDlvBusy("");
  };

  const openDelhiveryLabel = async () => {
    if (!order?.delhivery_awb) return;
    setDlvBusy("label"); setDlvError("");
    try {
      const res = await api("get", `/downloadDelhiveryLabel/${order.delhivery_awb}`, null, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setDlvError("Could not fetch the label PDF.");
    }
    setDlvBusy("");
  };

  const updateStatus = async () => {
    if (!newStatus) return;
    setSaving(true); setMsg("");
    try {
      await api("post", "/update_order_status", { id: order.id, order_status: newStatus });
      setMsg("Status updated successfully!");
      const res = await api("get", `/get_order_details/${id}`);
      if (res.data?.order_data) setOrder(res.data.order_data);
    } catch { setMsg("Failed to update status."); }
    setSaving(false);
  };

  if (!ready) return null;

  // Resolve status label from either a relationship object or a raw string
  const getStatusLabel = (o) => {
    if (!o) return "Pending";
    if (o.order_status && typeof o.order_status === "object") return o.order_status.status_description || "Pending";
    if (typeof o.order_status === "string") return o.order_status;
    return "Pending";
  };

  const status = getStatusLabel(order);
  const customerName = order?.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : "—";

  return (
    <AdminLayout title={`Order #${id}`}>
      <Head><title>Order #{id} — C&W Admin</title></Head>

      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
          <FiArrowLeft size={16} /> Back to Orders
        </button>
        {order && (
          <Link href={`/orders/invoice?id=${id}`} target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#203466] hover:bg-[#152548] transition-colors">
            <FiFileText size={15} /> View Invoice
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />
        ))}</div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <p className="text-gray-400 text-sm mb-2">{error}</p>
          <button onClick={() => router.back()} className="text-[#203466] text-sm font-semibold hover:underline">Go back</button>
        </div>
      ) : !order ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400 text-sm">Order not found</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left col ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Order items */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <FiPackage size={16} className="text-[#203466]" />
                <h3 className="font-bold text-gray-800 text-sm">Order Items</h3>
                <span className="ml-auto text-xs text-gray-400 font-mono mr-2">#{order.bill_no || order.id}</span>
                <StatusBadge status={status} />
              </div>

              {(order.order_items || []).length === 0 ? (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">No items found for this order.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {(order.order_items || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      {item.product_details?.primary_img ? (
                        <img src={item.product_details.primary_img} alt=""
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center text-purple-400 font-bold text-lg flex-shrink-0">
                          {(item.product_name?.[0] || "P").toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{item.product_name || "—"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          SKU: {item.sku || "—"} &nbsp;·&nbsp; Qty: {item.quantity} &nbsp;·&nbsp; {fmt(item.price)} each
                        </p>
                      </div>
                      <p className="font-bold text-gray-800 flex-shrink-0">{fmt(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="px-5 py-4 bg-gray-50 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{fmt(order.bill_amt)}</span></div>
                {parseFloat(order.discount_amt) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                    <span>−{fmt(order.discount_amt)}</span>
                  </div>
                )}
                {parseFloat(order.shipping_total) > 0 && (
                  <div className="flex justify-between text-sm text-gray-500"><span>Shipping</span><span>{fmt(order.shipping_total)}</span></div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
                  <span>Total</span><span>{fmt(order.pay_amt)}</span>
                </div>
                {parseFloat(order.tax_total) > 0 && (
                  <div className="text-right text-xs text-gray-400 italic">Includes tax of {fmt(order.tax_total)}</div>
                )}
              </div>
            </div>

            {/* Customer + Shipping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FiUser size={15} className="text-[#203466]" />
                  <h3 className="font-bold text-gray-800 text-sm">Customer</h3>
                </div>
                <InfoRow label="Name"   value={customerName} />
                <InfoRow label="Email"  value={order.customer?.email} />
                <InfoRow label="Mobile" value={order.customer?.mobile_number} />
                <InfoRow label="City"   value={order.customer?.city} />
                <InfoRow label="State"  value={order.customer?.state} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FiMapPin size={15} className="text-[#203466]" />
                  <h3 className="font-bold text-gray-800 text-sm">Shipping Address</h3>
                </div>
                {order.shipping_info ? (
                  <>
                    <InfoRow label="Name"    value={order.shipping_info.full_name} />
                    <InfoRow label="Address" value={[order.shipping_info.address_line_1, order.shipping_info.address_line_2].filter(Boolean).join(", ")} />
                    <InfoRow label="City"    value={order.shipping_info.city} />
                    <InfoRow label="State"   value={order.shipping_info.state} />
                    <InfoRow label="ZIP"     value={order.shipping_info.zip_code} />
                    <InfoRow label="Mobile"  value={order.shipping_info.mobile_number} />
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">No shipping address on file.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right col ── */}
          <div className="space-y-5">

            {/* Update status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-1">Current Status</h3>
              <div className="mb-4"><StatusBadge status={status} /></div>
              <h3 className="font-bold text-gray-800 text-sm mb-3">Update Status</h3>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#203466] bg-white mb-3">
                <option value="">— Select new status —</option>
                {statusList.map((s) => (
                  <option key={s.id} value={s.id}>{s.status_description}</option>
                ))}
              </select>
              <button onClick={updateStatus} disabled={saving || !newStatus}
                className="w-full bg-[#203466] hover:bg-[#152548] text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Update Status"}
              </button>
              {msg && <p className={`text-xs mt-2 text-center ${msg.includes("success") ? "text-green-600" : "text-red-500"}`}>{msg}</p>}
            </div>

            {/* Order info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-3">Order Info</h3>
              <InfoRow label="Order ID"  value={`#${order.id}`} />
              <InfoRow label="Bill No"   value={order.bill_no} />
              <InfoRow label="Date"      value={order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
              <InfoRow label="Note"      value={order.note} />
            </div>

            {/* Delhivery — the default courier */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiTruck size={15} className="text-[#203466]" />
                <h3 className="font-bold text-gray-800 text-sm">Delhivery</h3>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-gray-400">Default</span>
              </div>

              {order.delhivery_awb ? (
                <>
                  <InfoRow label="Waybill" value={order.delhivery_awb} />
                  <InfoRow label="Assigned" value="Yes" />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button onClick={trackDelhivery} disabled={!!dlvBusy}
                      className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-[#203466] text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                      <FiRefreshCw size={14} className={dlvBusy === "track" ? "animate-spin" : ""} />
                      {dlvBusy === "track" ? "Checking..." : "Track"}
                    </button>
                    <button onClick={openDelhiveryLabel} disabled={!!dlvBusy}
                      className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-[#203466] text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                      <FiFileText size={14} />
                      {dlvBusy === "label" ? "Opening..." : "Label"}
                    </button>
                  </div>
                  {dlvTrack && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Live courier status</p>
                      <p className="text-sm font-semibold text-gray-800">{dlvTrack.status}</p>
                      {dlvTrack.instructions && <p className="text-xs text-gray-500 mt-0.5">{dlvTrack.instructions}</p>}
                      {(dlvTrack.location || dlvTrack.at) && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {dlvTrack.location}
                          {dlvTrack.at ? ` · ${new Date(dlvTrack.at).toLocaleString("en-IN")}` : ""}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {order.delhivery_status === "failed" ? (
                    <>
                      <p className="text-sm font-semibold text-red-600 mb-1">Assignment failed</p>
                      <p className="text-xs text-gray-500 mb-3">{order.delhivery_last_error || "No error details recorded."}</p>
                    </>
                  ) : order.delhivery_status === "awaiting_payment" ? (
                    <p className="text-gray-400 text-sm mb-3">Waiting for payment before the shipment is created.</p>
                  ) : (
                    <p className="text-gray-400 text-sm mb-3">Not yet assigned to Delhivery.</p>
                  )}
                  <button onClick={createDelhivery} disabled={!!dlvBusy}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#203466] hover:bg-[#1a2a52] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                    <FiTruck size={14} />
                    {dlvBusy === "create" ? "Creating..." : order.delhivery_status === "failed" ? "Try again" : "Create shipment"}
                  </button>
                </>
              )}

              {dlvMsg && <p className="text-xs text-green-600 mt-2">{dlvMsg}</p>}
              {dlvError && <p className="text-xs text-red-500 mt-2">{dlvError}</p>}
            </div>

            {/* Shiprocket — manual fallback */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiTruck size={15} className="text-[#203466]" />
                <h3 className="font-bold text-gray-800 text-sm">Shiprocket</h3>
              </div>
              {order.shiprocket_awb ? (
                <>
                  <InfoRow label="AWB" value={order.shiprocket_awb} />
                  {order.shiprocket_live_status ? (
                    <InfoRow label="Courier Status" value={order.shiprocket_live_status} />
                  ) : (
                    <InfoRow label="Assigned" value="Yes" />
                  )}
                  {order.shiprocket_live_status_at && (
                    <p className="text-[11px] text-gray-400 -mt-1 mb-2">
                      as of {new Date(order.shiprocket_live_status_at).toLocaleString("en-IN")}
                    </p>
                  )}
                  <button onClick={checkLiveStatus} disabled={liveLoading}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-[#203466] text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                    <FiRefreshCw size={14} className={liveLoading ? "animate-spin" : ""} />
                    {liveLoading ? "Checking..." : "Check Live Status"}
                  </button>
                  {liveError && <p className="text-xs text-red-500 mt-2">{liveError}</p>}
                  {liveStatus && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Live courier status</p>
                      <p className="text-sm font-semibold text-gray-800">{liveStatus.current || "Not available from Shiprocket yet"}</p>
                    </div>
                  )}
                </>
              ) : order.shiprocket_status === "failed" ? (
                <>
                  <p className="text-sm font-semibold text-red-600 mb-1">Assignment failed</p>
                  <p className="text-xs text-gray-500">{order.shiprocket_last_error || "No error details recorded."}</p>
                </>
              ) : (
                <p className="text-gray-400 text-sm">Not used for this order. Delhivery is the default courier.</p>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiCreditCard size={15} className="text-[#203466]" />
                <h3 className="font-bold text-gray-800 text-sm">Payment</h3>
              </div>
              <InfoRow label="Method"     value={order.payment_method?.method_name} />
              <InfoRow label="Amount Due" value={fmt(order.pay_amt)} />
              <InfoRow label="Paid"       value={fmt(order.paid_amt)} />
              {(order.order_payments || []).map((p, i) => (
                <div key={i} className="mt-2 pt-2 border-t border-gray-50">
                  <InfoRow label="Status"     value={p.payment_status} />
                  <InfoRow label="Reference"  value={p.payment_reference} />
                </div>
              ))}
            </div>

            {/* Timeline */}
            {(order.order_trackings || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FiTruck size={15} className="text-[#203466]" />
                  <h3 className="font-bold text-gray-800 text-sm">Order Timeline</h3>
                </div>
                <div className="space-y-3">
                  {order.order_trackings.map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-[#203466] mt-1.5 flex-shrink-0" />
                        {i < order.order_trackings.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-xs font-semibold text-gray-800">{t.full_details}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
