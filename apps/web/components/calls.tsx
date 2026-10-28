"use client";

import { canAccess, type CallInfo } from "@filialhub/shared";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { clock, mediaError, mediaSupported } from "@/lib/media";
import { useToast } from "./toast";
import { Avatar, cn } from "./ui";

/*
 * Зангҳои аудио/видео бо WebRTC. Сервер танҳо пешниҳод/ҷавоби SDP-ро нигоҳ медорад (бе ICE-и қисм-қисм:
 * номзадҳо пеш аз фиристодан ҷамъ мешаванд), овоз ва видео мустақим байни ду браузер меравад.
 * Барои шабакаҳои бо NAT-и сахт (баъзе операторҳои мобилӣ) сервери TURN лозим аст — NEXT_PUBLIC_TURN_*.
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{ urls: process.env.NEXT_PUBLIC_TURN_URL, username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL }]
    : []),
];

type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active";

interface CallState {
  phase: Phase;
  call: CallInfo | null;
  peerName: string;
  video: boolean;
}

interface CallsApi {
  startCall: (peer: { id: number; fullName: string }, video: boolean) => void;
  busy: boolean;
}

const CallsContext = createContext<CallsApi>({ startCall: () => {}, busy: false });
export const useCalls = () => useContext(CallsContext);

/** То 3 сония номзадҳои ICE-ро ҷамъ мекунем (STUN одатан дар < 1 сония ҷавоб медиҳад). */
function iceGathered(pc: RTCPeerConnection, ms = 3000) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

