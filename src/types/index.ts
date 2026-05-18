export interface NowPlayingData {
  artist: string;
  title: string;
}

export interface VotePayload {
  artist: string;
  title: string;
  vote: "+" | "-";
}

export interface WishPayload {
  artist: string;
  title: string;
  weblink?: string;
}

export interface WishRatingPayload {
  wsongid: string;
  wrating: string;
}

export interface RankingEntry {
  artist: string;
  title: string;
  rating: number;
}
