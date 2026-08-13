export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export async function copyImageToClipboard(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return copyTextToClipboard(url);
    const blob = await res.blob();
    const type = blob.type.startsWith("image/") ? blob.type : "image/png";
    if (typeof ClipboardItem === "undefined") {
      return copyTextToClipboard(url);
    }
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    return true;
  } catch {
    return copyTextToClipboard(url);
  }
}
