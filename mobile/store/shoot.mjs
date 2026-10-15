// Usage: node shoot.mjs <outdir> <cssW> <cssH> <scale> route1 route2 ...
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
const [outdir, w, h, scale, ...routes] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const port = 9333;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`,
  `--user-data-dir=${outdir}/../chrome-cdp`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.find((t) => t.type === "page")) break; } catch {} await sleep(300); }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: +scale, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Page.enable");
await send("Page.navigate", { url: "http://localhost:8081/home" }); await sleep(45000);
for (const r of routes) {
  const [route, name, scrollY, tapText] = r.split("|");
  await send("Page.navigate", { url: `http://localhost:8081${route}` });
  await sleep(9000);
  if (tapText) {
    // Tap the last element whose own text is tapText (tab labels sit at the bottom of the DOM).
    const res = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => { const els=[...document.querySelectorAll('*')].filter(e => e.childElementCount===0 && e.textContent.trim()===${JSON.stringify("")}+${JSON.stringify(tapText)}); const el=els[els.length-1]; if(!el) return null; const b=el.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; })()` });
    const pt = res.result.result.value;
    if (pt) {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(5000);
    } else console.log("no element", tapText);
  }
  // On the web the tab labels sit flush with the viewport edge and lose their descenders; on a phone
  // the home-indicator inset gives them room. Nudge the tab bar contents up to match.
  await send("Runtime.evaluate", { expression: `(() => { const labels=["The car","Build log","Adopt a part","Crew","Clock","Jobs","Parts","Ledger","More"]; [...document.querySelectorAll('*')].filter(e => e.childElementCount===0 && labels.includes(e.textContent.trim())).forEach(e => { const r=e.getBoundingClientRect(); if (r.bottom > innerHeight - 40) { let a=e; for (let i=0;i<3;i++){ a=a.parentElement; a.style.overflow='visible'; } e.style.transform='translateY(-9px)'; e.style.overflow='visible'; e.style.lineHeight='1.35'; e.style.height='auto'; e.style.maxHeight='none'; const icon=e.parentElement && e.parentElement.firstElementChild; if (icon && icon!==e) icon.style.transform='translateY(-7px)'; } }); })()` });
  await sleep(300);
  if (scrollY) {
    // scroll the main ScrollView (react-native-web renders it as a scrollable div)
    await send("Runtime.evaluate", { expression: `(() => { const els=[...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 20 && getComputedStyle(d).overflowY !== 'visible'); els.sort((a,b)=>b.clientHeight-a.clientHeight); if (els[0]) els[0].scrollTop = ${scrollY}; return els.length; })()` });
    await sleep(1500);
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outdir}/${name}.png`, Buffer.from(shot.result.data, "base64"));
  console.log("saved", name);
}
ws.close(); chrome.kill();
