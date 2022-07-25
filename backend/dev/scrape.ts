import scrape from '../scraper/get-all-the-things';
import config from '../../config.json';
import type { Config } from '../scraper/parse-config';
import parseConfig from '../scraper/parse-config';

scrape(parseConfig(config as unknown as Config));
