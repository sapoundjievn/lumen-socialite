"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, X, Camera, SwitchCamera, Circle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { createStory, getActiveStories, type Story } from "@/lib/stories";
import { supabase } from "@/lib/supabase";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function StoriesBar() {
  const [stories, setStories] = useState<Story[]>([]);
  const [me, setMe] = useState<{
    id: string;
    username: string;
    avatar_url?: string | null;
  } | null>(null);
  const [viewer, setViewer] = useState<Story[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Live camera capture
  const [camOpen, setCamOpen] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const { data } = await getActiveStories();
    setStories(data || []);
  }

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p) setMe({ id: p.id, username: p.username, avatar_url: p.avatar_url });
    });
    reload();
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
  }

  async function openCamera() {
    if (!me) {
      alert("Sign in to post a live story");
      return;
    }
    setCamOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      alert(
        e?.message ||
          "Camera permission needed. Allow camera & mic for live stories."
      );
      setCamOpen(false);
    }
  }

  async function flipCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: next, width: { ideal: 1080 }, height: { ideal: 1920 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      /* keep previous */
    }
  }

  async function uploadBlob(blob: Blob, mediaType: "image" | "video") {
    if (!me) return;
    setUploading(true);
    try {
      const ext = mediaType === "video" ? "webm" : "jpg";
      const path = `${me.id}/story-${Date.now()}.${ext}`;
      let url = "";
      for (const bucket of ["Illuminations", "illuminations", "stories"]) {
        const { error } = await supabase.storage.from(bucket).upload(path, blob, {
          upsert: true,
          contentType: mediaType === "video" ? "video/webm" : "image/jpeg",
        });
        if (!error) {
          url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          break;
        }
      }
      if (!url) {
        alert("Upload failed — check storage bucket permissions");
        return;
      }
      // Live now → stays visible 24 hours
      const { error } = await createStory({
        userId: me.id,
        mediaUrl: url,
        mediaType,
        caption: "Live story",
      });
      if (error) alert(error.message);
      else {
        await reload();
        setCamOpen(false);
        stopCamera();
      }
    } finally {
      setUploading(false);
    }
  }

  async function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.92)
    );
    if (blob) await uploadBlob(blob, "image");
  }

  function startVideo() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm",
    });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      await uploadBlob(blob, "video");
    };
    rec.start(200);
    setRecording(true);
    // auto-stop at 30s for story clip
    setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
        setRecording(false);
      }
    }, 30000);
  }

  function stopVideo() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  async function onFile(file: File | null) {
    if (!file || !me) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const path = `${me.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      let url = "";
      for (const bucket of ["Illuminations", "illuminations", "stories"]) {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: true, contentType: file.type });
        if (!error) {
          url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          break;
        }
      }
      if (!url) {
        alert("Upload failed");
        return;
      }
      const { error } = await createStory({
        userId: me.id,
        mediaUrl: url,
        mediaType: isVideo ? "video" : "image",
      });
      if (error) alert(error.message);
      else await reload();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const byUser = new Map<string, Story[]>();
  for (const s of stories) {
    const list = byUser.get(s.user_id) || [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  const rings = Array.from(byUser.entries());
  const current = viewer?.[idx];

  return (
    <>
      <div className="flex gap-3 overflow-x-auto border-b border-border px-3 py-3">
        {/* Live camera story */}
        <button
          type="button"
          onClick={openCamera}
          disabled={uploading}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-gradient-to-br from-[#C9A86C] to-[#E8D5A3]">
            {me?.avatar_url ? (
              <img
                src={me.avatar_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <Camera className="h-6 w-6 text-charcoal" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-white">
              <Plus className="h-3 w-3" />
            </span>
          </div>
          <span className="w-full truncate text-center text-[10px] font-semibold text-gold-deep">
            {uploading ? "…" : "Live"}
          </span>
        </button>

        {/* Gallery fallback */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border bg-pearl">
            <Plus className="h-5 w-5 text-muted" />
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted">Gallery</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />

        {rings.map(([uid, list]) => {
          const p = list[0]?.profiles;
          return (
            <button
              key={uid}
              type="button"
              onClick={() => {
                setViewer(list);
                setIdx(0);
              }}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <div className="rounded-full bg-gradient-to-tr from-[#C9A86C] via-[#E8D5A3] to-[#C2185B] p-[2px]">
                <img
                  src={
                    p?.avatar_url ||
                    `https://api.dicebear.com/9.x/avataaars/svg?seed=${uid}`
                  }
                  alt=""
                  className="h-14 w-14 rounded-full border-2 border-pearl object-cover"
                />
              </div>
              <span className="w-full truncate text-center text-[10px] text-charcoal">
                {p?.username || "user"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Camera capture UI */}
      {camOpen && (
        <div className="fixed inset-0 z-[65] flex flex-col bg-black">
          <div className="flex items-center justify-between px-3 py-3 text-white">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setCamOpen(false);
              }}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            <p className="text-sm font-semibold">Live story · stays 24h</p>
            <button
              type="button"
              onClick={flipCamera}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <SwitchCamera className="h-6 w-6" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
            {recording && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                REC
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 px-4 pb-10 pt-4 text-white">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("photo")}
                className={`rounded-full px-4 py-1 text-xs font-bold ${
                  mode === "photo" ? "bg-white text-black" : "bg-white/20"
                }`}
              >
                Photo
              </button>
              <button
                type="button"
                onClick={() => setMode("video")}
                className={`rounded-full px-4 py-1 text-xs font-bold ${
                  mode === "video" ? "bg-white text-black" : "bg-white/20"
                }`}
              >
                Video
              </button>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                if (mode === "photo") takePhoto();
                else if (recording) stopVideo();
                else startVideo();
              }}
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white"
            >
              <Circle
                className={`h-14 w-14 ${
                  recording ? "fill-rose-600 text-rose-600" : "fill-white text-white"
                }`}
              />
            </button>
            <p className="text-[11px] text-white/70">
              {uploading
                ? "Posting live story…"
                : mode === "photo"
                ? "Tap to capture photo"
                : recording
                ? "Tap to stop (max 30s)"
                : "Tap to record video"}
            </p>
          </div>
        </div>
      )}

      {/* Viewer — available 24h after live post */}
      {viewer && current && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="flex gap-1 px-2 pt-3">
            {viewer.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full ${
                  i <= idx ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-white">
            <Link
              href={`/${current.profiles?.username || ""}`}
              className="flex items-center gap-2"
            >
              <img
                src={
                  current.profiles?.avatar_url ||
                  `https://api.dicebear.com/9.x/avataaars/svg?seed=${current.user_id}`
                }
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="text-sm font-bold">
                {current.profiles?.display_name}
              </span>
              {current.profiles?.verified && (
                <VerifiedBadge username={current.profiles.username} size="sm" />
              )}
            </Link>
            <button type="button" onClick={() => setViewer(null)} className="p-2">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center"
            onClick={() => {
              if (idx < viewer.length - 1) setIdx(idx + 1);
              else setViewer(null);
            }}
          >
            {current.media_type === "video" ? (
              <video
                src={current.media_url}
                className="max-h-full max-w-full object-contain"
                autoPlay
                controls
                playsInline
              />
            ) : (
              <img
                src={current.media_url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
