import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Camera() {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [frozenImage, setFrozenImage] = useState(null);
  const streamRef = useRef(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        videoRef.current.onloadeddata = () => {
          setReady(true);

          // 🔥 PREVIEW MIRROR (SELFIE)
          videoRef.current.style.transform = "scaleX(-1)";
        };

        videoRef.current.play().catch(() => {});
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    setupCamera();

    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleDetect = async () => {
    if (!ready) return;

    setLoading(true); // 🔥 keep "Detecting..." until navigate

    const video = videoRef.current;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 🔥 CAPTURE NORMAL (NOT MIRRORED)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 🔥 Freeze frame (AS-IS / NOT MIRROR)
    const freezeBase64 = canvas.toDataURL("image/png");
    setFrozenImage(freezeBase64);

    // Convert for backend
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.95)
    );

    stopCamera();

    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");

    try {
      const res = await fetch("http://localhost:4000/predict", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      navigate("/result", {
        state: {
          mood: data.prediction || data.mood_label,
          confidence: data.confidence,
        },
      });

    } catch (err) {
      console.error("API error:", err);
      alert("Prediction failed!");
      setLoading(false);
    }
  };

  return (
    <main className="screen screen--center">
      <div className="camera-wrapper">
        <div className="camera-frame">

          {/* BEFORE CAPTURE → show mirror video */}
          {!frozenImage && (
            <video
              ref={videoRef}
              muted
              playsInline
              className="camera-video"
              style={{ width: "100%", height: "auto" }}
            />
          )}

          {/* AFTER CAPTURE → show FREEZE frame (NORMAL, NO MIRROR) */}
          {frozenImage && (
            <img
              src={frozenImage}
              className="camera-video"
              style={{ width: "100%", height: "auto" }}
              alt="captured"
            />
          )}
        </div>

        {/* TEXT stays “Detecting…” while loading */}
        <p className="camera-caption">
          {loading ? "Detecting..." : ready ? "Click to detect mood" : "Initializing camera..."}
        </p>

        {/* BUTTON stays Detecting... and disabled */}
        {!frozenImage && (
          <button
            className="btn btn-primary"
            onClick={handleDetect}
            disabled={loading || !ready}
          >
            {loading ? "Detecting..." : "Detect Mood"}
          </button>
        )}
      </div>
    </main>
  );
}
