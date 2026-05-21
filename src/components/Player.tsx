"use client";

import { useState, useRef, useEffect } from "react";

interface PlayerProps {
  streamUrl: string;
  onVote: (direction: "+" | "-") => void;
  currentArtist: string;
  currentTitle: string;
  hasVoted: boolean;
}

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isIntentionalStop = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume / 100;

    audioRef.current.addEventListener("ended", () => {
      audioRef.current?.play();
    });

    audioRef.current.addEventListener("error", () => {
      if (!isIntentionalStop.current) {
        setIsOffline(true);
        setTimeout(() => setIsOffline(false), 30000);
      }
      isIntentionalStop.current = false;
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      isIntentionalStop.current = true;
      audioRef.current.src = "";
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = streamUrl;
      audioRef.current.play().catch(() => setIsOffline(true));
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
              Stream offline — retrying in 30s...
            </div>
          )}
          <div className="player-controls">
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
