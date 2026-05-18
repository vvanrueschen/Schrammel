"use client";

import { useState, useRef, useEffect } from "react";

interface PlayerProps {
  streamUrl: string;
  onVote: (direction: "+" | "-") => void;
  currentArtist: string;
  currentTitle: string;
}

export default function Player({
  streamUrl,
  onVote,
  currentArtist,
  currentTitle,
}: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isOffline, setIsOffline] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume / 100;

    audioRef.current.addEventListener("ended", () => {
      audioRef.current?.play();
    });

    audioRef.current.addEventListener("error", () => {
      setIsOffline(true);
      setTimeout(() => setIsOffline(false), 30000);
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
      <div className="flex items-center gap-5">
        <div className="album-art">
          {isPlaying ? (
            <div className="play-icon">⏸</div>
          ) : (
            <div className="play-icon">▶</div>
          )}
        </div>
        <div className="flex-1">
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
