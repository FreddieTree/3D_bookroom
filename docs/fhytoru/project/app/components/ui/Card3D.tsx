"use client";

import type { CSSProperties, PointerEventHandler, ReactNode } from "react";
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
  /** 指针 / 触控跟踪倾斜与光斑；关闭时仍可保留景深阴影 */
  enableTilt?: boolean;
  className?: string;
};

/** 书架 / 弹层等用的 3D 深度卡片：光斑跟随指针坐标，松开弹性回弹。 */
function Card3DInner({
  children,
  depth = 2,
  enableTilt = true,
  className,
}: Card3DProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(false);
  const [spot, setSpot] = useState({ x: 0.5, y: 0.5 });
  /** 弧度制倾斜，独立于光斑 normalized 坐标 */
  const [tiltDeg, setTiltDeg] = useState({ x: 0, y: 0 });

  const tiltOff = reduced || !enableTilt;
  const baseElev = ELEV_CLASS[depth] ?? ELEV_CLASS[2];

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el || tiltOff) return;
      const r = el.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      const ny = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
      setSpot({ x: nx, y: ny });
      setTiltDeg({
        x: (0.5 - ny) * 15,
        y: (nx - 0.5) * 15,
      });
    },
    [tiltOff],
  );

  const onPointerEnter: PointerEventHandler<HTMLDivElement> = () => setLift(true);
  const onPointerLeave: PointerEventHandler<HTMLDivElement> = () => {
    setLift(false);
    setSpot({ x: 0.5, y: 0.5 });
    setTiltDeg({ x: 0, y: 0 });
  };
  const onPointerMove: PointerEventHandler<HTMLDivElement> = (e) =>
    applyPointer(e.clientX, e.clientY);
  const onPointerDownCapture: PointerEventHandler<HTMLDivElement> = (e) =>
    applyPointer(e.clientX, e.clientY);

  const lightX = `${spot.x * 100}%`;
  const lightY = `${spot.y * 100}%`;

  return (
    <div className="perspective-mid w-full touch-manipulation">
      <motion.div
        ref={ref}
        className={cn(
          "preserve-3d relative w-full overflow-hidden rounded-2xl border border-border/80 bg-[var(--surface-1)] transition-shadow duration-300",
          lift ? "shadow-book" : baseElev,
          className,
        )}
        initial={false}
        animate={{
          rotateX: tiltOff ? 0 : tiltDeg.x,
          rotateY: tiltOff ? 0 : tiltDeg.y,
          scale: tiltOff ? 1 : lift ? 1.012 : 1,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        style={
          {
            transformStyle: "preserve-3d",
            "--spot-x": lightX,
            "--spot-y": lightY,
          } as CSSProperties
        }
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onPointerDownCapture={onPointerDownCapture}
        whileTap={{ scale: tiltOff ? 0.988 : lift ? 1.008 : 0.982 }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[2] rounded-2xl opacity-45"
          style={{
            background: `radial-gradient(circle at var(--spot-x) var(--spot-y), oklch(1 0 0 / 0.32), transparent 42%)`,
            mixBlendMode: "overlay",
          }}
          aria-hidden
        />
        <div className="relative z-[3]">{children}</div>
      </motion.div>
    </div>
  );
}

export const Card3D = memo(Card3DInner);
Card3D.displayName = "Card3D";
