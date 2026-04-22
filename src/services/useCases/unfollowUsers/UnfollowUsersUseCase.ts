import { unfollowUser } from '../../../requests/UnfollowRequest';

export async function unfollowUsers(
  usernames: string[],
): Promise<{ success: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    usernames.map(async (username) => {
      const randomDelay = Math.floor(Math.random() * 1000) + 500;
      await new Promise((resolve) => setTimeout(resolve, randomDelay));
      const ok = await unfollowUser(username);
      if (!ok) throw new Error(username);
      return username;
    }),
  );

  const success: string[] = [];
  const failed: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') success.push(result.value);
    else failed.push(usernames[i]);
  });

  return { success, failed };
}
