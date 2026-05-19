"use client";

import type { PointerEventHandler, ReactNode } from "react";
import { memo, useCallback, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/app/lib/utils";

const ELEV_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "shadow-[var(--shadow-elevation-1)]",
  2: "shadow-[var(--shadow-elevation-2)]",
  3: "shadow-[var(--shadow-elevation-3)]",
  4: "shadow-[var(--shadow-elevation-4)]",
};

export type Card3DProps = {
  children: ReactNode;
  depth?: 1 | 2 | 3 | 4;
  /** 桌面指针跟踪倾斜；移动端触摸短促倾斜 */
  enableTilt?: boolean;
  className?: string;
};

/** 书架 / 弹层等用的 3D 深度卡片：默认浅阴影，hover/touch 加深并微倾。 */
function Card3DInner({
  children,
  depth = 2,
  enableTilt = true,
  className,
}: Card3DProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const tiltOff = reduced || !enableTilt;
  const baseElev = ELEV_CLASS[depth] ?? ELEV_CLASS[2];

  const setFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el || tiltOff) return;
      const r = el.getBoundingClientRect();
      const nx = ((clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((clientY - r.top) / r.height - 0.5) * 2;
      setTilt({
        x: Math.max(-1, Math.min(1, -ny)) * 5,
        y: Math.max(-1, Math.min(1, nx)) * 7,
      });
    },
    [tiltOff],
  );

  const onPointerEnter: PointerEventHandler<HTMLDivElement> = () => {
    setLift(true);
  };
  const onPointerLeave: PointerEventHandler<HTMLDivElement> = () => {
    setLift(false);
    setTilt({ x: 0, y: 0 });
  };
  const onPointerMove: PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.pointerType === "touch") return;
    setFromClient(e.clientX, e.clientY);
  };

  const onTouchStart = () => {
    if (tiltOff) return;
    setLift(true);
    setTilt({ x: -3, y: 4 });
  };
  const onTouchEnd = () => {
    setLift(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="perspective-mid w-full touch-manipulation">
      <motion.div
        ref={ref}
        className={cn(
          "preserve-3d backface-hidden w-full rounded-2xl border border-border/80 bg-[var(--surface-1)] transition-shadow duration-300",
          lift ? "shadow-book" : baseElev,
          className,
        )}
        initial={false}
        animate={{
          rotateX: tiltOff ? 0 : tilt.x,
          rotateY: tiltOff ? 0 : tilt.y,
          scale: tiltOff ? 1 : lift ? 1.012 : 1,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        whileTap={{ scale: 0.985 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export const Card3D = memo(Card3DInner);
Card3D.displayName = "Card3D";
