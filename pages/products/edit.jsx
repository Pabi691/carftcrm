import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import ProductForm from "@/components/ProductForm";
import { FiArrowLeft, FiPlus, FiTrash2, FiUpload, FiX, FiStar, FiCheck } from "react-icons/fi";

const INPUT = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466] bg-white text-gray-800 transition-colors";

const TABS = [
  { key: "basic",      label: "Basic Info" },
  { key: "highlights", label: "Key Highlights" },
  { key: "images",     label: "Product Images" },
  { key: "sizes",      label: "Product Size" },
  { key: "colors",     label: "Product Color" },
  { key: "reviews",    label: "Product Review" },
  { key: "seo",        label: "SEO" },
];

// ─── Key Highlights Tab ──────────────────────────────────────────────────────
function HighlightsTab({ productId }) {
  const { api } = useAdmin();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]     = useState({ label: "", value: "" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", `/get_product_key_highlight/${productId}`);
      setItems(Array.isArray(res.data?.dataList) ? res.data.dataList : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [api, productId]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (item) => { setEditingId(item.id); setForm({ label: item.label, value: item.value }); };
  const cancelEdit = () => { setEditingId(null); setForm({ label: "", value: "" }); };

  const save = async () => {
    if (!form.label || !form.value) return setMsg("Label and value are required");
    setSaving(true); setMsg("");
    try {
      if (editingId) {
        await api("put", `/update_key_highlights/${editingId}`, form);
      } else {
        await api("post", `/add_product_key_highlight/${productId}`, form);
      }
      setForm({ label: "", value: "" }); setEditingId(null);
      await load();
      setMsg("Saved!");
    } catch { setMsg("Save failed."); }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm("Delete this highlight?")) return;
    await api("delete", `/delete_product_key_highlight/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Add / Edit form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">{editingId ? "Edit Highlight" : "Add Key Highlight"}</h3>
        {msg && <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${msg === "Saved!" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Label *</label>
            <input type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className={INPUT} placeholder="e.g. Material" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">Value *</label>
            <input type="text" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className={INPUT} placeholder="e.g. Handloom Cotton" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            {saving ? "Saving..." : editingId ? "Update" : "Add Highlight"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No highlights yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                <th className="px-5 py-3 text-left">Label</th>
                <th className="px-5 py-3 text-left">Value</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/70">
                  <td className="px-5 py-3 font-medium text-gray-800">{item.label}</td>
                  <td className="px-5 py-3 text-gray-600">{item.value}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#203466]/10 text-[#203466] text-xs font-semibold hover:bg-[#203466]/20">Edit</button>
                      <button onClick={() => remove(item.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Product Images Tab ───────────────────────────────────────────────────────
function ImagesTab({ product, onSaved }) {
  const { api } = useAdmin();
  const [slots, setSlots]   = useState({}); // { 1: file, 2: file, ... }
  const [previews, setPreviews] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  const existing = {};
  (product?.product_image_list || []).forEach((img) => { existing[img.image_no] = img.prod_img_url; });

  const handleSlot = (no, file) => {
    setSlots((s) => ({ ...s, [no]: file }));
    setPreviews((p) => ({ ...p, [no]: URL.createObjectURL(file) }));
  };

  const deleteImage = async (no) => {
    if (!confirm(`Delete image ${no}?`)) return;
    try {
      await api("post", `/delete_product_image/${product.id}`, { imgno: no });
      onSaved?.();
      setMsg(`Image ${no} deleted.`);
    } catch { setMsg("Delete failed."); }
  };

  const uploadImages = async () => {
    if (Object.keys(slots).length === 0) return setMsg("Select at least one image to upload.");
    setSaving(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("id", product.id);
      fd.append("prod_name", product.prod_name);
      fd.append("regular_price", product.regular_price);
      fd.append("sale_price", product.sale_price);
      fd.append("stock_qty", product.stock_qty);
      fd.append("pack_qty", product.pack_qty);
      fd.append("pack_price", product.pack_price);
      fd.append("is_sale", product.is_sale ?? "1");
      fd.append("status", product.status ?? "1");
      (product.product_categories || []).forEach((c, i) => fd.append(`product_categories[${i}][id]`, c.id));
      Object.entries(slots).forEach(([no, file]) => fd.append(`image_${no}`, file));
      await api("post", `/update_product/${product.id}`, fd);
      setSlots({}); setPreviews({});
      onSaved?.();
      setMsg("Images uploaded successfully!");
    } catch (err) {
      const m = err.response?.data?.error_message;
      setMsg(m || "Upload failed.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {msg && <div className={`text-sm px-4 py-3 rounded-xl border ${msg.includes("success") || msg.includes("deleted") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">Gallery Images (1–6)</h3>
          <button onClick={uploadImages} disabled={saving || Object.keys(slots).length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            <FiUpload size={14} /> {saving ? "Uploading..." : "Save Images"}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((no) => {
            const currentUrl = previews[no] || existing[no];
            return (
              <div key={no} className="space-y-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Image {no}</p>
                <div className="relative">
                  {currentUrl ? (
                    <div className="relative group">
                      <img src={currentUrl} alt={`Product image ${no}`}
                        className="w-full aspect-square object-cover rounded-xl border border-gray-200" />
                      <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="w-8 h-8 bg-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100">
                          <FiUpload size={14} className="text-gray-700" />
                          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSlot(no, e.target.files[0])} className="hidden" />
                        </label>
                        {existing[no] && !previews[no] && (
                          <button onClick={() => deleteImage(no)}
                            className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center hover:bg-red-600">
                            <FiTrash2 size={14} className="text-white" />
                          </button>
                        )}
                        {previews[no] && (
                          <button onClick={() => { setSlots((s) => { const n = {...s}; delete n[no]; return n; }); setPreviews((p) => { const n = {...p}; delete n[no]; return n; }); }}
                            className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700">
                            <FiX size={14} className="text-white" />
                          </button>
                        )}
                      </div>
                      {previews[no] && (
                        <div className="absolute top-1.5 right-1.5 bg-[#203466] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">New</div>
                      )}
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-[#203466] transition-colors">
                        <FiUpload size={20} className="text-gray-300" />
                        <span className="text-xs text-gray-400">Upload</span>
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSlot(no, e.target.files[0])} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Size Variants Tab ────────────────────────────────────────────────────────
function SizesTab({ product, onSaved }) {
  const { api } = useAdmin();
  const [sizes, setSizes]           = useState([]);
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [adding, setAdding]         = useState(false);
  const [addMsg, setAddMsg]         = useState("");
  // edits: { [varId]: { regular_price, sale_price, stock_qty } }
  const [edits, setEdits]           = useState({});
  // savingRow: { [varId]: bool }
  const [savingRow, setSavingRow]   = useState({});
  // rowMsg: { [varId]: { text, ok } }
  const [rowMsg, setRowMsg]         = useState({});

  const sizeVariants = (product?.product_variations || []).filter((v) => v.size_id);

  useEffect(() => {
    // Initialise edits from current variant data
    const init = {};
    sizeVariants.forEach((v) => {
      init[v.id] = { regular_price: v.regular_price ?? "", sale_price: v.sale_price ?? "", stock_qty: v.stock_qty ?? 0 };
    });
    setEdits(init);
  }, [product]);

  useEffect(() => {
    api("get", "/get_all_sizes").then((res) => setSizes(Array.isArray(res.data?.sizes) ? res.data.sizes : [])).catch(() => {});
  }, [api]);

  const setField = (varId, field, value) =>
    setEdits((prev) => ({ ...prev, [varId]: { ...prev[varId], [field]: value } }));

  const saveRow = async (varId) => {
    const data = edits[varId];
    if (!data) return;
    setSavingRow((s) => ({ ...s, [varId]: true }));
    setRowMsg((m) => ({ ...m, [varId]: null }));
    try {
      await api("post", `/update_product_variation/${varId}`, {
        regular_price: parseFloat(data.regular_price) || 0,
        sale_price:    parseFloat(data.sale_price)    || 0,
        stock_qty:     parseInt(data.stock_qty, 10)   || 0,
      });
      setRowMsg((m) => ({ ...m, [varId]: { text: "Saved!", ok: true } }));
      onSaved?.();
    } catch {
      setRowMsg((m) => ({ ...m, [varId]: { text: "Save failed.", ok: false } }));
    }
    setSavingRow((s) => ({ ...s, [varId]: false }));
  };

  const addSize = async () => {
    if (!selectedSizeId) return setAddMsg("Select a size");
    setAdding(true); setAddMsg("");
    try {
      await api("post", "/add_product_variation_size", { product_id: product.id, size_id: selectedSizeId });
      setSelectedSizeId(""); onSaved?.(); setAddMsg("Size added!");
    } catch { setAddMsg("Failed to add size."); }
    setAdding(false);
  };

  const removeVariant = async (id) => {
    if (!confirm("Delete this size variant?")) return;
    await api("get", `/delete_product_variation/${id}`);
    onSaved?.();
  };

  const CELL = "w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[#203466] bg-white text-gray-800";

  return (
    <div className="space-y-5">
      {addMsg && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${addMsg === "Size added!" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{addMsg}</div>
      )}

      {/* Add size */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">Add Size Variant</h3>
        <div className="flex gap-3">
          <select value={selectedSizeId} onChange={(e) => setSelectedSizeId(e.target.value)} className={INPUT}>
            <option value="">— Select Size —</option>
            {sizes.map((s) => <option key={s.id} value={s.id}>{s.size_name} ({s.size_code})</option>)}
          </select>
          <button onClick={addSize} disabled={adding || !selectedSizeId}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            <FiPlus size={15} /> {adding ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* Editable variants table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {sizeVariants.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No size variants yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                <th className="px-5 py-3 text-left">Size</th>
                <th className="px-4 py-3 text-left">Regular Price (₹)</th>
                <th className="px-4 py-3 text-left">Sale Price (₹)</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sizeVariants.map((v) => {
                const row  = edits[v.id] || { regular_price: v.regular_price, sale_price: v.sale_price, stock_qty: v.stock_qty };
                const busy = !!savingRow[v.id];
                const msg  = rowMsg[v.id];
                return (
                  <tr key={v.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">{v.size}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" step="0.01" value={row.regular_price}
                        onChange={(e) => setField(v.id, "regular_price", e.target.value)}
                        className={CELL} />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" step="0.01" value={row.sale_price}
                        onChange={(e) => setField(v.id, "sale_price", e.target.value)}
                        className={CELL} />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" step="1" value={row.stock_qty}
                        onChange={(e) => setField(v.id, "stock_qty", e.target.value)}
                        className={CELL + " w-24"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveRow(v.id)} disabled={busy}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#203466] hover:bg-[#152548] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                          <FiCheck size={12} /> {busy ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => removeVariant(v.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                      {msg && (
                        <p className={`text-xs mt-1 ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Color Variants Tab ───────────────────────────────────────────────────────
function ColorsTab({ product, onSaved }) {
  const { api } = useAdmin();
  const [colors, setColors]   = useState([]);
  const [selectedColorId, setSelectedColorId] = useState("");
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");

  const colorVariants = (product?.product_variations || []).filter((v) => v.color_id);

  useEffect(() => {
    api("get", "/get_all_colors").then((res) => setColors(Array.isArray(res.data?.colors) ? res.data.colors : [])).catch(() => {});
  }, [api]);

  const addColor = async () => {
    if (!selectedColorId) return setMsg("Select a color");
    setSaving(true); setMsg("");
    try {
      await api("post", "/add_product_variation_color", { product_id: product.id, color_id: selectedColorId });
      setSelectedColorId(""); onSaved?.(); setMsg("Color added!");
    } catch { setMsg("Failed to add color."); }
    setSaving(false);
  };

  const removeVariant = async (id) => {
    if (!confirm("Delete this color variant?")) return;
    await api("get", `/delete_product_variation/${id}`);
    onSaved?.();
  };

  return (
    <div className="space-y-5">
      {msg && <div className={`text-sm px-4 py-3 rounded-xl border ${msg === "Color added!" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">Add Color Variant</h3>
        <div className="flex gap-3 items-center">
          <select value={selectedColorId} onChange={(e) => setSelectedColorId(e.target.value)} className={INPUT}>
            <option value="">— Select Color —</option>
            {colors.map((c) => <option key={c.id} value={c.id}>{c.color_name}</option>)}
          </select>
          {selectedColorId && (() => { const c = colors.find((x) => String(x.id) === selectedColorId); return c ? <div className="w-8 h-8 rounded-lg border border-gray-200 flex-shrink-0" style={{ backgroundColor: c.color_code }} /> : null; })()}
          <button onClick={addColor} disabled={saving || !selectedColorId}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            <FiPlus size={15} /> {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {colorVariants.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No color variants yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide font-semibold">
                <th className="px-5 py-3 text-left">Color</th>
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Stock</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {colorVariants.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/70">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: v.color || "#ccc" }} />
                      <span className="text-gray-700 font-medium">{colors.find((c) => c.id == v.color_id)?.color_name || v.color}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{v.color}</td>
                  <td className="px-5 py-3 text-gray-700">{v.stock_qty}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => removeVariant(v.id)}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                      <FiTrash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Reviews Tab ──────────────────────────────────────────────────────────────
function ReviewsTab({ productId }) {
  const { api } = useAdmin();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", `/get_product_review/${productId}`);
      setReviews(Array.isArray(res.data?.product_review) ? res.data.product_review : []);
    } catch { setReviews([]); }
    setLoading(false);
  }, [api, productId]);

  useEffect(() => { load(); }, [load]);

  const toggleApprove = async (id, current) => {
    const next = current == 1 ? 0 : 1;
    await api("put", `/update_review_status/${id}/${next}`);
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_approved: next } : r));
  };

  const remove = async (id) => {
    if (!confirm("Delete this review?")) return;
    await api("delete", `/delete_review/${id}`);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No reviews yet for this product.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {reviews.map((r) => (
            <div key={r.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800 text-sm">{r.name || "Anonymous"}</p>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <FiStar key={s} size={12} className={s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                      ))}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${r.is_approved == 1 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {r.is_approved == 1 ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{r.review_text}</p>
                  <p className="text-xs text-gray-400 mt-1">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleApprove(r.id, r.is_approved)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${r.is_approved == 1 ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                    <FiCheck size={14} />
                  </button>
                  <button onClick={() => remove(r.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────
function SeoTab({ productId }) {
  const { api } = useAdmin();
  const INPUT_SEO = INPUT;
  const [form, setForm] = useState({
    meta_title: "", meta_description: "", meta_keywords: "",
    canonical_url: "", og_title: "", og_description: "",
    og_image: "", og_url: "", og_type: "product",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  useEffect(() => {
    api("post", "/get_seo_metadata", { entity_type: "product", entity_id: productId })
      .then((res) => { if (res.data?.data) setForm((f) => ({ ...f, ...res.data.data })); })
      .catch(() => {});
  }, [api, productId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.meta_title) return setMsg("Meta title is required");
    setSaving(true); setMsg("");
    try {
      await api("post", "/update_seo_metadata", { ...form, entity_type: "product", entity_id: productId });
      setMsg("SEO data saved!");
    } catch { setMsg("Save failed."); }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-800 text-sm mb-4">SEO Metadata</h3>
      {msg && <div className={`text-sm px-4 py-3 rounded-xl border mb-4 ${msg === "SEO data saved!" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>}
      <div className="space-y-3">
        {[
          { key: "meta_title",       label: "Meta Title *",       type: "text" },
          { key: "meta_description", label: "Meta Description",   type: "textarea" },
          { key: "meta_keywords",    label: "Meta Keywords",      type: "text" },
          { key: "canonical_url",    label: "Canonical URL",      type: "text" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">{label}</label>
            {type === "textarea" ? (
              <textarea value={form[key] || ""} onChange={set(key)} rows={3} className={INPUT_SEO + " resize-none"} />
            ) : (
              <input type="text" value={form[key] || ""} onChange={set(key)} className={INPUT_SEO} />
            )}
          </div>
        ))}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Open Graph</p>
          <div className="space-y-3">
            {[
              { key: "og_title",       label: "OG Title" },
              { key: "og_description", label: "OG Description" },
              { key: "og_image",       label: "OG Image URL" },
              { key: "og_url",         label: "OG URL" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">{label}</label>
                <input type="text" value={form[key] || ""} onChange={set(key)} className={INPUT_SEO} />
              </div>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="mt-2 px-5 py-2.5 bg-[#203466] hover:bg-[#152548] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save SEO"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Edit Page ───────────────────────────────────────────────────────────
export default function EditProduct() {
  const { ready } = useAuthGuard();
  const { api }   = useAdmin();
  const router    = useRouter();
  const { id }    = router.query;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("basic");

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api("get", `/get_product_id/${id}`);
      setProduct(res.data?.product_data || null);
    } catch { setProduct(null); }
    setLoading(false);
  }, [api, id]);

  useEffect(() => { if (ready && id) loadProduct(); }, [ready, id, loadProduct]);

  if (!ready || !id) return null;

  return (
    <AdminLayout title={`Edit: ${product?.prod_name || `#${id}`}`}>
      <Head><title>Edit Product — C&W Admin</title></Head>

      <button onClick={() => router.push("/products")}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium mb-5 transition-colors">
        <FiArrowLeft size={16} /> Back to Products
      </button>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto mb-5 bg-white rounded-xl border border-gray-100 shadow-sm p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${tab === t.key ? "bg-[#203466] text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
      ) : !product ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400">Product not found</div>
      ) : (
        <>
          {tab === "basic"      && <ProductForm productId={id} initialData={product} onSaved={loadProduct} />}
          {tab === "highlights" && <HighlightsTab productId={id} />}
          {tab === "images"     && <ImagesTab product={product} onSaved={loadProduct} />}
          {tab === "sizes"      && <SizesTab product={product} onSaved={loadProduct} />}
          {tab === "colors"     && <ColorsTab product={product} onSaved={loadProduct} />}
          {tab === "reviews"    && <ReviewsTab productId={id} />}
          {tab === "seo"        && <SeoTab productId={id} />}
        </>
      )}
    </AdminLayout>
  );
}
