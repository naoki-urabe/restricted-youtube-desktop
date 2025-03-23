import {onRequest,} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
// import axios from 'axios';

import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

import { setGlobalOptions } from 'firebase-functions';
setGlobalOptions({region: "asia-northeast1"})

// YouTube APIキー
const YOUTUBE_API_KEY = functions.params.defineSecret('YOUTUBE_API_KEY')

// YouTube APIのURL
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// 型定義
// interface YouTubeVideoItem {
//   id: {
//     videoId: string;
//   };
//   snippet: {
//     title: string;
//     description: string;
//     thumbnails: {
//       high: {
//         url: string;
//       };
//     };
//     publishedAt: string;
//   };
// }

// interface YouTubeApiResponse {
//   items: YouTubeVideoItem[];
// }

// interface YouTubeSearchResponse {
//   kind: string;
//   etag: string;
//   nextPageToken: string;
//   regionCode: string;
//   pageInfo: PageInfo;
//   items: YouTubeSearchItem[];
// }

// type YouTubeSearchResponse = {
//     nextPageToken?: string;
//     prevPageToken?: string;
//     pageInfo: {
//       totalResults: number;
//       resultsPerPage: number;
//     };
//     items: YouTubeSearchItem[];
//   };
  
  type YouTubeSearchItem = {
    id: {
      kind: string;
      videoId?: string;
      playlistId?: string;
    };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelId: string;
      channelTitle: string;
      thumbnails: {
        default: YouTubeThumbnail;
        medium: YouTubeThumbnail;
        high: YouTubeThumbnail;
      };
      resourceId?: {
        kind: string;
        videoId?: string;
        playlistId?: string;
      };
    };
  };
  
  type YouTubeThumbnail = {
    url: string;
    width: number;
    height: number;
  };
  



async function getUploadsPlaylistId(channelId: string) {
  const url = `${YOUTUBE_API_URL}/channels?key=${YOUTUBE_API_KEY.value()}&id=${channelId}&part=contentDetails`;
  const response = await fetch(url);
  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error("チャンネルが見つかりません");
  }

  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getAllVideosFromPlaylist(playlistId: string, channelId: string) {
  const videos = [];
  let nextPageToken = "";
  let counter = 0;
  do {
    counter++;
    const url = `${YOUTUBE_API_URL}/playlistItems?key=${YOUTUBE_API_KEY.value()}&playlistId=${playlistId}&part=snippet&maxResults=50&pageToken=${nextPageToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.items) {
      videos.push(...data.items);
    }
    if(counter%20==0){
      saveVideoInfos(videos, channelId);
      videos.length = 0;
    }
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);
  if(counter)saveVideoInfos(videos,channelId);
  return videos;
}

async function getChannelUpdatedAt(channelId: string) {
  const doc = await (admin.firestore().collection('allowed-channel').doc(channelId)).get();
  const updatedAt = doc.data()?.updatedAt
  return updatedAt
}

async function getPeriodYoutube(channelId: string, updatedAt: Timestamp) {
  const videos = [];
  let nextPageToken = "";
  const now = new Date().toISOString();
  let counter = 0;
  do {
    counter++;
    const url = `${YOUTUBE_API_URL}/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&publishedAfter=${updatedAt.toDate().toISOString()}&publishedBefore=${now}&key=${YOUTUBE_API_KEY.value()}&pageToken=${nextPageToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.items) {
      videos.push(...data.items);
    }
    if(counter%20==0){
      saveVideoInfos(videos, channelId);
      videos.length = 0
    }
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);
  if(counter)saveVideoInfos(videos,channelId);
  return videos;
}

async function fetchChannelIds(channelIds: string[]) {
  const channelInfos = await (admin.firestore().collection('allowed-channel').get())
  channelInfos.forEach((doc)=>{
    const data = doc.data()
    channelIds.push(data.channel_id);
  });
}

async function saveVideoInfos(allVideos: YouTubeSearchItem[], channelId: string) {
  const batch = admin.firestore().batch();
  const videoPromises = allVideos!.map(async (item) => {
    const resourceIdVideoId = item.snippet.resourceId?.videoId
    const IdVideoId = item.id?.videoId
    const videoId = resourceIdVideoId == null?IdVideoId:resourceIdVideoId;
    const doc = await (admin.firestore().collection('restricted-youtube').doc(videoId!)).get();
      if(doc.exists){
        return;
      }
      return {
        title: item.snippet.title,
        videoId: videoId,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        publishedAt: item.snippet.publishedAt,
        channelId: channelId,  // チャンネルIDを保存
      }
    }
  );
  const videos = (await Promise.all(videoPromises)).filter((video) => video != null);
  // 動画データをFirestoreに保存
  const videosRef = admin.firestore().collection('restricted-youtube');
  videos.forEach((video) => {
    const videoRef = videosRef.doc(video.videoId!);  // 新しいドキュメントを作成
    batch.set(videoRef, video);
  });
  // バッチ処理を実行
  await batch.commit();
}

// Cloud Function: 複数チャンネルから動画情報を取得してFirestoreに保存
export const fetchVideosFromChannels = onRequest({secrets: [YOUTUBE_API_KEY], timeoutSeconds: 540},async () => {
  //const channelIds: string[] = ["UCZ2bu0qutTOM0tHYa_jkIwg", "UCHp2q2i85qt_9nn2H7AvGOw", "UCtG3StnbhxHxXfE6Q4cPZwQ"];
  const channelIds: string[] = []
  await fetchChannelIds(channelIds)
  if (!channelIds || channelIds.length === 0) {
    //res.status(400).send('Channel IDs are required');
    // return; // void型を返すためにreturnを追加
  }

  try {
    // Firestoreのバッチ書き込みを開始
    for (const channelId of channelIds) {
      const updatedAt = await getChannelUpdatedAt(channelId);
      let allVideos
      if(updatedAt == null) {
        console.log("first fetch")
        const playlistId = await getUploadsPlaylistId(channelId);
        allVideos = await getAllVideosFromPlaylist(playlistId, channelId);
        saveVideoInfos(allVideos, channelId);
      } else {
        console.log("movies exists")
        allVideos = await getPeriodYoutube(channelId, updatedAt);
        saveVideoInfos(allVideos, channelId);
      }
      const doc = (admin.firestore().collection('allowed-channel').doc(channelId))
      doc.set({updatedAt: FieldValue.serverTimestamp()},{merge: true})
    }

    // 正常終了時のレスポンス
    //res.status(200).send({ message: 'Videos fetched and saved successfully' });
    //return; // void型を返すためにreturnを追加
  } catch (error) {
    console.error('Error fetching videos:', error);
    //res.status(500).send({ error: 'Failed to fetch videos' });
    //return; // void型を返すためにreturnを追加
  }
});
