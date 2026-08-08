"use client";

import { LayoutGrid, PanelRight, PictureInPicture2 } from "lucide-react";

type HostProps = {
  mode: "host";
  value: "sidebar" | "bottom";
  onChange: (value: "sidebar" | "bottom") => void;
};

type MemberProps = {
  mode: "member";
  value: "pip" | "side-by-side";
  onChange: (value: "pip" | "side-by-side") => void;
};

type Props = HostProps | MemberProps;

export function VideoLayoutSelect(props: Props) {
  if (props.mode === "host") {
    return (
      <div className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-burgundy p-0.5 text-xs">
        <LayoutButton
          active={props.value === "sidebar"}
          onClick={() => props.onChange("sidebar")}
          title="Members on the right"
          icon={PanelRight}
          label="Right"
        />
        <LayoutButton
          active={props.value === "bottom"}
          onClick={() => props.onChange("bottom")}
          title="Members along the bottom"
          icon={LayoutGrid}
          label="Bottom"
        />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-burgundy p-0.5 text-xs">
      <LayoutButton
        active={props.value === "pip"}
        onClick={() => props.onChange("pip")}
        title="Your camera in the corner"
        icon={PictureInPicture2}
        label="Corner"
      />
      <LayoutButton
        active={props.value === "side-by-side"}
        onClick={() => props.onChange("side-by-side")}
        title="Host and you side by side"
        icon={LayoutGrid}
        label="Split"
      />
    </div>
  );
}

function LayoutButton({
  active,
  onClick,
  title,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-semibold transition ${
        active ? "bg-gold text-burgundy-deep" : "text-gold-light hover:bg-burgundy-dark"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
