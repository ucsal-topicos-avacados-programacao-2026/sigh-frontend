# Arquitetura do front-end (FE-02)

Decisões de arquitetura, tomadas a partir do código do `sigh-backend` (SecurityConfig, TokenService, AutenticacaoController, TratadorDeErros, controllers) e do README (RNF-004, BE-23, BE-25).

## 1. Como o navegador chega à API

**Decisão: chamada direta do navegador à API, com CORS configurado no Spring Security. Vale igual no desenvolvimento e na apresentação.**

| Opção | TLS | Veredito |
|---|---|---|
| Proxy do Vite (`server.proxy`) | O processo Node do Vite termina o TLS do navegador e abre outra conexão com a API, então lê o tráfego em claro | **Recusada.** É o "proxy que termina o TLS antes da API" que o README diz que vira ponto de decifragem e teria de entrar no C4. Além disso, esconde do desenvolvimento os problemas de CORS que só apareceriam na apresentação |
| Front servido pelo Spring (`static/`) | Termina na API, com uma origem só | **Recusada.** Exige `permitAll` para os arquivos estáticos e um *fallback* da SPA para `index.html` no `SecurityConfig`. Esse *fallback* é uma rota sem `@PreAuthorize`, que o `VinculoEmTodaRotaTest` reprova. Também acopla o build dos dois repositórios, e o desenvolvimento continuaria precisando do servidor do Vite, ou seja, de CORS ou de proxy |
| **CORS com chamada direta** | Termina na própria API. O servidor do front só entrega HTML/JS e nunca vê dado clínico | **Escolhida** |

**Topologia:**
- Desenvolvimento: front em `https://localhost:5173` (`vite`) chamando `http://localhost:8080` (perfil padrão, só com dados fictícios da `demonstracao`).
- Apresentação: front em `https://localhost:4173` (`vite build && vite preview`) chamando `https://localhost:8443` (perfis `tls,demonstracao`).
- Só a variável `VITE_API_URL` muda. O código é o mesmo.

**TLS:**
- O front roda sempre em HTTPS, inclusive no desenvolvimento. A API em `tls` manda HSTS. O HSTS vale para o host `localhost` em qualquer porta e fica guardado por um ano, então depois disso um front em `http://localhost` seria forçado para HTTPS e quebraria.
- O certificado vem do `mkcert` (CA local confiável): um par para `localhost` serve à API (`SIGH_TLS_CERTIFICADO`/`SIGH_TLS_CHAVE_PRIVADA`) e ao Vite (`server.https` e `preview.https`, com os caminhos lidos do ambiente).
- Sem CA confiável, o `fetch` para a API falha sem mensagem útil. Fica um passo no README de cada aluno.

**Cookies/token:** nenhum cookie. O token vai em `Authorization: Bearer`, então o CORS dispensa `allowCredentials`, e o CSRF continua desligado (API sem estado), como já está.

**O que muda no back-end:**
1. O CORS precisa estar **na cadeia do Spring Security** (`http.cors(Customizer.withDefaults())` mais um bean `CorsConfigurationSource` lido da propriedade), e não só num `WebMvcConfigurer`. Senão os 401/403 gerados pelo filtro de segurança saem sem `Access-Control-Allow-Origin`, o navegador mostra "erro de rede", e o front não consegue detectar a sessão expirada. O pré-voo `OPTIONS` também precisa passar sem token.
2. Origens permitidas: `https://localhost:5173` e `https://localhost:4173`. Métodos `GET, POST, PATCH`, cabeçalhos `Authorization, Content-Type`, sem curinga `*`.
3. `GET /usuarios/eu` precisa de `@PreAuthorize("hasAnyRole(...)")` e de uma entrada justificada em `SEM_VINCULO` no `VinculoEmTodaRotaTest`. Senão o teste falha.

## 2. Token: onde guardar, expiração, 401/403

**Decisão: o token de acesso fica em `sessionStorage`. O token de segundo fator pendente (5 min) fica só em memória.**

| Opção | Recarregar a página | XSS | Veredito |
|---|---|---|---|
| Memória | Perde a sessão | Mais difícil de roubar | Não atende a demonstração, que recarrega a página |
| **sessionStorage** | Mantém | Legível por script injetado | **Escolhido.** Some ao fechar a aba, o que importa num computador compartilhado de hospital. Cada aba tem a sua sessão |
| localStorage | Mantém | Legível | Recusado. Sobrevive a fechar o navegador e fica 8 h num computador compartilhado |
| Cookie HttpOnly | Mantém | Não legível | Seria o melhor contra XSS, mas exige o back-end emitir e ler o cookie (`BearerTokenResolver`) e religar o CSRF. Isso é mudança de segurança no back-end, fora do FE-02 |

