const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { spawn } = require("child_process");
require("dotenv").config();

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

// ==========================
//  ML PREDICT (CALL PYTHON)
// ==========================
app.post("/predict", upload.single("image"), (req, res) => {
    const imagePath = req.file.path;

    const python = spawn("python", ["predict_mood.py", imagePath]);

    let output = "";
    python.stdout.on("data", (data) => output += data.toString());
    python.stderr.on("data", (data) => console.error("PY ERR:", data.toString()));

    python.on("close", () => {
        try {
            res.json(JSON.parse(output));
        } catch {
            res.json({ error: "Invalid output from Python" });
        }
    });
});

const axios = require("axios");

// ============================
// GET SPOTIFY TOKEN
// ============================
async function getToken() {
    const base = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await axios.post(
        "https://accounts.spotify.com/api/token",
        "grant_type=client_credentials",
        {
            headers: {
                Authorization: `Basic ${base}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return res.data.access_token;
}

// ============================
// MOOD QUERY (SIMPLE)
// ============================
const MOOD_QUERY = {
    happy: "happy",
    sad: "sad",
    angry: "rock",
    neutral: "chill",
    fear: "ambient",
    disgust: "emo",
    surprise: "edm"
};

// ============================
// SEARCH PLAYLISTS (FIXED 2025)
// ============================
async function searchPlaylists(mood) {
    const token = await getToken();
    const q = MOOD_QUERY[mood] || mood;

    const res = await axios.get("https://api.spotify.com/v1/search", {
        params: {
            q,
            type: "playlist",
            limit: 20,
            market: "ID"  // ← penting
        },
        headers: { Authorization: `Bearer ${token}` }
    });

    // filter playlist yang valid
    return res.data.playlists.items.filter(
        (p) => p && p.images && p.images.length > 0
    );
}

// ============================
// GET TRACKS FROM PLAYLIST
// ============================
async function getTracks(id) {
    const token = await getToken();

    const res = await axios.get(
        `https://api.spotify.com/v1/playlists/${id}/tracks`,
        {
            headers: { Authorization: `Bearer ${token}` },
            params: { market: "ID" }
        }
    );

    return res.data.items
        .map((i) => i.track)
        .filter(Boolean)
        .map((t) => ({
            title: t.name,
            artist: t.artists.map((a) => a.name).join(", "),
            preview_url: t.preview_url,
            image: t.album.images[0]?.url,
            spotify_url: t.external_urls.spotify
        }));
}

// ============================
// FINAL ENDPOINT
// ============================
app.get("/playlist", async (req, res) => {
    try {
        const mood = req.query.mood.toLowerCase();
        const playlists = await searchPlaylists(mood);

        if (!playlists || playlists.length === 0) {
            return res.json({ error: "No playlist found", tracks: [] });
        }

        const chosen = playlists[Math.floor(Math.random() * playlists.length)];

        const playlist_info = {
            id: chosen.id,
            name: chosen.name,
            cover: chosen.images?.[0]?.url,
            url: chosen.external_urls.spotify
        };

        const tracks = await getTracks(chosen.id);

        return res.json({
            mood,
            playlist_info,
            tracks
        });

    } catch (err) {
        console.error("SPOTIFY ERROR:", err.toString());
        res.json({ error: "Spotify API failed", detail: err.toString() });
    }
});

app.listen(4000, () => console.log("Backend running on port 4000"));
