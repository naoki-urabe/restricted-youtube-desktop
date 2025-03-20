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


async function getUploadsPlaylistId(channelId: string) {
  const url = `${YOUTUBE_API_URL}/channels?key=${YOUTUBE_API_KEY.value()}&id=${channelId}&part=contentDetails`;
  const response = await fetch(url);
  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error("チャンネルが見つかりません");
  }

  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getAllVideosFromPlaylist(playlistId: string) {
  const videos = [];
  let nextPageToken = "";

  do {
    const url = `${YOUTUBE_API_URL}/playlistItems?key=${YOUTUBE_API_KEY.value()}&playlistId=${playlistId}&part=snippet&maxResults=50&pageToken=${nextPageToken}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.items) {
      videos.push(...data.items);
    }
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);
  return videos;
}


// Cloud Function: 複数チャンネルから動画情報を取得してFirestoreに保存
export const fetchVideosFromChannels = onRequest({secrets: [YOUTUBE_API_KEY]},async () => {

  const channelIds: string[] = ["UCZ2bu0qutTOM0tHYa_jkIwg", "UCHp2q2i85qt_9nn2H7AvGOw", "UCtG3StnbhxHxXfE6Q4cPZwQ"];
  if (!channelIds || channelIds.length === 0) {
    //res.status(400).send('Channel IDs are required');
    // return; // void型を返すためにreturnを追加
  }

  try {
    // Firestoreのバッチ書き込みを開始
    const batch = admin.firestore().batch();

    for (const channelId of channelIds) {
      const playlistId = await getUploadsPlaylistId(channelId);
      const allVideos = await getAllVideosFromPlaylist(playlistId);
      const videoPromises = allVideos.map(async (item) => {
        const videoId = item.snippet.resourceId.videoId;
        const doc = await (admin.firestore().collection('restricted-youtube').doc(videoId)).get();
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
        const videoRef = videosRef.doc(video.videoId);  // 新しいドキュメントを作成
        batch.set(videoRef, video);
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