**Mitigação do XSS:**
- React escapa por padrão, e a regra `react/no-danger` proíbe `dangerouslySetInnerHTML`.
- Nenhum dado clínico vai para o armazenamento do navegador.
- CSP no `preview.headers`: `default-src 'self'; connect-src 'self' <VITE_API_URL>; img-src 'self' data:; frame-ancestors 'none'`. No `vite` de desenvolvimento ela não entra, porque o *preamble* do React Refresh é *script* inline.
- O QR do autenticador é desenhado localmente. A URI `otpauth` traz o segredo TOTP e nunca pode ir a um serviço externo de QR.

**Expiração (8 h, sem *refresh token* na API):**
- `auth/token.ts` decodifica o *payload* (base64url, sem biblioteca) e lê `exp` e `autorizacoes`.
- Ao iniciar, um token vencido é descartado. Com um token válido, agenda-se `sair()` para o instante do `exp`. A validação real continua sendo a da API.

**401/403** (tratados no cliente HTTP):
- **401 em rota autenticada:** limpa a sessão e vai para `/entrar`, com o aviso "Sessão expirada" e a rota de origem guardada para voltar depois.
- **401 em `/auth/*`:** é erro de formulário ("Login ou senha inválidos.", "Código do segundo fator inválido."), e não fim de sessão. O cliente não aciona o *logout* nessas rotas.
- **403:** não desloga. Mostra "Você não tem permissão para esta ação nesta instituição". Quase sempre é vínculo ausente ou encerrado (RF-012).
- 401 e 403 vindos do filtro do Spring chegam com **corpo vazio**, sem ProblemDetail. Por isso o cliente usa uma mensagem padrão por status.

## 3. Estrutura e camadas

```
src/
  main.tsx, App.tsx          providers + RouterProvider
  rotas.ts                   tabela única das telas: {caminho, rotulo, grupo, icone, perfis[], descricao, card}
  api/
    cliente.ts               requisicao<T>(metodo, caminho, {corpo, query, sinal}); ErroApi
    tipos.ts                 Perfil, Etapa, Pagina<T>, ProblemDetail, enums (CorRisco, StatusLeito...)
    auth.ts usuarios.ts triagens.ts atendimentos.ts resumos.ts leitos.ts
    internacoes.ts transferencias.ts pacientes.ts auditoria.ts   (1 arquivo por controller/domínio)
  auth/
    token.ts                 ler/gravar/limpar sessionStorage, decodificar exp/autorizacoes
    SessaoProvider.tsx       token, eu (GET /usuarios/eu), instituicaoAtiva, pacienteAtivo, entrar/sair
    permissoes.ts            podeAcessar(rota, sessao): função pura, a mesma para o menu e a guarda
    RotaProtegida.tsx
  layout/                    AppLayout (link "pular para o conteúdo", cabeçalho, menu, <main>), Menu, SeletorInstituicao
  componentes/               Botao, Campo (label + erro com aria-describedby), Alerta (role=alert|status),
                             Tabela (caption; vira cartões no celular), Paginacao, Dialogo (<dialog> nativo),
                             EstadoVazio, Carregando, SeloRisco (cor + texto), TituloPagina (foco no h1 a cada rota)
  paginas/{publicas,administrativo,paciente,enfermeiro,medico,auditor}/
  estilos/index.css          @import "tailwindcss"; @theme com os tokens do protótipo
```

**Cliente HTTP:**
- Um `fetch` envolto, sem axios.
- Prefixa `VITE_API_URL`, injeta o Bearer, serializa JSON e trata 204/202.
- Em erro, lança `ErroApi { status, detail, campos? }`. O `detail` vem do ProblemDetail do `TratadorDeErros`, e `campos` vem do 400 de validação (`{campo: mensagem}`), que o `Campo` mostra junto do campo certo.
- Também trata 409 ("conflito, consulte de novo"), 422 (regra de negócio, mostrar o `detail`) e 503 (IA indisponível: o enfermeiro segue sem sugestão).
- Os tipos de resposta são escritos à mão em cada `api/*.ts`, espelhando os `record` Java. O back-end não tem springdoc, então não há OpenAPI para gerar.
- `Pagina<T>` espelha o `PagedModel` (`{content, page: {size, number, totalElements, totalPages}}`).

