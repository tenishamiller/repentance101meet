import { redirect } from "next/navigation";

/** Legacy URL → new Live Meeting hub */
export default function LivestreamChannelRedirect() {
  redirect("/livestream");
}
