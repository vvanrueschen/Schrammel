"use client";

import { useState, useEffect } from "react";

interface Wish {
  id: number;
  artist: string;
  title: string;
  weblink: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

interface WishlistProps {
  deviceId: string;
}

export default function Wishlist({ deviceId }: WishlistProps) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [weblink, setWeblink] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWishes = async () => {
    try {
      const res = await fetch("/api/wish");
      const data = await res.json();
      setWishes(data);
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishes();
  }, []);

  const handleSubmit = async () => {
    if (!artist || !title) {
      alert("Nicht alle Felder sind ausgefüllt");
      return;
    }

    const formData = new FormData();
    formData.append("artist", artist);
    formData.append("title", title);
    formData.append("weblink", weblink);

    const res = await fetch("/api/wish", { method: "POST", body: formData });
    const result = await res.json();

    if (result.success) {
      setArtist("");
      setTitle("");
      setWeblink("");
      fetchWishes();
      if (result.message === "Title already exists") {
        alert(result.message);
      }
    } else {
      alert(result.message);
    }
  };

  const handleVote = async (wishId: number, direction: "+" | "-") => {
    const formData = new FormData();
    formData.append("wishId", wishId.toString());
    formData.append("vote", direction);
    formData.append("deviceId", deviceId);

    const res = await fetch("/api/wish/vote", {
      method: "POST",
      body: formData,
    });
    const result = await res.json();

    if (result.success) {
      fetchWishes();
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="neon-card">
      <h2 className="section-title text-neon-blue">🎵 Wunschliste</h2>

      <div className="wish-form">
        <div className="form-row">
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist"
            className="neon-input"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="neon-input"
          />
        </div>
        <div className="form-row">
          <input
            type="text"
            value={weblink}
            onChange={(e) => setWeblink(e.target.value)}
            placeholder="Weblink (optional)"
            className="neon-input"
          />
          <button onClick={handleSubmit} className="neon-btn neon-btn-primary">
            Einreichen
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm mt-4">Loading...</p>
      ) : wishes.length === 0 ? (
        <p className="text-gray-500 text-sm mt-4">No wishes yet.</p>
      ) : (
        <ul className="wish-list">
          {wishes.map((wish) => (
            <li key={wish.id} className="wish-item">
              <div className="wish-info">
                <span className="wish-title">{wish.artist}</span>
                <span className="wish-separator"> — </span>
                <span className="wish-artist">{wish.title}</span>
              </div>
              <div className="wish-votes">
                <button
                  onClick={() => handleVote(wish.id, "+")}
                  className="neon-btn neon-btn-sm vote-btn upvote"
                >
                  ▲ {wish.upvotes}
                </button>
                <button
                  onClick={() => handleVote(wish.id, "-")}
                  className="neon-btn neon-btn-sm vote-btn downvote"
                >
                  ▼ {wish.downvotes}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
