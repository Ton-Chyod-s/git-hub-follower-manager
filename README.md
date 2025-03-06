# GitHub Follower Manager

Este script em TypeScript verifica se seus seguidores no GitHub estão seguindo você de volta. Ele utiliza a API do GitHub para obter a lista de seguidores e seguidos de um determinado usuário, identificando seguidores mútuos e aqueles que não seguem de volta.

Na atualização mais recente, foi adicionada uma funcionalidade que permite clonar os seguidores de outros perfis, além de possibilitar deixar de seguir usuários que não retribuem o follow.

## Como Usar
1. Clone este repositório.
2. Instale o Node.js, se ainda não o fez.
    ```bash
    https://nodejs.org/en

3. em seguida instale as dependecias
   ```bash
    npm install
4. execute
    ```bash
        > crie e altere ./src/config/.env
        > USER = 'login git';
        > PASSWORD = 'senha git';
5. execute
    ```bash
    node ./src/services/webScraping/webScrapingData.js
        > em seu celular 
        > Digite o número: ...

6. Execute a api em seu terminal:

    ```bash
    node index.ts

    {
        "message": "Bem-vindo à API de Gerenciamento de Seguidores!",

        "description": "Esta API permite verificar seguidores, seguir usuários automaticamente e monitorar alterações na lista de seguidores.",

        "endpoints": {
            "/check-follower": "Verifica se um usuário segue outro usuário.",
            "/follow-users": "Segue automaticamente os seguidores de um usuário.",
            "/check-unfollower": "Verifica se um usuário deixou de seguir outro.",
            "/new-follower/:name": "Segue um novo usuário específico."
        },

        "note": "Para utilizar os endpoints que exigem um nome de usuário, passe o parâmetro 'name' na query string ou na URL.",
        
        "example": "/check-follower?name=usuario"
    }


## Contribuição

Sinta-se à vontade para contribuir abrindo issues ou pull requests.

## Video
### GitHub Follower Manager
<br>
<div style="display: inline_block">
<a href="https://www.youtube.com/watch?v=Cam6XuduU5Y&t=2s">
<img height=110 src="https://images.tcdn.com.br/img/img_prod/1076751/teste_2_591_1_db9b616c9397e918b1d43802d3dea23b.jpg"/>
</a>
</div>

## Licença
Este projeto está licenciado sob a Licença MIT - consulte o arquivo LICENSE para obter mais detalhes.
