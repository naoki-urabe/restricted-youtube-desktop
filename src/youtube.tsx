import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, DocumentData, where, limit } from "firebase/firestore";
import { db } from "./firebase";

export default function YouTubeWhitelist() {
  const PAGE_SIZE = 20
  const [videosByChannel, setVideosByChannel] = useState<Record<string, DocumentData[]>>({});
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [channels, setChannels] = useState<DocumentData[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const q = query(collection(db, "restricted-youtube"),where("channelId", "==", selectedChannel) , orderBy("publishedAt", "desc"))
      const querySnapshot = await getDocs(q);
      const videoList = querySnapshot.docs.map((doc) => doc.data());
      // チャンネルごとにグループ化
      const groupedVideos: Record<string, DocumentData[]> = {};
      videoList.forEach((video) => {
        const channel = video.channelName || "その他";
        if (!groupedVideos[channel]) {
          groupedVideos[channel] = [];
        }
        groupedVideos[channel].push(video);
      });

      setVideosByChannel(groupedVideos);
      // setSelectedChannel(Object.keys(groupedVideos)[0] || null);
    };
    const fetchChannels = async () => {
      const querySnapshot = await getDocs(query(collection(db, "allowed-channel")));
      const channelList = querySnapshot.docs.map((doc) => doc.data());
      setChannels(channelList);
      //setSelectedChannel(channelList[0].channel_id);
    }
    fetchChannels();
    fetchVideos();
  }, []);

  useEffect( () => {
    const fetchVideos = async () => {
      if(videosByChannel[selectedChannel!]){
        console.log("already exists")
        return;
      }
      try {
        const q = query(collection(db, "restricted-youtube"),where("channelId", "==", selectedChannel) , orderBy("publishedAt", "desc"), limit(PAGE_SIZE))
        const querySnapshot = await getDocs(q);
        const videoList = querySnapshot.docs.map((doc) => doc.data());
        // チャンネルごとにグループ化
        const groupedVideos: Record<string, DocumentData[]> = {};
        videoList.forEach((video: DocumentData) => {
          const channel = video.channelId;
          if (!groupedVideos[channel]) {
            groupedVideos[channel] = [];
          }
          groupedVideos[channel].push(video);
        });
        setVideosByChannel(groupedVideos);
      } catch(error) {
      console.error(error);
    }
  }
    fetchVideos();
  }, [selectedChannel]);

  const handleThumbnailClick = (videoId: string) => {
    setSelectedVideo(videoId);
  };

  const handleUpdate = async () => {
    const q = "https://asia-northeast1-restricted-73bf6.cloudfunctions.net/fetchVideosFromChannels"
    await fetch(q);
  }

  return (
    <div className="p-4">
        <>
          <button onClick={handleUpdate}>更新</button>
          {/* タブの表示 */}
          <div className="flex space-x-4 mb-4 border-b">
            {channels?.map((channel) => (
              <button
                key={channel!.channel_id}
                onClick={() => setSelectedChannel(channel!.channel_id)}
                className={`p-2 ${selectedChannel === channel!.channel ? "border-b-2 border-blue-500 font-bold" : ""}`}
              >
                {channel!.channel}
              </button>
            ))}
          </div>

          {/* 選択されたチャンネルの動画リスト */}
          {selectedChannel && (
            <div className="grid grid-cols-1 gap-4">
              {videosByChannel[selectedChannel]?.map((video) => (
                <div key={video.videoId} className="flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-2">{video.title}<br></br>{video.publishedAt}</h3>
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
                    ></iframe>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
    </div>
  );
}
