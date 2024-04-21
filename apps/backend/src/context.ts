import { createContextKey } from '@connectrpc/connect';

export const kVODURL = createContextKey<string | undefined>(undefined);
export const kCloudFrontPrivateKey = createContextKey<string | undefined>(
	undefined
);
export const kCloudFrontKeyPairID = createContextKey<string | undefined>(
	undefined
);
