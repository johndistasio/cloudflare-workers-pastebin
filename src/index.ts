/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  CONTENT: R2Bucket;

  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;
}

const methodNotAllowed = (request: Request, allowed: string) => {
  return new Response(`${request.method} is not allowed`, {
    status: 405,
    headers: {
      Allow: allowed,
    },
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (!key) {
      if (request.method != 'POST') {
        return methodNotAllowed(request, 'POST');
      }

      const object = await env.CONTENT.put(crypto.randomUUID(), request.body, {
        customMetadata: {
          'cf-connecting-ip': request.headers.get('cf-connecting-ip') || '',
          'cf-ray': request.headers.get('cf-ray') || '',
        },
      });

      console.log(`created ${object?.key}, ${object?.size} bytes`);

      return new Response(`${url.host}/${object?.key}`, { status: 201 });
    }

    if (request.method != 'GET') {
      return methodNotAllowed(request, 'GET');
    }

    const object = await env.CONTENT.get(key);

    return new Response(object?.body);
  },
};
