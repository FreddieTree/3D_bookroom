import type { ReactNode } from "react";

type PhaseBlurbProps = {
  children: ReactNode;
  className?: string;
};

export function PhaseBlurb({ children, className }: PhaseBlurbProps) {
  return (
    <p
      className={
        className ??
        "font-sans rounded-xl border border-border bg-muted/60 px-4 py-3 text-[0.9375rem] leading-relaxed text-muted-foreground"
      }
    >
      {children}
    </p>
  );
}
