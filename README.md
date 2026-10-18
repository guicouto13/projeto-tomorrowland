# Projeto Tomorrowland no iPhone

Este diretório contém um aplicativo web instalável (PWA). Não precisa de servidor próprio nem de etapa de compilação.

## Publicar gratuitamente no GitHub Pages

1. Crie um **repositório público** no GitHub, por exemplo `projeto-tomorrowland`.
2. Envie **os arquivos desta pasta** para a raiz do repositório: `index.html`, `foods-taco.json`, `manifest.webmanifest`, `sw.js`, `firebase-config.js`, `sync.js`, `firestore.rules`, os três PNGs e `.nojekyll`. O `README.md` também pode ir.
3. No repositório, abra **Settings → Pages**. Em **Build and deployment**, escolha **Deploy from a branch**, selecione `main` e `/(root)`, e salve.
4. Aguarde a publicação. O endereço terá o formato `https://SEU_USUARIO.github.io/projeto-tomorrowland/`.
5. Abra esse endereço no Safari do iPhone, toque em **Compartilhar → Adicionar à Tela de Início** e ative **Abrir como App**.

O site usa caminhos relativos, então também funciona se o repositório tiver outro nome. O GitHub Pages fornece HTTPS, necessário para instalação e funcionamento offline.

## Dados e backup

Uma cópia do histórico fica no armazenamento local do navegador ou do app instalado; ele **não é enviado ao GitHub**. Quando o Firebase estiver configurado e você entrar no app, os dias salvos e o progresso da corrida também ficam na sua conta privada do Firebase. No iPhone, os dados do app de tela inicial podem ficar separados dos dados da aba do Safari; entre com a mesma conta no app instalado.

O backup é um arquivo JSON contendo seu diário alimentar e as sessões de corrida marcadas. Guarde-o em local privado. A importação mantém datas que só existem no aparelho e substitui as datas presentes nos dois lugares, após confirmação.

O modo offline começa a funcionar depois da primeira visita online. Ao publicar uma versão nova, atualize o nome do cache em `sw.js` para forçar a atualização dos arquivos no app instalado.

O botão **Atualizar** no topo verifica o service worker e abre uma cópia nova da página. Ao abrir ou voltar ao app, a data selecionada retorna ao dia atual; o botão **Hoje** permite fazer isso manualmente. As abas **Alimentação**, **Histórico** e **Treino** ficam fixas no rodapé.

## Busca de alimentos por gramas

A opção **Montar com alimentos** aparece em cada refeição. Pesquise na tabela TACO, adicione um ou mais alimentos, ajuste os gramas e salve. O subtotal usa energia e proteína por 100 g da [Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição, NEPA/UNICAMP](https://nepa.unicamp.br/publicacoes/). A tabela local inclui 597 alimentos e funciona offline depois de o app carregar seus arquivos. Marcas e itens ausentes podem ser cadastrados manualmente pelos valores do rótulo.

## Sincronização privada entre aparelhos

1. No [console do Firebase](https://console.firebase.google.com/), crie um projeto no plano **Spark** e registre um aplicativo **Web**.
2. Em **Authentication → Sign-in method**, ative **E-mail/senha**.
3. Em **Firestore Database**, crie um banco de dados e publique o conteúdo de `firestore.rules` na aba **Rules**. Essas regras só permitem que cada usuário leia e altere os próprios registros.
4. Copie o objeto `firebaseConfig` mostrado nas configurações do aplicativo Web e coloque-o em `firebase-config.js` no lugar de `null`, no formato `window.TOMORROWLAND_FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };`. Essa configuração identifica o projeto; ela não é uma senha. Nunca coloque chave privada, senha ou token pessoal do GitHub nesse arquivo.
5. Publique os arquivos atualizados. Em **Histórico**, crie sua conta com e-mail e senha ou entre em uma conta existente. Use a mesma conta no iPhone e em outros aparelhos.

O app mantém uma cópia local para uso sem internet e tenta sincronizar ao salvar, ao voltar à tela e ao reconectar. A primeira entrada combina os dias locais com os dias da nuvem pela hora da última alteração. Excluir um dia também é sincronizado. Se dois aparelhos alterarem o mesmo dia sem conexão, a última alteração vence; exporte um backup antes de trocas importantes.
