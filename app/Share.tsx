"use client";
import { useState } from "react";

export function Share({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return (
    <div className="share">
      <span className="label">Share this</span>
      <a href={fb} target="_blank" rel="noopener">Facebook</a>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
