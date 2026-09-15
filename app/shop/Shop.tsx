"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Clock } from "./Clock";
import { Board } from "./Board";
import { Parts } from "./Parts";
import { Posts } from "./Posts";
import { Payroll } from "./Payroll";

const TABS = [
  ["clock", "Time clock"],
  ["board", "Sprint"],
  ["parts", "Parts"],
  ["posts", "Build log"],
  ["payroll", "Payroll"],
] as const;
type Tab = (typeof TABS)[number][0];

export function Shop() {
  const me = useQuery(api.crew.me);
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("clock");

  if (me === undefined) return <div className="shop-loading">Connecting to the shop…</div>;
  if (!me.crew) {
    return (
      <div className="shop-gate">
        <h1>Trans Am <span>Shop Board</span></h1>
        <p>You&rsquo;re signed in as <b>{me.email ?? user?.primaryEmailAddress?.emailAddress}</b>, but that address isn&rsquo;t on the crew list.</p>
        <p className="muted">Ask Steve to add you, then sign in again.</p>
        <div className="row"><SignOutButton><button className="btn">Sign out</button></SignOutButton><Link className="btn" href="/">Public site</Link></div>
      </div>
    );
  }
  const crew = me.crew;
  const tabs = TABS.filter(([k]) => k !== "payroll" || crew.canPay);

  return (
    <div className="shop">
      <div className="top">
        <div>
          <h1>Trans Am <span>Shop Board</span></h1>
          <div className="sub">Signed in as {crew.name} · <SignOutButton><button className="linkbtn">sign out</button></SignOutButton> · <Link href="/">public site</Link></div>
        </div>
        <nav className="tabs">
          {tabs.map(([k, label]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
      </div>
      <div className="wrap">
        {tab === "clock" && <Clock />}
        {tab === "board" && <Board />}
        {tab === "parts" && <Parts />}
        {tab === "posts" && <Posts />}
        {tab === "payroll" && crew.canPay && <Payroll />}
      </div>
    </div>
  );
}
