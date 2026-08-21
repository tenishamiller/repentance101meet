import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function MobileResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm mobileApp />
    </Suspense>
  );
}
