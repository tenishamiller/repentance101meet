"use client";

import { PersonalMinistryHub } from "@/components/private-ministry/PersonalMinistryHub";

export function AdminPrivateMinistryPanel() {
  return (
    <div className="animate-fade-up">
      <PersonalMinistryHub isAdmin embedded />
    </div>
  );
}
