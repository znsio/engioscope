import startServer from '../server/express';
import config from '../../config.json';
import type { Config } from '../scraper/parse-config';
import parseConfig from '../scraper/parse-config';

startServer(parseConfig(config as unknown as Config));
