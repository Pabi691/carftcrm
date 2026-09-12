import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

function fmt(val) {
  const n = parseFloat(val);
  return isNaN(n) ? "0.00" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusLabel(o) {
  if (!o) return "Pending";
  if (o.order_status && typeof o.order_status === "object") return o.order_status.status_description || "Pending";
  if (typeof o.order_status === "string") return o.order_status;
  return "Pending";
}

export default function OrderInvoice() {
  const { ready } = useAuthGuard();
  const { api }   = useAdmin();
  const router    = useRouter();
  const { id }    = router.query;

  const [order, setOrder]     = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!ready || !id) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api("get", `/get_order_details/${id}`);
        if (res.data?.order_data) setOrder(res.data.order_data);
        else setError("Order not found or you don't have permission to view it.");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load order details.");
      }
      try {
        const cres = await api("get", "/get_our_company");
        if (cres.data?.data) setCompany(cres.data.data);
      } catch { /* company header is optional */ }
      setLoading(false);
    })();
  }, [ready, id, api]);

  if (!ready) return null;

  const items = order?.order_items || [];
  const customerName = order?.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : "—";
  const ship = order?.shipping_info;
  const invoiceDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const paid = parseFloat(order?.paid_amt || 0) >= parseFloat(order?.pay_amt || 0) && parseFloat(order?.pay_amt || 0) > 0;

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <Head><title>Invoice — Order #{id} — C&W Admin</title></Head>

      <div className="max-w-3xl mx-auto px-4 print:px-0 print:max-w-none">
        {/* Toolbar — hidden when printing */}
        <div className="flex items-center justify-between mb-5 print:hidden">
          <button onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
            <FiArrowLeft size={16} /> Back to Order
          </button>
          {order && (
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#203466] hover:bg-[#152548] transition-colors">
              <FiPrinter size={15} /> Print / Save as PDF
            </button>
          )}
        </div>

        {loading ? (
          <div className="h-96 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ) : error || !order ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400 text-sm">
            {error || "Order not found"}
          </div>
        ) : (
          <div className="bg-white rounded-2xl print:rounded-none border border-gray-100 print:border-0 shadow-sm print:shadow-none px-8 py-10 print:px-0">

            {/* Header */}
            <div className="flex items-start justify-between pb-6 border-b-2 border-gray-800">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt={company?.company_name || "Craft & Weft"} className="h-12 w-auto" />
                <div>
                  <p className="font-bold text-gray-900 text-lg leading-tight">{company?.company_name || "Craft & Weft"}</p>
                  {company?.address && <p className="text-xs text-gray-500 max-w-xs mt-0.5">{company.address}</p>}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[company?.city, company?.state, company?.post_code].filter(Boolean).join(", ")}
                  </p>
                  {(company?.phone || company?.mobile) && (
                    <p className="text-xs text-gray-500 mt-0.5">Ph: {company.phone || company.mobile}</p>
                  )}
                  {company?.email && <p className="text-xs text-gray-500">{company.email}</p>}
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-extrabold tracking-wide text-gray-900">TAX INVOICE</h1>
                <p className="text-sm text-gray-500 mt-1">Invoice #{order.bill_no || order.id}</p>
                <p className="text-sm text-gray-500">Date: {invoiceDate}</p>
                <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                  paid ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {paid ? "Paid" : "Payment Pending"}
                </span>
              </div>
            </div>

            {/* Bill To / Ship To */}
            <div className="grid grid-cols-2 gap-8 py-6 border-b border-gray-200">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Bill To</p>
                <p className="font-semibold text-gray-900 text-sm">{customerName}</p>
                {order.customer?.email && <p className="text-xs text-gray-500 mt-0.5">{order.customer.email}</p>}
                {order.customer?.mobile_number && <p className="text-xs text-gray-500">{order.customer.mobile_number}</p>}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Ship To</p>
                {ship ? (
                  <>
                    <p className="font-semibold text-gray-900 text-sm">{ship.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[ship.address_line_1, ship.address_line_2].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {[ship.city, ship.state, ship.zip_code].filter(Boolean).join(", ")}
                    </p>
                    {ship.mobile_number && <p className="text-xs text-gray-500 mt-0.5">{ship.mobile_number}</p>}
                  </>
                ) : (
                  <p className="text-xs text-gray-400">No shipping address on file.</p>
                )}
              </div>
            </div>

            {/* Order meta */}
            <div className="grid grid-cols-3 gap-4 py-4 text-xs">
              <div><span className="text-gray-400">Order ID:</span> <span className="font-semibold text-gray-700">#{order.id}</span></div>
              <div><span className="text-gray-400">Status:</span> <span className="font-semibold text-gray-700">{getStatusLabel(order)}</span></div>
              <div><span className="text-gray-400">Payment Method:</span> <span className="font-semibold text-gray-700">{order.payment_method?.method_name || "—"}</span></div>
            </div>

            {/* Items table */}
            <table className="w-full mt-2 text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-2.5 px-3 font-semibold rounded-l-lg">#</th>
                  <th className="py-2.5 px-3 font-semibold">Item</th>
                  <th className="py-2.5 px-3 font-semibold">HSN</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Qty</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Rate</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Discount</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tax</th>
                  <th className="py-2.5 px-3 font-semibold text-right rounded-r-lg">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 px-3 text-gray-400">{i + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-gray-800">{item.product_name || "—"}</p>
                      <p className="text-[11px] text-gray-400">SKU: {item.sku || "—"}</p>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{item.product_details?.hsn_code || "—"}</td>
                    <td className="py-3 px-3 text-center text-gray-700">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-gray-700">₹{fmt(item.price)}</td>
                    <td className="py-3 px-3 text-right text-gray-500">{parseFloat(item.discount) > 0 ? `−₹${fmt(item.discount)}` : "—"}</td>
                    <td className="py-3 px-3 text-right text-gray-500">{parseFloat(item.tax_amt) > 0 ? `₹${fmt(item.tax_amt)}` : "—"}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">₹{fmt(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mt-4">
              <div className="w-full max-w-xs space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>₹{fmt(order.bill_amt)}</span>
                </div>
                {parseFloat(order.discount_amt) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                    <span>−₹{fmt(order.discount_amt)}</span>
                  </div>
                )}
                {parseFloat(order.shipping_total) > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Shipping / COD Charges</span><span>₹{fmt(order.shipping_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2.5 border-t-2 border-gray-800">
                  <span>Total</span><span>₹{fmt(order.pay_amt)}</span>
                </div>
                {parseFloat(order.tax_total) > 0 && (
                  <div className="text-right text-[11px] text-gray-400 italic pt-0.5">
                    Includes tax of ₹{fmt(order.tax_total)}
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>Amount Paid</span><span>₹{fmt(order.paid_amt)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-5 border-t border-gray-200 text-center">
              <p className="text-sm font-semibold text-gray-700">Thank you for your business!</p>
              <p className="text-xs text-gray-400 mt-1">
                This is a system-generated invoice and does not require a signature.
                {company?.email ? ` For queries, contact ${company.email}.` : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 14mm; }
          nav, aside, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
