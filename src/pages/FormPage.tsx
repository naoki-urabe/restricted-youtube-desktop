import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
//import { useNavigate } from "react-router-dom";

const FormPage = () => {
  const [channel, setChannel] = useState("");
  const [channelId, setChannelId] = useState("");
  //const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel || !channelId) return alert("すべてのフィールドを入力してください");

    try {
      await setDoc(doc(db, "allowed-channel", channelId), { channel: channel, channel_id: channelId });
      //navigate("/success");
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  return (
    <div>
      <h2>チャンネル登録</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>チャンネル名: </label>
          <input value={channel} onChange={(e) => setChannel(e.target.value)} required />
        </div>
        <div>
          <label>チャンネルID: </label>
          <input value={channelId} onChange={(e) => setChannelId(e.target.value)} required />
        </div>
        <button type="submit">登録</button>
      </form>
    </div>
  );
};

export default FormPage;
