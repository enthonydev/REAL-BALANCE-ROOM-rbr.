# RBR

## Planejamento e simulação de financiamento imobiliário

O RBR é uma aplicação local para planejar financiamentos imobiliários, simular os sistemas **Price** e **SAC**, aplicar amortizações extraordinárias e comparar os efeitos sobre prazo, parcela, juros e saldo devedor.

A aplicação é AI supported, possibilitando maior escopo de desenvolvimento, garantindo mais qualidade e também auxiliando a  minha evolução técnica/prática de codificação, engenharia de software, produto, regras de negócio, produto e etc. (IA deve ser sempre utilizada com responsabilidade para manter a segurança e também a autenticidade e o aprendizado verdadeiro sem deixar de evoluir junto com o mercado e as novas tecnologias)

A aplicação separa o motor financeiro determinístico da interface e da persistência. Isso permite revisar os cálculos com testes, manter os resultados reproduzíveis e evoluir a experiência sem duplicar regras de negócio.

> **Estado atual:** o RBR é uma ferramenta local de simulação e análise. Integrações bancárias, Open Finance, importação documental e auditoria de eventos reais ainda fazem parte do roadmap e não estão implementadas.

## O que já funciona

- Cadastro de financiamentos com nome do imóvel, principal, taxa, prazo e sistema de amortização.
- Simulação pelos sistemas Price e SAC.
- Cálculo de parcelas, juros, amortização, saldo devedor, total pago e mês de quitação.
- Amortizações extraordinárias com redução de prazo ou redução de parcela, conforme o cenário suportado.
- Comparação entre o cronograma base e o cenário com amortizações.
- Dashboard com indicadores e projeção do saldo baseada no cronograma calculado.
- Tabela de amortização com busca e paginação.
- Histórico de financiamentos salvos, seleção de imóvel e exclusão com confirmação.
- Persistência local em SQLite por meio do `node:sqlite`.
- Fallback para cálculo local quando a API de persistência não está disponível.
- Base inicial de autenticação por Firebase preparada para cadastro, login e verificação de e-mail.
- Testes automatizados do motor financeiro e da camada de persistência.
- Pipeline de integração contínua com verificação de tipos, testes e build.

## O que ainda não faz parte da versão atual

O RBR não acessa contas bancárias, contratos ou sistemas de instituições financeiras. Também não importa PDFs ou extratos, não acompanha pagamentos em tempo real, não classifica divergências de contratos e não substitui análise jurídica, contábil ou regulatória.

Essas capacidades dependem de fontes oficiais, autorização do usuário, segurança de credenciais, regras de acesso e modelos de dados próprios. Elas devem ser implementadas em etapas, começando por uma trilha de eventos e pela rastreabilidade das fontes.

## Arquitetura

```text
React + Vite + TypeScript
        │
        ├── Interface, estado e navegação
        ├── Simulação local com o motor compartilhado
        │
        ▼
Express + TypeScript
        │
        ├── API REST de financiamentos e amortizações
        └── Persistência local
        │
        ▼
SQLite via node:sqlite

Domínio compartilhado: shared/finance.ts
```

O motor financeiro está em `shared/finance.ts`. A interface principal está em `client/src/pages/Home.tsx`. As rotas HTTP estão em `server/index.ts`, e o acesso ao SQLite está em `server/db.ts`.

## Requisitos

- Node.js 22 ou superior.
- pnpm 10.
- Git, caso o projeto seja clonado do GitHub.

## Instalação

```bash
git clone https://github.com/enthonydev/REAL-BALANCE-ROOM-rbr..git
cd -RBR
pnpm install
```

## Desenvolvimento

Para iniciar o frontend em modo de desenvolvimento:

```bash
pnpm dev
```

O Vite serve a aplicação na porta `3000` por padrão.

Para executar o fluxo completo com o backend e persistência local:

```bash
pnpm build
DATABASE_PATH=./data/rbr.sqlite pnpm start
```

O diretório `data/` é criado conforme a necessidade do SQLite. `DATABASE_PATH` é opcional; sem essa variável, o servidor utiliza `./data/rbr.sqlite`.

No Windows PowerShell, a variável pode ser definida assim:

```powershell
$env:DATABASE_PATH=".\data\rbr.sqlite"
pnpm start
```

## Scripts

