# sigh-frontend

Front-end do SIGH (Sistema Integrado de Gestão Hospitalar): React 19, TypeScript, Vite, Tailwind 4 e lucide-react. Ele conversa com a API do [`sigh-backend`](../sigh-backend).

- **Arquitetura:** [`docs/arquitetura.md`](docs/arquitetura.md).
- **Visual e componentes:** [`docs/design-system.md`](docs/design-system.md). Os tokens e componentes partem do protótipo da equipe, com as correções de contraste e tamanho para o WCAG 2.1 AA (RNF-006). A fonte é a Plus Jakarta Sans, embutida no app, e as telas de entrada usam a foto de `src/assets/entrada.jpg` e a logo da equipe (seção 6 do design system).

## Como baixar e rodar

**Pré-requisitos:** Git e Node.js 20 ou mais novo (com npm). Para ter dados de verdade, a API do `sigh-backend` precisa estar no ar (ela tem um README com o passo a passo, incluindo banco, variáveis e IA).

1. **Baixar e instalar:**

   ```bash
   git clone https://github.com/ucsal-topicos-avacados-programacao-2026/sigh-frontend.git
   cd sigh-frontend
   git checkout develop
   npm install
   ```

2. **Configurar:** copie `.env.example` para `.env` e confira o `VITE_API_URL`. O perfil padrão da API usa `http://localhost:8080`; o perfil `tls`, `https://localhost:8443`.

   ```bash
   cp .env.example .env
   ```

3. **API:** em outro terminal, suba o `sigh-backend` com o CORS liberado para a origem do front (`http://localhost:5173` quando o front roda sem certificado, `https://localhost:5173` com ele):

   ```bash
   SIGH_CORS_ORIGENS=http://localhost:5173 ./mvnw spring-boot:run -Dspring-boot.run.profiles=demonstracao
   ```

4. **Front:**

   ```bash
   npm run dev
   ```

   Abra `http://localhost:5173` e entre com um dos usuários de demonstração (abaixo).

