import { fetchVideosFromChannels } from './fetchVideosFromChannels';
import { saveOtherVideo } from './saveOtherVideo';
import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions';
setGlobalOptions({region: "asia-northeast1"})
admin.initializeApp();
exports.fetchVideosFromChannels = fetchVideosFromChannels
exports.saveOtherVideo = saveOtherVideo