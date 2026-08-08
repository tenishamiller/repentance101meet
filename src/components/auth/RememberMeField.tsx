"use client";

import { useEffect, useState } from "react";
import { loadRememberedEmail, persistRememberedEmail } from "@/lib/remember-login";

type Props = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function RememberMeCheckbox({ id = "remember-me", checked, onChange }: Props) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-burgundy/80">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gold/40 text-burgundy focus:ring-gold"
      />
      Remember me on this trusted device
    </label>
  );
}

export function useRememberedEmail() {
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const saved = loadRememberedEmail();
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  function persistOnLogin(signedInEmail: string) {
    persistRememberedEmail(signedInEmail, rememberMe);
  }

  return { email, setEmail, rememberMe, setRememberMe, persistOnLogin };
}
