/** SMS-style alert: short ring + vibrate when a new DM arrives */

let lastSeenId: string | null = null;
let started = false;
let audioCtx: AudioContext | null = null;

function ensureAudio() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

/** Two short beeps — similar to a text alert */
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
      new Notification(title, { body, silent: true }); // we play our own sound
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
    // unlock audio on user gesture
    const ctx = ensureAudio();
    if (ctx && ctx.state === "suspended") await ctx.resume();
  } catch {
    /* ignore */
  }
}

/** Poll for newest incoming message for current user */
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
  const id = window.setInterval(tick, 4000);
  return () => {
    window.clearInterval(id);
    started = false;
  };
}
