import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

const PAGE_SIZE = 20;

export default function YouTubeWhitelist() {
  const [channels, setChannels] = useState<DocumentData[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const [videosByChannel, setVideosByChannel] =
    useState<Record<string, DocumentData[]>>({});

  const [lastDocs, setLastDocs] =
    useState<Record<string, QueryDocumentSnapshot<DocumentData> | null>>({});

  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // -----------------------
  // チャンネル一覧
  // -----------------------
  useEffect(() => {
    const fetchChannels = async () => {
      const snap = await getDocs(collection(db, "allowed-channel"));
      const list = snap.docs.map(d => d.data());
      setChannels(list);

      if (list.length > 0) {
        setSelectedChannel(list[0].channel_id);
      }
    };
    fetchChannels();
  }, []);

  // -----------------------
  // チャンネル切替 → 1ページ目
  // -----------------------
  useEffect(() => {
    const fetchFirstPage = async () => {
      if (!selectedChannel) return;

      const q = query(
        collection(db, "restricted-youtube"),
        where("channelId", "==", selectedChannel),
        orderBy("publishedAt", "desc"),
        limit(PAGE_SIZE)
      );

      const snap = await getDocs(q);

      setVideosByChannel(prev => ({
        ...prev,
        [selectedChannel]: snap.docs.map(d => d.data())
      }));

      setLastDocs(prev => ({
        ...prev,
        [selectedChannel]:
          snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
      }));
    };
    fetchFirstPage();
  }, [selectedChannel]);

  // -----------------------
  // 次の20件
  // -----------------------
  const loadNextPage = async () => {
    if (!selectedChannel) return;

    const last = lastDocs[selectedChannel];
    if (!last) return;

    const q = query(
      collection(db, "restricted-youtube"),
      where("channelId", "==", selectedChannel),
      orderBy("publishedAt", "desc"),
      startAfter(last),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    setVideosByChannel(prev => ({
      ...prev,
      [selectedChannel]: [
        ...prev[selectedChannel],
        ...snap.docs.map(d => d.data())
      ]
    }));

    setLastDocs(prev => ({
      ...prev,
      [selectedChannel]: snap.docs[snap.docs.length - 1]
    }));
  };

  const handleThumbnailClick = (videoId: string) => {
    setSelectedVideo(videoId);
  };

  const handleUpdate = async () => {
    const url =
      "https://asia-northeast1-restricted-73bf6.cloudfunctions.net/fetchVideosFromChannels";
    await fetch(url);
  };

  // -----------------------
  // UI
  // -----------------------
  return (
    <div className="p-4">
      <button
        onClick={handleUpdate}
        className="mb-4 px-3 py-1 bg-gray-200 rounded"
      >
        更新
      </button>

      {/* タブ */}
      <div className="flex space-x-4 mb-4 border-b">
        {channels.map(channel => (
          <button
            key={channel.channel_id}
            onClick={() => setSelectedChannel(channel.channel_id)}
            className={`p-2 ${
              selectedChannel === channel.channel_id
                ? "border-b-2 border-blue-500 font-bold"
                : ""
            }`}
          >
            {channel.channel}
          </button>
        ))}
      </div>

      {selectedChannel && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {videosByChannel[selectedChannel]?.map(video => (
              <div key={video.videoId} className="flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">
                  {video.title}
                  <br />
                  {video.publishedAt}
                </h3>

                <img
                  src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt={video.title}
                  onClick={() => handleThumbnailClick(video.videoId)}
                  className="cursor-pointer"
                />

                {selectedVideo === video.videoId && (
                  <iframe
                    width="1120"
                    height="630"
                    src={`https://www.youtube.com/embed/${video.videoId}`}
                    title={video.title}
                    allowFullScreen
                    className="mt-4"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={loadNextPage}
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded"
          >
            次の20件
          </button>
        </>
      )}
    </div>
  );
}
