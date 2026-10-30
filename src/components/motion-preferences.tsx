"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

export function MotionPreferences({
  reduceMotion,
  children,
}: {
  reduceMotion: boolean;
  children: ReactNode;
}) {
  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
