import startServer from '../server/express';
// Following line ts-ignore'd so that it can work in the CI pipeline
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../config.json';
import type { Config } from '../scraper/parse-config';
import parseConfig from '../scraper/parse-config';

startServer(parseConfig(config as unknown as Config));
