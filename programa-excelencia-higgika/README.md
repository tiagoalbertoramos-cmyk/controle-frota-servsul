# Enquete Semanal – Higgika

App separado (código, deploy e banco de dados próprios) para enviar perguntas semanais aos colaboradores pelo grupo do WhatsApp e acompanhar as respostas num painel só seu, com sinais automáticos de atenção.

> Este projeto substituiu o antigo **Programa Excelência** (bonificação por desempenho). O código e os dados daquele programa foram salvos à parte antes da substituição.

## Como funciona

1. **Você (administrador)** cadastra os colaboradores (um a um, ou colando uma lista inteira organizada por setor) e as perguntas da semana, depois clica em **"Gerar nova enquete"**. Isso cria um link único.
2. Você cola esse link no grupo do WhatsApp (tem um botão de compartilhamento direto).
3. **Cada colaborador** abre o link, escolhe o próprio nome numa lista (agrupada por setor) e digita a **senha de 4 dígitos** que você gerou para ele. No primeiro acesso, é obrigado a trocar essa senha por uma só dele antes de responder.
4. Você acompanha as respostas num **painel do administrador** (login por e-mail/senha), que já destaca:
   - Notas baixas (abaixo do limite que você configurar), em vermelho/amarelo.
   - Respostas em texto que contenham palavras de alerta (configuráveis), destacadas e marcadas com ⚠️.
   - Quem ainda não respondeu.
   - Uma tendência simples das últimas médias de cada colaborador.

**Sobre a senha de 4 dígitos:** ao cadastrar (individualmente ou pela importação em massa), o app gera uma senha aleatória para cada colaborador e mostra para você repassar — **individualmente** (WhatsApp direto com a pessoa, por exemplo), nunca no grupo todo, já que ali ela deixaria de ser secreta. No primeiro acesso, a pessoa é obrigada a trocar essa senha. Você, como administrador, pode gerar uma nova senha temporária para qualquer um a qualquer momento (botão 🔑 ao lado do nome) — útil se alguém esquecer a própria senha.

**Limite real dessa segurança:** diferente de uma senha de e-mail, essa senha de 4 dígitos é verificada no próprio aparelho do colaborador (o app não tem um servidor próprio para validar isso em segredo). Isso significa que é uma barreira boa contra alguém abrir o link por acaso e responder por engano ou de brincadeira, mas não é à prova de alguém tecnicamente muito capaz que decida investigar o aplicativo a fundo. Para o uso pretendido (pesquisa interna semanal, link só no grupo fechado do WhatsApp), esse nível de proteção é proporcional ao risco.

**Sobre os alertas automáticos:** são regras simples — nota numérica abaixo de um limite, e palavras-chave nas respostas em texto. Não é inteligência artificial nem análise de sentimento de verdade; é um apoio para você não perder nada ao ler rapidamente, mas a interpretação final é sempre sua.

Enquanto o Firebase não está configurado, o app funciona em **modo local de teste**: os dados ficam só no aparelho onde foi aberto, útil para testar a interface antes de configurar o banco de verdade.

## 1. Criar o banco de dados (Firebase) — gratuito

1. Acesse **https://console.firebase.google.com** e faça login com uma conta Google.
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `enquete-higgika`) e conclua a criação.
3. No menu lateral, vá em **Build → Firestore Database** → **Criar banco de dados** → modo **produção**, região mais próxima (ex: `southamerica-east1`).
4. Vá em **Build → Authentication** → aba **Sign-in method** → habilite **dois** provedores:
   - **E-mail/senha** (para o login do administrador).
   - **Anônimo** (usado nos bastidores quando um colaborador envia uma resposta — ele não vê nenhuma tela de login por causa disso).
5. No ícone de engrenagem (⚙️) → **Configurações do projeto** → **"Seus apps"** → ícone **`</>`** (Web) → registre um app e copie o bloco `firebaseConfig`.
6. Cole esses valores no arquivo **`index.html`** deste projeto, na constante `FIREBASE_CONFIG` (procure por `COLE_AQUI_`).

