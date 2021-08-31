import startServer from '../server/express';
// Following line ts-ignore'd so that it can work in the CI pipeline
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../config.json';
import parseConfig from '../scraper/parse-config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
startServer(parseConfig(config as any));
