"use client";

import { VIDEO_NOTE_MAX_SECONDS, VOICE_MAX_SECONDS } from "@filialhub/shared";
import { Loader2, Mic, Pause, Play, Send, Trash2, TriangleAlert, Video, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { tr } from "@/lib/i18n";
import { clock, mediaError, pickMime, useMediaUrl, useRecorder, type Recording } from "@/lib/media";
import { useToast } from "./toast";
import { cn } from "./ui";

/** Мавҷҳои «овоз» — аз id сохта мешаванд, то ҳар паём шакли худро дошта бошад ва ҳангоми рендер тағйир наёбад. */
function bars(seed: number, n = 28) {
  let x = seed * 9301 + 49297;
  return Array.from({ length: n }, () => {
    x = (x * 9301 + 49297) % 233280;
    return 0.25 + (x / 233280) * 0.75;
  });
}

export function VoiceBubble({ id, mediaId, seconds, mine }: { id: number; mediaId: number; seconds: number; mine: boolean }) {
  const { url, error } = useMediaUrl(mediaId);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const wave = useMemo(() => bars(id), [id]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  return (
    <div className="flex w-60 max-w-full items-center gap-3">
      <button
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? tr("Таваққуф") : tr("Гӯш кардан")}
        className={cn(
          "grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition active:scale-90 disabled:cursor-wait",
          mine ? "bg-white/25 text-white hover:bg-white/35" : "brand-gradient text-white shadow-md",
        )}
      >
        {!url && !error ? <Loader2 className="size-4 animate-spin" /> : playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-7 items-center gap-[2px]" aria-hidden>
          {wave.map((h, i) => (
            <span
              key={i}
              className={cn("w-[3px] rounded-full transition-colors", i / wave.length < progress ? (mine ? "bg-white" : "bg-brand") : mine ? "bg-white/40" : "bg-ink/20")}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <div className={cn("mt-0.5 text-[11px] tabular", mine ? "text-white/80" : "text-muted")}>
          {error ? tr("Файл кушода нашуд") : clock(playing || progress ? progress * seconds : seconds)}
        </div>
      </div>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            const total = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : seconds;
            setProgress(Math.min(a.currentTime / total, 1));
          }}
        />
      )}
    </div>
  );
}

/** Видеои мудаввар (мисли Telegram): бе садо худ ба худ давр мезанад, пахш кунед — бо садо аз аввал. */
export function VideoNoteBubble({ mediaId, seconds }: { mediaId: number; seconds: number }) {
  const { url, error } = useMediaUrl(mediaId);
  const ref = useRef<HTMLVideoElement>(null);
  const [withSound, setWithSound] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (!withSound) {
      v.muted = false;
      v.currentTime = 0;
      v.loop = false;
      void v.play();
      setWithSound(true);
    } else if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <button onClick={toggle} className="group relative block size-52 cursor-pointer sm:size-60" aria-label={tr("Видеопаём")}>
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="48.5" fill="none" stroke="var(--line)" strokeWidth="2" />
        {withSound && <circle cx="50" cy="50" r="48.5" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" pathLength={100} strokeDasharray={`${progress * 100} 100`} />}
      </svg>
      <div className="absolute inset-[5px] overflow-hidden rounded-full bg-black shadow-lg">
        {url ? (
          <video
            ref={ref}
            src={url}
            autoPlay
            muted
            loop
            playsInline
            className="size-full object-cover"
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              const total = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : seconds;
              setProgress(Math.min(v.currentTime / total, 1));
            }}
            onEnded={() => {
              setWithSound(false);
              setProgress(0);
              if (ref.current) {
                ref.current.muted = true;
                ref.current.loop = true;
                void ref.current.play();
              }
            }}
          />
        ) : (
          <div className="grid size-full place-items-center text-white/70">{error ? <TriangleAlert className="size-6" /> : <Loader2 className="size-6 animate-spin" />}</div>
        )}
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white tabular backdrop-blur">
        {withSound ? clock(progress * seconds) : <><VolumeX className="mr-1 inline size-3 -mt-0.5" />{clock(seconds)}</>}
      </span>
    </button>
  );
}

