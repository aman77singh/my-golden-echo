import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceNotePlayerProps {
  voiceUrl: string;
  isMe: boolean;
}

export function VoiceNotePlayer({ voiceUrl, isMe }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate 20 deterministic waveform bar heights from voiceUrl string
  const bars = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < voiceUrl.length; i++) {
      hash = (hash << 5) - hash + voiceUrl.charCodeAt(i);
      hash |= 0;
    }
    return Array.from({ length: 20 }).map((_, i) => {
      const val = Math.abs(Math.sin(hash + i * 1.3));
      return Math.max(0.2, val);
    });
  }, [voiceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <audio ref={audioRef} src={voiceUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
          isMe
            ? "bg-[#0d0d12]/20 text-[#0d0d12] hover:bg-[#0d0d12]/30"
            : "bg-accent/20 text-accent hover:bg-accent/30"
        }`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      {/* Waveform Visualizer */}
      <div className="flex-1">
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            if (audioRef.current && duration > 0) {
              audioRef.current.currentTime = pos * duration;
            }
          }}
          className="flex h-6 cursor-pointer items-center gap-0.5"
        >
          {bars.map((height, i) => {
            const barProgress = (i / bars.length) * 100;
            const isFilled = barProgress <= progress;
            return (
              <span
                key={i}
                style={{ height: `${height * 100}%` }}
                className={`w-1 rounded-full transition-colors ${
                  isFilled
                    ? isMe
                      ? "bg-[#0d0d12]"
                      : "bg-accent shadow-sm"
                    : isMe
                    ? "bg-[#0d0d12]/25"
                    : "bg-white/20"
                }`}
              />
            );
          })}
        </div>

        <div
          className={`flex items-center justify-between text-[10px] font-mono ${
            isMe ? "text-[#0d0d12]/80" : "text-muted-foreground"
          }`}
        >
          <span>{formatSec(currentTime)}</span>
          <span>{duration > 0 ? formatSec(duration) : "0:05"} · Voice Memo</span>
        </div>
      </div>
    </div>
  );
}