**Como os FE-03..08 se encaixam sem retrabalho:**
- Cada card só acrescenta `paginas/<perfil>/*`, as funções em `api/<dominio>.ts` e trocam a página do item em `rotas.ts`/`App.tsx`. Ele não toca `auth/`, `layout/` nem `cliente.ts`.
- O FE-02 já entrega todas as rotas do mapa abaixo com uma página provisória ("Em construção"). Assim, o critério "perfil vê somente o menu permitido" fica testável desde agora.
- A instituição ativa vem sempre de `useSessao().instituicaoAtiva`. Nenhuma página lê o armazenamento direto.
- O paciente ativo (o titular ou um representado, `GET /api/pacientes/gerenciados`) vem de `usePacienteAtivo()` (`src/paciente/PacienteAtivo.tsx`), só em memória. As telas do paciente usam a moldura `PaginaDoPaciente`, que mostra o seletor "Dados de" quando há mais de um.

## 4. Mapa de rotas por perfil e guarda

A tabela única é `src/rotas.ts`. Os nomes e grupos seguem o protótipo, e os perfis seguem os `@PreAuthorize` do back-end (design system, seção 2.12):

| Grupo | Item (rota do front) | Perfis | Rotas da API que a tela vai usar |
|---|---|---|---|
| Visão geral | Pacientes `/pacientes` | Administrativo | `POST /api/pacientes/busca`, `/admissoes`, `/{id}/conta`, `/{id}/representantes` |
| Visão geral | Meu prontuário `/meu-prontuario` | Paciente | `GET /api/pacientes/gerenciados`, `/{id}/historico`, `/{id}/acessos` |
| Atendimento | Triagem `/triagem` | Enfermeiro | `POST /triagens`, `/{id}/sugestao`, `/{id}/confirmacao` |
| Atendimento | Atendimentos `/atendimentos` | Médico, Enfermeiro | `GET /triagens/fila?instituicaoId`, `/atendimentos/{id}/historico` e emergência; médico também `/registros`, `/encerramento`, `/resumos` (202 e consulta periódica de `GET /resumos/{id}`) |
| Atendimento | Leitos `/leitos` | Administrativo | `GET/POST /leitos`, `PATCH /leitos/{id}/status` |
| Atendimento | Internações `/internacoes` | Administrativo | `POST /internacoes`, `/{id}/transferencia`, `/{id}/solicitacoes-transferencia`, `/{id}/alta`, `/solicitacoes-transferencia/*` |
| Gestão da rede | Consentimentos `/consentimentos` | Paciente | `/api/pacientes/{id}/consentimentos`, `/restricoes`, `/autorizacoes` |
| Gestão da rede | Auditoria `/auditoria` | Auditor/Gestor | `/auditoria/registros`, `/emergencias/pendentes`, `/analises` |
| Gestão da rede | Relatórios `/relatorios` | Auditor/Gestor | `GET /auditoria/indicadores` |

**Rotas públicas e comuns:**
- Públicas: `/entrar`, `/entrar/segundo-fator/cadastro` (QR mais o segredo em texto, para quem não consegue escanear) e `/entrar/segundo-fator`.
- Comuns: `/` (vai para o primeiro item permitido do menu) e `*`. A falta de permissão aparece no próprio endereço da tela, sem rota separada. Endereço desconhecido: sem sessão, o cartão 404; com sessão, o 404 dentro do shell.

**Fluxo do login pela etapa:**
- `ACESSO_LIBERADO`: grava o token e busca `/usuarios/eu`.
- `VALIDAR_SEGUNDO_FATOR`: vai para a validação.
- `CADASTRAR_SEGUNDO_FATOR`: vai para o cadastro e depois para a validação.

**Guarda (`podeAcessar`):**
1. Sem token válido: vai para `/entrar`.
2. A fonte da verdade é o `GET /usuarios/eu`. Ele é buscado de novo a cada carga da página e fica só em memória. O `autorizacoes` do token serve apenas para não piscar a tela enquanto ele carrega.
3. A rota exige `perfil ∈ eu.perfis`.
4. Para os perfis de instituição (MEDICO, ENFERMEIRO, ADMINISTRATIVO), a rota também exige uma `instituicaoAtiva` cujo vínculo traga aquele perfil (`perfilLiberado`, em `src/auth/permissoes.ts`).
5. Seletor de instituição no cabeçalho:
   - mostra só os vínculos de `eu.vinculos`;
   - com um vínculo só, ele é escolhido automaticamente;
   - a escolha fica em `sessionStorage` e é descartada se o vínculo não vier mais no `/eu`;
   - trocar de instituição volta para o início do perfil.
6. O menu é `rotas.filter(podeAcessar)`, com a mesma função. A guarda é conveniência de interface: quem autoriza é a API (403).

## 5. Bibliotecas, testes, lint e tipagem

**Execução** (além de `react` e `react-dom`):

