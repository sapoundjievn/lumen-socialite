"use client";

import { useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getLatestIncomingMessage, getLatestNotification } from "@/lib/posts";
import {
  requestMessageAlertPermission,
  startMessageAlertWatcher,
  startNotificationAlertWatcher,
  unlockAudio,
} from "@/lib/messageAlerts";

/** Mount once: rings for DMs + notifications */
export default function MessageAlertBootstrap() {
  useEffect(() => {
    let stopMsg: (() => void) | undefined;
    let stopNotif: (() => void) | undefined;

    const unlock = () => {
      void unlockAudio();
      void requestMessageAlertPermission();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);

    (async () => {
      const user = await getCurrentUser();
      if (!user) return;
      stopMsg = startMessageAlertWatcher(user.id, async () => {
        const row = await getLatestIncomingMessage(user.id);
        if (!row) return null;
        return {
          id: row.id,
          sender_id: row.sender_id,
          content: row.content || "",
        };
      });
      stopNotif = startNotificationAlertWatcher(user.id, async () => {
        return await getLatestNotification(user.id);
      });
    })();

    return () => {
      stopMsg?.();
      stopNotif?.();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  return null;
}
