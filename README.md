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