/** Сатри сабти овоз: вақт, нишондиҳандаи сурх, бекор / фиристодан. */
export function VoiceRecorder({ onSend, onCancel }: { onSend: (r: Recording) => void; onCancel: () => void }) {
  const toast = useToast();
  const rec = useRecorder(VOICE_MAX_SECONDS);
  const stream = useRef<MediaStream | null>(null);
  const sendOnStop = useRef(false);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let ctx: AudioContext | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        // Баландии овоз барои аниматсия
        try {
          ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          ctx.createMediaStreamSource(s).connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(data);
            setLevel(data.reduce((a, b) => a + b, 0) / data.length / 128);
            raf = requestAnimationFrame(tick);
          };
          tick();
        } catch {}
        void rec.start(s, pickMime("audio"), { audioBitsPerSecond: 48000 }).then((r) => {
          s.getTracks().forEach((t) => t.stop());
          if (r && sendOnStop.current) onSend(r);
        });
      })
      .catch((e) => {
        toast.error(mediaError(e));
        onCancel();
      });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      void ctx?.close();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сабт як маротиба ҳангоми кушодан оғоз мешавад
  }, []);

  return (
    <div className="rise flex h-11 flex-1 items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft px-3">
      <button onClick={() => (rec.cancel(), onCancel())} className="grid size-8 cursor-pointer place-items-center rounded-lg text-brand hover:bg-surface" aria-label={tr("Бекор кардан")}>
        <Trash2 className="size-4" />
      </button>
      <span className="relative grid size-3 place-items-center">
        <span className="absolute size-3 animate-ping rounded-full bg-brand/60" />
        <span className="size-2.5 rounded-full bg-brand" />
      </span>
      <span className="text-sm font-semibold text-brand tabular">{clock(rec.seconds)}</span>
      <div className="flex h-6 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="w-[3px] rounded-full bg-brand/70 transition-[height] duration-100" style={{ height: `${Math.max(12, Math.min(100, level * 100 * (0.5 + ((i * 37) % 10) / 10)))}%` }} />
        ))}
      </div>
      <button
        onClick={() => {
          sendOnStop.current = true;
          rec.stop();
        }}
        disabled={!rec.recording}
        className="brand-gradient grid size-9 cursor-pointer place-items-center rounded-full text-white shadow-md transition active:scale-90 disabled:opacity-50"
        aria-label={tr("Фиристодан")}
      >
        <Send className="size-4" />
      </button>
    </div>
  );
}

/** Сабти видеои мудаввар: пешнамоиши даврӣ, ҳалқаи вақт (то 60 сония), бекор / фиристодан. */
export function VideoNoteRecorder({ onSend, onClose }: { onSend: (r: Recording) => void; onClose: () => void }) {
  const toast = useToast();
  const rec = useRecorder(VIDEO_NOTE_MAX_SECONDS);
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const sendOnStop = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 }, aspectRatio: 1 } })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (preview.current) preview.current.srcObject = s;
        setReady(true);
      })
      .catch((e) => {
        toast.error(mediaError(e));
        onClose();
      });
    return () => {
      alive = false;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- камера як маротиба кушода мешавад
  }, []);

  const start = () => {
    if (!stream.current) return;
    void rec.start(stream.current, pickMime("video"), { videoBitsPerSecond: 700_000, audioBitsPerSecond: 48000 }).then((r) => {
      if (r && sendOnStop.current) onSend(r);
      if (sendOnStop.current) onClose();
    });
  };

  const progress = rec.seconds / VIDEO_NOTE_MAX_SECONDS;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !rec.recording && onClose()}>
      <div className="pop flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
        <div className="relative size-72 sm:size-80">
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2" />
            <circle cx="50" cy="50" r="48.5" fill="none" stroke="#dc3b1c" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${progress * 100} 100`} className="transition-[stroke-dasharray] duration-300" />
          </svg>
          <div className="absolute inset-[6px] overflow-hidden rounded-full bg-black">
            <video ref={preview} autoPlay muted playsInline className="size-full object-cover" style={{ transform: "scaleX(-1)" }} />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center text-white/70">
                <Loader2 className="size-7 animate-spin" />
              </div>
            )}
          </div>
          {rec.recording && (
            <span className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white tabular">
              <span className="size-2 animate-pulse rounded-full bg-[#dc3b1c]" /> {clock(rec.seconds)} / {clock(VIDEO_NOTE_MAX_SECONDS)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => (rec.cancel(), onClose())}
            className="grid size-14 cursor-pointer place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-90"
            aria-label={tr("Бекор кардан")}
          >
            <X className="size-6" />
          </button>
          {!rec.recording ? (
            <button
              onClick={start}
              disabled={!ready}
              className="grid size-16 cursor-pointer place-items-center rounded-full bg-[#dc3b1c] text-white transition active:scale-90 disabled:opacity-50"
              aria-label={tr("Сабтро оғоз кардан")}
            >
              <Video className="size-7" />
            </button>
          ) : (
            <button
              onClick={() => {
                sendOnStop.current = true;
                rec.stop();
              }}
              className="grid size-16 cursor-pointer place-items-center rounded-full bg-white text-[#dc3b1c] shadow-xl transition active:scale-90"
              aria-label={tr("Фиристодан")}
            >
              <Send className="size-7" />
            </button>
          )}
        </div>
        <p className="text-center text-sm text-white/70">{rec.recording ? tr("Барои фиристодан тугмаи сафедро пахш кунед") : tr("Тугмаи сурхро пахш кунед ва гап занед (то 1 дақиқа)")}</p>
      </div>
    </div>
  );
}

export function RecordButtons({ onVoice, onVideo, disabled }: { onVoice: () => void; onVideo: () => void; disabled?: boolean }) {
  return (
    <>
      <button
        onClick={onVideo}
        disabled={disabled}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-line text-ink-2 transition hover:border-brand/40 hover:text-brand active:scale-90 disabled:opacity-50"
        aria-label={tr("Видеои мудаввар")}
        title={tr("Видеои мудаввар")}
      >
        <Video className="size-5" />
      </button>
      <button
        onClick={onVoice}
        disabled={disabled}
        className="brand-gradient grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-white shadow-md transition active:scale-90 disabled:opacity-50"
        aria-label={tr("Паёми овозӣ")}
        title={tr("Паёми овозӣ")}
      >
        <Mic className="size-5" />
      </button>
    </>
  );
}
