"use client";

import type { MutableRefObject, ReactNode } from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type ReaderParagraphRevealProps = {
  id: string;
  /** 每章挂载时外层应 clear；已进入过视口的 id 记在 Set 内则不再播放 */
  seenOnceIdsRef: MutableRefObject<Set<string>>;
  children: ReactNode;
};

/**
 * 段落首次进入视口时微量入场（200ms）；重复进入不重播。
 */
export const ReaderParagraphReveal = memo(function ReaderParagraphReveal({
  id,
  seenOnceIdsRef,
  children,
}: ReaderParagraphRevealProps) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  const [done, setDone] = useState(() => reduce || seenOnceIdsRef.current.has(id));

  useEffect(() => {
    if (done || reduce) return;
    const node = rootRef.current;
    if (!node || seenOnceIdsRef.current.has(id)) {
      queueMicrotask(() => setDone(true));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          seenOnceIdsRef.current.add(id);
          setDone(true);
          io.disconnect();
        });
      },
      { root: null, threshold: [0.1, 0.12], rootMargin: "0px 0px -12% 0px" },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [done, reduce, seenOnceIdsRef, id]);

  const anim = useMemo(
    () => ({
      opacity: reduce || done ? 1 : 0,
      y: reduce || done ? 0 : 8,
    }),
    [reduce, done],
  );

  return (
    <div ref={rootRef} className="reader-paragraph-reveal-root">
      <motion.div
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0.02, y: 10 }}
        animate={anim}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
});
