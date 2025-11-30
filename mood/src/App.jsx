import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const STEPS = {
  LANDING: "landing",
  CAMERA: "camera",
  RESULT: "result",
  PLAYLIST: "playlist",
};

const MOOD_EMOJI = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  neutral: "😐",
};

const MAX_SFX_DURATION = 2; // durasi SFX maksimal (detik)

/**
 * Format waktu jadi "1:57 AM" dengan zona waktu WIB (Asia/Jakarta).
 */
function getFormattedTimeWIB() {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Jakarta", // WIB
  });
}

/**
 * Ambil 1 frame dari video → dataURL base64 (JPEG).
 */
function captureFrame(videoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function App() {
  const [step, setStep] = useState(STEPS.LANDING);
  const [mood, setMood] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingMood, setLoadingMood] = useState(false);

  // state jam WIB
  const [timeString, setTimeString] = useState(getFormattedTimeWIB());

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sfxRef = useRef(null);
  const sfxTimeoutRef = useRef(null);
  const playerRef = useRef(null);

  // update jam WIB tiap detik
  useEffect(() => {
    const id = setInterval(() => {
      setTimeString(getFormattedTimeWIB());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // aktifkan / matikan kamera saat masuk/keluar halaman CAMERA
  useEffect(() => {
    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("Tidak bisa akses kamera:", err);
      }
    }

    if (step === STEPS.CAMERA) {
      enableCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [step]);

  // bersihkan timeout SFX kalau komponen unmount
  useEffect(() => {
    return () => {
      if (sfxTimeoutRef.current) {
        clearTimeout(sfxTimeoutRef.current);
      }
    };
  }, []);

  const handleStart = () => {
    setStep(STEPS.CAMERA);
  };

  /**
   * Play SFX mood maksimal 2 detik.
   */
  const playMoodSfx = (moodName) => {
    const audio = sfxRef.current;
    if (!audio || !moodName) return;

    // batalkan timeout sebelumnya kalau ada
    if (sfxTimeoutRef.current) {
      clearTimeout(sfxTimeoutRef.current);
      sfxTimeoutRef.current = null;
    }

    audio.src = `/audio/sfx-${moodName}.mp3`;
    audio.currentTime = 0;

    audio
      .play()
      .then(() => {
        // stop paksa setelah MAX_SFX_DURATION detik
        sfxTimeoutRef.current = setTimeout(() => {
          if (!audio.paused) {
            audio.pause();
          }
          audio.currentTime = 0;
        }, MAX_SFX_DURATION * 1000);
      })
      .catch((e) => {
        console.warn("SFX autoplay diblokir atau gagal:", e);
      });
  };

  const handleDetectMood = async () => {
    if (!videoRef.current) return;
    setLoadingMood(true);

    try {
      const imageDataUrl = captureFrame(videoRef.current);

      // Panggil backend Node.js → Python model + Spotify
      const res = await fetch("http://localhost:4000/api/detect-mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      if (!res.ok) throw new Error("Response tidak OK");
      const data = await res.json(); // { mood, playlist }

      setMood(data.mood);
      setPlaylist(data.playlist || []);
      setCurrentTrackIndex(0);

      // mainkan SFX pendek (2 detik max)
      if (data.mood) {
        playMoodSfx(data.mood);
      }

      setStep(STEPS.RESULT);
    } catch (err) {
      console.error("Gagal mendeteksi mood:", err);
      alert("Gagal mendeteksi mood. Coba lagi ya.");
    } finally {
      setLoadingMood(false);
    }
  };

  const handleGoToPlaylist = async () => {
    setStep(STEPS.PLAYLIST);

    const firstTrack = playlist[0];
    if (playerRef.current && firstTrack?.audioUrl) {
      playerRef.current.src = firstTrack.audioUrl;
      try {
        await playerRef.current.play();
      } catch (e) {
        console.warn("Autoplay lagu diblokir:", e);
      }
    }
  };

  const handleSelectTrack = async (index) => {
    setCurrentTrackIndex(index);
    const track = playlist[index];
    if (!track || !playerRef.current) return;

    playerRef.current.src = track.audioUrl;
    try {
      await playerRef.current.play();
    } catch (e) {
      console.warn("Gagal play track:", e);
    }
  };

  const currentTrack = playlist[currentTrackIndex];

  return (
    <div className="app">
      {/* HEADER */}
      <header className="app-header">
        {/* jam pakai WIB */}
        <span className="app-time">{timeString}</span>
        <div className="app-logo">
          <span className="app-logo-main">momu</span>
          <span className="app-logo-sub">playlist</span>
        </div>
        {/* span kanan disembunyikan untuk seimbangkan layout */}
        <span className="app-time app-time--hidden">{timeString}</span>
      </header>

      {/* LANDING PAGE */}
      {step === STEPS.LANDING && (
        <main className="screen screen--landing">
          <div className="landing-grid">
            <section className="landing-text">
              <h1 className="landing-title">
                Match your playlist
                <br />
                with your mood —{" "}
                <span className="landing-title-accent">
                  see what fits your vibe today!
                </span>
              </h1>
              <p className="landing-desc">
                Elevate your emotional well-being with our Mood Music Tracker
                Website. Now try it, it&apos;s your turn!
              </p>
              <button className="btn btn-primary" onClick={handleStart}>
                Start
              </button>
            </section>

            <section className="landing-hero">
              <img
                src="/images/landing-hero.png"
                alt="Person with headphones"
                className="landing-hero-img"
              />
            </section>
          </div>
        </main>
      )}

      {/* CAMERA PAGE */}
      {step === STEPS.CAMERA && (
        <main className="screen screen--center">
          <div className="camera-wrapper">
            <div className="camera-frame">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="camera-video"
              />
            </div>
            <p className="camera-caption">
              Click the button below to start checking your mood
            </p>
            <button
              className="btn btn-primary"
              onClick={handleDetectMood}
              disabled={loadingMood}
            >
              {loadingMood ? "Detecting..." : "Detect Mood"}
            </button>
          </div>
        </main>
      )}

      {/* RESULT PAGE */}
      {step === STEPS.RESULT && mood && (
        <main className="screen screen--center">
          <div className="result-wrapper">
            <div className="result-emoji">
              {MOOD_EMOJI[mood] ?? "🙂"}
            </div>
            <div className="result-text">
              <p>
                Your mood is{" "}
                <span className="result-mood">{mood}</span>
              </p>
              <p className="result-sub">
                Scroll down or click the button to see your mood playlist
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleGoToPlaylist}>
              See Your Playlist
            </button>
          </div>
        </main>
      )}

      {/* PLAYLIST PAGE */}
      {step === STEPS.PLAYLIST && mood && (
        <main className="screen screen--playlist">
          <div className="playlist-grid">
            {/* KIRI: daftar lagu */}
            <section className="playlist-left">
              <div className="playlist-mood-header">
                <div className="playlist-mood-emoji">
                  {MOOD_EMOJI[mood]}
                </div>
                <div>
                  <p className="playlist-mood-label">Mood Playlist</p>
                  <p className="playlist-mood-title">
                    {mood.charAt(0).toUpperCase() + mood.slice(1)} Playlist
                  </p>
                </div>
              </div>

              <div className="playlist-list">
                {playlist.map((track, idx) => (
                  <button
                    key={track.id || track.title + idx}
                    className={
                      "playlist-item" +
                      (idx === currentTrackIndex
                        ? " playlist-item--active"
                        : "")
                    }
                    onClick={() => handleSelectTrack(idx)}
                  >
                    <span className="playlist-item-index">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="playlist-item-cover"
                    />
                    <div className="playlist-item-info">
                      <p className="playlist-item-title">{track.title}</p>
                      <p className="playlist-item-artist">
                        {track.artist}
                      </p>
                    </div>
                    <span className="playlist-item-duration">
                      {track.durationText}
                    </span>
                  </button>
                ))}

                {playlist.length === 0 && (
                  <p className="playlist-empty">
                    Playlist belum tersedia. Pastikan backend sudah mengembalikan
                    data dari Spotify.
                  </p>
                )}
              </div>
            </section>

            {/* TENGAH: piringan hitam */}
            <section className="playlist-center">
              <div className="vinyl-wrapper">
                <div className="vinyl-glow">
                  <div
                    className={
                      "vinyl-disc" + (isPlaying ? " vinyl-disc--spin" : "")
                    }
                  >
                    <div className="vinyl-center" />
                  </div>
                </div>
              </div>
              <div className="vinyl-progress">
                <div className="vinyl-progress-bar" />
              </div>
            </section>

            {/* KANAN: detail lagu */}
            <section className="playlist-right">
              {currentTrack ? (
                <>
                  <div className="track-cover-row">
                    <img
                      src={currentTrack.coverUrl}
                      alt={currentTrack.title}
                      className="track-cover-main"
                    />
                  </div>
                  <div className="track-info">
                    <p className="track-title">{currentTrack.title}</p>
                    <p className="track-album">
                      Album : {currentTrack.album}
                    </p>
                    {currentTrack.year && (
                      <p className="track-year">{currentTrack.year}</p>
                    )}
                    <p className="track-artist">{currentTrack.artist}</p>
                  </div>
                </>
              ) : (
                <p className="playlist-empty">
                  Pilih lagu dari daftar di sebelah kiri.
                </p>
              )}

              <div className="track-controls">
                <button
                  className="btn btn-outline"
                  onClick={() =>
                    playerRef.current && playerRef.current.pause()
                  }
                >
                  Pause
                </button>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() =>
                    playerRef.current && playerRef.current.play()
                  }
                >
                  Play
                </button>
              </div>
            </section>
          </div>
        </main>
      )}

      {/* audio elements */}
      <audio ref={sfxRef} className="hidden" />
      <audio
        ref={playerRef}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}

export default App;
