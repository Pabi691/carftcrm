import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import { FiLock, FiEye, FiEyeOff, FiCheck } from "react-icons/fi";

const INPUT =
  "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#203466] bg-white text-gray-800 transition-colors";

export default function ChangePassword() {
  const { ready } = useAuthGuard();
  const { api, logout } = useAdmin();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSave = password.length >= 8 && password === confirm && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await api("post", "/change_password", {
        password,
        password_confirmation: confirm,
      });
      if (res.data?.status) {
        setMsg({ ok: true, text: res.data.message || "Password changed. Please sign in again." });
        // Every token was dropped server-side, so this session is already dead.
        setTimeout(() => {
          logout();
          router.replace("/login");
        }, 1800);
      } else {
        setMsg({ ok: false, text: res.data?.message || "Could not change the password." });
      }
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || "Could not change the password." });
    }
    setSaving(false);
  };

  if (!ready) return null;

  return (
    <AdminLayout title="Change Password">
      <Head><title>Change Password — C&W Admin</title></Head>

      <div className="max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <FiLock size={15} className="text-[#203466]" />
            <h2 className="font-bold text-gray-800 text-sm">Set a new password</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            You will be signed out of every device once it is changed, including this one.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">New password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT + " pr-10"}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {tooShort && <p className="text-xs text-red-500 mt-1">Use at least 8 characters.</p>}
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">Confirm new password</label>
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={INPUT}
                placeholder="Type it again"
                autoComplete="new-password"
              />
              {mismatch && <p className="text-xs text-red-500 mt-1">The two passwords do not match.</p>}
            </div>

            <button
              type="submit"
              disabled={!canSave}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#203466] hover:bg-[#1a2a52] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              <FiCheck size={15} />
              {saving ? "Saving..." : "Change password"}
            </button>
          </form>

          {msg && (
            <p className={`text-xs mt-4 ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