## 2. Criar sua conta de Administrador (manual, uma única vez)

1. No Firebase Console: **Build → Authentication → Users → Add user**. Informe seu e-mail e uma senha. Copie o **User UID** gerado.
2. Em **Build → Firestore Database**, crie uma coleção chamada **`enquete_roles`**.
3. ID do documento: cole o **User UID** do passo 1.
4. Adicione um campo `role` (tipo `string`) com valor `admin`. Salve.

## 3. Regras de segurança do Firestore

Vá em **Firestore Database → Regras** e publique:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function myRole() { return get(/databases/$(database)/documents/enquete_roles/$(request.auth.uid)).data; }
    function isAdmin() { return isSignedIn() && myRole().role == 'admin'; }

    // Perguntas e enquetes não são sigilosas — qualquer pessoa com o link
    // precisa conseguir ler isso, mesmo sem estar logada, para o formulário
    // funcionar. Só o admin edita.
    match /enquete_config/{id}  { allow read: if true; allow write: if isAdmin(); }
    match /enquete_rodadas/{id} { allow read: if true; allow write: if isAdmin(); }

    // Colaboradores agora guarda a senha de 4 dígitos de cada um, então a
    // leitura exige pelo menos uma sessão anônima (o app já faz isso sozinho,
    // sem o colaborador perceber nenhuma tela de login a mais).
    match /enquete_colaboradores/{id} { allow read: if isSignedIn(); allow write: if isAdmin(); }

    match /enquete_roles/{uid} {
      allow read: if isSignedIn() && request.auth.uid == uid;
      allow write: if isAdmin();
    }

    // Respostas só podem ser lidas pelo administrador (dado sensível de
    // desempenho/relacionamento). Qualquer sessão autenticada (inclusive
    // anônima, usada pelos colaboradores) pode enviar uma resposta.
    match /enquete_respostas/{id} {
      allow read: if isAdmin();
      allow create, update: if isSignedIn();
      allow delete: if isAdmin();
    }
  }
}
```

Clique em **Publicar**.

## 4. Publicar o app (Vercel)

Se este projeto já estava publicado como "Programa Excelência", **não precisa reconfigurar nada** — é a mesma pasta (`programa-excelencia-higgika`) e o mesmo projeto Vercel; o próximo deploy automático já troca o conteúdo pela Enquete Semanal, no mesmo link.

Se for a primeira vez publicando:
1. No painel da [vercel.com](https://vercel.com), **"Add New" → "Project"**.
2. Importe o repositório e, em **"Root Directory"**, selecione a pasta **`programa-excelencia-higgika`**.
3. **Deploy**.

## 5. Cadastrar colaboradores

1. Entre no app com seu e-mail/senha de administrador (link "Sou administrador", embaixo da tela inicial).
2. No card **"📥 Importar lista de colaboradores"**, cole os nomes organizados por setor (uma linha com o nome do setor, seguida dos nomes daquele setor, com uma linha em branco entre setores) e clique em **Importar lista**.
3. O app mostra a senha gerada para cada nome novo. **Copie e repasse cada uma individualmente** (WhatsApp direto com a pessoa) — nunca no grupo, pois ali todo mundo veria a senha de todo mundo.
4. Para adicionar alguém depois, use o campo "Nome do colaborador" + "Setor" logo acima do importador.
5. Esqueceu a senha? Clique no 🔑 ao lado do nome da pessoa para gerar uma nova.

## 6. Uso semanal

1. Confira/ajuste as perguntas da semana.
2. Clique em **"Gerar nova enquete"**.
3. Clique em **"Compartilhar no WhatsApp"** (abre o WhatsApp já com o texto e o link prontos — escolha o grupo) ou **"Copiar link"** para colar manualmente.
4. Ao longo da semana, acompanhe o painel **"Respostas e sinais de alerta"**.
