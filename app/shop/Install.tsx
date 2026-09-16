"use client";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || !!(window.navigator as Navigator & { standalone?: boolean }).standalone;
}
function detect(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}
/** Gmail, Facebook and Messages open links in their own little browser, which can't add to the home screen. */
function inAppBrowser() {
  return /FBAN|FBAV|Instagram|GSA\/|Line\/|Messenger|Twitter/i.test(navigator.userAgent);
}

/**
 * "Add to your phone" button for the shop board. iOS has no install prompt, so it gets the
 * Share → Add to Home Screen steps. Android/Chrome gets the real prompt when the browser offers it.
 */
export function Install() {
  const [open, setOpen] = useState(false);
  const [os, setOs] = useState<"ios" | "android" | "other">("other");
  const [installed, setInstalled] = useState(false);
  const [trapped, setTrapped] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setOs(detect()); setInstalled(standalone()); setTrapped(inAppBrowser());
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); setStatus("Installed. Look for the TA icon on your home screen."); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const c = await prompt.userChoice;
    setPrompt(null);
    setStatus(c.outcome === "accepted" ? "Installing…" : "No problem. The steps below work too.");
  }

  return (
    <>
      <button className="linkbtn" onClick={() => setOpen(true)}>add to your phone</button>
      {open && (
        <div className="install-back" onClick={() => setOpen(false)}>
          <div className="install" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Put the shop board on your phone</h2>
              <button className="btn quiet" onClick={() => setOpen(false)}>Close</button>
            </header>
            <p className="lead">It becomes an app icon on your home screen. Opens straight to the time clock, full screen, no browser bar. Same sign-in, same data.</p>

            {trapped && (
              <p className="warn">You&rsquo;re in an app&rsquo;s built-in browser (Gmail, Facebook, Messages). Those can&rsquo;t install. Tap the <b>&hellip;</b> or <b>share</b> icon and choose <b>Open in Safari</b> or <b>Open in Chrome</b>, then come back here.</p>
            )}

            {os === "ios" && (
              <ol>
                <li>Open <b>firebird.crewchiefsteve.com/shop</b> in <b>Safari</b>. Not Chrome, not the Gmail link viewer. Safari is the only one Apple lets install.</li>
                <li>Tap the <b>Share</b> button. It&rsquo;s the square with the arrow pointing up, at the bottom of the screen on an iPhone, top right on an iPad.</li>
                <li>Scroll the list down and tap <b>Add to Home Screen</b>.</li>
                <li>Leave the name as <b>Trans Am</b> and tap <b>Add</b> in the top right.</li>
                <li>Open it from the home screen and sign in with Google once. After that it stays signed in.</li>
              </ol>
            )}

            {os === "android" && (
              <>
                {prompt ? (
                  <p><button className="btn primary" onClick={install}>Install Trans Am</button> <span className="hint">Chrome will ask once to confirm.</span></p>
                ) : (
                  <ol>
                    <li>Open <b>firebird.crewchiefsteve.com/shop</b> in <b>Chrome</b>.</li>
                    <li>Tap the <b>&#8942;</b> menu in the top right.</li>
                    <li>Tap <b>Add to Home screen</b> (some phones say <b>Install app</b>).</li>
                    <li>Tap <b>Add</b> or <b>Install</b>.</li>
                    <li>Open it from the home screen and sign in with Google once.</li>
                  </ol>
                )}
              </>
            )}

            {os === "other" && (
              <>
                <p>On a phone, open this page there and tap <b>add to your phone</b> again for the steps.</p>
                <ol>
                  <li><b>iPhone or iPad:</b> open the site in Safari, tap Share, then <b>Add to Home Screen</b>.</li>
                  <li><b>Android:</b> open it in Chrome, tap the &#8942; menu, then <b>Add to Home screen</b>.</li>
                  <li><b>Desktop Chrome or Edge:</b> {prompt ? <button className="btn primary" onClick={install}>Install now</button> : <>click the install icon at the right end of the address bar, or the &#8942; menu then <b>Install</b>.</>}</li>
                </ol>
              </>
            )}

            {status && <p className="hint">{status}</p>}
            <p className="hint">Nothing to download from an app store. It&rsquo;s the same website, pinned to your phone, and it updates itself.</p>
          </div>
        </div>
      )}
    </>
  );
}
