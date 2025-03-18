import {onRequest} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
// import axios from 'axios';
import { setGlobalOptions } from 'firebase-functions';
import * as functions from 'firebase-functions';

admin.initializeApp();
setGlobalOptions({region: "asia-northeast1"})

// YouTube APIキー
const YOUTUBE_API_KEY = functions.params.defineSecret('YOUTUBE_API_KEY')

// YouTube APIのURL
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

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

interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: YouTubeSearchItemId;
  snippet: YouTubeSearchSnippet;
}

interface YouTubeSearchItemId {
  kind: string;
  videoId?: string;  // 動画IDが含まれる場合
  playlistId?: string;  // プレイリストIDが含まれる場合
  channelId?: string;  // チャンネルIDが含まれる場合
}

interface YouTubeSearchSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  liveBroadcastContent: string;
}

interface YouTubeThumbnails {
  default: YouTubeThumbnail;
  medium: YouTubeThumbnail;
  high: YouTubeThumbnail;
}

interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YouTubeVideo {
  title: string;
  videoId: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelId: string; // チャンネルIDを保存
}


// Cloud Function: 複数チャンネルから動画情報を取得してFirestoreに保存
export const fetchVideosFromChannels = onRequest({secrets: [YOUTUBE_API_KEY]},async (req, res) => {

  const channelIds: string[] = ["UCZ2bu0qutTOM0tHYa_jkIwg"];
  console.log(req,res);
  if (!channelIds || channelIds.length === 0) {
    //res.status(400).send('Channel IDs are required');
    // return; // void型を返すためにreturnを追加
  }

  try {
    // Firestoreのバッチ書き込みを開始
    const batch = admin.firestore().batch();

    for (const channelId of channelIds) {
      const response = await fetch(`${YOUTUBE_API_URL}?part=snippet&channelId=${channelId}&maxResults=50&order=date&key=${process.env.YOUTUBE_API_KEY}`);
      const json = await response.json();
      console.log(json)
      const videos = json.items.map((item: YouTubeSearchItem) => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high.url,
        publishedAt: item.snippet.publishedAt,
        channelId: channelId,  // チャンネルIDを保存
      }));
      // 動画データをFirestoreに保存
      const videosRef = admin.firestore().collection('restricted-youtube');
      videos.forEach((video: YouTubeVideo) => {
        const videoRef = videosRef.doc();  // 新しいドキュメントを作成
        batch.set(videoRef, video);
        console.log(video)
      });
    }

    // バッチ処理を実行
    await batch.commit();

    // 正常終了時のレスポンス
    //res.status(200).send({ message: 'Videos fetched and saved successfully' });
    //return; // void型を返すためにreturnを追加
  } catch (error) {
    console.error('Error fetching videos:', error);
    //res.status(500).send({ error: 'Failed to fetch videos' });
    //return; // void型を返すためにreturnを追加
  }
});
