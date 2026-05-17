import { GetFollowersData } from '../requests/followers-request';
import { GetFollowingData } from '../requests/following-request';
import { newFollower } from '../requests/follow-request';
import { getUserData } from '../requests/user-request';
import { filterOrganicFollowers } from './filter-organic-followers-usecase';

const PER_PAGE = 100;
const BATCH_SIZE = 20;
const DAILY_LIMIT = 100;

export async function FollowUsersFollowers(
  targetUser: string,
  myUser: string,
): Promise<{ followed: number; skipped: number; filtered: number; remaining: number } | null> {
  const toFollow = await getFollowersIDoNotFollow(targetUser, myUser);
  if (!toFollow) return null;

  const { organic, suspicious } = await filterOrganicFollowers([...toFollow]);

  const limited = organic.slice(0, DAILY_LIMIT);
  const remaining = organic.length - limited.length;

  let followed = 0;
  let skipped = 0;

  const batches = chunkArray(limited, BATCH_SIZE);

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (username) => {
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        const ok = await newFollower(username);
        if (!ok) throw new Error(username);
        return username;
      }),
    );

    results.forEach((r) => (r.status === 'fulfilled' ? followed++ : skipped++));

    if (batches.indexOf(batch) < batches.length - 1) {
      const batchDelay = Math.floor(Math.random() * 5000) + 10000;
      await new Promise((resolve) => setTimeout(resolve, batchDelay));
    }
  }

  return { followed, skipped, filtered: suspicious.length, remaining };
}

async function getFollowersIDoNotFollow(
  targetUser: string,
  myUser: string,
): Promise<Set<string> | null> {
  const [targetFollowers, myFollowing] = await Promise.all([
    getUserFollowers(targetUser),
    getUserFollowing(myUser),
  ]);

  if (!targetFollowers || !myFollowing) return null;

  const toFollow = new Set<string>();
  targetFollowers.forEach((user) => {
    if (!myFollowing.has(user) && user !== myUser) toFollow.add(user);
  });

  return toFollow;
}

const PAGE_BATCH_SIZE = 5;

async function fetchPagesBatched<T>(
  fetchFn: (page: number) => Promise<T[] | null>,
  pageCount: number,
): Promise<T[]> {
  const result: T[] = [];
  for (let i = 0; i < pageCount; i += PAGE_BATCH_SIZE) {
    const batch = Array.from(
      { length: Math.min(PAGE_BATCH_SIZE, pageCount - i) },
      (_, j) => fetchFn(i + j + 1),
    );
    const pages = await Promise.all(batch);
    pages.forEach((page) => page?.forEach((item) => result.push(item)));
  }
  return result;
}

async function getUserFollowers(username: string): Promise<Set<string> | null> {
  const userData = await getUserData(username);
  if (!userData) return null;

  const pageCount = Math.ceil((userData.Followers ?? 0) / PER_PAGE);
  if (!Number.isFinite(pageCount) || pageCount <= 0) return new Set();

  const items = await fetchPagesBatched((page) => GetFollowersData(username, page), pageCount);
  return new Set(items.map((f) => f.Name));
}

async function getUserFollowing(username: string): Promise<Set<string> | null> {
  const userData = await getUserData(username);
  if (!userData) return null;

  const pageCount = Math.ceil((userData.Following ?? 0) / PER_PAGE);
  if (!Number.isFinite(pageCount) || pageCount <= 0) return new Set();

  const items = await fetchPagesBatched((page) => GetFollowingData(username, page), pageCount);
  return new Set(items.map((f) => f.Name));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
