import { useLocation, useNavigate } from "react-router-dom";

const EMOJI = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  neutral: "😐",
  fear: "😨",
  disgust: "🤢",
  surprise: "😲",
};

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state || !state.mood) {
    return <p>No data received</p>;
  }

  // Normalisasi mood dari backend (ex: "Happy" → "happy")
  const mood = state.mood.toLowerCase();

  return (
    <main className="screen screen--center">
      <div className="result-wrapper">
        
        {/* Emoji */}
        <div className="result-emoji">{EMOJI[mood] || "🙂"}</div>

        {/* Text */}
        <p className="result-text">
          Your mood is <span className="result-mood">{state.mood}</span>
        </p>

        {/* Button to playlist */}
        <button
          className="btn btn-primary"
          onClick={() =>
            navigate("/playlist", {
              state: { mood: state.mood }, // kirim mood saja
            })
          }
        >
          See Your Playlist
        </button>
      </div>
    </main>
  );
}
