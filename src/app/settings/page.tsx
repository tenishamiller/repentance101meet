"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { BrandDivider } from "@/components/BrandDivider";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { isMobileAppPath } from "@/lib/mobile-paths";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const homePath = isMobileAppPath(pathname) ? "/m" : "/";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.avatarUrl ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, avatarUrl }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }

    await update({ name, avatarUrl: data.user.avatarUrl });
    setAvatarUrl(data.user.avatarUrl ?? "");
    setMessage("Profile updated!");
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not upload photo");
        return;
      }

      setAvatarUrl(data.avatarUrl ?? "");
      await update({ avatarUrl: data.avatarUrl });
      setMessage("Profile photo updated! Everyone in meetings and chat will see it.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.trim().toLowerCase() !== "confirm") {
      setError('Type "confirm" to permanently delete your profile.');
      return;
    }

    setError("");
    const res = await fetch("/api/user/delete", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: homePath });
      return;
    }
    const data = await res.json();
    setError(data.error ?? "Could not delete profile.");
  }

  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-burgundy/70">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold text-burgundy">Account Settings</h1>
      <BrandDivider className="my-4 max-w-xs" />
      <p className="text-burgundy/70">
        Update your profile photo, name, email, and password. Members and admins use this same
        page.
      </p>

      {message && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-burgundy">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-burgundy/30 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
          {error}
        </div>
      )}

      <section className="card-brand mt-8 p-6">
        <h2 className="mb-1 font-serif font-semibold text-burgundy">Profile Photo</h2>
        <p className="mb-5 text-sm text-burgundy/60">
          JPG, PNG, or WebP up to 5 MB. Shown in livestream, chat, and your profile.
        </p>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <UserAvatar
            userId={session.user.id}
            name={name || session.user.name || "Member"}
            avatarUrl={avatarUrl}
            size="2xl"
            interactive={false}
          />
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => void handleAvatarUpload(e)}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {uploadingAvatar ? "Uploading..." : avatarUrl ? "Change Photo" : "Upload Photo"}
            </button>
            <p className="text-xs text-burgundy/55">
              Saves automatically — no need to click Save Profile for your photo.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleProfileUpdate} className="card-brand mt-6 space-y-4 p-6">
        <h2 className="font-serif font-semibold text-burgundy">Profile</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-burgundy">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-burgundy">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
        </div>
        <button type="submit" className="btn-primary">
          Save Profile
        </button>
      </form>

      <ChangePasswordForm />

      <section className="mt-6 rounded-2xl border-2 border-burgundy/30 bg-burgundy/5 p-6">
        <h2 className="font-serif font-semibold text-burgundy">Delete Account</h2>
        <p className="mt-2 text-sm text-burgundy/70">
          This schedules your profile for removal. Norman can restore it within 30 days; after
          that you would need to create a new account. Type <strong>confirm</strong> to proceed.
        </p>
        <input
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder='Type "confirm"'
          className="input-field mt-3"
        />
        <button type="button" onClick={handleDeleteAccount} className="btn-burgundy mt-3">
          Permanently Delete Profile
        </button>
      </section>
    </div>
  );
}
