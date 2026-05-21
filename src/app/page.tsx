"use client";

import { useState, useCallback, useEffect } from "react";
import Player from "@/components/Player";
import TopTen from "@/components/TopTen";
import BottomTen from "@/components/BottomTen";
import Wishlist from "@/components/Wishlist";

const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost/listen/schrammel_stream/schrammel";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("schrammel_device_id");
  if (!id) {
    id = generateId();
    localStorage.setItem("schrammel_device_id", id);
  }
  return id;
}

export default function Home() {
  const [currentArtist, setCurrentArtist] = useState("Der Schrammel Reloaded Stream");
  const [currentTitle, setCurrentTitle] = useState("Loading...");
  const [hasVoted, setHasVoted] = useState(false);
  const [topTenRefreshKey, setTopTenRefreshKey] = useState(0);
  const [bottomTenRefreshKey, setBottomTenRefreshKey] = useState(0);
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch(`/api/now-playing?deviceId=${deviceId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentArtist(data.artist);
        setCurrentTitle(data.title);
        setHasVoted(data.hasVoted ?? false);
      }
    } catch {
      // ignore
    }
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10000);
    return () => clearInterval(interval);
  }, [fetchNowPlaying, deviceId]);

  const handleVote = async (direction: "+" | "-") => {
    if (hasVoted) return;

    const formData = new FormData();
    formData.append("artist", currentArtist);
    formData.append("title", currentTitle);
    formData.append("vote", direction);
    formData.append("deviceId", deviceId);

    const res = await fetch("/api/vote", { method: "POST", body: formData });
    const result = await res.json();

    if (result.success) {
      setHasVoted(true);
      setTopTenRefreshKey((k) => k + 1);
      setBottomTenRefreshKey((k) => k + 1);
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="space-y-6">
      <Player
        streamUrl={STREAM_URL}
        onVote={handleVote}
        currentArtist={currentArtist}
        currentTitle={currentTitle}
        hasVoted={hasVoted}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopTen refreshKey={topTenRefreshKey} />
        <Wishlist deviceId={deviceId} />
      </div>

      <BottomTen refreshKey={bottomTenRefreshKey} />
    </div>
  );
}
