# Programa Excelência – Higgika

App separado (não compartilha código, banco de dados ou deploy com o Controle de Frota SERVSUL) do programa de bonificação por desempenho para colaboradores de estoque e logística.

## Como funciona

- **Administrador**: cadastra colaboradores (criando o e-mail/senha de acesso de cada um), lança ocorrências (entregas, estoque, organização, veículo, equipamentos, comprometimento), marca bônus extras do mês e gera o PDF de fechamento.
- **Colaborador**: acessa com e-mail e senha próprios, acompanha sua pontuação e bônus previsto do mês, preenche o checklist diário e vê o histórico dos últimos 6 meses.

O login é feito com **e-mail e senha reais do Firebase Authentication** — não é um PIN simples. Isso permite configurar regras de segurança no banco de dados que realmente impedem que alguém sem conta leia ou altere os dados (ver seção 3).

Enquanto o Firebase não está configurado, o app entra automaticamente em **modo local de teste** (sem tela de login, direto como Administrador), salvando os dados só no aparelho onde foi aberto — ótimo para testar a interface, mas sem sincronizar entre celulares e sem a segurança real descrita abaixo.

## 1. Criar o banco de dados (Firebase) — gratuito

1. Acesse **https://console.firebase.google.com** e faça login com uma conta Google.
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `excelencia-higgika`) e conclua a criação.
3. No menu lateral, vá em **Build → Firestore Database** → **Criar banco de dados** → escolha o modo **produção** e a região mais próxima (ex: `southamerica-east1`).
4. Vá em **Build → Authentication** → aba **Sign-in method** → habilite o provedor **E-mail/senha** (Email/Password) — é esse, e não o "Anônimo".
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

## 2. Criar a primeira conta de Administrador (manual, uma única vez)

Como o app não tem um "backend" próprio, a primeiríssima conta de administrador precisa ser criada direto no console do Firebase (as próximas contas — dos colaboradores — você cria pelo próprio app, isso aqui é só para o primeiro acesso):

1. No Firebase Console, vá em **Build → Authentication → Users → Add user**. Informe seu e-mail e uma senha. Anote/copie o **User UID** que aparece na lista depois de criado.
2. Vá em **Build → Firestore Database → Start collection** (ou "+ Start collection" se já houver dados). Nome da coleção: **`excelencia_roles`**.
3. ID do documento: cole o **User UID** copiado no passo 1.
4. Adicione um campo: nome `role`, tipo `string`, valor `admin`. Salve.

Pronto — esse e-mail e senha agora entram no app como Administrador.

## 3. Regras de segurança do Firestore (importante!)

Vá em **Firestore Database → Regras** e substitua pelo conteúdo abaixo. Isso garante que **só o Administrador** pode alterar colaboradores/ocorrências/configurações, que **cada colaborador só edita o próprio checklist**, e que **ninguém sem login** consegue ler ou escrever nada:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function myRole() {
      return get(/databases/$(database)/documents/excelencia_roles/$(request.auth.uid)).data;
    }
    function isAdmin() {
      return isSignedIn() && myRole().role == 'admin';
    }

    match /excelencia_roles/{uid} {
      allow read: if isSignedIn() && request.auth.uid == uid;
      allow write: if isAdmin();
    }

    match /excelencia_data/{docId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /excelencia_checklist/{docId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn() &&
        (isAdmin() || request.resource.data.colaboradorId == myRole().colaboradorId);
      allow delete: if isAdmin();
    }
  }
}
```

Clique em **Publicar**.

## 4. Publicar o app (Vercel) — separado de qualquer outro projeto

1. No painel da [vercel.com](https://vercel.com), clique em **"Add New" → "Project"**.
2. Importe o repositório e, em **"Root Directory"**, selecione a pasta **`programa-excelencia-higgika`**.
3. Clique em **Deploy**. A Vercel vai gerar uma URL própria, completamente separada do app de frota.

## 5. Cadastrando colaboradores (Felipe, etc.)

1. Abra o link publicado e entre com o e-mail/senha de Administrador criados no passo 2.
2. Na aba do Programa Excelência, cadastre o colaborador: nome, cargo, valor do bônus mensal, **e-mail** e **senha inicial** (mín. 6 caracteres) — isso cria a conta de acesso dele automaticamente, sem precisar voltar ao console do Firebase.
3. Repasse o e-mail e a senha para o colaborador. Ele entra na mesma URL, com essas credenciais.
4. Para instalar como aplicativo no celular, use o botão **"📲 Instalar App"** na tela de login (ou "Adicionar à tela de início" no Safari/iOS).

## Segurança — o que isso resolve

Numa versão anterior deste app, o acesso era por um PIN de 4 dígitos verificado só na tela (interface), enquanto o banco de dados ficava aberto para qualquer pessoa que abrisse o link (autenticação anônima automática). Com e-mail/senha reais + as regras acima, o próprio banco de dados passa a exigir login de verdade para ler ou escrever qualquer coisa, e cada colaborador só consegue alterar o seu próprio checklist — o PIN deixou de ser a única barreira.
