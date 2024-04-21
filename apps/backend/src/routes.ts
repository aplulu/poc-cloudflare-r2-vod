import { type ConnectRouter } from '@connectrpc/connect';

import { VODService } from '@nyantube/grpc/nyantube/vod/v1';

import {
	kCloudFrontKeyPairID,
	kCloudFrontPrivateKey,
	kVODURL,
} from './context';
import { getSignedCookie } from './signer';

export const routes = ({ service }: ConnectRouter) => {
	service(VODService, {
		getVideo: async (req, ctx) => {
			const vodURL = ctx.values.get(kVODURL);
			if (!vodURL) {
				throw new Error('VOD URL is not set');
			}
			const cloudFrontPrivateKey = ctx.values.get(kCloudFrontPrivateKey);
			if (!cloudFrontPrivateKey) {
				throw new Error('CloudFront private key is not set');
			}
			const cloudFrontKeyPairID = ctx.values.get(kCloudFrontKeyPairID);
			if (!cloudFrontKeyPairID) {
				throw new Error('CloudFront key pair ID is not set');
			}
			if (!/^[a-zA-Z0-9_-]{1,32}$/.test(req.videoId)) {
				throw new Error('Invalid video ID');
			}

			const baseUrl = `${vodURL}/${req.videoId}`;
			const playlistUrl = `${baseUrl}/index.m3u8`;

			try {
				const cookies = await getSignedCookie({
					resource: `${baseUrl}/*`,
					privateKey: cloudFrontPrivateKey,
					keyPairId: cloudFrontKeyPairID,
					dateLessThan: Math.floor(Date.now() / 1000) + 600,
				});

				return {
					playlistUrl,
					cookies,
				};
			} catch (err) {
				console.error(err);
				throw new Error('Internal server error');
			}
		},
	});
};
