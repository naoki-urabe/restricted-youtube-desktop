import { useState, useEffect } from "react";
import { collection, getDocs, query, DocumentData } from "firebase/firestore";
import { db } from "../firebase";

const RegisterVideo = () => {
  const [videoId, setVideoId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channels, setChannels] = useState<DocumentData[]>([]);

  useEffect(() => {
    const fetchChannels = async () => {
      const querySnapshot = await getDocs(query(collection(db, "allowed-channel")));
      const channelList = querySnapshot.docs.map((doc) => doc.data());
      setChannels(channelList);
      if (channelList[0]) {
        setChannelId(channelList[0].channel_id);
      }
    };
    fetchChannels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoId) return alert("すべてのフィールドを入力してください");
    const url = `https://asia-northeast1-restricted-73bf6.cloudfunctions.net/saveOtherVideo?channelId=${channelId}&videoId=${videoId}`;
    try {
      const res = await fetch(url);
      console.log(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>ビデオ登録</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>カテゴリ名: </label>
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            {channels.map((ch) => (
              <option key={ch.channel_id} value={ch.channel_id}>
                {ch.channel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>ビデオID: </label>
          <input value={videoId} onChange={(e) => setVideoId(e.target.value)} required />
        </div>
        <button type="submit">登録</button>
      </form>
    </div>
  );
};

export default RegisterVideo;
