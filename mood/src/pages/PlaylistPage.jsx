import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const EMOJI = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  neutral: "😐",
  fear: "😨",
  disgust: "🤢",
  surprise: "😲",
};

export default function PlaylistPage() {
  const { state } = useLocation();
  const [tracks, setTracks] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  if (!state || !state.mood) return "No Data";

  const mood = state.mood.toLowerCase();

  useEffect(() => {
    async function fetchPlaylist() {
      try {
        const res = await fetch(`http://localhost:4000/playlist?mood=${mood}`);
        const data = await res.json();

        console.log("Playlist by Mood:", data);

        if (data.error) {
          setErrorMsg("No playlist found for this mood.");
          setLoading(false);
          return;
        }

        // Playlist info
        setPlaylistInfo(data.playlist_info || null);

        // 🚀 LIMIT TRACKS → 15 only
        const limitedTracks = (data.tracks || []).slice(0, 15);
        setTracks(limitedTracks);

        if (limitedTracks.length === 0) {
          setErrorMsg("No tracks found for this playlist.");
        }
      } catch (err) {
        console.error("Spotify playlist fetch error:", err);
        setErrorMsg("Failed to fetch playlist from backend.");
      }

      setLoading(false);
    }

    fetchPlaylist();
  }, [mood]);

  if (loading) {
    return <p className="text-center mt-10 text-lg">Loading playlist...</p>;
  }

  return (
    <main className="screen screen--playlist p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        {EMOJI[mood] || "🎵"} {state.mood} Playlist
      </h2>

      {errorMsg && <p className="text-red-400 mb-4 text-lg">{errorMsg}</p>}

      {/* Playlist Info */}
      {playlistInfo && (
        <div className="flex items-center gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/10 shadow">
          <img
            src={playlistInfo.cover}
            alt="playlist cover"
            className="w-28 h-28 rounded-lg shadow-lg"
          />
          <div>
            <p className="text-xl font-bold">{playlistInfo.name}</p>
            <a
              href={playlistInfo.url}
              target="_blank"
              className="text-blue-400 underline text-sm"
            >
              Open full playlist on Spotify →
            </a>
          </div>
        </div>
      )}

      {/* Track list */}
      <div className="playlist-list space-y-4">
        {tracks.map((song, idx) => (
          <div
            key={idx}
            className="playlist-item flex gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
          >
            <img
              src={song.image}
              width={60}
              className="rounded shadow"
              alt="track cover"
            />

            <div className="flex-1">
              <p className="font-bold">{song.title}</p>
              <p className="text-sm opacity-70">{song.artist}</p>

              {song.preview_url && (
                <audio
                  controls
                  src={song.preview_url}
                  className="mt-2 w-full"
                ></audio>
              )}

              <a
                href={song.spotify_url}
                target="_blank"
                className="text-blue-400 text-sm"
              >
                Listen on Spotify →
              </a>
            </div>
          </div>
        ))}

        {tracks.length === 0 && !loading && (
          <p className="text-red-400 mt-6 text-center">
            No tracks available for this mood 🚫
          </p>
        )}
      </div>
    </main>
  );
}
