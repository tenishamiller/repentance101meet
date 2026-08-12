"use client";

import { Mic, RefreshCw } from "lucide-react";
import { audioDeviceLabel } from "@/lib/media-devices";

type Props = {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onChange: (deviceId: string) => void;
  onRefresh?: () => void;
  disabled?: boolean;
  refreshing?: boolean;
};

export function AudioDeviceSelect({
  devices,
  selectedDeviceId,
  onChange,
  onRefresh,
  disabled = false,
  refreshing = false,
}: Props) {
  const selectValue =
    selectedDeviceId && devices.some((device) => device.deviceId === selectedDeviceId)
      ? selectedDeviceId
      : selectedDeviceId || "";

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-burgundy px-2 py-1.5 text-xs text-gold-light sm:text-sm">
      <Mic className="h-4 w-4 shrink-0 text-gold" aria-hidden />
      <span className="hidden font-semibold text-gold-light/90 sm:inline">Mic</span>
      <select
        value={selectValue}
        disabled={disabled || devices.length === 0}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Choose microphone"
        className="max-w-[9rem] cursor-pointer bg-transparent text-xs font-semibold text-cream outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[14rem] sm:text-sm"
      >
        {devices.length === 0 ? (
          <option value="">No microphone found</option>
        ) : (
          devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId} className="text-burgundy">
              {audioDeviceLabel(device, index)}
            </option>
          ))
        )}
      </select>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled || refreshing}
          title="Refresh microphone list"
          aria-label="Refresh microphone list"
          className="rounded-md p-1 text-gold transition hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}
