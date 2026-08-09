"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { updateCallStatus } from "@/lib/calls";
import { supabase } from "@/lib/supabase";

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;
  const [status, setStatus] = useState("connecting");
  const [kind, setKind] = useState<"audio" | "video">("audio");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await getCurrentProfile();
      if (!me) {
        router.push("/login");
        return;
      }
      const { data: call } = await supabase
        .from("call_sessions")
        .select("*")
        .eq("id", callId)
        .single();
      if (!call) {
        setStatus("Call not found — run SQL schema");
        return;
      }
      setKind(call.kind === "video" ? "video" : "audio");
      setStatus(call.status || "ringing");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: call.kind === "video",
        });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localRef.current) {
          localRef.current.srcObject = stream;
        }
        await updateCallStatus(callId, "active");
        setStatus("active — camera/mic on this device. Full peer-to-peer connects when both join.");
      } catch (e: any) {
        setStatus(e?.message || "Microphone/camera permission needed");
      }
    })();

    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [callId, router]);

  async function hangUp() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
      <div className="flex-1 relative flex items-center justify-center">
        {kind === "video" ? (
          <>
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover opacity-40"
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
          </div>
        )}
        <p className="absolute left-4 right-4 top-8 text-center text-sm text-white/80">{status}</p>
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
