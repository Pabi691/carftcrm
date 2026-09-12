import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiSearch, FiStar, FiCheck, FiX, FiTrash2 } from "react-icons/fi";

const TABS = ["Pending", "Approved", "All"];

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5 text-yellow-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar key={i} size={13} className={i <= rating ? "fill-current" : "text-gray-200"} />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_all_review");
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch { setReviews([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchReviews(); }, [ready, fetchReviews]);

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      await api("put", `/update_review_status/${id}/${status}`);
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_approved: status } : r)));
    } catch {}
    setBusyId(null);
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api("delete", `/delete_review/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {}
    setBusyId(null);
  };

  const filtered = reviews.filter((r) => {
    const matchesTab = tab === "All" || (tab === "Pending" ? Number(r.is_approved) === 0 : Number(r.is_approved) === 1);
    const q = search.toLowerCase();
    const matchesSearch = !q || (r.product?.prod_name || "").toLowerCase().includes(q) || (r.name || "").toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  if (!ready) return null;

  return (
    <AdminLayout title="Product Reviews">
      <Head><title>Product Reviews — C&W Admin</title></Head>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center">
          <FiStar size={17} className="text-yellow-500" />
        </div>
        <p className="text-xs text-gray-400">Moderate customer-submitted product reviews</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or reviewer name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] bg-white shadow-sm" />
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${tab === t ? "bg-[#203466] text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No reviews found</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-800">{r.name || "Anonymous"}</p>
                  <Stars rating={r.rating} />
                </div>
                <p className="text-xs text-gray-400 mb-1.5">{r.product?.prod_name || "—"}</p>
                <p className="text-sm text-gray-600">{r.review_text}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {Number(r.is_approved) !== 1 && (
                  <button disabled={busyId === r.id} onClick={() => setStatus(r.id, 1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50">
                    <FiCheck size={12} /> Approve
                  </button>
                )}
                {Number(r.is_approved) !== 0 && (
                  <button disabled={busyId === r.id} onClick={() => setStatus(r.id, 0)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-semibold hover:bg-yellow-100 disabled:opacity-50">
                    <FiX size={12} /> Unapprove
                  </button>
                )}
                <button disabled={busyId === r.id} onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-50">
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
