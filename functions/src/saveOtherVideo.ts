import {onRequest,} from 'firebase-functions/v2/https';

// import axios from 'axios';

import * as functions from 'firebase-functions';

import * as admin from 'firebase-admin';

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

async function getYoutubeVideo(videoId: string) {
  const videos = [];
  const url = `${YOUTUBE_API_URL}/videos?id=${videoId}&key=${YOUTUBE_API_KEY.value()}&part=snippet,contentDetails`
  const response = await fetch(url);
  const data = await response.json();
  if (data.items) {
    videos.push(...data.items);
  }
  return videos;
}

async function saveVideoInfos(videoId: string, allVideos: YouTubeSearchItem[]) {
  const batch = admin.firestore().batch();
  const videoPromises = allVideos!.map(async (item) => {
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
        channelId: "others",  // チャンネルIDを保存
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
export const saveOtherVideo = onRequest({secrets: [YOUTUBE_API_KEY], timeoutSeconds: 540},async (res) => {
  //const channelIds: string[] = ["UCZ2bu0qutTOM0tHYa_jkIwg", "UCHp2q2i85qt_9nn2H7AvGOw", "UCtG3StnbhxHxXfE6Q4cPZwQ"];
  const videoId: string = res.query.videoId as string
  const video = await getYoutubeVideo(videoId)
  await saveVideoInfos(videoId, video)
});
