import { Route, Routes } from "react-router-dom";

import RemainPage from "@/pages/remain";
import IndexPage from "@/pages";
import HistoryPage from "@/pages/history";
import ProfilePage from "@/pages/profile";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<HistoryPage />} path="/history" />
      <Route element={<ProfilePage />} path="/profile" />
      <Route element={<RemainPage />} path="/remain" />
    </Routes>
  );
}

export default App;
