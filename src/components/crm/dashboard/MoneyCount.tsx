"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";

const usd = new Intl.NumberFormat("en-US");

// Count-up para dinero con separadores de miles: $12,500.
// CountUp del sitio solo admite prefix/suffix y no formatea miles, por eso este.
export function MoneyCount({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const [n, setN] = useState(reduce ? value : 0);

  useEffect(() => {
    const unsub = mv.on("change", (v) => setN(Math.round(v)));
    if (reduce) {
      mv.set(value);
      return unsub;
    }
    const controls = animate(mv, value, { duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] });
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, reduce, mv]);

  return <span className={className}>${usd.format(n)}</span>;
}
