"use client";

import { useState, useEffect } from "react";

interface Wish {
  id: number;
  artist: string;
  title: string;
  weblink: string | null;
  rating: number;
  createdAt: string;
}

export default function Wishlist() {
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

  const handleRate = async (wishId: number, rating: number) => {
    if (rating < 0 || rating > 10) {
      alert("Es muss eine Bewertung von 0 bis 10 abgegeben werden.");
      return;
    }

    const formData = new FormData();
    formData.append("wsongid", wishId.toString());
    formData.append("wrating", rating.toString());

    const res = await fetch("/api/wish/rate", {
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
        <input
          type="text"
          value={weblink}
          onChange={(e) => setWeblink(e.target.value)}
          placeholder="Weblink (optional)"
          className="neon-input mb-3"
        />
        <button onClick={handleSubmit} className="neon-btn neon-btn-primary">
          Einreichen
        </button>
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
                <span className="wish-title">{wish.title}</span>
                <span className="wish-artist">{wish.artist}</span>
              </div>
              <div className="wish-rating">
                <input
                  type="number"
                  min="0"
                  max="10"
                  defaultValue={wish.rating}
                  className="rating-input"
                  id={`rating-${wish.id}`}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      `rating-${wish.id}`
                    ) as HTMLInputElement;
                    handleRate(wish.id, parseInt(input.value, 10));
                  }}
                  className="neon-btn neon-btn-sm"
                >
                  Rate
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