**HTTPS:** rode o front em HTTPS. A API, no perfil `tls`, manda HSTS, que vale para `localhost` em qualquer porta, e depois disso um front em `http://` deixa de funcionar no navegador.
- Gere um certificado local confiável com o [mkcert](https://github.com/FiloSottile/mkcert): `mkcert -install` e depois `mkcert localhost`.
- Aponte o front para ele com `SIGH_FRONT_CERTIFICADO` e `SIGH_FRONT_CHAVE` no `.env`.
- O mesmo par pode servir à API (`SIGH_TLS_CERTIFICADO` e `SIGH_TLS_CHAVE_PRIVADA`).

Na apresentação, use `npm run build` e `npm run preview` (porta 4173), com `https://localhost:4173` incluída em `SIGH_CORS_ORIGENS`.

**Usuários de demonstração:** os do perfil `demonstracao` da API (`paciente.demo`, `enfermeiro.demo`, `medico.demo`, `administrativo.demo`, `recepcao.demo` e `auditor.demo`), com a senha de `SIGH_SENHA_DEMONSTRACAO`. A tela Pacientes é da recepção (`recepcao.demo`); leitos e internações são do administrativo. Médico, enfermeiro, recepção e auditor cadastram o segundo fator no primeiro acesso, com um aplicativo autenticador.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Confere os tipos e gera `dist/` |
| `npm run preview` | Serve o `dist/` com a política de segurança de conteúdo (CSP) |
| `npm run lint` | oxlint, com as regras de acessibilidade (`jsx-a11y`) |
| `npm run typecheck` | TypeScript estrito |
| `npm test` | Vitest e Testing Library, com axe-core para acessibilidade |

## Como funciona (FE-02)

**Entrada:**
- O login segue a `etapa` devolvida pela API: acesso liberado, validar o segundo fator ou cadastrá-lo.
- No cadastro, o QR code é gerado no próprio navegador. A URI traz o segredo e nunca vai a outro serviço.
- O token de segundo fator pendente fica só em memória.

**Sessão:**
- O token de acesso fica no `sessionStorage`. Ele sobrevive ao recarregar e some ao fechar a aba.
- Nenhum dado clínico é guardado no navegador.
- Um 401 numa rota autenticada encerra a sessão e volta ao login. Um 403 mostra a falta de permissão.

**Menu e guarda de rota:**
- Os dois vêm de `GET /usuarios/eu` e usam a mesma regra (`src/auth/permissoes.ts`).
- Médico, enfermeiro e administrativo precisam de uma instituição ativa, escolhida no topo da página.
- Paciente e auditor não dependem de instituição.
- Esconder o item é conveniência. Quem autoriza de fato é a API.

| Perfil | Menu |
|---|---|
| Paciente | Meu prontuário, Consentimentos |
| Enfermeiro | Triagem, Atendimentos |
| Médico | Atendimentos |
| Administrativo | Pacientes, Leitos, Internações |
| Auditor/Gestor de rede | Auditoria, Relatórios |

As telas de cada item são entregues nos cards FE-03 a FE-08. Até lá, a rota existe e mostra "Em construção".

**Acessibilidade:** o layout se adapta a celular, tablet e desktop, com menu lateral em gaveta abaixo de 1024px.
- Link "Pular para o conteúdo".
- Foco visível e foco no título a cada troca de página.
- Navegação completa por teclado.
- Alvos de toque de 44px no celular.
- Textos com no mínimo 14px (12px só em rótulos secundários).

**Componentes reutilizáveis** (`src/componentes/`):
- botão;
- campo de texto, de senha e seleção;
- tabela com estados de carregando, vazio e erro;
- painel;
- cartão de indicador;
- etiqueta de status;
- alerta;
- aviso de conteúdo gerado por IA;
- toast;
- diálogo de confirmação.

## Pacientes (FE-03)

Tela da Recepção para receber o paciente na instituição ativa (RF-001, RF-002, RN-004).

1. **Busca pelo CPF na rede** (`POST /api/pacientes/busca`). O CPF é conferido no navegador com a mesma regra da API (dígitos verificadores, sem todos os dígitos iguais) e vai no corpo da requisição, nunca na URL. Ele não é guardado no navegador.
2. **Paciente já na rede:** a tela mostra nome e nascimento e pergunta só o que o paciente está sentindo (sem sinais vitais). O atendimento é aberto no prontuário que ele já tem; cadastro e consentimento não mudam aqui.
3. **CPF fora da rede:** cadastro com nome, data de nascimento, consentimento inicial e motivo (`POST /api/pacientes/admissoes`). O consentimento tem três opções: autoriza o compartilhamento na rede, não autoriza, ou não se manifestou agora (o campo não vai, e vale como não autorizado até o paciente decidir).
4. **CPF cadastrado por outra recepção ao mesmo tempo:** a API abre o atendimento no prontuário existente, e a tela avisa que os dados digitados não foram usados.

Trocar a instituição ativa recomeça a tela. Erros de campo da API aparecem no próprio campo; 403, 409 e falhas de rede aparecem num alerta.

## Paciente (FE-05)

Duas telas do perfil Paciente, também para o representante legal (RF-002, RF-008, RF-009, RN-007).

**De quem são os dados:** `GET /api/pacientes/gerenciados` traz o próprio cadastro e os representados. Com mais de um, a página mostra o seletor "Dados de"; a escolha fica só em memória. Se o acesso não está ligado a um cadastro de paciente, a tela diz isso.

**Meu prontuário:**
- **Histórico na rede:** cada registro com tipo, data, instituição, categoria, CID e se está restrito. "Restringir este registro" explica o efeito antes de confirmar.
- **Quem acessou:** profissional, perfil, instituição, data e finalidade, com os acessos de emergência marcados, de 10 em 10.

**Consentimentos:**
- **Compartilhamento na rede:** a situação atual e o que ela significa. Autorizar e revogar pedem confirmação, com o efeito escrito. Na revogação: quem já atendeu o paciente continua vendo o histórico, e as outras instituições deixam de ver, a não ser numa emergência (RN-007).
- **Informações restritas:** restringir uma categoria (com as categorias do histórico como sugestão) e encerrar restrições. Uma informação restrita não aparece para nenhuma instituição, nem a que fez o registro, a não ser com autorização adicional ou numa emergência.
- **Autorizações adicionais:** liberar algo restrito para uma instituição credenciada (`GET /api/instituicoes`) e revogar. A autorização só faz efeito onde o compartilhamento vale (autorizado; ou, revogado, nas instituições que já tinham atendido) ou na instituição que fez o registro; sem o compartilhamento autorizado, a tela avisa isso.

## Auditor/Gestor de rede (FE-08)

Duas telas do perfil Auditor/Gestor de rede (RF-008, RF-011, RN-003, RN-006). O registro de acessos é imutável: nenhuma tela tem ação de editar ou excluir, e a única ação sobre um acesso é registrar uma análise, que é um registro novo.

**Auditoria:**
- **Emergências aguardando análise** (`GET /auditoria/emergencias/pendentes`): acessos de emergência com a justificativa, do mais antigo para o mais recente. Cada um sai da fila quando recebe uma análise com conclusão diferente de "Pendente".
- **Registro de acessos** (`GET /auditoria/registros`): filtros por período (padrão: últimos 30 dias), instituição e "Só emergências", aplicados ao clicar em "Aplicar". O filtro de instituição lista as que tiveram acesso no período, vindas dos indicadores. Paginado de 20 em 20.
- **Registrar análise** (`POST /auditoria/registros/{id}/analises`): parecer ou alerta de possível acesso indevido, com conclusão (pendente, regular, indevido ou inconclusivo) e descrição.
- **Análises registradas** (`GET /auditoria/analises`): alertas e pareceres, cada um com o código do acesso analisado (os 8 primeiros caracteres do id, os mesmos mostrados no registro de acessos).

**Relatórios** (`GET /auditoria/indicadores`): acessos e emergências por instituição no período, com os totais e a parte em emergência. O filtro de instituição é aplicado na tela. "Imprimir relatório" imprime só o relatório, sem o menu e o cabeçalho.

## Leitos e internações (FE-04)

Duas telas do Administrativo, sempre na instituição ativa (RF-005, RF-006). As duas se atualizam sozinhas a cada 30 segundos com a aba visível, e de novo depois de cada operação.

**Leitos** (`GET /leitos`):
- Mapa por categoria, com a contagem por estado (livre, ocupado, em higienização, bloqueado) e filtros de categoria e estado. O leito ocupado mostra o paciente.
- Ações de estado que a API aceita: bloquear o livre, concluir a higienização, desbloquear. O ocupado só muda por internação, transferência ou alta.
- Cadastrar leito (código, setor, categoria).

**Internações:**
- **Atendimentos sem internação** (`GET /internacoes/atendimentos-sem-leito`): atendimentos em aberto cujo paciente não está internado, na ordem de chegada. Sem leito livre na instituição, a lista vira "Fila de espera por leito".
- **Internar:** só os leitos livres aparecem para escolher, agrupados por categoria.
- **Internados** (`GET /internacoes`): transferir para outro leito livre da instituição (direto) ou pedir a transferência para outra instituição da rede, mostrando as vagas livres de lá na categoria; dar alta escolhendo o resumo de alta feito desde a admissão (sem resumo, a tela explica que a alta precisa dele).
- **Pedidos recebidos:** aceitar escolhendo um leito livre da categoria pedida, ou recusar com motivo. **Pedidos enviados:** situação, motivo da recusa e cancelar o pendente.

## Usuários e senhas (Auditor/Gestor)

**Tela Usuários** (`/usuarios`, só o Auditor/Gestor): quem cria e administra os usuários da rede.
- **Lista e busca** (`GET /usuarios`): por nome ou login, perfil e situação, com paginação, mostrando perfil, hospitais e se a senha ainda é temporária.
- **Novo usuário** (`POST /usuarios`): login, nome, perfil e, para médico, enfermeiro, recepção e administrativo, os hospitais em que atua (com CRM ou COREN para médico e enfermeiro). Não há perfil Paciente: o paciente é cadastrado pela recepção. O sistema gera a senha temporária, que aparece **uma única vez** numa janela, com botão de copiar.
- **Ações por usuário**, todas com confirmação: desativar e reativar (a sessão aberta do desativado cai na hora), redefinir a senha (gera outra temporária), zerar o segundo fator e gerenciar vínculos (adicionar e encerrar hospitais). O auditor não desativa nem redefine a própria senha.
- **Ações administrativas** (`GET /usuarios/acoes`): registro imutável de quem fez o quê, em quem e quando.

**Primeiro acesso:** quem entra com senha temporária (usuário novo ou com senha redefinida) vai para a tela **Troque a sua senha** (`/entrar/trocar-senha`) antes de tudo. Depois da troca seguem o segundo fator, se o perfil exigir, e o acesso. A senha nova tem de 10 a 72 caracteres, com letras e números.

**Alterar a própria senha:** o botão de chave no topo abre `/alterar-senha`, que pede a senha atual (`POST /auth/senha/alteracao`).

## Triagem (FE-06)

Tela do Enfermeiro, na instituição ativa (RF-003, RF-010, RN-001, RN-005, RN-008, RN-009). As listas se atualizam sozinhas a cada 30 segundos.

- **Aguardando triagem** (`GET /triagens/aguardando`): por ordem de chegada. Quem tem triagem registrada e não confirmada aparece com a sugestão da IA, se houver, e o botão "Continuar triagem".
- **Triagem aberta na recepção:** o paciente chega com o relato da recepção e a cor sugerida pela IA já marcada, como "Sugestão preliminar (sem sinais vitais)". O enfermeiro registra os sinais vitais (`PATCH /triagens/{id}/sinais-vitais`), a IA refaz a sugestão sozinha (a tela espera, sem botão de pedir) e ele confirma ou altera a cor. Também pode classificar sem registrar os sinais agora. A confirmação exige o clique em "Confirmar classificação": o Enter não confirma.
- **Triagem sem recepção** (reclassificar, ou paciente sem triagem aberta):
  1. Sintomas e sinais vitais, validados como a API valida (`POST /triagens`).
  2. A sugestão de cor da IA (`POST /triagens/{id}/sugestao`) aparece identificada como "Sugestão gerada por IA — sujeita à validação profissional" e já marcada. O enfermeiro confirma ou escolhe outra cor; se escolher outra, a tela diz que ele alterou a sugestão.
  3. A triagem só termina com a confirmação do enfermeiro (`POST /triagens/{id}/confirmacao`). Fechar sem confirmar deixa a triagem pendente, para retomar depois.
- **IA indisponível** (situação `INDISPONIVEL`, 503 ou falha de rede): a tela avisa e o enfermeiro classifica sozinho, com a opção de pedir a sugestão de novo.
- **Na recepção**, depois de abrir o atendimento, a tela mostra só o andamento da pré-classificação (`GET /triagens/pre-classificacao`): em andamento, pronta ou indisponível. A cor não aparece para a recepção.
- **Fila de atendimento** (`GET /triagens/fila`): por prioridade da cor confirmada, com o tempo de espera, a marca "Tempo máximo excedido" e um alerta com quantos passaram do limite. "Reclassificar" registra uma triagem nova para o paciente.
- **Histórico e acesso de emergência** (`GET /atendimentos/{id}/historico` e `POST .../historico/emergencia`): paciente sem histórico segue o mesmo fluxo, com um aviso. Com informações restritas, o acesso de emergência pede a justificativa (de 20 a 2000 caracteres) e mostra os registros restritos marcados. As recusas da API, como quem confirmou a cor tentando a emergência, aparecem no formulário.

## Atendimento do médico (FE-07)

Telas do Médico na instituição ativa (RF-004, RF-006, RF-007, RF-010, RN-003, RN-008).

**Atendimentos** (`/atendimentos`, também para o enfermeiro): os atendimentos em andamento (`GET /atendimentos/em-andamento`), com os do médico logado marcados como "Você", e a fila de triagem por prioridade. O médico abre ou começa o atendimento; o enfermeiro consulta o histórico.

**Atendimento do paciente** (`/atendimentos/:id`, só para o médico):
- **Cabeçalho:** classificação de risco, chegada, início e motivo.
- **Resumo do histórico por IA** (`POST /atendimentos/{id}/resumos`, 202): gerado em segundo plano e consultado a cada 3 segundos (`GET /resumos/{id}`) até ficar pronto. Aparece sempre com o aviso "Sugestão gerada por IA — sujeita à validação profissional" e o aviso da API. Os registros usados ficam marcados "Usado no resumo" no prontuário, para conferir o original. O médico valida o resumo (`POST /resumos/{id}/validacao`). Falha da IA (resumo FALHOU, 503 ou rede) mostra um aviso, sem impedir a leitura do prontuário, que fica num painel à parte.
- **Prontuário** (`GET /atendimentos/{id}/historico`): o que a instituição pode ver, inclusive de outras instituições, com o acesso de emergência com justificativa quando há informações restritas (o mesmo componente da triagem).
- **Novo registro** (`POST /atendimentos/{id}/registros`): evolução e conduta, diagnóstico com CID-10 (validado no formato da API), prescrição, exame, alergia e resumo de internação ou alta, que o administrativo anexa à alta.
- **Encerrar atendimento**, com confirmação.

## Painel por hospital (FE-09)

Primeira tela do Médico, do Enfermeiro, do Administrativo e do Auditor/Gestor (`/painel`, RF-005, RF-006, RF-011, RF-012). Mostra os números de agora de um hospital (`GET /painel`), sem nenhum dado de paciente, e se atualiza sozinha a cada 30 segundos com a aba visível.

- **Pilha de hospitais:** um cartão por hospital, com foto genérica e véu de cor (créditos das fotos no `docs/design-system.md`, seção 2.14), e o escolhido na frente. O médico, o enfermeiro e o administrativo veem os hospitais do vínculo, e escolher um cartão troca a instituição ativa do topo. O gestor vê os hospitais credenciados da rede (`GET /api/instituicoes`), e a escolha fica só no painel. Cada cartão é um rádio: Tab chega ao marcado e as setas trocam de hospital. A ordem no DOM não muda com a escolha, só a posição na tela, para o foco não se perder.
- **Ocupação de leitos:** a taxa de ocupação e uma barra dividida por situação, com a legenda e a contagem de cada uma.
- **Aguardando triagem:** quantos e há quanto tempo espera o primeiro.
- **Fila do médico por cor:** quantos em cada cor, a maior espera, o tempo máximo da cor e quantos passaram dele.
- **Agora no hospital:** chegadas hoje, em atendimento e internados. **Leitos livres por categoria** e **transferências pendentes** (recebidas e enviadas).
- **Links:** "Abrir leitos", "Abrir triagem", "Abrir atendimentos" e "Abrir internações" aparecem só para quem pode abrir a tela.
- Na troca de hospital, os números do anterior somem até os do novo chegarem.
- **Início com vários vínculos:** sem instituição escolhida, o Início mostra a mesma pilha, mas com botões: escolher leva ao Painel, então só Enter, Espaço ou clique escolhem, e as setas não tiram a pessoa da página.


## Testes de ponta a ponta e de acessibilidade (TST-02, TST-03)

Dois scripts em `e2e/` rodam no sistema de verdade, no Chrome, contra a API no perfil `demonstracao` (recém-iniciada), a IA local e `npm run dev`. A senha dos usuários `*.demo` vem de `SIGH_SENHA_DEMONSTRACAO` ou do arquivo de ambiente local; o segundo fator é cadastrado e validado pelo próprio script.

- `node e2e/funcionais.mjs`: os 14 casos do roteiro da ERS (mesmo CPF em dois hospitais, triagem com e sem histórico, internação, transferência e alta, resumo por IA, emergência, auditoria imutável, perfis e segundo fator). Relatório em `docs/testes/tst-02-funcionais.md`.
- `node e2e/acessibilidade.mjs`: axe (WCAG 2.0/2.1 A e AA, com contraste), rolagem lateral em 390, 768, 1280 e 320 px e o percurso só com Tab em 20 telas e estados. Relatório em `docs/testes/tst-03-acessibilidade.md`.

As evidências (capturas e `resultado.json`) ficam em `docs/testes/evidencias/`. O Playwright vem do projeto ou do caminho em `PW_LIB`.
