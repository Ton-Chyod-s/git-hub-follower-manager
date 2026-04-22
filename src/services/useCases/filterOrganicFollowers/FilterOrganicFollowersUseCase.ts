import { getUserData } from '../../../requests/UserRequest';

interface FilterResult {
  organic: string[];
  suspicious: string[];
  reasons: Record<string, string[]>;
}

const BOT_BIO_KEYWORDS = [
  'give me stars',
  'back to your repositories',
  'follow back',
  'follow for follow',
  'f4f',
  'i follow back',
  'follow me back',
];

function isSuspicious(user: Awaited<ReturnType<typeof getUserData>>, username: string): string[] {
  const reasons: string[] = [];
  if (!user) return ['perfil não encontrado'];

  const bio = (user.Bio ?? '').toLowerCase();

  if (BOT_BIO_KEYWORDS.some((kw) => bio.includes(kw)))
    reasons.push('bio suspeita (follow-for-follow)');

  if (user.Following > 0 && user.Followers > 0) {
    const ratio = user.Following / user.Followers;
    if (ratio > 3 && user.Following > 300)
      reasons.push(`ratio suspeito (seguindo ${user.Following} / seguidores ${user.Followers})`);
  }

  const createdYear = new Date(user.CreatedAt).getFullYear();
  const currentYear = new Date().getFullYear();
  if (currentYear - createdYear <= 1 && user.Following > 500)
    reasons.push('conta nova com muitos follows');

  if (user.PublicRepos === 0) reasons.push('nenhum repositório público');

  return reasons;
}

export async function filterOrganicFollowers(usernames: string[]): Promise<FilterResult> {
  const organic: string[] = [];
  const suspicious: string[] = [];
  const reasons: Record<string, string[]> = {};

  await Promise.all(
    usernames.map(async (username) => {
      const userData = await getUserData(username);
      const suspiciousReasons = isSuspicious(userData, username);

      if (suspiciousReasons.length > 0) {
        suspicious.push(username);
        reasons[username] = suspiciousReasons;
      } else {
        organic.push(username);
      }
    }),
  );

  return { organic, suspicious, reasons };
}
