# Controle de Frota – SERVSUL · Guia de instalação

App web (PWA) de controle de frota: checklist mensal, requisições de combustível
com assinatura e comprovante, fornecedores, relatórios. Funciona em iPhone,
Android e computador, inclusive sem internet.

## O que tem neste pacote

| Arquivo / pasta | Para que serve |
|---|---|
| `index.html` | O app inteiro (telas, regras e sincronização) |
| `sw.js`, `manifest.json`, `icon-*` | Instalação no celular e funcionamento offline |
| `contrato.html` | Página do contrato |
| `api/ajuda.js` | Assistente de ajuda (💬) — usa a API da Anthropic |
| `api/relatorio-semanal.js` | Relatório semanal por e-mail (toda segunda, 8h) |
| `vercel.json` | Agendamento do relatório e cabeçalhos de segurança |
| `package.json` | Dependências das funções da pasta `api/` |
| `programa-excelencia-higgika/` | Outro app (Programa Excelência), publicado à parte |

## Onde ficam os dados

Os dados **não** ficam no servidor do site: ficam no **Firebase** (projeto
`modo-produ`). Qualquer servidor onde o app for publicado usa o mesmo banco,
então os dados continuam os mesmos. A configuração do Firebase já está dentro
do `index.html`.

## Opção 1 — Vercel (recomendado, tudo funciona)

1. Instale o Node.js (https://nodejs.org) no computador.
2. Descompacte o pacote, abra o Terminal na pasta e rode:
   ```bash
   npx vercel login
   npx vercel --prod
   ```
3. No painel da Vercel (Settings → Environment Variables) cadastre:

   | Variável | Uso |
   |---|---|
   | `ANTHROPIC_API_KEY` | Assistente de ajuda (💬) |
   | `GMAIL_USER` | E-mail que envia o relatório semanal |
   | `GMAIL_APP_PASS` | Senha de app do Gmail desse e-mail |
   | `CRON_SECRET` | Protege a rota do relatório semanal |

   Os valores atuais estão no painel da Vercel do projeto antigo
   (`controle-frota-powerst` → Settings → Environment Variables). Por
   segurança, eles **não** vão neste pacote.
4. Publique de novo (`npx vercel --prod`) para aplicar as variáveis.

## Opção 2 — Qualquer hospedagem de site (Hostinger, Apache, Nginx, Netlify…)

1. Envie para a pasta pública do site: `index.html`, `sw.js`,
   `manifest.json`, `contrato.html` e os ícones (`icon-192.svg`,
   `icon-512.svg`, `icon-apple.png`).
2. O site **precisa** estar em **HTTPS** (sem isso o app não instala no
   celular nem funciona offline).
3. O app funciona normalmente. Só não funcionam o **assistente de ajuda (💬)**
   e o **relatório semanal por e-mail**, que dependem da pasta `api/` (só
   rodam na Vercel ou num servidor Node.js adaptado).

## Depois de publicar num endereço novo

- No Firebase Console (projeto `modo-produ`) → Authentication → Settings →
  **Authorized domains**, adicione o novo domínio.
- Envie o novo link para a equipe. Quem já tinha o app instalado precisa
  abrir o link novo e instalar de novo (cada endereço é um app separado no
  celular).
- Nos celulares, o primeiro acesso precisa de internet; depois funciona offline.

## Teste rápido no próprio computador

```bash
npx serve -p 5173 .
```
Abra http://localhost:5173 no navegador. Ele usa os dados reais do Firebase.

## Acesso

- Código da empresa: `SERVSUL`
- Motoristas: PIN = 4 primeiros dígitos do CPF
- Administrador e gestora: PINs definidos no app (aba Motoristas)
