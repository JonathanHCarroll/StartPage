import { getConfig } from '../lib/config.js';
import { getStartPageData, jsonResponse, errorResponse } from '../lib/data.js';
import { clearCache } from '../lib/cache.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    if (!env.CACHE) {
      return errorResponse('CACHE KV binding is not configured.', 500);
    }

    const config = getConfig(env);
    const data = await getStartPageData(env, env.CACHE);
    return jsonResponse(data, { maxAge: config.cacheSeconds });
  } catch (err) {
    return errorResponse(err, 500);
  }
}

export async function onRequestDelete(context) {
  const { env } = context;

  try {
    if (!env.CACHE) {
      return errorResponse('CACHE KV binding is not configured.', 500);
    }
    await clearCache(env.CACHE);
    return jsonResponse({ ok: true });
  } catch (err) {
    return errorResponse(err, 500);
  }
}
