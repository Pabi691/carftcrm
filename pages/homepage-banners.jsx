import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiUpload, FiTrash2, FiPlus, FiImage, FiRefreshCw } from "react-icons/fi";

const HERO_PAGE_KEY = "home";
const SLOTS = [
  { key: "home_middle_1", label: "Middle Banner 1", hint: "Shown after the Planters row" },
  { key: "home_middle_2", label: "Middle Banner 2", hint: "Shown after the Buckets row" },
  { key: "home_bottom", label: "Bottom Banner", hint: "Closing banner just above the footer" },
];

function ActiveToggle({ active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
        active ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

function BannerSlot({ label, hint, pageKey, image, onChanged }) {
  const { api } = useAdmin();
  const [saving, setSaving] = useState(false);

  const upload = async (file) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("name", pageKey);
      fd.append("image_type", "banner");
      fd.append("page_key", pageKey);
      if (image) {
        await api("post", `/images/${image.id}`, fd);
      } else {
        await api("post", "/images", fd);
      }
      onChanged();
    } catch (err) {
      alert("Upload failed. Please try again.");
    }
    setSaving(false);
  };

  const toggleActive = async () => {
    const fd = new FormData();
    fd.append("is_active", image.is_active ? 0 : 1);
    await api("post", `/images/${image.id}`, fd);
    onChanged();
  };

  const remove = async () => {
    if (!confirm("Delete this banner?")) return;
    await api("delete", `/images/${image.id}`);
    onChanged();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
          <p className="text-xs text-gray-400">{hint}</p>
        </div>
        {image && <ActiveToggle active={image.is_active} onToggle={toggleActive} />}
      </div>

      {image ? (
        <div className="flex items-center gap-4">
          <img src={image.image_path} alt={label} className="w-40 h-24 object-cover rounded-xl border border-gray-100" />
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#203466] bg-[#203466]/10 px-3 py-2 rounded-xl cursor-pointer hover:bg-[#203466]/20 transition-colors">
              <FiRefreshCw size={13} /> {saving ? "Uploading..." : "Replace"}
              <input type="file" accept="image/*" className="hidden" disabled={saving}
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            <button onClick={remove} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors">
              <FiTrash2 size={13} /> Delete
            </button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-[#203466] transition-colors">
          <FiUpload size={16} className="text-gray-300" />
          <span className="text-xs text-gray-400">{saving ? "Uploading..." : "Upload banner image"}</span>
          <input type="file" accept="image/*" className="hidden" disabled={saving}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}

function HeroSlides({ slides, onChanged }) {
  const { api } = useAdmin();
  const [saving, setSaving] = useState(false);

  const addSlide = async (file) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("name", "home_banner");
      fd.append("image_type", "banner");
      fd.append("page_key", HERO_PAGE_KEY);
      fd.append("sort_order", slides.length > 0 ? Math.max(...slides.map((s) => s.sort_order || 0)) + 1 : 1);
      await api("post", "/images", fd);
      onChanged();
    } catch (err) {
      alert("Upload failed. Please try again.");
    }
    setSaving(false);
  };

  const toggleActive = async (slide) => {
    const fd = new FormData();
    fd.append("is_active", slide.is_active ? 0 : 1);
    await api("post", `/images/${slide.id}`, fd);
    onChanged();
  };

  const updateOrder = async (slide, sortOrder) => {
    const fd = new FormData();
    fd.append("sort_order", sortOrder);
    await api("post", `/images/${slide.id}`, fd);
    onChanged();
  };

  const remove = async (slide) => {
    if (!confirm("Delete this slide?")) return;
    await api("delete", `/images/${slide.id}`);
    onChanged();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Hero Banner Slides</h3>
          <p className="text-xs text-gray-400">The rotating banner at the very top of the homepage</p>
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#203466] hover:bg-[#152548] px-3.5 py-2 rounded-xl cursor-pointer transition-colors">
          <FiPlus size={14} /> {saving ? "Uploading..." : "Add Slide"}
          <input type="file" accept="image/*" className="hidden" disabled={saving}
            onChange={(e) => e.target.files?.[0] && addSlide(e.target.files[0])} />
        </label>
      </div>

      {slides.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
          <FiImage size={22} className="text-gray-300" />
          No hero slides yet.
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide) => (
            <div key={slide.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100">
              <img src={slide.image_path} alt={slide.name} className="w-32 h-16 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{slide.name || `Slide #${slide.id}`}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <label className="text-xs text-gray-400">Order</label>
                  <input
                    type="number"
                    defaultValue={slide.sort_order || 0}
                    onBlur={(e) => updateOrder(slide, e.target.value)}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#203466]"
                  />
                </div>
              </div>
              <ActiveToggle active={slide.is_active} onToggle={() => toggleActive(slide)} />
              <button onClick={() => remove(slide)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0">
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomepageBanners() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/images?image_type=banner");
      setImages(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setImages([]);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchImages(); }, [ready, fetchImages]);

  if (!ready) return null;

  const heroSlides = images
    .filter((i) => i.page_key === HERO_PAGE_KEY)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <AdminLayout title="Homepage Banners">
      <Head><title>Homepage Banners — C&W Admin</title></Head>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-50 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-5">
          <HeroSlides slides={heroSlides} onChanged={fetchImages} />

          {SLOTS.map((slot) => (
            <BannerSlot
              key={slot.key}
              label={slot.label}
              hint={slot.hint}
              pageKey={slot.key}
              image={images.find((i) => i.page_key === slot.key) || null}
              onChanged={fetchImages}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
