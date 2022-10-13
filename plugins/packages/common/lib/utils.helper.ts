import { QueryError } from './query.error';

const CACHED_CONNECTIONS: any = {};

export function parseJson(jsonString: string, errorMessage?: string): object {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    throw new QueryError(errorMessage, err.message, {});
  }
}

export function cacheConnection(dataSourceId: string, connection: any): any {
  const updatedAt = new Date();
  CACHED_CONNECTIONS[dataSourceId] = { connection, updatedAt };
}

export function getCachedConnection(dataSourceId: string | number, dataSourceUpdatedAt: any): any {
  const cachedData = CACHED_CONNECTIONS[dataSourceId];

  if (cachedData) {
    const updatedAt = new Date(dataSourceUpdatedAt || null);
    const cachedAt = new Date(cachedData.updatedAt || null);

    const diffTime = (cachedAt.getTime() - updatedAt.getTime()) / 1000;

    if (diffTime < 0) {
      return null;
    } else {
      return cachedData['connection'];
    }
  }
}

export function cleanSensitiveData(data, keys) {
  if (!data || typeof data !== 'object') return;

  const dataObj = { ...data };
  clearData(dataObj, keys);
  return dataObj;
}

function clearData(data, keys) {
  if (!data || typeof data !== 'object') return;

  for (const key in data) {
    if (keys.includes(key)) {
      delete data[key];
    } else {
      clearData(data[key], keys);
    }
  }
}

export const getCurrentToken = (isMultiAuthEnabled: boolean, tokenData: any, userId: string, isAppPublic: boolean) => {
  if (isMultiAuthEnabled) {
    if (!tokenData || !Array.isArray(tokenData)) return null;
    return !isAppPublic
      ? tokenData.find((token: any) => token.user_id === userId)
      : userId
      ? tokenData.find((token: any) => token.user_id === userId)
      : tokenData[0];
  } else {
    return tokenData;
  }
};
