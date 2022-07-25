import startServer from '../server/express';
import config from '../../config.json';
import parseConfig from '../scraper/parse-config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
startServer(parseConfig(config as any));
