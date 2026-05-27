# IMEC Metalurgica

Site institucional multipagina com painel administrativo para editar textos,
imagens, videos, equipamentos, servicos, setores, clientes, galeria e contatos.

## Previa local

```powershell
npm install
npm start
```

- Site: `http://127.0.0.1:4180/`
- Painel: `http://127.0.0.1:4180/admin/login`
- Acesso somente na previa: `admin@imec.local` / `imec-preview`

## Publicar na Hostinger pelo GitHub

A aplicacao foi preparada para `Node.js 22` com `Express` e `MySQL`. Na
Hostinger, o aplicativo Node.js esta disponivel nos planos Business Web Hosting
e Cloud.

1. Envie todos os arquivos deste projeto para um repositorio GitHub, sem enviar
   `node_modules`, `.env`, `.npm-cache` ou os arquivos `storage/*.local.json`.
2. No hPanel, escolha criar um site/aplicativo `Node.js Web App` e conecte o
   repositorio GitHub.
3. Selecione `Node.js 22.x`, deixe a instalacao executar `npm install` e use o
   comando de inicio `npm start`.
4. Crie um banco MySQL no hPanel e informe as variaveis abaixo na configuracao
   do aplicativo.
5. Depois do primeiro deploy, execute `npm run seed:admin` para criar o acesso
   ao painel administrativo.

Variaveis de ambiente para a publicacao:

```env
NODE_ENV=production
HOST=0.0.0.0
SESSION_SECRET=gere-uma-chave-longa-e-secreta
DATA_DRIVER=mysql
MYSQL_HOST=seu-host-mysql
MYSQL_PORT=3306
MYSQL_DATABASE=seu-banco
MYSQL_USER=seu-usuario
MYSQL_PASSWORD=sua-senha
ADMIN_EMAIL=admin@imecmetalurgica.com.br
ADMIN_PASSWORD=defina-uma-senha-forte
```

A plataforma normalmente define a porta automaticamente. Se o painel solicitar
uma porta, use `PORT=3000`. A aplicacao cria as tabelas necessarias no banco na
primeira inicializacao.

## Fotos e videos

As imagens premium atuais sao conceituais de apresentacao. Pelo painel, a equipe
pode substituir por fotos e videos reais de fabricacao, reforma, montagem e
equipamentos entregues. Antes de um novo deploy, mantenha uma copia de seguranca
das midias enviadas pelo painel.
