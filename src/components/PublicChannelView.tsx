import type { Channel } from "@/generated/prisma/client";
import { BrandDivider } from "@/components/BrandDivider";

type Props = {
  channel: Channel;
};

function renderMarkdown(content: string) {
  return content
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={i} className="mb-4 font-serif text-3xl font-bold text-burgundy">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="mb-3 mt-6 font-serif text-xl font-semibold text-burgundy">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="mb-2 mt-4 font-semibold text-burgundy">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 list-disc text-burgundy/90">
            {line.slice(2)}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} className="mb-2 text-burgundy/90">
          {line}
        </p>
      );
    });
}

export function PublicChannelView({ channel }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-gold-muted">
          Public Channel
        </p>
        <h1 className="font-serif text-3xl font-bold text-burgundy">{channel.name}</h1>
        <BrandDivider className="my-3 max-w-xs" />
      </div>

      <div className="card-brand prose-ministry p-8">
        {renderMarkdown(channel.content ?? "No content yet.")}
      </div>
    </div>
  );
}
