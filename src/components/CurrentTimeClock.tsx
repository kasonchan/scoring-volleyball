"use client";

import { useEffect, useState } from "react";

export function CurrentTimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <p className="font-mono text-sm tabular-nums text-slate-500">
      {time}
    </p>
  );
}
