"use client";

import { useState, useCallback } from "react";
import Player from "@/components/Player";
import TopTen from "@/components/TopTen";
import Wishlist from "@/components/Wishlist";

const STREAM_URL = "http://schrammelstream.ddns.net:8000/schrammel";

export default function Home() {
  const [currentArtist, setCurrentArtist] = useState("Der Schrammel.Reloaded.Stream");
  const [currentTitle, setCurrentTitle] = useState("Loading...");
  const [voteDisabled, setVoteDisabled] = useState(false);

  const handleSongChange = useCallback((data: { artist: string; title: string }) => {
    setCurrentArtist(data.artist);
    setCurrentTitle(data.title);
    setVoteDisabled(false);
  }, []);

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
        <TopTen />
        <Wishlist />
      </div>
    </div>
  );
}
