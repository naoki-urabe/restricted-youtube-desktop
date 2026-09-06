import {onRequest,} from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';

import { setGlobalOptions } from 'firebase-functions';
setGlobalOptions({region: "asia-northeast1"})
const PAGE_SIZE = 20
const YOUTUBE_API_KEY = functions.params.defineSecret('YOUTUBE_API_KEY')
const ALLOWED_ORIGIN = "https://restricted-73bf6.web.app"

// Cloud Function: 複数チャンネルから動画情報を取得してFirestoreに保存
export const searchVideo = onRequest({secrets: [YOUTUBE_API_KEY], timeoutSeconds: 30, cors: [ALLOWED_ORIGIN]},async (req, res) => {
  const channelId: string = req.query.channelId as string
  const searchKeyword: string = req.query.searchKeyword as string
  const nextPageToken: string = req.query.nextPageToken as string
  if(channelId == null || searchKeyword == null) {
    return
  }

  const params = new URLSearchParams({
      part: "snippet",
      channelId: channelId,
      q: searchKeyword,
      order: "date",
      maxResults: PAGE_SIZE.toString(),
      key: YOUTUBE_API_KEY.value(),
    });

    if (nextPageToken) {
      params.append("pageToken", nextPageToken);
    }

    const youtubeRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    const data = await youtubeRes.json();
    res.status(200).json(data);
});
