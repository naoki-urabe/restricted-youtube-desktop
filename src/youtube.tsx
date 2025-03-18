import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from './firebase'
import { auth, login, logout } from "./auth";
import { onAuthStateChanged } from "firebase/auth";

export default function YouTubeWhitelist() {
  const [user, setUser] = useState<any>("");
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if(currentUser == null)return;
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const fetchVideos = async () => {
      const querySnapshot = await getDocs(query(collection(db, "restricted-youtube"), orderBy("publishedAt", "desc")));
      const videoList = querySnapshot.docs.map((doc) => doc.data());
      setVideos(videoList);
    };

    fetchVideos();
  }, []);  // 空の依存配列でコンポーネントがマウントされたときのみ実行

  return (
    <div className="p-4">
      {user ? (
        <>
          <button
            onClick={logout}
            className="mb-4 p-2 bg-red-500 text-white rounded"
          >
            ログアウト
          </button>
          <div className="grid grid-cols-1 gap-4">
            {videos.map((video) => (
              <div key={video.videoId} className="flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                <iframe
                  width="560"
                  height="315"
                  src={`https://www.youtube.com/embed/${video.videoId}`}
                  title={video.title}
                  allowFullScreen
                ></iframe>
              </div>
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={login}
          className="p-2 bg-green-500 text-white rounded"
        >
          Googleでログイン
        </button>
      )}
    </div>
  );
}
