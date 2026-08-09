"use client";

import { useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getLatestIncomingMessage } from "@/lib/posts";
import {
  requestMessageAlertPermission,
  startMessageAlertWatcher,
} from "@/lib/messageAlerts";

/** Mount once in layout: ring + vibrate on new DMs */
export default function MessageAlertBootstrap() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let unlocked = false;

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      void requestMessageAlertPermission();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      stop = startMessageAlertWatcher(user.id, async () => {
        const row = await getLatestIncomingMessage(user.id);
        if (!row) return null;
        return {
          id: row.id,
          sender_id: row.sender_id,
          content: row.content || "",
        };
      });
    })();

    return () => {
      stop?.();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return null;
}
