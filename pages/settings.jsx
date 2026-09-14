import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiCheck, FiAlertCircle } from "react-icons/fi";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_COLOR = "#87A96B";
const SHADE_STEPS = { 50: 0.9, 100: 0.78, 500: 0.15, 600: 0, 700: -0.15, 900: -0.45 };

function hexToRgb(hex) {
  const value = parseInt(hex.replace("#", ""), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function shade(hex, amount) {
  const rgb = hexToRgb(hex);
  const target = amount > 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const t = Math.abs(amount);
  return {
    r: Math.round(rgb.r + (target.r - rgb.r) * t),
    g: Math.round(rgb.g + (target.g - rgb.g) * t),
    b: Math.round(rgb.b + (target.b - rgb.b) * t),
  };
}

function SwatchScale({ hex }) {
  if (!HEX_PATTERN.test(hex)) return null;
  return (
    <div className="flex rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      {Object.entries(SHADE_STEPS).map(([step, amount]) => {
        const { r, g, b } = shade(hex, amount);
        const bg = `rgb(${r} ${g} ${b})`;
        const light = amount > 0.3;
        return (
          <div key={step} className="flex-1 h-16 flex items-end justify-center pb-1.5" style={{ background: bg }}>
            <span className={`text-[10px] font-semibold ${light ? "text-gray-500" : "text-white/80"}`}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ThemeSettings() {
  const { ready } = useAuthGuard();
  const { api } = useAdmin();
  const [savedColor, setSavedColor] = useState(DEFAULT_COLOR);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("get", "/theme_settings");
      const hex = res.data?.data?.primary_color;
      if (hex && HEX_PATTERN.test(hex)) {
        setSavedColor(hex);
        setColor(hex);
      }
    } catch {
      setMessage({ type: "error", text: "Could not load the current theme color." });
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { if (ready) fetchSettings(); }, [ready, fetchSettings]);

  const save = async () => {
    if (!HEX_PATTERN.test(color)) {
      setMessage({ type: "error", text: "Enter a valid hex color, e.g. #87A96B." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await api("post", "/theme_settings", { primary_color: color });
      if (res.data?.status) {
        setSavedColor(color);
        setMessage({ type: "success", text: "Saved. The storefront picks up the new color automatically — no deploy needed." });
      } else {
        setMessage({ type: "error", text: res.data?.message || "Failed to save." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Failed to save." });
    }
    setSaving(false);
  };

  if (!ready) return null;

  const dirty = color !== savedColor;

  return (
    <AdminLayout title="Theme Settings">
      <Head><title>Theme Settings — C&W Admin</title></Head>

      {loading ? (
        <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" />
      ) : (
        <div className="max-w-xl space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Brand Color</h3>
            <p className="text-xs text-gray-400 mb-4">
              Controls the primary green used across the website — buttons, links, active states, and header.
              Changes apply live, no code deploy required.
            </p>

            <div className="flex items-center gap-3 mb-4">
              <input
                type="color"
                value={HEX_PATTERN.test(color) ? color : "#1F7A3D"}
                onChange={(e) => setColor(e.target.value.toUpperCase())}
                className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value.trim())}
                placeholder="#1F7A3D"
                maxLength={7}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-gray-400"
              />
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1F7A3D] hover:bg-[#155C2E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            <button
              onClick={() => setColor(DEFAULT_COLOR)}
              disabled={color === DEFAULT_COLOR}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed mb-4 -mt-2"
            >
              Reset to default color
            </button>

            <p className="text-[11px] text-gray-400 mb-2">Preview shades (light → dark)</p>
            <SwatchScale hex={HEX_PATTERN.test(color) ? color : savedColor} />

            {message && (
              <div className={`mt-4 flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${
                message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
              }`}>
                {message.type === "success" ? <FiCheck className="mt-0.5 shrink-0" /> : <FiAlertCircle className="mt-0.5 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
