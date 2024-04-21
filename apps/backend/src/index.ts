import { createContextValues } from '@connectrpc/connect';

import { createWorkerHandler } from './handler';
import { routes } from './routes';
import {
  kCloudFrontKeyPairID,
  kCloudFrontPrivateKey,
  kVODURL,
} from './context';

export interface Env {
  VOD_URL: string;
  CLOUDFRONT_PRIVATE_KEY: string;
  CLOUDFRONT_KEY_PAIR_ID: string;
}

export default createWorkerHandler<Env>({
  routes,
  contextValues: (_, env) =>
    createContextValues()
      .set(kVODURL, env.VOD_URL)
      .set(kCloudFrontPrivateKey, env.CLOUDFRONT_PRIVATE_KEY)
      .set(kCloudFrontKeyPairID, env.CLOUDFRONT_KEY_PAIR_ID),
});
