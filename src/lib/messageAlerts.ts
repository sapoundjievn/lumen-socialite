/** SMS-style alert + call ring */

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

/** Two short beeps — text / DM alert */
export function playMessageRing() {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const beep = (start: number, freq: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(start);
      o.stop(start + dur + 0.02);
    };

    const t = ctx.currentTime;
    beep(t, 1200, 0.12);
    beep(t + 0.16, 1400, 0.14);
  } catch {
    /* ignore */
  }
}

/** Longer repeating ring for incoming voice/video calls */
export function playCallRing() {
  stopCallRing();
  const once = () => {
    try {
      const ctx = ensureAudio();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime;
      const tones = [0, 0.25, 0.5, 0.75];
      for (const off of tones) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = off % 0.5 === 0 ? 880 : 1040;
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.28, t + off + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.2);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t + off);
        o.stop(t + off + 0.22);
      }
    } catch {
      /* ignore */
    }
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([300, 120, 300, 120, 400]);
      }
    } catch {
      /* ignore */
    }
  };
  once();
  callRingTimer = window.setInterval(once, 2200) as unknown as number;
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
      navigator.vibrate([120, 60, 120, 60, 180]);
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
