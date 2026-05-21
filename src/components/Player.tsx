"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface PlayerProps {
  streamUrl: string;
  onVote: (direction: "+" | "-") => void;
  currentArtist: string;
  currentTitle: string;
  hasVoted: boolean;
}

const MAX_RETRY_DELAY = 60000;
const INITIAL_RETRY_DELAY = 2000;

export default function Player({
  streamUrl,
  onVote,
  currentArtist,
  currentTitle,
  hasVoted,
}: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isOffline, setIsOffline] = useState(false);
  const [retryDisplay, setRetryDisplay] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isIntentionalStop = useRef(false);

  const scheduleRetry = useCallback((count: number) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, count - 1), MAX_RETRY_DELAY);
    retryTimerRef.current = setTimeout(() => {
      if (audioRef.current && !isIntentionalStop.current) {
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        audioRef.current.play().then(() => {
          setIsOffline(false);
          retryCountRef.current = 0;
          setRetryDisplay(0);
        }).catch(() => {
          retryCountRef.current++;
          setRetryDisplay(retryCountRef.current);
          scheduleRetry(retryCountRef.current);
        });
      }
    }, delay);
  }, [streamUrl]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = volume / 100;
    audioRef.current = audio;

    audio.addEventListener("error", () => {
      if (!isIntentionalStop.current) {
        setIsOffline(true);
        retryCountRef.current++;
        setRetryDisplay(retryCountRef.current);
        scheduleRetry(retryCountRef.current);
      }
      isIntentionalStop.current = false;
    });

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [scheduleRetry]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      isIntentionalStop.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      setIsOffline(false);
      retryCountRef.current = 0;
      setRetryDisplay(0);
      audioRef.current.muted = true;
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = streamUrl;
      audioRef.current.load();
      audioRef.current.muted = false;
      audioRef.current.play().catch(() => {
        setIsOffline(true);
        retryCountRef.current = 1;
        setRetryDisplay(1);
        scheduleRetry(1);
      });
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleVote = (direction: "+" | "-") => {
    onVote(direction);
  };

  return (
    <div className="neon-card hero-card">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="album-art">
          <img src="/cover_1.png" alt="Album cover" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
          <h1 className="stream-title">
            Der Schrammel<span className="text-neon-pink">.</span>
            Reloaded<span className="text-neon-blue">.</span>Stream
          </h1>
          <div className="now-playing-text">
            Now Playing:{" "}
            <span className="text-white font-medium">
              {currentArtist} — {currentTitle}
            </span>
          </div>
          {isOffline && (
            <div className="offline-indicator">
              Stream offline — retrying in ~{Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryDisplay - 1) / 1000, MAX_RETRY_DELAY / 1000).toFixed(0)}s...
            </div>
          )}
          <div className="player-controls">
            <div className="player-buttons">
              <button
                onClick={() => handleVote("-")}
                className="vote-btn vote-down"
                aria-label="Vote down"
                disabled={hasVoted}
              >
                👎
              </button>
              <button
                onClick={togglePlay}
                className="play-btn"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button
                onClick={() => handleVote("+")}
                className="vote-btn vote-up"
                aria-label="Vote up"
                disabled={hasVoted}
              >
                👍
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
