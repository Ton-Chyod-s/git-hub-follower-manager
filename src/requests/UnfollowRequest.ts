import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../config/.env") });

export async function unfollowUser(username: string): Promise<boolean> {
    try {
        const key = process.env.KEY;
        if (!key) {
            console.error("[unfollowUser] Variável KEY não configurada.");
            return false;
        }

        const response = await fetch(`https://api.github.com/user/following/${username}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${key}`,
                Accept: "application/vnd.github+json",
            },
        });

        if (!response.ok) {
            console.error(`[unfollowUser] Erro HTTP ${response.status} ao deixar de seguir ${username}`);
            return false;
        }

        return true;

    } catch (error) {
        console.error(`[unfollowUser] Erro ao deixar de seguir ${username}:`, error instanceof Error ? error.message : error);
        return false;
    }
}
