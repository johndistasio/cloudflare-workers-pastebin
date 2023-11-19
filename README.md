# Cloudflare Workers Pastebin

Pastebin built on top of Cloudflare [Workers](https://developers.cloudflare.com/workers/) and [R2](https://developers.cloudflare.com/r2/).

1. Set up a Cloudflare account and install Wrangler.
   - https://developers.cloudflare.com/workers/wrangler/install-and-update/
2. Create R2 buckets to store pasted documents:
   ```
   npx wrangler r2 bucket create paste-content
   npx wrangler r2 bucket create paste-content-dev
   ```
3. Deploy:
   ```
   npm run deploy
   ```
4. Undeploy:
   ```
   npm run delete
   ```
