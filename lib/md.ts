/** Tiny Markdown: paragraphs, **bold**, *italic*, - lists, [text](url). Escapes everything else. */
export function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  const out: string[] = [];
  let para: string[] = [];
  let items: string[] = [];
  const flush = () => {
    if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
    if (items.length) { out.push("<ul>" + items.map((i) => "<li>" + inline(i) + "</li>").join("") + "</ul>"); items = []; }
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } items.push(line.slice(2)); }
    else if (line.trim() === "") flush();
    else { if (items.length) flush(); para.push(line.trim()); }
  }
  flush();
  return out.join("\n");
}
