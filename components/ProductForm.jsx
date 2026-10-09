import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAdmin } from "./AdminContext";
import { FiUpload, FiX } from "react-icons/fi";

const INPUT = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466] bg-white text-gray-800 transition-colors";

const EMPTY = {
  prod_name: "", prod_type: "simple", sku: "", hsn_code: "", prod_desc: "",
  regular_price: "", sale_price: "", stock_qty: "", pack_qty: "1",
  pack_price: "", min_order_qty: "1", brand_id: "", status: "1",
  is_sale: "1", is_returnable: "0", is_cod: "1",
  product_tag: "", product_quality: "",
};

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function ProductForm({ productId, initialData, onSaved }) {
  const { api } = useAdmin();
  const router  = useRouter();
  const isEdit  = !!productId;

  const [form, setForm]               = useState(EMPTY);
  const [categoryIds, setCategoryIds] = useState([]);
  const [primaryFile, setPrimaryFile] = useState(null);
  const [primaryPreview, setPrimaryPreview] = useState(null);
  const [categories, setCategories]   = useState([]);
  const [brands, setBrands]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [catRes, brandRes] = await Promise.all([
          api("get", "/get_all_categories"),
          api("get", "/get_brands"),
        ]);
        setCategories(Array.isArray(catRes.data?.categoryList) ? catRes.data.categoryList : []);
        setBrands(Array.isArray(brandRes.data?.brandList) ? brandRes.data.brandList : []);
      } catch { /* non-fatal */ }

      const p = initialData;
      if (p) {
        setForm({
          prod_name:       p.prod_name       || "",
          prod_type:       p.prod_type       || "simple",
          sku:             p.sku             || "",
          hsn_code:        p.hsn_code        || "",
          prod_desc:       p.prod_desc       || "",
          regular_price:   p.regular_price   ?? "",
          sale_price:      p.sale_price      ?? "",
          stock_qty:       p.stock_qty       ?? "",
          pack_qty:        p.pack_qty        ?? "1",
          pack_price:      p.pack_price      ?? "",
          min_order_qty:   p.min_order_qty   ?? "",
          brand_id:        p.brand_id        ?? "",
          status:          String(p.status        ?? "1"),
          is_sale:         String(p.is_sale       ?? "1"),
          is_returnable:   String(p.is_returnable ?? "0"),
          is_cod:          String(p.is_cod        ?? "1"),
          product_tag:     p.product_tag     || "",
          product_quality: p.product_quality || "",
        });
        if (p.primary_img) setPrimaryPreview(p.primary_img);
        setCategoryIds((p.product_categories || []).map((c) => String(c.id)));
      }
      setLoading(false);
    })();
  }, [initialData, api]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleCategory = (id) => {
    const sid = String(id);
    setCategoryIds((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryFile(file);
    setPrimaryPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.prod_name)                         return setError("Product name is required");
    if (!form.regular_price || !form.sale_price) return setError("Regular price and sale price are required");
    if (!form.stock_qty)                         return setError("Stock quantity is required");
    if (!form.pack_qty || !form.pack_price)      return setError("Pack qty and pack price are required");
    // min_order_qty is NOT NULL in the database — an empty one used to
    // fail at the insert with a raw SQL error.
    if (!form.min_order_qty)                     return setError("Min order qty is required");
    if (categoryIds.length === 0)                return setError("Select at least one category");
    if (!isEdit && !primaryFile)                 return setError("Primary image is required for new products");

    setSaving(true);
    try {
      const fd = new FormData();
      if (isEdit) fd.append("id", productId);
      Object.entries(form).forEach(([k, v]) => { if (v !== "") fd.append(k, v); });
      categoryIds.forEach((id, i) => fd.append(`product_categories[${i}][id]`, id));
      if (primaryFile) fd.append("primary_img", primaryFile);

      const res = await api("post", isEdit ? `/update_product/${productId}` : "/create_product", fd);

      // The API answers 200 even when it refused the save, with status:false
      // and the reason in error_message. Without this check a validation
      // failure, a duplicate name or a failed image upload looked like a
      // successful save and the product silently never existed.
      if (res.data?.status === false) {
        const reason = res.data.error_message || res.data.message;
        const detail = res.data.error_message_old;
        const firstField = detail && typeof detail === "object"
          ? Object.values(detail).flat()[0]
          : null;
        setError(firstField || (typeof reason === "string" ? reason : "Save failed."));
        setSaving(false);
        return;
      }

      if (isEdit) {
        setSuccess("Product updated successfully!");
        onSaved?.();
      } else {
        router.push("/products");
      }
    } catch (err) {
      const msg = err.response?.data?.error_message || err.response?.data?.message;
      setError(typeof msg === "string" ? msg : msg ? JSON.stringify(msg) : "Save failed.");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Basic Information</h3>
            <div className="space-y-3">
              <Field label="Product Name *">
                <input type="text" value={form.prod_name} onChange={set("prod_name")} className={INPUT} placeholder="Enter product name" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Product Type">
                  <select value={form.prod_type} onChange={set("prod_type")} className={INPUT}>
                    <option value="simple">Simple</option>
                    <option value="variable">Variable</option>
                  </select>
                </Field>
                <Field label="SKU">
                  <input type="text" value={form.sku} onChange={set("sku")} className={INPUT} placeholder="e.g. CW-001" />
                </Field>
                <Field label="HSN Code">
                  <input type="text" value={form.hsn_code} onChange={set("hsn_code")} className={INPUT} placeholder="e.g. 3924" />
                </Field>
              </div>
              <Field label="Description">
                <textarea value={form.prod_desc} onChange={set("prod_desc")} rows={4}
                  className={INPUT + " resize-none"} placeholder="Product description..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Product Tag">
                  <input type="text" value={form.product_tag} onChange={set("product_tag")} className={INPUT} />
                </Field>
                <Field label="Quality">
                  <input type="text" value={form.product_quality} onChange={set("product_quality")} className={INPUT} />
                </Field>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Pricing & Stock</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Regular Price (₹) *">
                <input type="number" value={form.regular_price} onChange={set("regular_price")} className={INPUT} placeholder="0" min="0" />
              </Field>
              <Field label="Sale Price (₹) *">
                <input type="number" value={form.sale_price} onChange={set("sale_price")} className={INPUT} placeholder="0" min="0" />
              </Field>
              <Field label="Stock Qty *">
                <input type="number" value={form.stock_qty} onChange={set("stock_qty")} className={INPUT} placeholder="0" min="0" />
              </Field>
              <Field label="Min Order Qty *">
                <input type="number" value={form.min_order_qty} onChange={set("min_order_qty")} className={INPUT} placeholder="1" min="1" />
              </Field>
              <Field label="Pack Qty *">
                <input type="number" value={form.pack_qty} onChange={set("pack_qty")} className={INPUT} placeholder="1" min="1" />
              </Field>
              <Field label="Pack Price (₹) *">
                <input type="number" value={form.pack_price} onChange={set("pack_price")} className={INPUT} placeholder="0" min="0" />
              </Field>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Primary Image {!isEdit && <span className="text-red-500">*</span>}</h3>
            <label className="block cursor-pointer w-fit">
              {primaryPreview ? (
                <div className="relative inline-block">
                  <img src={primaryPreview} alt="" className="w-36 h-36 object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={(e) => { e.preventDefault(); setPrimaryFile(null); setPrimaryPreview(null); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-sm">
                    <FiX size={11} />
                  </button>
                </div>
              ) : (
                <div className="w-36 h-36 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-[#203466] transition-colors">
                  <FiUpload size={20} className="text-gray-300" />
                  <span className="text-xs text-gray-400">Click to upload</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 mt-2">JPEG, PNG, WebP · Max 2MB</p>
          </section>
        </div>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Publish</h3>
            <div className="space-y-3">
              <Field label="Status">
                <select value={form.status} onChange={set("status")} className={INPUT}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </Field>
              <Field label="On Sale">
                <select value={form.is_sale} onChange={set("is_sale")} className={INPUT}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </Field>
              <Field label="Returnable">
                <select value={form.is_returnable} onChange={set("is_returnable")} className={INPUT}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </Field>
              <Field label="Cash on Delivery">
                <select value={form.is_cod} onChange={set("is_cod")} className={INPUT}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </Field>
            </div>
            <button type="submit" disabled={saving}
              className="mt-5 w-full bg-[#203466] hover:bg-[#152548] text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
              {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
            </button>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Brand</h3>
            <select value={form.brand_id} onChange={set("brand_id")} className={INPUT}>
              <option value="">— No Brand —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
            </select>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3">Categories <span className="text-red-500">*</span></h3>
            <div className="space-y-0.5 max-h-60 overflow-y-auto pr-1">
              {categories.map((c) => {
                const checked = categoryIds.includes(String(c.id));
                return (
                  <label key={c.id} className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={checked} onChange={() => toggleCategory(c.id)}
                      className="w-4 h-4 rounded accent-[#203466]" />
                    <span className={`text-sm ${checked ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {c.category_name || c.name}
                    </span>
                  </label>
                );
              })}
              {categories.length === 0 && <p className="text-xs text-gray-400">No categories available</p>}
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