| Biblioteca | Por quê |
|---|---|
| `react-router` | Rotas, `lazy` por perfil e redirecionamento da guarda (decidido) |
| `tailwindcss` + `@tailwindcss/vite` | Tailwind 4 (decidido). Os tokens do protótipo (`--primary #12345a`, `--ring`, `--radius`) vão para `@theme` |
| `lucide-react` | Ícones (decidido), com `aria-hidden` quando há texto ao lado |
| `qrcode.react` | QR do segundo fator gerado no navegador. Sem ele, o segredo iria a um serviço externo |

**Fora, de propósito:**
- axios: `fetch` basta.
- shadcn/base-ui: o protótipo usa só `button.tsx`. Elementos nativos com Tailwind cobrem o caso, e `<dialog>` já dá foco e Esc.
- react-hook-form/zod: a validação é a do servidor (`campos`) mais os atributos HTML.
- TanStack Query e gerenciador de estado: um Context basta. Desde o FE-05, as telas carregam dados com `useConsulta` (`src/api/useConsulta.ts`: carrega ao montar e quando as dependências mudam, cancela a requisição anterior e ignora a resposta que chega depois) e gravam com `useEnvio` (`src/api/useEnvio.ts`: enviando, erro e o disparo). Como `api/*.ts` devolve *promises* tipadas, dá para adotar uma biblioteca depois sem reescrever a camada.
- recharts: entra só se o FE-08 precisar de gráfico.

**Desenvolvimento:**
- `typescript` com `strict` e `noUncheckedIndexedAccess`.
- Alias `@/` para `src/` no `tsconfig` e no `vite.config`, conforme a Constitution, art. VI.
- `vitest` + `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `axe-core`.

**Testes no FE-02:**
- Unidade: `token.ts` (expiração), `permissoes.ts` (matriz perfil × rota × vínculo) e `cliente.ts` (com `fetch` simulado: 401 fora e dentro de `/auth`, 403 e 400 com `campos`).
- Componente: um teste para cada etapa do login. Um teste de menu para cada perfil prova o critério "vê somente o menu permitido". Navegação com `user.tab()` e Enter prova o teclado.
- Acessibilidade: `axe-core` sobre o `container` de cada página e componente renderizado, sem violações. No jsdom o axe não mede contraste.
- O contraste e as larguras de 360, 768 e 1280 px ficam para o TST-02/TST-03, com `@playwright/test` e `@axe-core/playwright` contra a API real. Para isso, os testes usam sempre `getByRole`/`getByLabelText`, que o Playwright reaproveita.

**Lint e tipagem:**
- Mantém o `oxlint`, que já está no projeto, com os plugins `typescript`, `react`, `react-hooks`, `jsx-a11y` e `import`, e a regra `react/no-danger` como erro.
- *Scripts*: `lint`, `typecheck` (`tsc -p tsconfig.json`), `test` (`vitest run`) e `build`.

## 6. Riscos e o que fica fora do FE-02

**Riscos:**
- **Certificado local:** sem `mkcert` (ou com a CA não instalada), o `fetch` à API em HTTPS falha. O mesmo acontece se alguém subir o front em `http://` depois de receber o HSTS da API. Mitigação: um passo a passo único no README e o front sempre em HTTPS.
- **XSS com o token em `sessionStorage`:** mitigado pela CSP no *build*, pelo `no-danger` e por não usar bibliotecas de HTML. Um cookie HttpOnly fica registrado como melhoria do back-end.
- **Lacunas de API que travam cards seguintes** (decidir com o grupo antes do FE-03/FE-05, sem inventar no front):
  - não há rota que liste os atendimentos admitidos e ainda sem triagem, porque a fila só traz quem tem cor confirmada. O enfermeiro só conseguiria o `atendimentoId` pela resposta da admissão;
  - não há `GET` de internações, e o `LeitoResponseDTO` não traz o `internacaoId`. Assim, alta e transferência não têm de onde partir na tela.
- **Duplicidades na API:** `/api/pacientes/me/consentimentos` e `/auditoria/meus-acessos` duplicam as versões com `{pacienteId}`, e as rotas de paciente usam o prefixo `/api` e as outras não. O front usa as versões com `{pacienteId}`.
- **Resumo por IA:** leva cerca de 23 s e pode passar de 30 s com fila. A tela do médico precisa de consulta periódica com intervalo e de um estado "em geração" que seja anunciado (`aria-live`). Isso fica no card do médico.

**Fora do FE-02:**
- as telas de negócio (FE-03..08);
- *refresh token* e aviso de "sessão vai expirar";
- cookie HttpOnly;
- testes ponta a ponta e de acessibilidade em navegador real (TST-02/TST-03);
- tema escuro;
- internacionalização;
- PWA/offline;
- qualquer cache local de dado clínico, que não deve existir em nenhum card.
