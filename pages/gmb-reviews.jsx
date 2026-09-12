import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiStar, FiTrash2, FiPlus, FiDownload } from "react-icons/fi";

const EMPTY_FORM = { branch: "", reviewer_name: "", rating: 5, review_text: "", source_url: "" };

export default function GmbReviews() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importBranch, setImportBranch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/get_gmb_reviews_admin");
      setReviews(Array.isArray(res.data?.reviews) ? res.data.reviews : []);
    } catch { setReviews([]); }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchReviews(); }, [ready, fetchReviews]);

  const addReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api("post", "/create_gmb_review", form);
      if (res.data?.status) {
        setReviews((prev) => [res.data.review, ...prev]);
        setForm(EMPTY_FORM);
      }
    } catch {}
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await api("delete", `/delete_gmb_review/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  };

  const importFromUrl = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportMsg("");
    try {
      const res = await api("post", "/import_gmb_reviews_from_url", { url: importUrl, branch: importBranch });
      if (res.data?.status) {
        setReviews((prev) => [...(res.data.reviews || []), ...prev]);
        setImportUrl("");
        setImportMsg(`Imported ${res.data.reviews?.length || 0} reviews.`);
      } else {
        setImportMsg(res.data?.message || "Import failed.");
      }
    } catch {
      setImportMsg("Import failed.");
    }
    setImporting(false);
  };

  if (!ready) return null;

  return (
    <AdminLayout title="Google Reviews">
      <Head><title>Google Reviews — C&W Admin</title></Head>

      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <FiStar size={17} className="text-[#203466]" />
        </div>
        <p className="text-xs text-gray-400">Curated Google/JustDial reviews shown on the storefront</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <form onSubmit={importFromUrl} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Import from URL</p>
          <div className="space-y-2.5">
            <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} required
              placeholder="Google Maps or JustDial URL"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466]" />
            <input value={importBranch} onChange={(e) => setImportBranch(e.target.value)}
              placeholder="Branch label (optional)"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466]" />
            <button disabled={importing} type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#203466] text-white text-sm font-semibold disabled:opacity-50">
              <FiDownload size={14} /> {importing ? "Importing..." : "Import"}
            </button>
            {importMsg && <p className="text-xs text-gray-500">{importMsg}</p>}
          </div>
        </form>

        <form onSubmit={addReview} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Add review manually</p>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <input value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} required
                placeholder="Reviewer name" className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466]" />
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466]">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
              </select>
            </div>
            <input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}
              placeholder="Branch (optional)" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466]" />
            <textarea value={form.review_text} onChange={(e) => setForm({ ...form, review_text: e.target.value })} required rows={2}
              placeholder="Review text" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#203466] resize-none" />
            <button disabled={saving} type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#203466] text-white text-sm font-semibold disabled:opacity-50">
              <FiPlus size={14} /> {saving ? "Saving..." : "Add Review"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-sm">No Google reviews yet</div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="p-5 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-800">{r.reviewer_name}</p>
                  <span className="text-xs text-yellow-500 font-bold">{r.rating}★</span>
                  {r.branch && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md font-semibold">{r.branch}</span>}
                </div>
                <p className="text-sm text-gray-600">{r.review_text}</p>
              </div>
              <button onClick={() => remove(r.id)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                <FiTrash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
