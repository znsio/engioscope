import { join } from 'path';
import { promises as fs } from 'fs';
import { and } from 'ramda';
import ms from 'ms';
import debug from 'debug';
import { Config } from './types';

const logDiskIO = debug('disk-io');
const logNetworkIO = debug('network-io');
const logRecoveredError = debug('recovered-error');

const cachePath = join(process.cwd(), 'cache');
const createCachePath = fs.mkdir(cachePath, { recursive: true });

const isCacheValid = async (config: Config) => {
  try {
    const lastFetchDate = await fs.readFile(join(cachePath, 'last-fetch-date.txt'), 'utf8');
    return new Date(lastFetchDate).getTime() - ms(config.cacheToDiskFor) > 0;
  } catch (e) {
    return false;
  }
};

const fileExists = async (fileName: string) => {
  try {
    await fs.access(fileName);
    return true;
  } catch (e) {
    return false;
  }
};

const looksLikeDate = (value: string) => (
  /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test(value)
);

const parseDate = (_: string, value: unknown) => {
  if (typeof value !== 'string') return value;
  if (!looksLikeDate(value)) return value;
  return new Date(value);
};

export default (config: Config) => {
  const isCacheValidPromise = isCacheValid(config);

  return async <T>(pathParts: string[], fn: () => Promise<T>) => {
    await createCachePath;
    const fileName = join(cachePath, `${pathParts.join('-')}.json`);

    const canUseCache = and(...await Promise.all([
      isCacheValidPromise, fileExists(fileName)
    ]));

    if (canUseCache) {
      logDiskIO(fileName);
      const contents = await fs.readFile(fileName, 'utf8');
      try {
        return JSON.parse(contents, parseDate) as T;
      } catch (e) {
        logRecoveredError(`Error parsing ${fileName}. Deleting and going to the network instead.`);
        await fs.unlink(fileName);
      }
    }

    logNetworkIO(pathParts.join(' '));
    const result = await fn();
    await Promise.all([
      fs.writeFile(fileName, JSON.stringify(result), 'utf8'),
      fs.writeFile(join(cachePath, 'last-fetch-date.txt'), new Date().toISOString(), 'utf8')
    ]);
    return result;
  };
};
