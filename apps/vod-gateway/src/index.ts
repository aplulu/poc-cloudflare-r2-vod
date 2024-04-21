import { verifyCookie, VerifyError } from './verify';
import { cors } from '@nyantube/cors';

interface Env {
  VOD_BUCKET: R2Bucket;
  CLOUDFRONT_PUBLIC_KEY: string;
  CACHE_TTL: string;
}

export default {
  fetch: cors(
    {
      allowedOrigins: ['*'],
      allowedMethods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Cookie'],
      allowCredentials: true,
      maxAge: 3600,
    },
    async (
      req: Request,
      env: Env,
      ctx: ExecutionContext
    ): Promise<Response> => {
      try {
        const url = new URL(req.url);

        const cookie = req.headers.get('Cookie') ?? '';
        await verifyCookie(cookie, req.url, env.CLOUDFRONT_PUBLIC_KEY);

        const cacheKey = new Request(url.toString(), req);
        const cache = caches.default;

        let resp = await cache.match(cacheKey);
        console.log(`cacheKey=${cacheKey.url}, cacheHit=${!!resp}`);
        if (resp) {
          return resp;
        }

        const objectKey = url.pathname.slice(1);
        const object = await env.VOD_BUCKET.get(objectKey);
        if (!object) {
          return new Response('Not found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        if (env.CACHE_TTL) {
          headers.set('Cache-Control', `s-maxage=${env.CACHE_TTL}`);
        }

        resp = new Response(object.body, { status: 200, headers });

        ctx.waitUntil(cache.put(cacheKey, resp.clone()));

        return resp;
      } catch (err) {
        console.error(err);
        if (err instanceof VerifyError) {
          return new Response(err.message, { status: 403 });
        }
        return new Response('Internal Server Error', { status: 500 });
      }
    }
  ),
};
