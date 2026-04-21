require('dotenv').config({ path: "src\\config\\.env" });

export async function unfollowUser(username: string): Promise<boolean> {
    try {
        const key = process.env.KEY;
        if (!key) throw new Error("Chave não encontrada.");

        const response = await fetch(`https://api.github.com/user/following/${username}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${key}`,
                'Accept': 'application/vnd.github+json'
            },
        });

        if (!response.ok) {
            throw new Error(`Erro: ${response.status} - ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error(`Erro ao deixar de seguir ${username}:`, error);
        return false;
    }
}
