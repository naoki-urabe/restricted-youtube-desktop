import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const PAGE_SIZE = 20;

interface Video {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
}

interface Channel {
  channel: string;
  channel_id: string;
}

export default function Search() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [searchTrigger, setSearchTrigger] = useState(false); // ←検索ボタン押下フラグ

  // Firestore から許可チャンネル取得
  useEffect(() => {
    const fetchChannels = async () => {
      const snapshot = await getDocs(collection(db, "allowed-channel"));
      const list = snapshot.docs.map(doc => doc.data() as Channel);
      setChannels(list);
      if (list[0]) setSelectedChannel(list[0].channel_id);
    };
    fetchChannels();
  }, []);

  // API を呼ぶ処理
  const fetchVideos = async (isNextPage: boolean) => {
    if (!selectedChannel) return;
    setLoading(true);

    const params = new URLSearchParams({
      part: "snippet",
      channelId: selectedChannel,
      q: searchKeyword,
      order: "date",
      maxResults: PAGE_SIZE.toString(),
      key: import.meta.env.VITE_API_KEY,
    });

    if (isNextPage && nextPageToken) {
      params.append("pageToken", nextPageToken);
    }

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    const data = await res.json();

    const newVideos = (data.items || []).map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));

    setVideos(prev => isNextPage ? [...prev, ...newVideos] : newVideos);
    setNextPageToken(data.nextPageToken || null);
    setLoading(false);
  };

  // 検索ボタン押下
  const handleSearch = () => {
    setVideos([]);
    setNextPageToken(null);
    setSelectedVideoId(null);
    setSearchTrigger(prev => !prev); // フラグ反転で useEffect をトリガー
  };

  // 検索ボタン押下時に API を呼ぶ
  useEffect(() => {
    if (!selectedChannel) return;
    fetchVideos(false);
  }, [searchTrigger, selectedChannel]);

  const handleThumbnailClick = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  return (
    <div className="p-4">
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="検索"
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          className="p-2 border rounded w-full"
        />
        <button
          onClick={handleSearch}
          className="ml-2 p-2 bg-blue-500 text-white rounded"
        >
          検索
        </button>
      </div>

      <div className="flex space-x-4 mb-4 border-b">
        {channels.map(ch => (
          <button
            key={ch.channel_id}
            onClick={() => setSelectedChannel(ch.channel_id)}
            className={`p-2 ${selectedChannel === ch.channel_id ? "border-b-2 border-blue-500 font-bold" : ""}`}
          >
            {ch.channel}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {videos.map(v => (
          <div key={v.videoId} className="flex flex-col items-center">
            <h3>{v.title}</h3>
            <p>{v.publishedAt}</p>
            <img
              src={v.thumbnail}
              alt={v.title}
              className="cursor-pointer"
              onClick={() => handleThumbnailClick(v.videoId)}
            />
            {selectedVideoId === v.videoId && (
              <iframe
                width="560"
                height="315"
                src={`https://www.youtube.com/embed/${v.videoId}`}
                title={v.title}
                allowFullScreen
                className="mt-2"
              />
            )}
          </div>
        ))}
      </div>

      {nextPageToken && (
        <button
          onClick={() => fetchVideos(true)}
          disabled={loading}
          className="mt-4 p-2 bg-blue-500 text-white rounded"
        >
          {loading ? "読み込み中..." : "次ページ"}
        </button>
      )}
    </div>
  );
}
