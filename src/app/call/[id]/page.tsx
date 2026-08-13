"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhoneOff, Mic, MicOff, Video, VideoOff, AlertTriangle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import {
  updateCallStatus,
  sendCallSignal,
  getCallById,
  CALL_ICE_SERVERS,
} from "@/lib/calls";
import { supabase } from "@/lib/supabase";

type SignalRow = {
  id: string;
  sender_id: string;
  payload: any;
  created_at: string;
};

function mediaErrorMessage(err: any): string {
  const name = err?.name || "";
  const msg = (err?.message || "").toLowerCase();
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera/microphone blocked. Allow access in browser settings and try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera or microphone found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Camera/mic is in use by another app. Close it and try again.";
  }
  if (name === "OverconstrainedError") {
    return "This device cannot use the requested camera/mic settings.";
  }
  if (name === "SecurityError" || msg.includes("secure")) {
    return "Calls need a secure connection (HTTPS).";
  }
  return err?.message || "Could not open camera/microphone.";
}

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const callId = (params.id as string) || "";

  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"audio" | "video">("audio");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const meIdRef = useRef<string | null>(null);
  const isCallerRef = useRef(false);
  const seenSignals = useRef<Set<string>>(new Set());
  const makingOffer = useRef(false);
  const politeRef = useRef(false);
  const offerSent = useRef(false);
  const endedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let pollTimer: number | undefined;
    let statusTimer: number | undefined;
    let waitActive: number | undefined;
    let connectWatch: number | undefined;

    endedRef.current = false;
    setError(null);
    setRemoteReady(false);
    offerSent.current = false;
    seenSignals.current = new Set();

    function fail(message: string, endCall = false) {
      if (!alive) return;
      setError(message);
      setStatus("Failed");
      if (endCall && callId && !endedRef.current) {
        endedRef.current = true;
        void updateCallStatus(callId, "ended");
      }
    }

    async function handleSignal(row: SignalRow) {
      if (!alive || !pcRef.current || !meIdRef.current || endedRef.current) return;
      if (row.sender_id === meIdRef.current) return;
      if (seenSignals.current.has(row.id)) return;
      seenSignals.current.add(row.id);

      const pc = pcRef.current;
      const payload = row.payload || {};

      try {
        if (payload.type === "offer" && payload.sdp) {
          const offerCollision =
            makingOffer.current || pc.signalingState !== "stable";
          if (offerCollision && !politeRef.current) return;
          await pc.setRemoteDescription(payload.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          const { error: sigErr } = await sendCallSignal({
            callId,
            senderId: meIdRef.current,
            signal: { type: "answer", sdp: pc.localDescription },
          });
          if (sigErr) {
            fail("Could not send answer — check connection / calls SQL.");
            return;
          }
          setStatus("Connected");
          setError(null);
        } else if (payload.type === "answer" && payload.sdp) {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(payload.sdp);
            setStatus("Connected");
            setError(null);
          }
        } else if (payload.type === "ice" && payload.candidate) {
          try {
            await pc.addIceCandidate(payload.candidate);
          } catch {
            /* ignore late / bad candidates */
          }
        } else if (payload.type === "hangup") {
          setStatus("Call ended");
          cleanupMedia();
          router.back();
        } else if (payload.type === "error" && payload.message) {
          fail(String(payload.message));
        }
      } catch (e: any) {
        console.error("signal error", e);
        fail(e?.message || "Call signal failed");
      }
    }

    async function pollSignals() {
      if (!alive || !meIdRef.current || endedRef.current) return;
      try {
        const { data, error } = await supabase
          .from("call_signals")
          .select("id, sender_id, payload, created_at")
          .eq("call_id", callId)
          .order("created_at", { ascending: true })
          .limit(120);
        if (error) {
          // Don't spam UI on transient network blips
          console.warn("poll signals", error.message);
          return;
        }
        for (const row of data || []) {
          await handleSignal(row as SignalRow);
        }
      } catch (e: any) {
        console.warn("poll signals exception", e?.message);
      }
    }

    async function pollCallStatus() {
      if (!alive || endedRef.current) return;
      try {
        const { data: call, error } = await getCallById(callId);
        if (error) {
          console.warn("poll call", error.message);
          return;
        }
        if (!call) {
          fail("Call not found.");
          return;
        }
        if (call.status === "ended") {
          setStatus("Call ended");
          cleanupMedia();
          setTimeout(() => router.back(), 700);
        } else if (call.status === "declined") {
          setStatus("Declined");
          setError("The other person declined the call.");
          cleanupMedia();
          setTimeout(() => router.back(), 1200);
        }
      } catch {
        /* ignore */
      }
    }

    function cleanupMedia() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try {
        pcRef.current?.close();
      } catch {
        /* */
      }
      pcRef.current = null;
    }

    async function tryOffer(video: boolean) {
      if (!alive || !pcRef.current || !meIdRef.current || endedRef.current) return;
      if (!isCallerRef.current) return;
      if (pcRef.current.signalingState !== "stable") return;
      if (offerSent.current && pcRef.current.connectionState === "connected") return;
      makingOffer.current = true;
      try {
        const offer = await pcRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: video,
        });
        await pcRef.current.setLocalDescription(offer);
        const { error: sigErr } = await sendCallSignal({
          callId,
          senderId: meIdRef.current,
          signal: { type: "offer", sdp: pcRef.current.localDescription },
        });
        if (sigErr) {
          fail(
            sigErr.message?.includes("call_signals")
              ? "Signaling failed — run calls-webrtc.sql in Supabase."
              : sigErr.message || "Could not send call offer."
          );
          return;
        }
        offerSent.current = true;
        setStatus("Ringing… waiting for answer");
      } catch (e: any) {
        fail(e?.message || "Could not create call offer.");
      } finally {
        makingOffer.current = false;
      }
    }

    if (!callId) {
      fail("Invalid call link.");
      return;
    }

    (async () => {
      try {
        const me = await getCurrentProfile();
        if (!me) {
          router.push("/login");
          return;
        }
        meIdRef.current = me.id;

        const { data: call, error: callErr } = await getCallById(callId);
        if (callErr || !call) {
          fail(
            callErr?.message?.includes("permission") || callErr?.code === "42501"
              ? "No permission for this call — run calls SQL / RLS."
              : "Call not found — it may have ended."
          );
          return;
        }

        if (call.callee_id !== me.id && call.caller_id !== me.id) {
          fail("You are not a participant in this call.");
          return;
        }

        if (call.status === "ended") {
          fail("This call already ended.");
          return;
        }
        if (call.status === "declined") {
          fail("This call was declined.");
          return;
        }

        const isCaller = call.caller_id === me.id;
        isCallerRef.current = isCaller;
        politeRef.current = !isCaller;
        const isVideo = call.kind === "video";
        setKind(isVideo ? "video" : "audio");
        setStatus(isCaller ? "Calling…" : "Connecting…");

        if (!navigator?.mediaDevices?.getUserMedia) {
          fail("This browser does not support calls.");
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo,
          });
        } catch (e: any) {
          // Video fallback: try audio-only if camera fails
          if (isVideo) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
              });
              setKind("audio");
              setError("Camera unavailable — switched to voice only.");
            } catch (e2: any) {
              fail(mediaErrorMessage(e2));
              return;
            }
          } else {
            fail(mediaErrorMessage(e));
            return;
          }
        }

        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        let pc: RTCPeerConnection;
        try {
          pc = new RTCPeerConnection({ iceServers: CALL_ICE_SERVERS });
        } catch (e: any) {
          fail(e?.message || "WebRTC not supported on this device.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          const [remoteStream] = ev.streams;
          if (remoteRef.current && remoteStream) {
            remoteRef.current.srcObject = remoteStream;
            setRemoteReady(true);
            setStatus("Connected");
            setError(null);
          }
        };

        pc.onicecandidate = (ev) => {
          if (ev.candidate && meIdRef.current && !endedRef.current) {
            void sendCallSignal({
              callId,
              senderId: meIdRef.current,
              signal: { type: "ice", candidate: ev.candidate.toJSON() },
            }).then(({ error }) => {
              if (error) console.warn("ICE signal", error.message);
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          if (s === "connected") {
            setStatus("Connected");
            setError(null);
          } else if (s === "failed") {
            fail("Connection failed. Check network and tap Retry.");
          } else if (s === "disconnected") {
            setStatus("Disconnected — trying to recover…");
          }
        };

        pc.oniceconnectionstatechange = () => {
          const s = pc.iceConnectionState;
          if (s === "failed") {
            fail("Network path failed (ICE). Try again on the same Wi‑Fi or network.");
          }
        };

        if (!isCaller) {
          const { error: stErr } = await updateCallStatus(callId, "active");
          if (stErr) {
            fail(stErr.message || "Could not join call.");
            return;
          }
        }

        await pollSignals();
        pollTimer = window.setInterval(() => void pollSignals(), 800);
        statusTimer = window.setInterval(() => void pollCallStatus(), 1500);

        // Watchdog: if still not connected after 45s, surface error
        connectWatch = window.setTimeout(() => {
          if (!alive || endedRef.current || !pcRef.current) return;
          const st: string = pcRef.current.connectionState;
          if (st === "connected" || st === "connecting") return;
          fail(
            isCaller
              ? "No answer or connection timed out. Try calling again."
              : "Could not connect to the other person. Tap Retry."
          );
        }, 45000);

        if (isCaller) {
          window.setTimeout(() => void tryOffer(isVideo), 1000);
          waitActive = window.setInterval(async () => {
            const { data: c } = await getCallById(callId);
            if (c?.status === "active") {
              void tryOffer(isVideo);
              if (waitActive) window.clearInterval(waitActive);
            }
            if (c?.status === "declined" || c?.status === "ended") {
              if (waitActive) window.clearInterval(waitActive);
            }
          }, 1000);
        }
      } catch (e: any) {
        fail(e?.message || "Unexpected call error.");
      }
    })();

    return () => {
      alive = false;
      if (pollTimer) window.clearInterval(pollTimer);
      if (statusTimer) window.clearInterval(statusTimer);
      if (waitActive) window.clearInterval(waitActive);
      if (connectWatch) window.clearTimeout(connectWatch);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        pcRef.current?.close();
      } catch {
        /* */
      }
    };
  }, [callId, router, retryKey]);

  async function hangUp() {
    endedRef.current = true;
    try {
      if (meIdRef.current) {
        await sendCallSignal({
          callId,
          senderId: meIdRef.current,
          signal: { type: "hangup" },
        });
      }
    } catch {
      /* */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      pcRef.current?.close();
    } catch {
      /* */
    }
    try {
      await updateCallStatus(callId, "ended");
    } catch {
      /* */
    }
    router.back();
  }

  function toggleMute() {
    const t = streamRef.current?.getAudioTracks()?.[0];
    if (t) {
      t.enabled = !t.enabled;
      setMuted(!t.enabled);
    }
  }

  function toggleCam() {
    const t = streamRef.current?.getVideoTracks()?.[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamOff(!t.enabled);
    }
  }

  function retry() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      pcRef.current?.close();
    } catch {
      /* */
    }
    streamRef.current = null;
    pcRef.current = null;
    setError(null);
    setStatus("Reconnecting…");
    setRetryKey((k) => k + 1);
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-charcoal text-pearl">
      <div className="relative flex flex-1 items-center justify-center">
        {kind === "video" ? (
          <>
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className={`h-full w-full object-cover ${remoteReady ? "opacity-100" : "opacity-30"}`}
            />
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-28 right-4 h-36 w-28 rounded-xl border border-white/30 object-cover"
            />
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gold/30 text-4xl">
              📞
            </div>
            <p className="text-lg font-semibold">Voice call</p>
            <video ref={remoteRef} autoPlay playsInline className="hidden" />
            <video ref={localRef} autoPlay playsInline muted className="hidden" />
          </div>
        )}
        <div className="absolute left-4 right-4 top-8 text-center">
          <p className="text-sm text-white/80">{status}</p>
          {error && (
            <div className="mx-auto mt-3 max-w-md rounded-xl border border-rose-400/40 bg-rose-950/80 px-4 py-3 text-left">
              <div className="flex items-start gap-2 text-[13px] text-rose-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-full bg-gold px-4 py-1.5 text-[13px] font-bold text-white"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={hangUp}
                  className="rounded-full bg-white/15 px-4 py-1.5 text-[13px] font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 pb-12">
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15"
          title="Mute"
        >
          {muted ? <MicOff /> : <Mic />}
        </button>
        {kind === "video" && (
          <button
            type="button"
            onClick={toggleCam}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15"
            title="Camera"
          >
            {camOff ? <VideoOff /> : <Video />}
          </button>
        )}
        <button
          type="button"
          onClick={hangUp}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600"
          title="Hang up"
        >
          <PhoneOff />
        </button>
      </div>
    </div>
  );
}
