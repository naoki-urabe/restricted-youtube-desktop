import { useState } from "react";
//import { useNavigate } from "react-router-dom";

const RegisterVideo = () => {
  const [videoId, setVideoId] = useState("");
  //const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoId) return alert("すべてのフィールドを入力してください");
    const query = `https://asia-northeast1-restricted-73bf6.cloudfunctions.net/saveOtherVideo?videoId=${videoId}`
    try {
      const res = await fetch(query);
      console.log(res);
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>ビデオ登録</h2>
      <form onSubmit={handleSubmit}>
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