| Comando | Finalidade |
|---|---|
| `pnpm dev` | Inicia o Vite em modo de desenvolvimento. |
| `pnpm build` | Gera o frontend e empacota o servidor. |
| `pnpm start` | Executa o bundle de produção. |
| `pnpm check` | Verifica os tipos TypeScript. |
| `pnpm test` | Executa os testes automatizados. |
| `pnpm format` | Formata os arquivos com Prettier. |

## API REST

A API atual é voltada à persistência dos financiamentos. Os cálculos podem ser executados localmente no frontend pelo motor compartilhado.

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/api/financings` | Lista os financiamentos do usuário local. |
| `POST` | `/api/financings` | Cria um financiamento e suas amortizações. |
| `GET` | `/api/financings/:id` | Recupera um financiamento com suas amortizações. |
| `PUT` | `/api/financings/:id` | Atualiza o financiamento e substitui as amortizações. |
| `DELETE` | `/api/financings/:id` | Remove o financiamento e seus registros dependentes. |
| `POST` | `/api/financings/:id/amortizations` | Adiciona uma amortização extraordinária. |
| `DELETE` | `/api/financings/:id/amortizations/:amortizationId` | Remove uma amortização extraordinária. |

A versão atual utiliza um usuário local fixo e não possui tela de login. O schema mantém a relação entre usuário, financiamento e amortizações para permitir evolução futura sem misturar os dados no banco.

### Autenticação em transição

O cliente já possui a base de configuração do Firebase e a tela `/auth`. Para ativar o fluxo, preencha as variáveis `VITE_FIREBASE_*` do `.env.example`. O servidor aceita tokens Firebase quando `FIREBASE_SERVICE_ACCOUNT_JSON` está configurada. Durante a transição, `AUTH_REQUIRED=false` mantém o modo local; esse modo não deve ser usado para uma publicação externa. A etapa seguinte é ativar a exigência de autenticação e concluir o isolamento por `uid` em ambiente de staging.

## Motor financeiro

O módulo compartilhado define os principais tipos do domínio:

- `FinancingInput`: principal, taxa anual, prazo e método.
- `ExtraordinaryPayment`: mês e valor do aporte.
- `ScheduleRow`: saldo inicial, parcela, juros, amortização, aporte extraordinário e saldo final.
- `FinancingSimulation`: resultado completo de uma simulação.
- `SimulationComparison`: comparação entre cenário base e cenário com aportes.

Os valores monetários são arredondados para centavos. A taxa mensal é derivada da taxa anual efetiva. O comportamento do motor é coberto por testes para Price, SAC e amortizações extraordinárias.

## Qualidade

A validação local completa é executada com:

```bash
pnpm check
pnpm test
pnpm build
```

O GitHub Actions executa os mesmos três passos para alterações na `main` e em pull requests. O build pode emitir um aviso de tamanho do bundle frontend acima de 500 kB; esse aviso não impede a compilação.

## Estrutura do repositório

```text
client/
  src/
    pages/          Telas principais do produto.
    components/     Componentes reutilizáveis e primitives de interface.
    contexts/       Contextos React.
    hooks/          Hooks auxiliares.
    index.css       Estilos globais e tema.
server/
  db.ts             Schema e operações SQLite.
  db.test.ts        Testes da persistência.
  index.ts          Servidor Express e API REST.
shared/
  finance.ts        Motor financeiro compartilhado.
  finance.test.ts   Testes dos cálculos.
docs/
  arquitetura.md    Decisões e limites arquiteturais.
.github/workflows/
  validacao.yml     Check, testes e build no GitHub Actions.
```

## Roadmap técnico

A evolução recomendada segue esta ordem:

1. **Estabilização financeira:** ampliar os testes para múltiplos aportes, taxa zero, prazos extremos e arredondamentos.
2. **Configurações:** centralizar preferências, parâmetros e origem dos dados.
3. **Trilha de eventos:** registrar alterações contratuais, pagamentos, amortizações e documentos associados.
4. **Importação controlada:** permitir documentos e extratos fornecidos pelo usuário, com metadados e origem.
5. **Comparação entre esperado e realizado:** confrontar o cronograma calculado com dados observados, sempre exibindo contexto e tolerância.
6. **Integrações oficiais:** avaliar fontes autorizadas, Open Finance e regras habitacionais somente após definir segurança, consentimento e conformidade.

O RBR deve identificar e documentar divergências. Ele não deve declarar fraude, ilegalidade ou irregularidade automaticamente.

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).

## Referências do projeto

- [Documentação da arquitetura](docs/arquitetura.md)
- [Relatório de status](relatorio-status-rbr.md)
- [Repositório no GitHub](https://github.com/enthonydev/-RBR)
