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

const htmlHeader = `<!DOCTYPE html>
<head>
  <style>
    .header, .content {
      margin: auto;
      width: 75%;
      display: flex;
      justify-content: center;
    }
    .form {
      width: 100%;
      display: flex;
      justify-content: center;
      flex-direction: column;
    }
    .paste {
      margin-left: 10%;
      margin-right: 10%;
      margin-bottom: 10px;
      width: 80%;
      height: 60vh;
      resize: none;
    }
    .button {
      margin-left: 10%;
      margin-right: auto;
      width: 100px;
    }
  </style>
</head>
`;

const pasteItemDocument =
  htmlHeader +
  `<body>
  <div class="header">
    <h1>Paste Item</h1>
  </div>
  <div class="content">
    <form class="form" action="/" method="post">
      <textarea class="paste" mthod="post" name="content" required="true" placeholder="Paste something..."></textarea>
      <button class="button" type="submit">Paste</button>
    </form>
  </div>
</body>
`;

const itemCreatedTemplate = (itemURL: string) =>
  htmlHeader +
  `<body>
  <div class="header">
    <h1>Pasted Item</h1>
  </div>
  <div class="content">
    <p>
      <a href="${itemURL}">${itemURL}</a>
    </p>
  </div>
</body>
`;

const getItemPrefaceHTML = `<!DOCTYPE html>
<body>
  <center><h1>Get Item</h1></center>
  <p>
`;

const getItemTrailingHTML = `  </p>
</body>
`;

const missingItemHTML = `<!DOCTYPE html>
<body>
  <center><h1>Missing Item</h1></center>
</body>
`;

const methodNotAllowedHTML = `<!DOCTYPE html>
<body>
  <center><h1>405 Method Not Allowed</h1></center>
</body>
`;

const streamGetItemResponse = async (readable: ReadableStream, writable: WritableStream) => {
  const encoder = new TextEncoder();
  const reader = readable.getReader();
  const writer = writable.getWriter();

  await writer.write(encoder.encode(getItemPrefaceHTML));

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    await writer.write(value);
  }

  await writer.write(encoder.encode(getItemTrailingHTML));

  await writer.close();
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    switch (request.method) {
      case 'GET':
        const key = new URL(request.url).pathname.slice(1);

        if (!key) {
          return new Response(pasteItemDocument, {
            headers: {
              'content-type': 'text/html;charset=UTF-8',
            },
            status: 200,
          });
        }

        if (key.toLowerCase() == 'favicon.ico') {
          return new Response(null, { status: 404 });
        }

        const newObject = await env.CONTENT.get(key);

        if (!newObject) {
          return new Response(missingItemHTML, {
            headers: {
              'content-type': 'text/html;charset=UTF-8',
            },
            status: 404,
          });
        }

        const { readable, writable } = new TransformStream();

        // This is specifically _not_ awaited on so the runtime begins sending the
        // response back as soon as possible.
        streamGetItemResponse(newObject.body, writable);

        return new Response(readable, {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
          },
          status: 200,
        });

      case 'POST':
        const body = (await request.formData()).get('content');

        if (!body) {
          return new Response(null, { status: 404 });
        }

        const object = await env.CONTENT.put(crypto.randomUUID(), body, {
          customMetadata: {
            'cf-connecting-ip': request.headers.get('cf-connecting-ip') || '',
            'cf-ray': request.headers.get('cf-ray') || '',
          },
        });

        console.log(`created ${object.key}, ${object.size} bytes`);

        return new Response(itemCreatedTemplate(request.url + object.key), {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
          },
          status: 201,
        });
      default:
        return new Response(methodNotAllowedHTML, {
          headers: {
            allow: 'GET,POST',
            'content-type': 'text/html;charset=UTF-8',
          },
          status: 405,
        });
    }
  },
};
