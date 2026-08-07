"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { getInitials } from "@/lib/utils";
import { BrandDivider } from "@/components/BrandDivider";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.avatarUrl ?? "");

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

    await update({ name, avatarUrl });
    setMessage("Profile updated!");
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password changed!");
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json();
      setAvatarUrl(data.url);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "confirm") {
      setError('Type "confirm" to permanently delete your profile.');
      return;
    }

    const res = await fetch("/api/user/delete", { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error);
    }
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
        <h2 className="mb-4 font-serif font-semibold text-burgundy">Profile Photo</h2>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-burgundy/10 ring-2 ring-gold/40">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-burgundy">
                {getInitials(name || "U")}
              </span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm text-burgundy/70" />
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

      <form onSubmit={handlePasswordUpdate} className="card-brand mt-6 space-y-4 p-6">
        <h2 className="font-serif font-semibold text-burgundy">Change Password</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-burgundy">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-burgundy">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            className="input-field"
          />
        </div>
        <button type="submit" className="btn-burgundy">
          Change Password
        </button>
      </form>

      <section className="mt-6 rounded-2xl border-2 border-burgundy/30 bg-burgundy/5 p-6">
        <h2 className="font-serif font-semibold text-burgundy">Delete Account</h2>
        <p className="mt-2 text-sm text-burgundy/70">
          This permanently deletes your profile. Type <strong>confirm</strong> to proceed.
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
