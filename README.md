# IMEC Metalurgica

Site institucional multipagina com painel administrativo para editar textos, imagens, videos, equipamentos, servicos, setores, clientes, galeria e contatos.

## Publicar na Hostinger pelo GitHub

A aplicacao foi preparada para `Node.js 22` com `Express` e `MySQL`. Na Hostinger, crie um aplicativo `Node.js Web App`, conecte este repositorio, selecione `Node.js 22.x` e use `npm start`.

Configure no painel da Hostinger as variaveis `NODE_ENV=production`, `HOST=0.0.0.0`, `SESSION_SECRET`, `DATA_DRIVER=mysql`, dados `MYSQL_*`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. A plataforma normalmente define a porta automaticamente; se solicitado, use `PORT=3000`.

O painel administrativo permite editar textos e publicar fotos e videos dos servicos e projetos.
