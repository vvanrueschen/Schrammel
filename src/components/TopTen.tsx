"use client";

import { useState, useEffect } from "react";
import type { RankingEntry } from "@/types";

interface TopTenProps {
  refreshKey?: number;
}

export default function TopTen({ refreshKey = 0 }: TopTenProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    try {
      const res = await fetch("/api/ranking");
      const data = await res.json();
      setRankings(data);
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="neon-card">
        <h2 className="section-title text-neon-pink">🏆 Top 10</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="neon-card">
      <h2 className="section-title text-neon-pink">🏆 Top 10</h2>
      {rankings.length === 0 ? (
        <p className="text-gray-500 text-sm">No votes yet. Be the first!</p>
      ) : (
        <ul className="ranking-list">
          {rankings.map((entry, index) => (
            <li key={index} className="ranking-item">
              <span className="rank-number">{index + 1}.</span>
              <span className="song-info">
                {entry.title} — {entry.artist}
              </span>
              <span className="vote-count">{entry.rating > 0 ? `+${entry.rating}` : entry.rating}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
