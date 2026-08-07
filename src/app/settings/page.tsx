"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { getInitials } from "@/lib/utils";

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
        <p>Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold">Account Settings</h1>

      {message && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Profile Photo</h2>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-amber-100 ring-2 ring-amber-200">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-amber-900">
                {getInitials(name || "U")}
              </span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarUpload} />
        </div>
      </section>

      <form onSubmit={handleProfileUpdate} className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-4 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-4 py-2"
          />
        </div>
        <button type="submit" className="rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white">
          Save Profile
        </button>
      </form>

      <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Change Password</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-4 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            className="w-full rounded-lg border border-stone-300 px-4 py-2"
          />
        </div>
        <button type="submit" className="rounded-lg bg-stone-800 px-6 py-2 font-semibold text-white">
          Change Password
        </button>
      </form>

      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-900">Delete Account</h2>
        <p className="mt-2 text-sm text-red-700">
          This permanently deletes your profile. Type <strong>confirm</strong> to proceed.
        </p>
        <input
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder='Type "confirm"'
          className="mt-3 w-full rounded-lg border border-red-300 px-4 py-2"
        />
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="mt-3 rounded-lg bg-red-600 px-6 py-2 font-semibold text-white hover:bg-red-700"
        >
          Permanently Delete Profile
        </button>
      </section>
    </div>
  );
}
