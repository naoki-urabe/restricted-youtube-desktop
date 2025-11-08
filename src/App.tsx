import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { auth, login, logout } from "./auth";
import { onAuthStateChanged, User } from "firebase/auth";
import YouTube from "./youtube";
import FormPage from "./pages/FormPage";
import RegisterVideo from "./pages/RegisterVideo";
import Search from "./pages/Search";
import "./App.css";

function App() {
  const [user, setUser] = useState<User>();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser!);
    });
    return () => unsubscribe();
  }, []);
  return (
    <>
    {user ? (
      <>
      <button
        onClick={logout}
        className="mb-4 p-2 bg-red-500 text-white rounded"
      >
        ログアウト
      </button>
    <Router>
        <nav>
          <Link to="/form">チャンネル登録</Link>
          <br></br>
          <Link to="/video">ビデオ登録</Link>
          <br></br>
          <Link to="/search">検索</Link>
          <br></br>
          <Link to="/">ホーム</Link>
        </nav>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <h1>Restricted YouTube</h1>
              <div className="card">
                <YouTube />
              </div>
            </>
          }
        />
        <Route path="/form" element={<FormPage />} />
        <Route path="/video" element={<RegisterVideo></RegisterVideo>} />
        <Route path="/search" element={<Search></Search>} />
      </Routes>
    </Router>
    </>
    ) : (
      <button
        onClick={login}
        className="p-2 bg-green-500 text-white rounded"
      >
        Googleでログイン
      </button>
    )}
  </>
  )
}

export default App;
