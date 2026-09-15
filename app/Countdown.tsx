"use client";
import { useEffect, useState } from "react";
import { PROJECT, daysUntil, niceDate } from "@/lib/project";

function Days({ iso }: { iso: string }) {
  const [d, setD] = useState<number | null>(null);
  useEffect(() => setD(daysUntil(iso)), [iso]);
  if (d === null) return <span>–</span>;
  return <span>{d > 0 ? d : d === 0 ? "Today" : "Done"}</span>;
}

export function Countdown() {
  const { rolling, birthday } = PROJECT.milestones;
  return (
    <div className="count">
      <div className="c">
        <div className="n num"><Days iso={rolling.date} /></div>
        <div className="t">days to a rolling chassis</div>
        <div className="d">Target {niceDate(rolling.date)}</div>
      </div>
      <div className="c gold">
        <div className="n num"><Days iso={birthday.date} /></div>
        <div className="t">days until Joe drives it</div>
        <div className="d">{niceDate(birthday.date)} · his 80th birthday</div>
      </div>
    </div>
  );
}
