# Programa Excelência – Higgika

App separado (não compartilha código, banco de dados ou deploy com o Controle de Frota SERVSUL) do programa de bonificação por desempenho para colaboradores de estoque e logística.

## Como funciona

- **Administrador**: cadastra colaboradores, lança ocorrências (entregas, estoque, organização, veículo, equipamentos, comprometimento), marca bônus extras do mês e gera o PDF de fechamento.
- **Colaborador**: acessa com PIN próprio, acompanha sua pontuação e bônus previsto do mês, preenche o checklist diário e vê o histórico dos últimos 6 meses.

Enquanto o Firebase não está configurado, o app funciona salvando os dados **só no aparelho onde foi aberto** (localStorage) — ótimo para testar, mas os lançamentos feitos no celular do administrador não aparecem no celular do colaborador. Para sincronizar entre aparelhos, configure um banco de dados Firebase próprio (passo a passo abaixo).

## 1. Criar o banco de dados (Firebase) — gratuito

1. Acesse **https://console.firebase.google.com** e faça login com uma conta Google.
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `excelencia-higgika`) e conclua a criação.
3. No menu lateral, vá em **Build → Firestore Database** → **Criar banco de dados** → escolha o modo **produção** e a região mais próxima (ex: `southamerica-east1`).
4. Vá em **Build → Authentication** → aba **Sign-in method** → habilite o provedor **Anônimo**.
5. Ainda no console, clique no ícone de engrenagem (⚙️) → **Configurações do projeto** → role até **"Seus apps"** → clique no ícone **`</>`** (Web) → dê um nome ao app e registre.
6. O Firebase vai mostrar um bloco `firebaseConfig` parecido com este:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "excelencia-higgika.firebaseapp.com",
  projectId: "excelencia-higgika",
  storageBucket: "excelencia-higgika.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

7. Copie esses valores e cole no arquivo **`index.html`** deste projeto, na constante `FIREBASE_CONFIG` (procure por `COLE_AQUI_`).
8. Em **Firestore Database → Regras**, publique estas regras básicas (permitem acesso apenas a usuários autenticados anonimamente pelo próprio app):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 2. Publicar o app (Vercel) — separado de qualquer outro projeto

1. No painel da [vercel.com](https://vercel.com), clique em **"Add New" → "Project"**.
2. Importe o repositório e, em **"Root Directory"**, selecione a pasta **`programa-excelencia-higgika`**.
3. Clique em **Deploy**. A Vercel vai gerar uma URL própria (ex: `excelencia-higgika.vercel.app`), completamente separada do app de frota.

## 3. Primeiro acesso

1. Abra o link publicado. Entre como **Administrador** (PIN padrão: `0000` — troque em **Configurações → Alterar PIN do administrador** assim que entrar).
2. Cadastre o(s) colaborador(es) (nome, cargo, valor do bônus mensal e um PIN de 4 dígitos para o login dele).
3. Envie o link e o PIN para o colaborador. Ele deve entrar por **Colaborador** e escolher o próprio nome.
4. Para instalar como aplicativo no celular, use o botão **"📲 Instalar App"** na tela de login (ou "Adicionar à tela de início" no Safari/iOS).
