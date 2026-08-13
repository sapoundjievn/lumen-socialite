"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
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

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;

  const [status, setStatus] = useState("Connecting…");
  const [kind, setKind] = useState<"audio" | "video">("audio");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);

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

  useEffect(() => {
    let alive = true;
    let pollTimer: number | undefined;
    let statusTimer: number | undefined;
    let waitActive: number | undefined;

    async function handleSignal(row: SignalRow) {
      if (!alive || !pcRef.current || !meIdRef.current) return;
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
          await sendCallSignal({
            callId,
            senderId: meIdRef.current,
            signal: { type: "answer", sdp: pc.localDescription },
          });
          setStatus("Connected");
        } else if (payload.type === "answer" && payload.sdp) {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(payload.sdp);
            setStatus("Connected");
          }
        } else if (payload.type === "ice" && payload.candidate) {
          try {
            await pc.addIceCandidate(payload.candidate);
          } catch {
            /* ignore */
          }
        } else if (payload.type === "hangup") {
          setStatus("Call ended");
          cleanupMedia();
          router.back();
        }
      } catch (e: any) {
        console.error("signal error", e);
      }
    }

    async function pollSignals() {
      if (!alive || !meIdRef.current) return;
      const { data } = await supabase
        .from("call_signals")
        .select("id, sender_id, payload, created_at")
        .eq("call_id", callId)
        .order("created_at", { ascending: true })
        .limit(120);
      for (const row of data || []) {
        await handleSignal(row as SignalRow);
      }
    }

    async function pollCallStatus() {
      if (!alive) return;
      const { data: call } = await getCallById(callId);
      if (!call) return;
      if (call.status === "ended" || call.status === "declined") {
        setStatus(call.status === "declined" ? "Declined" : "Call ended");
        cleanupMedia();
        setTimeout(() => router.back(), 700);
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
      if (!alive || !pcRef.current || !meIdRef.current) return;
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
        await sendCallSignal({
          callId,
          senderId: meIdRef.current,
          signal: { type: "offer", sdp: pcRef.current.localDescription },
        });
        offerSent.current = true;
        setStatus("Ringing… waiting for answer");
      } finally {
        makingOffer.current = false;
      }
    }

    (async () => {
      const me = await getCurrentProfile();
      if (!me) {
        router.push("/login");
        return;
      }
      meIdRef.current = me.id;

      const { data: call } = await getCallById(callId);
      if (!call) {
        setStatus("Call not found — run calls SQL in Supabase");
        return;
      }

      if (call.callee_id !== me.id && call.caller_id !== me.id) {
        setStatus("Not a participant");
        return;
      }

      const isCaller = call.caller_id === me.id;
      isCallerRef.current = isCaller;
      politeRef.current = !isCaller;
      const isVideo = call.kind === "video";
      setKind(isVideo ? "video" : "audio");
      setStatus(isCaller ? "Calling…" : "Connecting…");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({ iceServers: CALL_ICE_SERVERS });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          const [remoteStream] = ev.streams;
          if (remoteRef.current && remoteStream) {
            remoteRef.current.srcObject = remoteStream;
            setRemoteReady(true);
            setStatus("Connected");
          }
        };

        pc.onicecandidate = (ev) => {
          if (ev.candidate && meIdRef.current) {
            void sendCallSignal({
              callId,
              senderId: meIdRef.current,
              signal: { type: "ice", candidate: ev.candidate.toJSON() },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          if (s === "connected") setStatus("Connected");
          if (s === "failed") setStatus("Connection failed — try again");
          if (s === "disconnected") setStatus("Disconnected");
        };

        // Callee joining from Accept already set active; caller keeps ringing
        if (!isCaller) {
          await updateCallStatus(callId, "active");
        }

        await pollSignals();
        pollTimer = window.setInterval(() => void pollSignals(), 800);
        statusTimer = window.setInterval(() => void pollCallStatus(), 1500);

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
        setStatus(e?.message || "Microphone/camera permission needed");
      }
    })();

    return () => {
      alive = false;
      if (pollTimer) window.clearInterval(pollTimer);
      if (statusTimer) window.clearInterval(statusTimer);
      if (waitActive) window.clearInterval(waitActive);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        pcRef.current?.close();
      } catch {
        /* */
      }
    };
  }, [callId, router]);

  async function hangUp() {
    if (meIdRef.current) {
      await sendCallSignal({
        callId,
        senderId: meIdRef.current,
        signal: { type: "hangup" },
      });
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      pcRef.current?.close();
    } catch {
      /* */
    }
    await updateCallStatus(callId, "ended");
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
        <p className="absolute left-4 right-4 top-8 text-center text-sm text-white/80">
          {status}
        </p>
      </div>
      <div className="flex items-center justify-center gap-6 pb-12">
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15"
        >
          {muted ? <MicOff /> : <Mic />}
        </button>
        {kind === "video" && (
          <button
            type="button"
            onClick={toggleCam}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15"
          >
            {camOff ? <VideoOff /> : <Video />}
          </button>
        )}
        <button
          type="button"
          onClick={hangUp}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600"
        >
          <PhoneOff />
        </button>
      </div>
    </div>
  );
}
