import { getConfig } from '../../lib/config.js';
import { getCollectionData, jsonResponse, errorResponse } from '../../lib/data.js';

export async function onRequestGet(context) {
  const { env, params } = context;

  try {
    if (!env.CACHE) {
      return errorResponse('CACHE KV binding is not configured.', 500);
    }

    const config = getConfig(env);
    const collection = await getCollectionData(env, env.CACHE, params.id);
    return jsonResponse(collection, { maxAge: config.cacheSeconds });
  } catch (err) {
    return errorResponse(err, 500);
  }
}
