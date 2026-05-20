"use client";

import { useState, useCallback, useEffect } from "react";
import Player from "@/components/Player";
import TopTen from "@/components/TopTen";
import Wishlist from "@/components/Wishlist";

const STREAM_URL = "http://vinceberrypi/listen/schrammel_stream/schrammel";

export default function Home() {
  const [currentArtist, setCurrentArtist] = useState("Der Schrammel.Reloaded.Stream");
  const [currentTitle, setCurrentTitle] = useState("Loading...");
  const [voteDisabled, setVoteDisabled] = useState(false);
  const [topTenRefreshKey, setTopTenRefreshKey] = useState(0);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/now-playing");
      if (res.ok) {
        const data = await res.json();
        setCurrentArtist(data.artist);
        setCurrentTitle(data.title);
        setVoteDisabled(false);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10000);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  const handleVote = async (direction: "+" | "-") => {
    if (voteDisabled) return;

    const formData = new FormData();
    formData.append("artist", currentArtist);
    formData.append("title", currentTitle);
    formData.append("vote", direction);

    const res = await fetch("/api/vote", { method: "POST", body: formData });
    const result = await res.json();

    if (result.success) {
      setVoteDisabled(true);
      setTopTenRefreshKey((k) => k + 1);
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
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopTen refreshKey={topTenRefreshKey} />
        <Wishlist />
      </div>
    </div>
  );
}
