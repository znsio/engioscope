import ms from 'ms';
import { promises as fs } from 'fs';

export const pastDate = (past?: string) => {
  if (!past) return new Date();

  const d = new Date();
  d.setMilliseconds(d.getMilliseconds() - ms(past));
  return d;
};

const isWithin = (time: string) => (date: Date) => date > pastDate(time);
export const isWithinFortnight = isWithin('15 days');

export const isNewerThan = (date1: Date) => (date2: Date) => (
  date2.getTime() > date1.getTime()
);

export const shortDateFormat = (date: Date) => [
  date.toLocaleString('default', { month: 'short' }),
  date.getDate()
].join(' ');

export const isMaster = (branchName: string) => [
  'refs/heads/master', 'refs/heads/main'
].includes(branchName);

export const normalizeBranchName = (branchName: string) => branchName.replace('refs/heads/', '');

export const exists = <T>(x: T | undefined | null): x is T => (
  x !== null && x !== undefined
);

export const doesFileExist = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (e) {
    return false;
  }
};

export const range = (num: number) => [...Array(num).keys()];

export const chunkArray = <T>(array: T[], chunkSize: number) => (
  range(Math.ceil(array.length / chunkSize))
    .map(i => array.slice(i * chunkSize, (i + 1) * chunkSize))
);

export const unique = <T>(xs: T[]) => [...new Set(xs)];
