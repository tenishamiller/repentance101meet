import { Suspense } from "react";
import { LivestreamEndedBanner } from "@/components/livestream/LivestreamEndedBanner";
import { MobileLivestreamHub } from "@/components/mobile/MobileLivestreamHub";

export const dynamic = "force-dynamic";

export default function MobileLivestreamPage() {
  return (
    <>
      <Suspense fallback={null}>
        <div className="px-4 pt-5">
          <LivestreamEndedBanner />
        </div>
      </Suspense>
      <MobileLivestreamHub />
    </>
  );
}
