// Same tiny Markdown as lib/md.ts on the website (paragraphs, - lists, **bold**, *italic*, [text](url)),
// parsed into blocks for React Native instead of HTML.
export type Span = { text: string; bold?: boolean; italic?: boolean; href?: string };
export type Block = { kind: "p"; spans: Span[] } | { kind: "ul"; items: Span[][] };

export function inline(s: string): Span[] {
  const out: Span[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  for (let m; (m = re.exec(s)); ) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) out.push({ text: m[2], italic: true });
    else out.push({ text: m[3], href: m[4] });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

export function parse(md: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let items: string[] = [];
  const flushPara = () => { if (para.length) { out.push({ kind: "p", spans: inline(para.join(" ")) }); para = []; } };
  const flushItems = () => { if (items.length) { out.push({ kind: "ul", items: items.map(inline) }); items = []; } };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) { flushPara(); items.push(line.slice(2)); }
    else if (line.trim() === "") { flushPara(); flushItems(); }
    else { flushItems(); para.push(line.trim()); }
  }
  flushPara(); flushItems();
  return out;
}
