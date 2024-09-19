import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages";
import HistoryPage from "@/pages/history";
import ProfilePage from "@/pages/profile";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<HistoryPage />} path="/history" />
      <Route element={<ProfilePage />} path="/profile" />
    </Routes>
  );
}

export default App;
