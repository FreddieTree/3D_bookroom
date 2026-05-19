import type { Variants } from "framer-motion";

/** 物理感弹性：优先用于 UI 动效（移动端注意减少同时动画数量以保 60fps）。 */
export const spring = {
  standard: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
    mass: 0.8,
  },
  soft: {
    type: "spring" as const,
    stiffness: 200,
    damping: 30,
    mass: 1,
  },
  bouncy: {
    type: "spring" as const,
    stiffness: 400,
    damping: 15,
    mass: 0.6,
  },
  heavy: {
    type: "spring" as const,
    stiffness: 150,
    damping: 35,
    mass: 1.5,
  },
  snappy: {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
    mass: 0.5,
  },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: spring.standard,
  },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: spring.bouncy,
  },
};

export const cardHoverVariants: Variants = {
  rest: {
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    z: 0,
    transition: spring.snappy,
  },
  hover: {
    rotateX: -2,
    rotateY: 4,
    scale: 1.02,
    z: 20,
    transition: spring.standard,
  },
  tap: {
    scale: 0.98,
    transition: spring.snappy,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};
