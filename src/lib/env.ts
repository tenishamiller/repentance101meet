/** Strip Coolify/Compose wrapping quotes from env values. */
export function unquoteEnv(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  for (let i = 0; i < 3; i++) {
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1).trim();
      continue;
    }
    if (v.startsWith('\\"') && v.endsWith('\\"')) {
      v = v.slice(2, -2).trim();
      continue;
    }
    break;
  }
  return v.replace(/^\\"/, "").replace(/\\"$/, "");
}
