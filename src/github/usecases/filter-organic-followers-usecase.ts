import { getUserData } from '../requests/user-request';
import { GitHubUser } from '../types/github-user';

interface FilterResult {
  organic: string[];
  suspicious: string[];
  reasons: Record<string, string[]>;
}

const SCORE_THRESHOLD = 2;

const BOT_BIO_KEYWORDS = [
  'give me stars',
  'back to your repositories',
  'follow back',
  'follow for follow',
  'follow4follow',
  'follow 4 follow',
  'f4f',
  'i follow back',
  'follow me back',
  'followback',
  'spam follower',
  'spam account',
  'follow everyone',
  'follow all',
];

function isSuspicious(user: GitHubUser | null): string[] {
  if (!user) return ['perfil não encontrado'];

  const reasons: string[] = [];
  let score = 0;
  const bio = (user.Bio ?? '').toLowerCase();

  if (BOT_BIO_KEYWORDS.some((kw) => bio.includes(kw))) {
    score += 3;
    reasons.push('bio suspeita (follow-for-follow)');
  }

  if (user.Following > 0) {
    const ratio = user.Followers > 0 ? user.Following / user.Followers : Infinity;

    if (ratio > 10 && user.Following > 100) {
      score += 3;
      reasons.push(`ratio extremo: ${user.Following} seguindo / ${user.Followers} seguidores`);
    } else if (ratio > 5 && user.Following > 150) {
      score += 2;
      reasons.push(`ratio alto: ${user.Following} seguindo / ${user.Followers} seguidores`);
    } else if (ratio > 2 && user.Following > 400) {
      score += 1;
      reasons.push(`ratio suspeito: ${user.Following} seguindo / ${user.Followers} seguidores`);
    }
  }

  if (user.Following > 2000) {
    score += 2;
    reasons.push(`seguindo ${user.Following} pessoas (volume muito alto)`);
  } else if (user.Following > 1000) {
    score += 1;
    reasons.push(`seguindo ${user.Following} pessoas (volume alto)`);
  }

  if (user.PublicRepos === 0) {
    score += 1;
    reasons.push('nenhum repositório público');
  }

  if (user.PublicRepos === 0 && user.PublicGists === 0) {
    score += 1;
    reasons.push('sem nenhuma atividade pública (repos + gists)');
  }

  if (!user.Name) {
    score += 1;
    reasons.push('sem nome configurado no perfil');
  }

  const ageDays = (Date.now() - new Date(user.CreatedAt).getTime()) / 86400000;

  if (ageDays < 90 && user.Following > 50) {
    score += 2;
    reasons.push(`conta muito nova (${Math.floor(ageDays)} dias) com ${user.Following} follows`);
  } else if (ageDays < 180 && user.Following > 100) {
    score += 1;
    reasons.push(`conta nova (${Math.floor(ageDays)} dias) com ${user.Following} follows`);
  } else if (ageDays < 365 && user.Following > 300) {
    score += 1;
    reasons.push(`conta recente com volume alto de follows (${user.Following})`);
  }

  if (user.UpdatedAt && user.CreatedAt) {
    const diffMs = Math.abs(
      new Date(user.UpdatedAt).getTime() - new Date(user.CreatedAt).getTime(),
    );
    if (diffMs < 60000) {
      score += 1;
      reasons.push('perfil nunca atualizado após criação');
    }
  }

  return score >= SCORE_THRESHOLD ? reasons : [];
}

export async function filterOrganicFollowers(usernames: string[]): Promise<FilterResult> {
  const organic: string[] = [];
  const suspicious: string[] = [];
  const reasons: Record<string, string[]> = {};

  await Promise.all(
    usernames.map(async (username) => {
      const userData = await getUserData(username);
      const suspiciousReasons = isSuspicious(userData);

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
