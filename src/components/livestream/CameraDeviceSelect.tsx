"use client";

import { Camera } from "lucide-react";
import { videoDeviceLabel } from "@/lib/media-devices";

type Props = {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onChange: (deviceId: string) => void;
  disabled?: boolean;
};

export function CameraDeviceSelect({
  devices,
  selectedDeviceId,
  onChange,
  disabled = false,
}: Props) {
  if (devices.length <= 1) {
    return null;
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-burgundy px-2 py-1.5 text-xs text-gold-light sm:text-sm">
      <Camera className="h-4 w-4 shrink-0 text-gold" aria-hidden />
      <span className="sr-only">Camera device</span>
      <select
        value={selectedDeviceId || devices[0]?.deviceId || ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[11rem] cursor-pointer bg-transparent text-xs font-semibold text-cream outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[14rem] sm:text-sm"
      >
        {devices.map((device, index) => (
          <option key={device.deviceId} value={device.deviceId} className="text-burgundy">
            {videoDeviceLabel(device, index)}
          </option>
        ))}
      </select>
    </label>
  );
}
