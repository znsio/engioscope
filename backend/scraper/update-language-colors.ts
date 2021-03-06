import fetch from 'node-fetch';
import yaml from 'yaml';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line no-underscore-dangle
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const run = async () => {
  const response = await fetch('https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml');
  const data = yaml.parse(await response.text());
  const result = Object.entries(data as Record<string, { color?: string}>)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, o]) => (o).color)
    .reduce((colors, [language, { color }]) => ({
      ...colors,
      [language.toLowerCase()]: color?.toLowerCase()
    }), {});

  await fs.writeFile(join(__dirname, 'language-colors.ts'), `// This file is autogenerated! Do not modify!
// Run \`npm run update-language-colors\` to update this file.
export default ${JSON.stringify(result, null, 2)} as const;
`, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Wrote ${join(__dirname, 'language-colors.ts')}`);
};

run();
