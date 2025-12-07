import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Camera from "./pages/Camera";
import ResultPage from "./pages/ResultPage";
import PlaylistPage from "./pages/PlaylistPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/playlist" element={<PlaylistPage />} />
      </Routes>
    </Router>
  );
}

export default App;
