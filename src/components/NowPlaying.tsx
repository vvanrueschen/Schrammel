"use client";

import { useState, useEffect } from "react";

interface NowPlayingData {
  artist: string;
  title: string;
}

interface NowPlayingProps {
  onSongChange?: (data: NowPlayingData) => void;
}

export default function NowPlaying({ onSongChange }: NowPlayingProps) {
  const [data, setData] = useState<NowPlayingData>({
    artist: "Der Schrammel Reloaded Stream",
    title: "Loading...",
  });
  const [prevKey, setPrevKey] = useState("");

  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const res = await fetch("/api/now-playing");
        const json = await res.json();
        const currentKey = `${json.artist}-${json.title}`;

        if (currentKey !== prevKey) {
          setPrevKey(currentKey);
          setData(json);
          onSongChange?.(json);
        }
      } catch {
        // Silently fail, keep showing last known
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, [prevKey, onSongChange]);

  return (
    <div className="now-playing-display">
      <span className="now-playing-label">Now Playing:</span>
      <span className="now-playing-artist">{data.artist}</span>
      <span className="now-playing-title">{data.title}</span>
    </div>
  );
}
