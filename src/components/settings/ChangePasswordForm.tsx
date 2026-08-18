"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not change password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password changed. Use the new password the next time you sign in.");
  }

  return (
    <form
      id="change-password"
      onSubmit={(e) => void handlePasswordUpdate(e)}
      className="card-brand mt-6 scroll-mt-24 space-y-4 p-6"
    >
      <h2 className="font-serif font-semibold text-burgundy">Change Password</h2>
      <p className="text-sm text-burgundy/65">
        Members and admins can update their own login password here. You will stay signed in after
        changing it.
      </p>

      {message && (
        <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-burgundy">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-burgundy/30 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-burgundy" htmlFor="current-password">
          Current Password
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="input-field"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-burgundy" htmlFor="new-password">
          New Password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
          className="input-field"
        />
        <p className="mt-1 text-xs text-burgundy/55">At least 8 characters.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-burgundy" htmlFor="confirm-password">
          Confirm New Password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          required
          className="input-field"
        />
      </div>
      <button type="submit" disabled={saving} className="btn-burgundy disabled:opacity-60">
        {saving ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
}
