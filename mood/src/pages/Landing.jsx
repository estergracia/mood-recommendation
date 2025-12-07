import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
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
            Website. Now try it, it’s your turn!
          </p>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/camera")}
          >
            Start
          </button>
        </section>

        <section className="landing-hero">
          <img
            src="/images/landing-hero.png"
            alt="hero"
            className="landing-hero-img"
          />
        </section>
      </div>
    </main>
  );
}
