"use client";

import { useState, useEffect } from "react";
import type { RankingEntry } from "@/types";

interface BottomTenProps {
  refreshKey?: number;
}

export default function BottomTen({ refreshKey = 0 }: BottomTenProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    try {
      const res = await fetch("/api/bottom-ten");
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
      <h2 className="section-title text-red-500">💀 Bottom 10</h2>
      <p className="text-gray-400 text-xs mb-2">
        Songs mit mindestens 3 Votes und einem Rating von -5 oder schlechter werden wöchentlich automatisch gelöscht.
      </p>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="neon-card">
      <h2 className="section-title text-red-500">💀 Bottom 10</h2>
      {rankings.length === 0 ? (
        <p className="text-gray-500 text-sm">Noch keine negativen Votes.</p>
      ) : (
        <ul className="ranking-list">
          {rankings.map((entry, index) => (
            <li key={index} className="ranking-item">
              <span className="rank-number">{index + 1}.</span>
              <span className="song-info">
                {entry.title} — {entry.artist}
              </span>
              <span className="vote-count">{entry.rating}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
