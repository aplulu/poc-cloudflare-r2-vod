import {
  type ConnectRouter,
  type ConnectRouterOptions,
  ContextValues,
  createConnectRouter,
} from '@connectrpc/connect';
import {
  UniversalHandler,
  universalServerRequestFromFetch,
  universalServerResponseToFetch,
} from '@connectrpc/connect/protocol';
import { cors } from '@nyantube/cors';

interface WorkerHandlerOptions<Env> extends ConnectRouterOptions {
  routes: (router: ConnectRouter) => void;
  contextValues?: (
    req: Request,
    env: Env,
    ctx: ExecutionContext
  ) => ContextValues;
}

export const createWorkerHandler = <Env>(
  options: WorkerHandlerOptions<Env>
) => {
  const router = createConnectRouter();
  options.routes(router);

  const paths = new Map<string, UniversalHandler>();
  for (const uh of router.handlers) {
    paths.set(uh.requestPath, uh);
  }

  return {
    fetch: cors(
      {
        allowedOrigins: ['*'],
        allowedHeaders: ['Content-Type', 'Connect-Protocol-Version'],
      },
      async (req: Request, env: Env, ctx: ExecutionContext) => {
        const url = new URL(req.url);

        const handler = paths.get(url.pathname);
        if (!handler) {
          return new Response('Not found', { status: 404 });
        }

        try {
          const uReq = {
            ...universalServerRequestFromFetch(req, {}),
            contextValues: options.contextValues?.(req, env, ctx),
          };

          const uRes = await handler(uReq);
          return universalServerResponseToFetch(uRes);
        } catch (err) {
          console.error(err);
          return new Response('Internal server error', { status: 500 });
        }
      }
    ),
  };
};
