/** Distinct rings: message / notification / voice call / video call */

let lastSeenMsgId: string | null = null;
let lastSeenNotifId: string | null = null;
let msgWatchStarted = false;
let notifWatchStarted = false;
let audioCtx: AudioContext | null = null;
let callRingTimer: number | null = null;

function ensureAudio() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

/** Must run after a user tap so browsers allow sound */
export async function unlockAudio() {
  try {
    const ctx = ensureAudio();
    if (ctx && ctx.state === "suspended") await ctx.resume();
    // silent blip unlocks some mobile browsers
    if (ctx) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.01);
    }
  } catch {
    /* ignore */
  }
}

function tone(
  ctx: AudioContext,
  start: number,
  freq: number,
  dur: number,
  vol = 0.22,
  type: OscillatorType = "sine"
) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** Message DM — short double beep */
export function playMessageRing() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    tone(ctx, t, 1200, 0.1, 0.25, "sine");
    tone(ctx, t + 0.14, 1500, 0.12, 0.25, "sine");
  } catch {
    /* */
  }
}

/** In-app notification (likes, follows, etc.) — soft triple tick */
export function playNotificationRing() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    tone(ctx, t, 900, 0.07, 0.18, "triangle");
    tone(ctx, t + 0.1, 900, 0.07, 0.18, "triangle");
    tone(ctx, t + 0.2, 1100, 0.1, 0.2, "triangle");
  } catch {
    /* */
  }
}

/** Voice call — lower phone-style ring */
export function playVoiceCallRingOnce() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    for (const off of [0, 0.22, 0.44, 0.66]) {
      tone(ctx, t + off, 440, 0.18, 0.3, "sine");
      tone(ctx, t + off, 480, 0.18, 0.2, "sine");
    }
  } catch {
    /* */
  }
}

/** Video call — brighter faster ring */
export function playVideoCallRingOnce() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    for (const off of [0, 0.14, 0.28, 0.42, 0.56, 0.7]) {
      tone(ctx, t + off, 880, 0.1, 0.28, "triangle");
      tone(ctx, t + off + 0.05, 1175, 0.08, 0.18, "triangle");
    }
  } catch {
    /* */
  }
}

export function playCallRing(kind: "audio" | "video" = "audio") {
  stopCallRing();
  void unlockAudio();
  const once = () => {
    if (kind === "video") playVideoCallRingOnce();
    else playVoiceCallRingOnce();
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(
          kind === "video"
            ? [180, 80, 180, 80, 180, 80, 300]
            : [400, 200, 400, 200, 400]
        );
      }
    } catch {
      /* */
    }
  };
  once();
  callRingTimer = window.setInterval(once, kind === "video" ? 2000 : 2800) as unknown as number;
}

export function stopCallRing() {
  if (callRingTimer != null) {
    window.clearInterval(callRingTimer);
    callRingTimer = null;
  }
}

export function vibrateMessage() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch {
    /* */
  }
}

export function alertNewMessage(title: string, body: string) {
  void unlockAudio();
  playMessageRing();
  vibrateMessage();
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, silent: true });
    }
  } catch {
    /* */
  }
}

export function alertNewNotification(title: string, body: string) {
  void unlockAudio();
  playNotificationRing();
  vibrateMessage();
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, silent: true });
    }
  } catch {
    /* */
  }
}

export async function requestMessageAlertPermission() {
  await unlockAudio();
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {
    /* */
  }
}

export function startMessageAlertWatcher(
  userId: string,
  getLatest: () => Promise<{ id: string; sender_id: string; content: string } | null>
) {
  if (msgWatchStarted || typeof window === "undefined") return () => {};
  msgWatchStarted = true;

  const tick = async () => {
    try {
      const latest = await getLatest();
      if (!latest) return;
      if (!lastSeenMsgId) {
        lastSeenMsgId = latest.id;
        return;
      }
      if (latest.id !== lastSeenMsgId && latest.sender_id !== userId) {
        lastSeenMsgId = latest.id;
        const preview =
          latest.content.length > 80 ? latest.content.slice(0, 80) + "…" : latest.content;
        alertNewMessage("New message · Lumen", preview);
      } else {
        lastSeenMsgId = latest.id;
      }
    } catch {
      /* */
    }
  };

  void tick();
  const id = window.setInterval(tick, 2500);
  return () => {
    window.clearInterval(id);
    msgWatchStarted = false;
  };
}

export function startNotificationAlertWatcher(
  userId: string,
  getLatest: () => Promise<{ id: string; type?: string; body?: string } | null>
) {
  if (notifWatchStarted || typeof window === "undefined") return () => {};
  notifWatchStarted = true;

  const tick = async () => {
    try {
      const latest = await getLatest();
      if (!latest) return;
      if (!lastSeenNotifId) {
        lastSeenNotifId = latest.id;
        return;
      }
      if (latest.id !== lastSeenNotifId) {
        lastSeenNotifId = latest.id;
        alertNewNotification(
          "Notification · Lumen",
          latest.body || latest.type || "Something new on Lumen"
        );
      }
    } catch {
      /* */
    }
  };

  void tick();
  const id = window.setInterval(tick, 3500);
  return () => {
    window.clearInterval(id);
    notifWatchStarted = false;
  };
}
