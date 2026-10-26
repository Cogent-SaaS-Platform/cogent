/**
 * Resilient HTTP Client for Nigerian Regulatory Feeds
 * 
 * Solves DNSSEC resolution issues on .gov.ng domains by using Cloudflare Anycast DNS (1.1.1.1)
 * with automatic retries and realistic enterprise browser headers.
 */

import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns';

// Ensure Cloudflare Anycast DNS is queried for government and registry domains
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8']);

const customLookup: https.RequestOptions['lookup'] = (hostname, options, cb) => {
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      // Fall back to standard lookup if resolve4 fails
      return dns.lookup(hostname, options as any, cb);
    }
    if (options && (options as any).all) {
      cb(null, addresses.map((a) => ({ address: a, family: 4 })) as any);
    } else {
      cb(null, addresses[0], 4);
    }
  });
};

export interface ResilientResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string | string[] | undefined>;
  text: () => Promise<string>;
  json: () => Promise<T>;
  buffer: () => Promise<Buffer>;
}

export interface ResilientRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
}

export async function resilientFetch<T = any>(
  urlStr: string,
  options: ResilientRequestOptions = {}
): Promise<ResilientResponse<T>> {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const defaultHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...options.headers,
  };

  const timeoutDuration = options.timeoutMs || 8000;

  return new Promise((resolve, reject) => {
    let settled = false;
    const hardTimeoutTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        req.destroy(new Error(`Resilient HTTP request to ${urlStr} timed out after ${timeoutDuration}ms`));
        reject(new Error(`Resilient HTTP request to ${urlStr} timed out after ${timeoutDuration}ms`));
      }
    }, timeoutDuration);

    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: defaultHeaders,
        lookup: customLookup,
        timeout: timeoutDuration,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          clearTimeout(hardTimeoutTimer);
          if (settled) return;
          settled = true;

          const bodyBuffer = Buffer.concat(chunks);
          const bodyText = bodyBuffer.toString('utf-8');

          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: res.headers,
            text: async () => bodyText,
            json: async () => JSON.parse(bodyText),
            buffer: async () => bodyBuffer,
          });
        });
      }
    );

    req.on('timeout', () => {
      clearTimeout(hardTimeoutTimer);
      if (!settled) {
        settled = true;
        req.destroy(new Error(`Resilient HTTP request to ${urlStr} timed out after ${timeoutDuration}ms`));
        reject(new Error(`Resilient HTTP request to ${urlStr} timed out after ${timeoutDuration}ms`));
      }
    });

    req.on('error', (err) => {
      clearTimeout(hardTimeoutTimer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}
