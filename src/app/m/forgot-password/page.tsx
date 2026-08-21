import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function MobileForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm mobileApp />
    </Suspense>
  );
}
