# sigh-frontend

Front-end do SIGH (Sistema Integrado de Gestão Hospitalar): React 19, TypeScript, Vite, Tailwind 4 e lucide-react. Ele conversa com a API do [`sigh-backend`](../sigh-backend).

- **Arquitetura:** [`docs/arquitetura.md`](docs/arquitetura.md).
- **Visual e componentes:** [`docs/design-system.md`](docs/design-system.md). Os tokens e componentes partem do protótipo da equipe, com as correções de contraste e tamanho para o WCAG 2.1 AA (RNF-006). A fonte é a Plus Jakarta Sans, embutida no app, e as telas de entrada usam a foto de `src/assets/entrada.jpg` e a logo da equipe (seção 6 do design system).

## Como rodar

1. **API:** suba o `sigh-backend` com o CORS liberado para a origem do front:

   ```bash
   SIGH_CORS_ORIGENS=https://localhost:5173 ./mvnw spring-boot:run -Dspring-boot.run.profiles=demonstracao
   ```

2. **Configuração:** copie `.env.example` para `.env` e confira o `VITE_API_URL`. O perfil padrão da API usa `http://localhost:8080`; o perfil `tls`, `https://localhost:8443`.

3. **Front:**

   ```bash
   npm install
   npm run dev
   ```

**HTTPS:** rode o front em HTTPS. A API, no perfil `tls`, manda HSTS, que vale para `localhost` em qualquer porta, e depois disso um front em `http://` deixa de funcionar no navegador.
- Gere um certificado local confiável com o [mkcert](https://github.com/FiloSottile/mkcert): `mkcert -install` e depois `mkcert localhost`.
- Aponte o front para ele com `SIGH_FRONT_CERTIFICADO` e `SIGH_FRONT_CHAVE` no `.env`.
- O mesmo par pode servir à API (`SIGH_TLS_CERTIFICADO` e `SIGH_TLS_CHAVE_PRIVADA`).

Na apresentação, use `npm run build` e `npm run preview` (porta 4173), com `https://localhost:4173` incluída em `SIGH_CORS_ORIGENS`.

**Usuários de demonstração:** os do perfil `demonstracao` da API (`paciente.demo`, `enfermeiro.demo`, `medico.demo`, `administrativo.demo` e `auditor.demo`), com a senha de `SIGH_SENHA_DEMONSTRACAO`. Médico, enfermeiro e auditor cadastram o segundo fator no primeiro acesso, com um aplicativo autenticador.

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

Tela do Administrativo para receber o paciente na instituição ativa (RF-001, RF-002, RN-004).

1. **Busca pelo CPF na rede** (`POST /api/pacientes/busca`). O CPF é conferido no navegador com a mesma regra da API (dígitos verificadores, sem todos os dígitos iguais) e vai no corpo da requisição, nunca na URL. Ele não é guardado no navegador.
2. **Paciente já na rede:** a tela mostra nome e nascimento e pede só o motivo. O atendimento é aberto no prontuário que ele já tem; cadastro e consentimento não mudam aqui.
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
