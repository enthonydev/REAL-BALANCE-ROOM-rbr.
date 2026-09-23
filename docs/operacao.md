# Operação e publicação

## Objetivo

Este documento descreve o fluxo mínimo para publicar o RBR com segurança. A branch `develop` representa staging. A branch `main` representa produção. Nenhuma branch deve receber alterações diretas sem revisão.

## Variáveis por ambiente

O frontend precisa das configurações públicas do aplicativo Web do Firebase:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

O backend precisa das seguintes variáveis:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
AUTH_REQUIRED=true
NODE_ENV=production
DATABASE_URL=<banco persistente de produção>
```

`FIREBASE_SERVICE_ACCOUNT_JSON` é um secret administrativo. Ele deve existir somente no ambiente de execução do backend. Nunca deve ser colocado no frontend, no bundle, em logs, em issues ou no repositório.

O modo `AUTH_REQUIRED=false` é permitido apenas no desenvolvimento local. Em staging e produção, o backend deve rejeitar chamadas sem token válido.

## Fluxo de mudança

Toda alteração deve começar em uma branch de trabalho criada a partir de `develop` ou `main`, conforme o tipo de mudança. O autor deve executar localmente:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm audit --prod
pnpm run build
```

Depois, deve revisar o diff e confirmar que não existem secrets, arquivos de banco, artefatos de build ou alterações não relacionadas. O commit deve usar uma mensagem profissional em português e a alteração deve ser publicada por pull request.

## Staging

O merge em `develop` deve publicar a aplicação em staging. Depois da publicação, executar os seguintes testes:

1. Abrir `/health` e confirmar retorno HTTP 200.
2. Abrir a tela de autenticação.
3. Criar uma conta de teste.
4. Confirmar a verificação de e-mail.
5. Entrar com a conta verificada.
6. Criar um financiamento Price.
7. Criar um financiamento SAC.
8. Adicionar e remover uma amortização extraordinária.
9. Confirmar que os dados de uma conta não aparecem para outra conta.
10. Verificar os logs e confirmar que nenhum token ou secret foi impresso.

## Produção

O merge em `main` deve exigir aprovação do ambiente de produção. O deploy deve executar o build validado, aplicar migrações compatíveis e reiniciar o serviço. Depois, repetir pelo menos o teste de `/health`, login e leitura de financiamentos.

O banco de produção deve ser persistente e separado do banco de staging. O SQLite local não deve ser usado como banco compartilhado entre múltiplas instâncias.

## Rollback

Se o deploy causar erro, interromper novas publicações e preservar os logs. Reverter para o último artefato ou commit aprovado. Se houver migração de banco, usar somente migrações reversíveis ou aplicar o procedimento de restauração documentado antes de reverter o código.

Depois do rollback, executar `/health`, autenticação e uma leitura de financiamento. Registrar a causa, a versão revertida e o próximo passo corretivo.

## Rotação da chave Firebase

Para substituir a credencial administrativa:

1. Gerar uma nova chave no Firebase Console.
2. Cadastrar o JSON completo como `FIREBASE_SERVICE_ACCOUNT_JSON` no ambiente correto.
3. Reiniciar ou publicar o backend.
4. Validar login, token e leitura de dados.
5. Revogar a chave antiga no Google Cloud.
6. Excluir o arquivo baixado localmente.

Não é necessário criar commit para a rotação de secrets, pois a credencial não pertence ao código-fonte.

## Checklist de release

Antes do merge em `main`, confirmar que o CI passou, o pull request foi revisado, as migrações foram avaliadas, os secrets existem no ambiente de destino e o rollback está disponível. Depois do merge, confirmar o health check, a autenticação, o isolamento de dados e os logs.