/** Садои занг бо WebAudio (бе файл): ду бип ҳар 2 сония. */
function useRingtone(on: boolean, outgoing: boolean) {
  useEffect(() => {
    if (!on) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    const beep = (at: number) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = outgoing ? 425 : 880;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(outgoing ? 0.05 : 0.12, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + (outgoing ? 0.9 : 0.35));
      o.connect(g).connect(ctx!.destination);
      o.start(at);
      o.stop(at + 1);
    };
    const ring = () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      beep(t);
      if (!outgoing) beep(t + 0.45);
    };
    ring();
    const id = setInterval(ring, outgoing ? 3000 : 2000);
    return () => {
      clearInterval(id);
      void ctx?.close();
    };
  }, [on, outgoing]);
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState<CallState>({ phase: "idle", call: null, peerName: "", video: false });
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const remote = useRef<MediaStream | null>(null);
  const remoteSet = useRef(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const phaseRef = useRef<Phase>("idle");
  const callRef = useRef<CallInfo | null>(null);
  useEffect(() => {
    phaseRef.current = state.phase;
    callRef.current = state.call;
  });
  // Бизнеси тасдиқнашуда занг надорад (API 403 медиҳад)
  const enabled = !!user && (user.isSuperAdmin || user.organization?.status === "APPROVED") && canAccess(user, "calls");

  const cleanup = useCallback((message?: string, tone: "info" | "error" = "info") => {
    pc.current?.close();
    pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    remote.current = null;
    remoteSet.current = false;
    setMuted(false);
    setCamOff(false);
    setStartedAt(0);
    phaseRef.current = "idle";
    setState({ phase: "idle", call: null, peerName: "", video: false });
    if (message) (tone === "error" ? toast.error : toast.info)(message);
  }, [toast]);

  const attachStreams = useCallback(() => {
    if (localVideo.current && local.current) localVideo.current.srcObject = local.current;
    if (remoteVideo.current && remote.current) remoteVideo.current.srcObject = remote.current;
    if (remoteAudio.current && remote.current) remoteAudio.current.srcObject = remote.current;
  }, []);

  const createPeer = useCallback(
    (stream: MediaStream) => {
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      remote.current = new MediaStream();
      peer.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => remote.current!.getTracks().includes(t) || remote.current!.addTrack(t));
        attachStreams();
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected" && phaseRef.current !== "active") {
          setStartedAt(Date.now());
          setState((s) => ({ ...s, phase: "active" }));
        }
        if (peer.connectionState === "failed") {
          if (callRef.current) void api(`/calls/${callRef.current.id}/end`, { method: "POST" }).catch(() => {});
          cleanup(tr("Пайваст нашуд: шабака занги мустақимро иҷозат намедиҳад."), "error");
        }
      };
      pc.current = peer;
      return peer;
    },
    [attachStreams, cleanup],
  );

  const getMedia = (video: boolean) =>
    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: video ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
    });

  const startCall = useCallback(
    async (peer: { id: number; fullName: string }, video: boolean) => {
      if (phaseRef.current !== "idle") return;
      if (!mediaSupported() || typeof RTCPeerConnection === "undefined") return toast.error(tr("Браузери шумо занг заданро дастгирӣ намекунад."));
      phaseRef.current = "outgoing";
      setState({ phase: "outgoing", call: null, peerName: peer.fullName, video });
      try {
        const stream = await getMedia(video);
        local.current = stream;
        attachStreams();
        const conn = createPeer(stream);
        await conn.setLocalDescription(await conn.createOffer());
        await iceGathered(conn);
        const call = await api<CallInfo>("/calls", { method: "POST", json: { calleeId: peer.id, video, offer: conn.localDescription!.sdp } });
        if ((phaseRef.current as Phase) === "idle") {
          // Дар ин муддат «қатъ кардан»-ро пахш карданд.
          void api(`/calls/${call.id}/end`, { method: "POST" }).catch(() => {});
          return;
        }
        setState((s) => ({ ...s, call }));
      } catch (e) {
        const err = e as Error & { status?: number };
        cleanup(err instanceof DOMException ? mediaError(e) : err.message, "error");
      }
    },
    [attachStreams, cleanup, createPeer, toast],
  );

  async function accept() {
    const call = state.call;
    if (!call?.offer) return;
    setState((s) => ({ ...s, phase: "connecting" }));
    try {
      const stream = await getMedia(call.video);
      local.current = stream;
      attachStreams();
      const conn = createPeer(stream);
      await conn.setRemoteDescription({ type: "offer", sdp: call.offer });
      await conn.setLocalDescription(await conn.createAnswer());
      await iceGathered(conn);
      await api(`/calls/${call.id}/answer`, { method: "POST", json: { answer: conn.localDescription!.sdp } });
    } catch (e) {
      void api(`/calls/${call.id}/decline`, { method: "POST" }).catch(() => {});
      cleanup(e instanceof DOMException ? mediaError(e) : (e as Error).message, "error");
    }
  }

  function decline() {
    if (state.call) void api(`/calls/${state.call.id}/decline`, { method: "POST" }).catch(() => {});
    cleanup();
  }

  function hangUp() {
    if (state.call) void api(`/calls/${state.call.id}/end`, { method: "POST" }).catch(() => {});
    cleanup();
  }

  // Зангҳои воридшаванда — ҳар 3 сония (танҳо вақте ки дар занг нестем).
  useEffect(() => {
    if (!enabled || state.phase !== "idle") return;
    let alive = true;
    const pull = () =>
      api<CallInfo | null>("/calls/incoming")
        .then((c) => {
          if (alive && c && phaseRef.current === "idle") setState({ phase: "incoming", call: c, peerName: c.callerName, video: c.video });
        })
        .catch(() => {});
    pull();
    const t = setInterval(pull, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [enabled, state.phase]);

  // Ҳолати занги ҷорӣ: ҷавоби тарафи дигар, рад, қатъ.
  const callId = state.call?.id;
  useEffect(() => {
    if (!callId || state.phase === "idle") return;
    let alive = true;
    const pull = async () => {
      try {
        const c = await api<CallInfo>(`/calls/${callId}`);
        if (!alive) return;
        if (c.status === "ACTIVE" && c.answer && pc.current && !remoteSet.current && phaseRef.current === "outgoing") {
          remoteSet.current = true;
          setState((s) => ({ ...s, phase: "connecting" }));
          await pc.current.setRemoteDescription({ type: "answer", sdp: c.answer });
        }
        const ended: Partial<Record<CallInfo["status"], string>> = {
          DECLINED: tr("Занг рад карда шуд"),
          MISSED: tr("Ҷавоб надоданд"),
          CANCELLED: tr("Занг бекор шуд"),
          ENDED: tr("Занг тамом шуд"),
        };
        if (ended[c.status]) cleanup(ended[c.status]);
      } catch {}
    };
    const t = setInterval(pull, state.phase === "active" ? 2500 : 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [callId, state.phase, cleanup]);

  // Агар 25 сония пас аз ҷавоб пайваст нашавад — шабака монеъ аст.
  useEffect(() => {
    if (state.phase !== "connecting") return;
    const t = setTimeout(() => {
      if (phaseRef.current === "connecting") {
        if (state.call) void api(`/calls/${state.call.id}/end`, { method: "POST" }).catch(() => {});
        cleanup(tr("Пайваст нашуд: шабака занги мустақимро иҷозат намедиҳад."), "error");
      }
    }, 25000);
    return () => clearTimeout(t);
  }, [state.phase, state.call, cleanup]);

  useEffect(() => {
    if (state.phase !== "active") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state.phase]);

  useEffect(attachStreams, [state.phase, attachStreams]);

  // Ҳангоми пӯшидани саҳифа занг қатъ мешавад.
  useEffect(() => {
    const onUnload = () => {
      const token = getToken();
      if (state.call && phaseRef.current !== "idle" && token) {
        void fetch(`/api/calls/${state.call.id}/end`, { method: "POST", keepalive: true, headers: { Authorization: `Bearer ${token}` } });
      }
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, [state.call]);

  useRingtone(state.phase === "incoming" || state.phase === "outgoing", state.phase === "outgoing");

  const toggleMute = () => {
    local.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  };
  const toggleCam = () => {
    local.current?.getVideoTracks().forEach((t) => (t.enabled = camOff));
    setCamOff(!camOff);
  };

  const { phase, peerName, video } = state;
  const status =
    phase === "outgoing" ? tr("Занг зада истодааст…") : phase === "incoming" ? (video ? tr("Занги видео") : tr("Занги аудио")) : phase === "connecting" ? tr("Пайваст шуда истодааст…") : clock(Math.max(0, Math.floor((now - startedAt) / 1000)));

  return (
    <CallsContext.Provider value={{ startCall, busy: phase !== "idle" }}>
      {children}
      {phase !== "idle" && (
        <div className="call-in fixed inset-0 z-[70] flex flex-col overflow-hidden bg-[#0f0a0b] text-white" role="dialog" aria-label={tr("Занг")}>
          <div className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-[#e4002b] opacity-30 blur-[120px]" />
          <div className="pointer-events-none absolute -right-32 -bottom-40 size-[460px] rounded-full bg-[#ff5a36] opacity-20 blur-[120px]" />
          <audio ref={remoteAudio} autoPlay />

          {video && phase !== "incoming" ? (
            <>
              <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 size-full bg-black object-cover" />
              <video
                ref={localVideo}
                autoPlay
                playsInline
                muted
                className={cn("absolute top-4 right-4 z-10 aspect-[3/4] w-28 rounded-2xl border border-white/20 bg-black object-cover shadow-2xl sm:w-40", camOff && "opacity-0")}
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="relative z-10 p-6 text-center [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
                <div className="text-lg font-bold">{peerName}</div>
                <div className="text-sm text-white/75 tabular">{status}</div>
              </div>
            </>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
              <div className="call-pulse rounded-full">
                <Avatar name={peerName} size={120} />
              </div>
              <div>
                <div className="text-2xl font-bold">{peerName}</div>
                <div className="mt-1 text-white/70 tabular">{status}</div>
              </div>
            </div>
          )}

          <div className="relative z-10 mt-auto flex items-center justify-center gap-5 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            {phase === "incoming" ? (
              <>
                <CallButton onClick={decline} label={tr("Рад кардан")} className="bg-[#e4002b] hover:bg-[#c80026]">
                  <PhoneOff className="size-7" />
                </CallButton>
                <CallButton onClick={accept} label={tr("Ҷавоб додан")} className="call-bounce bg-[#1fa855] hover:bg-[#178a45]">
                  {video ? <Video className="size-7" /> : <Phone className="size-7" />}
                </CallButton>
              </>
            ) : (
              <>
                <CallButton onClick={toggleMute} label={muted ? tr("Микрофонро фаъол кардан") : tr("Микрофонро хомӯш кардан")} className={muted ? "bg-white text-[#0f0a0b]" : "bg-white/15 hover:bg-white/25"}>
                  {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
                </CallButton>
                {video && (
                  <CallButton onClick={toggleCam} label={camOff ? tr("Камераро фаъол кардан") : tr("Камераро хомӯш кардан")} className={camOff ? "bg-white text-[#0f0a0b]" : "bg-white/15 hover:bg-white/25"}>
                    {camOff ? <VideoOff className="size-6" /> : <Video className="size-6" />}
                  </CallButton>
                )}
                <CallButton onClick={hangUp} label={tr("Қатъ кардан")} className="bg-[#e4002b] hover:bg-[#c80026]">
                  <PhoneOff className="size-7" />
                </CallButton>
              </>
            )}
          </div>
        </div>
      )}
    </CallsContext.Provider>
  );
}

function CallButton({ onClick, label, className, children }: { onClick: () => void; label: string; className: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cn("grid size-16 cursor-pointer place-items-center rounded-full shadow-xl transition active:scale-90", className)}>
      {children}
    </button>
  );
}
