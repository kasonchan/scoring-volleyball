"use client";

import { useEffect, useState } from "react";

export function CurrentTimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="font-mono text-sm tabular-nums text-slate-500">
      {now.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })}
    </p>
  );
}
