# DNMenu Manager

Sistema de gerenciamento de usuários Roblox com Tailwind CSS e sincronização com GitHub.

## Setup Local

1. Instale dependências:

\\\ash
npm install
\\\

2. Copie \.env.example\ para \.env.local\:

\\\ash
cp .env.example .env.local
\\\

3. Configure \REACT_APP_GITHUB_TOKEN\ em \.env.local\:
   - Gere um GitHub Personal Access Token em https://github.com/settings/tokens
   - Use permissões: \epo\ (acesso completo)

4. Rodar em desenvolvimento:

\\\ash
npm start
\\\

5. Build de produção:

\\\ash
npm run build
\\\

## Deploy no Netlify

### Opção 1: via GitHub (Recomendado)

1. Faça push para GitHub
2. Vá para https://app.netlify.com
3. Clique em "Add new site"  "Import an existing project"
4. Selecione seu repositório
5. Configure as variáveis de ambiente:
   - Vá em "Site settings"  "Build & deploy"  "Environment"
   - Adicione \REACT_APP_GITHUB_TOKEN\ com o valor do token
6. Deploy automático será acionado a cada push

### Opção 2: via CLI

Instale Netlify CLI:

\\\ash
npm install -g netlify-cli
\\\

Faça login e deploy:

\\\ash
netlify login
netlify deploy --prod
\\\

Quando pedido, use:
- Build command: \
pm run build\
- Publish directory: \uild\

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| \REACT_APP_GITHUB_TOKEN\ | Token GitHub para sincronização (deve ser privado) |

**Não comite arquivos \.env*\**  estão em \.gitignore\.

## Stack Técnico

- React 19
- Tailwind CSS v3
- lucide-react (ícones)
- GitHub API v3

## Notas de Segurança

- Token GitHub é sensível  mantenha privado
- Use variáveis de ambiente no Netlify, não em código
- Configure \.env.local\ localmente para desenvolvimento
