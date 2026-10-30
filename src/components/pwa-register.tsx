"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.storage?.persist?.())
      .catch(() => {
        // The app stays usable online if registration fails.
      });
  }, []);

  return null;
}
