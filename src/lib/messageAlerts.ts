/** Distinct rings: message vs voice call vs video call */

let lastSeenId: string | null = null;
let started = false;
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
  g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** Short double-beep — new message / DM */
export function playMessageRing() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    tone(ctx, t, 1200, 0.1, 0.2, "sine");
    tone(ctx, t + 0.14, 1500, 0.12, 0.2, "sine");
  } catch {
    /* ignore */
  }
}

/** Classic phone-style ring — voice call (lower, slower) */
export function playVoiceCallRingOnce() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    // two bursts: 440+480 style
    for (const off of [0, 0.2, 0.4, 0.6]) {
      tone(ctx, t + off, 440, 0.16, 0.26, "sine");
      tone(ctx, t + off, 480, 0.16, 0.18, "sine");
    }
  } catch {
    /* ignore */
  }
}

/** Brighter faster ring — video call */
export function playVideoCallRingOnce() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    for (const off of [0, 0.15, 0.3, 0.45, 0.6, 0.75]) {
      tone(ctx, t + off, 880, 0.1, 0.24, "triangle");
      tone(ctx, t + off + 0.05, 1175, 0.08, 0.16, "triangle");
    }
  } catch {
    /* ignore */
  }
}

export function playCallRing(kind: "audio" | "video" = "audio") {
  stopCallRing();
  const once = () => {
    if (kind === "video") playVideoCallRingOnce();
    else playVoiceCallRingOnce();
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        if (kind === "video") {
          navigator.vibrate([180, 80, 180, 80, 180, 80, 300]);
        } else {
          navigator.vibrate([400, 200, 400, 200, 400]);
        }
      }
    } catch {
      /* ignore */
    }
  };
  once();
  // Keep ringing until Accept / Decline
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
    /* ignore */
  }
}

export function alertNewMessage(title: string, body: string) {
  playMessageRing();
  vibrateMessage();
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, silent: true });
    }
  } catch {
    /* ignore */
  }
}

export async function requestMessageAlertPermission() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    const ctx = ensureAudio();
    if (ctx && ctx.state === "suspended") await ctx.resume();
  } catch {
    /* ignore */
  }
}

export function startMessageAlertWatcher(
  userId: string,
  getLatest: () => Promise<{ id: string; sender_id: string; content: string } | null>
) {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  const tick = async () => {
    try {
      const latest = await getLatest();
      if (!latest) return;
      if (!lastSeenId) {
        lastSeenId = latest.id;
        return;
      }
      if (latest.id !== lastSeenId && latest.sender_id !== userId) {
        lastSeenId = latest.id;
        const preview =
          latest.content.length > 80 ? latest.content.slice(0, 80) + "…" : latest.content;
        alertNewMessage("New message · Lumen", preview);
      } else {
        lastSeenId = latest.id;
      }
    } catch {
      /* ignore */
    }
  };

  void tick();
  const id = window.setInterval(tick, 2500);
  return () => {
    window.clearInterval(id);
    started = false;
  };
}
