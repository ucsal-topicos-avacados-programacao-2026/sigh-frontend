# Design system do front-end do SIGH (FE-02)

- **Card:** FE-02 (base do front, login com MFA, layout responsivo e acessível, menu por perfil, componentes reutilizáveis)
- **Requisitos:** RNF-006 (web responsiva, WCAG 2.1 AA, sem app nativo); validação prevista no TST-03
- **Stack:** Vite + React + TypeScript + Tailwind 4 + lucide-react
- **Referência visual:** protótipo da equipe (`app/globals.css`, `components/sigh-app.tsx`, `lib/services.ts`). Este documento herda dele cores, fonte, bordas e proporções, e corrige o que falha em acessibilidade.
- **Fonte dos dados:** endpoints reais do `sigh-backend` (`/auth/login`, `/auth/segundo-fator/cadastro`, `/auth/segundo-fator/validacao`, `/usuarios/eu`), papéis de `@PreAuthorize` e DTOs. Nada aqui depende de endpoint inexistente.

**Legenda usada no documento**

- **[Correção]**: obrigatória para WCAG 2.1 AA ou para os requisitos do card.
- **[Ajuste sugerido]**: muda o visual do protótipo para tirar elementos de aparência genérica (pílula, ícone em quadrado colorido, topbar com desfoque). Adotado no FE-02; a equipe pode reverter. A seção 5 junta os três ajustes.

---

## 1. Tokens

### 1.1 Cores

| Token | Valor | Uso |
|---|---|---|
| `--color-fundo` | `#f4f6f8` | Fundo da página (body, login) |
| `--color-superficie` | `#ffffff` | Painel, cartão, campo, topbar, diálogo |
| `--color-superficie-suave` | `#f8fafc` | Cabeçalho de tabela, hover de linha, campo somente leitura |
| `--color-superficie-desabilitada` | `#f1f5f9` | Botão e campo desabilitados, etiqueta neutra |
| `--color-borda` | `#dfe5eb` | Borda de painel, cartão e tabela (decorativa) |
| `--color-borda-divisoria` | `#eef1f5` | Linha entre cabeçalho e corpo do painel, entre linhas da tabela |
| `--color-borda-campo` | `#7b8a9c` | **[Correção]** Borda de campo e select. O protótipo usa `#dce3ec` (1,29:1) |
| `--color-texto` | `#263548` | Texto do corpo |
| `--color-texto-forte` | `#12345a` | Títulos (h1, h2, título de painel), valor de indicador |
| `--color-texto-medio` | `#475569` | Texto de botão secundário, cabeçalho de tabela, ícone de botão |
| `--color-texto-suave` | `#5b6b80` | **[Correção]** Texto secundário, ajuda, placeholder, metadados. Substitui `#94a3b8`, `#a0acba` e `#64748b` |
| `--color-link` | `#2563eb` | Link e botão de texto |
| `--color-link-hover` | `#1d4ed8` | Link no hover |
| `--color-primaria` | `#12345a` | Botão primário, toast, link "pular para o conteúdo" |
| `--color-primaria-hover` | `#1c4774` | Botão primário no hover |
| `--color-primaria-ativa` | `#0d2846` | Botão primário pressionado |
| `--color-acento` | `#14b8a6` | Só decoração: ponto da marca "SIGH.", marcador do item ativo na sidebar, faixa do cartão. **Nunca como cor de texto sobre branco** (2,49:1) |
| `--color-acento-texto` | `#0f766e` | Quando o teal precisar ser texto sobre fundo claro |
| `--color-perigo` | `#b91c1c` | Botão de perigo, borda e texto de erro |
| `--color-perigo-hover` | `#991b1b` | Botão de perigo no hover |
| `--color-foco` | `#2563eb` | Anel de foco sobre superfícies claras |
| `--color-foco-escuro` | `#5eead4` | **[Correção]** Anel de foco dentro da sidebar. O azul `#2563eb` dá 2,71:1 sobre `#102d4c` |
| `--color-lateral` | `#102d4c` | Fundo da sidebar |
| `--color-lateral-hover` | `#1b3754` | Hover do item (equivale a branco a 4,7% sobre `#102d4c`) |
| `--color-lateral-ativo` | `#223d59` | Item ativo (equivale a branco a 7,5% sobre `#102d4c`) |
| `--color-lateral-texto` | `#c2cedb` | Texto do item de menu |
| `--color-lateral-texto-forte` | `#ffffff` | Texto do item ativo e no hover, nome da marca |
| `--color-lateral-texto-suave` | `#9fb0c3` | **[Correção]** Rótulo de grupo ("VISÃO GERAL"). Substitui `#8294aa` e `#94a3b8` dentro da sidebar |
| `--color-lateral-icone-ativo` | `#55d6c3` | Ícone do item ativo |
| `--color-avatar-fundo` / `--color-avatar-texto` | `#eaf2ff` / `#1d4ed8` | Iniciais do usuário |

**Tons de estado** (alerta, etiqueta, aviso de IA). O texto do tom vale para título e etiqueta; o corpo dos alertas usa `#334155`.

| Tom | Texto | Fundo | Borda |
|---|---|---|---|
| `info` | `#1d4ed8` | `#eff6ff` | `#bfdbfe` |
| `sucesso` | `#047857` | `#ecfdf5` | `#a7f3d0` |
| `atencao` | `#b45309` | `#fffbeb` | `#fde68a` |
| `erro` | `#b91c1c` | `#fef2f2` | `#fecaca` |
| `neutro` | `#475569` | `#f1f5f9` | `#dfe5eb` |
| `ia` | `#5b21b6` | `#f5f3ff` | `#ddd6fe` |

**Tons de risco** (cores do enum `CorRisco` do back-end: VERMELHO, LARANJA, AMARELO, VERDE, AZUL). Entram agora porque a etiqueta é componente do FE-02. Quem usa é o card de triagem.

| Risco | Texto | Fundo | Observação |
|---|---|---|---|
| Vermelho | `#b91c1c` | `#fef2f2` | igual ao tom `erro` |
| Laranja | `#9a3412` | `#ffedd5` | **[Correção]** o protótipo usa `#c2410c` (4,52:1, passa por 0,02) |
| Amarelo | `#854d0e` | `#fef3c7` | **[Correção]** o protótipo usa `#a16207` (4,42:1, **reprova**) |
| Verde | `#166534` | `#dcfce7` | **[Correção]** o protótipo usa `#15803d` (4,57:1, passa por 0,07) |
| Azul | `#1d4ed8` | `#eff6ff` | igual ao tom `info` |

Fora da paleta: o violeta de status do protótipo (`status-pill violet`) só aparecia em dado de demonstração. O violeta fica reservado ao aviso de IA.

### 1.2 Razões de contraste dos pares usados

Fórmula de luminância relativa do WCAG 2.1. Os valores foram calculados, não estimados. Limites: texto 4,5:1 (1.4.3); componente de interface e foco 3:1 (1.4.11).

**Texto sobre fundo claro**

| Texto | Fundo | Razão | Resultado |
|---|---|---|---|
| `#263548` texto | `#ffffff` | 12,46:1 | passa |
| `#263548` texto | `#f4f6f8` | 11,50:1 | passa |
| `#12345a` texto-forte | `#ffffff` | 12,62:1 | passa |
| `#12345a` texto-forte | `#f4f6f8` | 11,65:1 | passa |
| `#475569` texto-medio | `#ffffff` | 7,58:1 | passa |
| `#475569` texto-medio | `#f8fafc` | 7,24:1 | passa |
| `#475569` texto-medio | `#f1f5f9` | 6,92:1 | passa |
| `#5b6b80` texto-suave | `#ffffff` | 5,44:1 | passa |
| `#5b6b80` texto-suave | `#f4f6f8` | 5,02:1 | passa |
| `#5b6b80` texto-suave | `#f8fafc` | 5,20:1 | passa |
| `#5b6b80` texto-suave | `#f1f5f9` | 4,97:1 | passa |
| `#2563eb` link | `#ffffff` | 5,17:1 | passa |
| `#2563eb` link | `#f4f6f8` | 4,77:1 | passa |
| `#1d4ed8` link-hover | `#ffffff` | 6,70:1 | passa |
| `#0f766e` acento-texto | `#ffffff` | 5,47:1 | passa |
| `#b91c1c` erro (texto do campo) | `#ffffff` | 6,47:1 | passa |
| `#1d4ed8` avatar | `#eaf2ff` | 5,95:1 | passa |

**Texto sobre fundo escuro**

| Texto | Fundo | Razão | Resultado |
|---|---|---|---|
| `#ffffff` | `#12345a` primária | 12,62:1 | passa |
| `#ffffff` | `#1c4774` primária-hover | 9,53:1 | passa |
| `#ffffff` | `#0d2846` primária-ativa | 14,90:1 | passa |
| `#ffffff` | `#b91c1c` perigo | 6,47:1 | passa |
| `#ffffff` | `#991b1b` perigo-hover | 8,31:1 | passa |
| `#ffffff` | `#102d4c` sidebar | 13,98:1 | passa |
| `#ffffff` | `#223d59` item ativo | 11,17:1 | passa |
| `#c2cedb` item de menu | `#102d4c` | 8,75:1 | passa |
| `#c2cedb` item de menu | `#1b3754` hover | 7,64:1 | passa |
| `#9fb0c3` rótulo de grupo | `#102d4c` | 6,31:1 | passa |
| `#55d6c3` ícone ativo | `#223d59` | 6,27:1 | passa |

**Estados**

| Texto | Fundo | Razão |
|---|---|---|
| `#1d4ed8` info | `#eff6ff` | 6,16:1 |
| `#047857` sucesso | `#ecfdf5` | 5,21:1 |
| `#b45309` atenção | `#fffbeb` | 4,84:1 |
| `#b91c1c` erro | `#fef2f2` | 5,91:1 |
| `#475569` neutro | `#f1f5f9` | 6,92:1 |
| `#5b21b6` IA | `#f5f3ff` | 8,19:1 |
| `#334155` corpo do alerta | `#eff6ff` / `#ecfdf5` / `#fffbeb` / `#fef2f2` / `#f5f3ff` | 9,51 / 9,83 / 9,99 / 9,47 / 9,44:1 |
| `#9a3412` risco laranja | `#ffedd5` | 6,38:1 |
| `#854d0e` risco amarelo | `#fef3c7` | 6,15:1 |
| `#166534` risco verde | `#dcfce7` | 6,49:1 |

**Componentes e foco (limite 3:1)**

| Elemento | Contra | Razão |
|---|---|---|
| `#7b8a9c` borda do campo | `#ffffff` | 3,52:1 |
| `#7b8a9c` borda do campo | `#f8fafc` | 3,37:1 |
| `#9fb0c3` borda do select na sidebar (< 640px) | `#102d4c` | 6,31:1 |
| `#2563eb` foco | `#ffffff` | 5,17:1 |
| `#2563eb` foco | `#f4f6f8` | 4,77:1 |
| `#5eead4` foco escuro | `#102d4c` | 9,45:1 |
| `#5eead4` foco escuro | `#223d59` | 7,55:1 |
| `#14b8a6` marcador do item ativo | `#102d4c` | 5,62:1 |

### 1.3 Correções de contraste em relação ao protótipo

| Onde no protótipo | Par | Razão | Troca |
|---|---|---|---|
| `.panel-subtitle`, `.data-table th`, `text-slate-400` em metadados e rodapé | `#94a3b8` / `#ffffff` | **2,56:1** | `#5b6b80` (5,44:1) |
| `.data-table th` | `#94a3b8` / `#fafbfd` | **2,48:1** | `#475569` (7,32:1) |
| `.form-control::placeholder`, `.search-input` | `#a0acba` / `#ffffff` | **2,31:1** | `#5b6b80` (5,44:1) |
| `.sidebar-label` | `#8294aa` / `#102d4c` | 4,51:1 | Passa por 0,01. Troca para `#9fb0c3` (6,31:1), porque qualquer variação de renderização reprova |
| `text-slate-500` direto no fundo da página (trilha, subtítulo do h1, texto do login) | `#64748b` / `#f4f6f8` | **4,39:1** | `#5b6b80` (5,02:1). Achado extra: `#64748b` só passa sobre branco (4,76:1) |
| `.alert-card p { opacity: .8 }` | erro / atenção / info a 80% | **4,34 / 3,30 / 4,14:1** | Tirar a opacidade. O corpo usa `#334155` (≥ 9,4:1) |
| `.risk-label.risk-yellow` | `#a16207` / `#fef3c7` | **4,42:1** | `#854d0e` (6,15:1) |
| `.nav-counter` | `#ffffff` / `#ef4444` | **3,76:1** | O contador sai (não tem dado, ver seção 4). Se voltar: fundo `#dc2626` (4,83:1) |
| `.form-control` (borda) | `#dce3ec` / `#ffffff` | **1,29:1** | `#7b8a9c` (3,52:1), critério 1.4.11 |
| `.form-control:focus` (borda `#60a5fa` + sombra `#dbeafe`) | contra `#ffffff` | **2,54 / 1,22:1** | Contorno de 2px `#2563eb` (5,17:1) |
| Foco padrão do navegador dentro da sidebar | `#2563eb` / `#102d4c` | **2,71:1** | `#5eead4` (9,45:1) |
| Teal como texto (ex.: `text-teal-500/600` em ícones com significado) | `#14b8a6` / `#ffffff` | **2,49:1** | `#0f766e` (5,47:1). O ponto de "SIGH." fica, porque logotipo é exceção do 1.4.3 |

### 1.4 Tipografia

Fonte: **Plus Jakarta Sans** (Google Fonts), embutida no app pelo pacote `@fontsource-variable/plus-jakarta-sans`, sem chamada ao Google: `"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Escolhida no lugar da Inter do protótipo, depois de comparar as opções na tela de login. Números em tabela e indicador usam `font-variant-numeric: tabular-nums`. Código e segredo usam `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`.

**[Correção]** O protótipo usa 9, 10, 11 e 12px no corpo. Regra nova: **corpo, campos, botões, tabelas e itens de menu com no mínimo 14px; 12px só em rótulo secundário** (rótulo de grupo da sidebar, etiqueta, trilha, metadado de data/modelo, perfil abaixo do nome). Nada abaixo de 12px.

| Token Tailwind | px | rem | Altura de linha | Peso | Uso |
|---|---|---|---|---|---|
| `text-rotulo` | 12 | 0.75 | 16px | 600 | Rótulos secundários. Em caixa alta só no rótulo de grupo da sidebar, com `letter-spacing: .08em` |
| `text-corpo` | 14 | 0.875 | 20px | 400/500 | Corpo, tabela, botão, campo (≥ 640px), item de menu, ajuda, erro |
| `text-destaque` | 16 | 1 | 24px | 600 | Título de painel (era 13px), nome no toast, campo em < 640px |
| `text-titulo-secao` | 20 | 1.25 | 28px | 600 | Título de diálogo, campo do código de 6 dígitos |
| `text-titulo-pagina` | 24 | 1.5 | 32px | 600 | h1 da página e do cartão de login (era 25–27px) |
| `text-indicador` | 28 | 1.75 | 36px | 600 | Valor do cartão de indicador (era 26px) |
| `text-numero-principal` | 48 | 3 | 48px | 600 | Número principal de um bloco do painel (FE-09), como a taxa de ocupação |

Campos de texto ficam com **16px abaixo de 640px**: o Safari do iOS aplica zoom ao focar campo com menos de 16px.

`letter-spacing` negativo do protótipo (`-.01em` a `-.08em`) fica só na marca "SIGH". Títulos usam `-0.01em`.

### 1.5 Espaçamento e dimensões

Base de 4px (`--spacing: 0.25rem`, o padrão do Tailwind 4). Escala usada: 4, 8, 12, 16, 20, 24, 32, 40, 48px.

| Token | Valor | Uso |
|---|---|---|
| `--spacing-controle` | 40px | Altura de botão, campo e select a partir de 1024px |
| `--spacing-alvo` | 44px | **[Correção]** Altura mínima de botão, campo, select, item de menu, botão só de ícone e controle de paginação abaixo de 1024px. O item de menu da sidebar tem 44px em qualquer largura |
| `--spacing-lateral` | 244px | Largura da sidebar |
| `--spacing-topbar` | 64px | Altura da topbar (≥ 640px) |
| `--spacing-topbar-movel` | 56px | Altura da topbar (< 640px) |
| Respiro do conteúdo | 24px × 32px (≥ 1024), 24px × 24px (640–1023), 16px × 16px (< 640) | Vertical × horizontal |
| Distância entre cartões | 16px | Grades de painéis e cartões |
| Distância entre blocos da página | 24px | Cabeçalho da página → grade → painel |
| Espaço entre alvos de toque | ≥ 8px | Botões lado a lado, paginação |

Nota sobre o alvo: no WCAG 2.1, o critério de 44px (2.5.5) é AAA, e o 2.1 AA não tem critério de tamanho de alvo. O 44px em telas abaixo de 1024px é decisão do projeto, mais exigente que o 24px do WCAG 2.2 AA (2.5.8).

### 1.6 Raios

| Token | Valor | Uso |
|---|---|---|
| `--radius-etiqueta` | 4px | Etiqueta de status e de risco **[Ajuste sugerido: era 999px]**, tecla `kbd` |
| `--radius-painel` | 6px | Painel, cartão de indicador, alerta, aviso de IA, toast, diálogo, cartão de login (como no protótipo) |
| `--radius-controle` | 8px | Botão, campo, select, item de menu (como no protótipo) |
| Círculo | 50% | Só o avatar de iniciais |

### 1.7 Sombras

| Token | Valor | Uso |
|---|---|---|
| (nenhuma) | — | Painel, cartão e tabela usam só a borda, como no protótipo (`box-shadow: none`) |
| `--shadow-botao` | `0 1px 2px rgb(18 52 90 / 0.12)` | Botão primário |
| `--shadow-sobreposto` | `0 8px 24px rgb(15 23 42 / 0.12)` | Toast, menu suspenso |
| `--shadow-dialogo` | `0 16px 48px rgb(15 23 42 / 0.18)` | Diálogo |
| Fundo do diálogo e da sidebar aberta | `rgb(15 23 42 / 0.40)` | `::backdrop` e camada atrás da sidebar |

### 1.8 Foco

- `:focus-visible { outline: 2px solid var(--color-foco); outline-offset: 2px; }` em todo elemento interativo. Nunca `outline: none` sem substituto.
- Campo e select: `outline-offset: 1px` e a borda também muda para `--color-foco`.
- Dentro da sidebar e de qualquer superfície escura: `outline-color: var(--color-foco-escuro)`, com `outline-offset: -2px` (o contorno fica dentro do item e não é cortado pelo `overflow` da navegação).
- Botão primário sobre fundo claro: o contorno azul fica a 2px do botão, sobre o fundo claro (5,17:1), então não depende do contraste com `#12345a`.
- Região rolável da tabela (`tabindex="0"`) recebe o mesmo contorno.
- `<main tabindex="-1">` e o h1 que recebe foco por programa não mostram contorno (não são controles).
- `html { scroll-padding-top: 72px; }` (64px da topbar + 8px) para o elemento focado não ficar embaixo da topbar fixa.

### 1.9 Movimento

- Transições de cor e borda: 150ms `ease`. Abertura da sidebar: `transform` 200ms `ease`.
- Proibido: `translateY` no hover (o `bed-card` do protótipo faz isso), brilho animado em esqueleto de carregamento, animação em loop.
- `@media (prefers-reduced-motion: reduce)`: transições e animações em 0,01ms. O ícone de carregamento deixa de girar e o texto do botão ("Entrando…") passa a ser o único indicador.

### 1.10 Pontos de quebra e camadas

| Ponto | Largura | O que muda |
|---|---|---|
| `sm` | 640px | Topbar ganha seletor de instituição e nome do usuário; campos voltam a 14px |
| `lg` | 1024px | Sidebar fixa; controles passam de 44px para 40px |
| `xl` | 1280px | Grades de 4 colunas de cartões |

Camadas (`z-index`): topbar 20, fundo da sidebar aberta 25, sidebar 30, toast 50, link "pular para o conteúdo" 60. O diálogo usa a camada superior nativa do `<dialog>`.

O layout precisa funcionar a 320px de largura sem rolagem horizontal da página (1.4.10). Só a tabela rola, dentro do próprio contêiner.

### 1.11 Trecho de tokens para o Tailwind 4

```css
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  /* Remove a escala padrão de tamanhos para ninguém usar text-xs/10px por engano */
  --text-*: initial;
  --text-rotulo: 0.75rem;          --text-rotulo--line-height: 1rem;
  --text-corpo: 0.875rem;          --text-corpo--line-height: 1.25rem;
  --text-destaque: 1rem;           --text-destaque--line-height: 1.5rem;
  --text-titulo-secao: 1.25rem;    --text-titulo-secao--line-height: 1.75rem;
  --text-titulo-pagina: 1.5rem;    --text-titulo-pagina--line-height: 2rem;
  --text-indicador: 1.75rem;       --text-indicador--line-height: 2.25rem;

  --color-fundo: #f4f6f8;
  --color-superficie: #ffffff;
  --color-superficie-suave: #f8fafc;
  --color-superficie-desabilitada: #f1f5f9;
  --color-borda: #dfe5eb;
  --color-borda-divisoria: #eef1f5;
  --color-borda-campo: #7b8a9c;
  --color-texto: #263548;
  --color-texto-forte: #12345a;
  --color-texto-medio: #475569;
  --color-texto-suave: #5b6b80;
  --color-link: #2563eb;
  --color-link-hover: #1d4ed8;
  --color-primaria: #12345a;
  --color-primaria-hover: #1c4774;
  --color-primaria-ativa: #0d2846;
  --color-acento: #14b8a6;
  --color-acento-texto: #0f766e;
  --color-perigo: #b91c1c;
  --color-perigo-hover: #991b1b;
  --color-foco: #2563eb;
  --color-foco-escuro: #5eead4;
  --color-lateral: #102d4c;
  --color-lateral-hover: #1b3754;
  --color-lateral-ativo: #223d59;
  --color-lateral-texto: #c2cedb;
  --color-lateral-texto-suave: #9fb0c3;
  --color-lateral-icone-ativo: #55d6c3;

  --color-info: #1d4ed8;     --color-info-fundo: #eff6ff;     --color-info-borda: #bfdbfe;
  --color-sucesso: #047857;  --color-sucesso-fundo: #ecfdf5;  --color-sucesso-borda: #a7f3d0;
  --color-atencao: #b45309;  --color-atencao-fundo: #fffbeb;  --color-atencao-borda: #fde68a;
  --color-erro: #b91c1c;     --color-erro-fundo: #fef2f2;     --color-erro-borda: #fecaca;
  --color-neutro: #475569;   --color-neutro-fundo: #f1f5f9;   --color-neutro-borda: #dfe5eb;
  --color-ia: #5b21b6;       --color-ia-fundo: #f5f3ff;       --color-ia-borda: #ddd6fe;
  --color-corpo-alerta: #334155;

  --color-risco-vermelho: #b91c1c;  --color-risco-vermelho-fundo: #fef2f2;
  --color-risco-laranja: #9a3412;   --color-risco-laranja-fundo: #ffedd5;
  --color-risco-amarelo: #854d0e;   --color-risco-amarelo-fundo: #fef3c7;
  --color-risco-verde: #166534;     --color-risco-verde-fundo: #dcfce7;
  --color-risco-azul: #1d4ed8;      --color-risco-azul-fundo: #eff6ff;

  --spacing-controle: 2.5rem;
  --spacing-alvo: 2.75rem;
  --spacing-lateral: 15.25rem;
  --spacing-topbar: 4rem;
  --spacing-topbar-movel: 3.5rem;

  --radius-etiqueta: 4px;
  --radius-painel: 6px;
  --radius-controle: 8px;

  --shadow-botao: 0 1px 2px rgb(18 52 90 / 0.12);
  --shadow-sobreposto: 0 8px 24px rgb(15 23 42 / 0.12);
  --shadow-dialogo: 0 16px 48px rgb(15 23 42 / 0.18);
}

@layer base {
  html { scroll-padding-top: 72px; }
  body { background: var(--color-fundo); color: var(--color-texto); font-family: var(--font-sans);
         font-size: var(--text-corpo); line-height: var(--text-corpo--line-height); font-feature-settings: "ss01" on; }
  :focus-visible { outline: 2px solid var(--color-foco); outline-offset: 2px; }
  .superficie-escura :focus-visible { outline-color: var(--color-foco-escuro); outline-offset: -2px; }
  main:focus, [data-foco-programatico]:focus { outline: none; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
                             transition-duration: .01ms !important; scroll-behavior: auto !important; }
  }
}
```

---

## 2. Componentes base

### 2.0 Regras que valem para todos

| Regra | Critério WCAG 2.1 |
|---|---|
| `<html lang="pt-BR">`; cada rota define `document.title` no formato "{Página} · SIGH" | 3.1.1, 2.4.2 |
| Uma h1 por página; painéis usam h2, subseções h3 | 1.3.1, 2.4.6 |
| Na troca de rota, o foco vai para o h1 (`tabindex="-1"`). Exceção: telas de login e segundo fator, onde vai para o primeiro campo | 2.4.3 |
| Ícone decorativo (ao lado de texto) recebe `aria-hidden="true"` passado explicitamente no componente do lucide-react, sem depender do padrão da versão | 1.1.1 |
| Botão só de ícone tem `aria-label` com verbo e objeto ("Fechar menu", "Próxima página"), nunca só "Fechar" quando houver mais de um na tela | 4.1.2, 2.5.3 |
| Navegação usa `<a href>` com rotas reais. O protótipo usa `<button>` com estado interno, o que quebra voltar, abrir em nova aba e `aria-current` | 2.4.4, 4.1.2 |
| Cor nunca sozinha: estado sempre tem texto (etiqueta) ou ícone com forma distinta mais texto | 1.4.1 |
| Sem bloqueio de zoom: `<meta name="viewport" content="width=device-width, initial-scale=1">` | 1.4.4 |
| Texto continua legível com espaçamento de texto aumentado (sem altura fixa em contêiner com texto) | 1.4.12 |
| Nenhuma ação muda de contexto só por digitar ou selecionar (ex.: o código de 6 dígitos não envia sozinho; trocar de instituição não navega para outra área sem aviso) | 3.2.2 |

### 2.1 Botão

**Variações:** primário, secundário, perigo, só ícone, texto (link com aparência de link).

**Anatomia:** `[ícone opcional 16px] rótulo`. Altura 40px (≥ 1024) / 44px (< 1024); `padding: 0 16px`; `gap: 8px`; `border-radius: 8px`; texto 14px peso 600. Botão de largura total nos formulários de login.

| Estado | Primário | Secundário | Perigo | Só ícone |
|---|---|---|---|---|
| Normal | fundo `#12345a`, texto `#fff`, `--shadow-botao` | fundo `#fff`, borda 1px `#dfe5eb`, texto `#334155` | fundo `#b91c1c`, texto `#fff` | 40×40 / 44×44, ícone 20px `#475569`, sem fundo |
| Hover | fundo `#1c4774` | fundo `#f8fafc`, borda `#cbd5e1` | fundo `#991b1b` | fundo `#f1f5f9`, ícone `#12345a` |
| Pressionado | fundo `#0d2846` | fundo `#f1f5f9` | fundo `#991b1b` | fundo `#e2e8f0` |
| Foco | contorno 2px `#2563eb`, afastado 2px | idem | idem | idem (na sidebar: `#5eead4`, interno) |
| Desabilitado | fundo `#f1f5f9`, texto `#5b6b80`, sem sombra, `cursor: not-allowed` | idem | idem | ícone `#5b6b80` |
| Carregando | ícone `Loader2` gira no lugar do ícone; texto muda para o gerúndio ("Entrando…"); largura mantida; `disabled` enquanto a requisição corre | idem | idem | `aria-busy="true"` e `aria-label` muda ("Carregando") |

Botão de texto: sem fundo, texto 14px 600 `#2563eb`, hover `#1d4ed8` com sublinhado, altura mínima 44px abaixo de 1024px (área clicável com `padding` vertical, não só o texto).

**Acessibilidade**

- Sempre `<button type="button">`, exceto o que envia formulário (`type="submit"`).
- Rótulo é verbo + objeto: "Acessar plataforma", "Ativar segundo fator", "Copiar segredo".
- O estado desabilitado não serve para esconder regra de negócio: se a ação não é permitida para o perfil, o botão não aparece.
- O perigo exige diálogo de confirmação (2.11) quando a ação não tem volta.
- Botão só de ícone: `aria-label` obrigatório. Se o rótulo não for óbvio para quem enxerga, mostrar dica visível no hover e no foco (não usar só `title`, que não aparece no toque nem no teclado).

### 2.2 Campo de formulário

**Anatomia (de cima para baixo):** rótulo visível → ajuda (opcional) → controle → mensagem de erro.

| Parte | Medidas |
|---|---|
| Rótulo | `<label for>`, 14px peso 500 `#334155`, 6px acima do controle. Campo opcional leva "(opcional)" no rótulo; obrigatório não leva marca (todos do FE-02 são obrigatórios) |
| Ajuda | 14px `#5b6b80`, 4px abaixo do rótulo e antes do controle |
| Controle | altura 40px / 44px (< 1024); `padding: 0 12px`; borda 1px `#7b8a9c`; raio 8px; fundo `#fff`; texto 14px (16px < 640) `#263548`; placeholder `#5b6b80`, só como exemplo, nunca no lugar do rótulo |
| Erro | 14px `#b91c1c`, ícone `AlertCircle` 16px `aria-hidden`, 6px abaixo do controle; texto começa pelo que fazer ("Digite o código de 6 dígitos.") |

| Estado | Visual |
|---|---|
| Normal | borda `#7b8a9c` |
| Hover | borda `#5b6b80` |
| Foco | borda `#2563eb` + contorno 2px `#2563eb` afastado 1px |
| Desabilitado | fundo `#f1f5f9`, borda `#dfe5eb`, texto `#5b6b80`, `cursor: not-allowed` |
| Somente leitura | fundo `#f8fafc`, borda `#dfe5eb` |
| Erro | borda `#b91c1c` (6,47:1), mensagem de erro visível; no foco a borda continua `#b91c1c` e o contorno fica `#2563eb` |
| Carregando (validação no servidor) | o botão de envio mostra o carregamento; o campo não muda |

**Acessibilidade**

- `id` único por campo; `aria-describedby` liga ajuda e erro, nesta ordem: `aria-describedby="login-ajuda login-erro"`. Só inclua o `id` do erro quando o erro existir.
- Com erro: `aria-invalid="true"`. Sem erro: atributo ausente.
- Validação no envio, não a cada tecla. Depois do primeiro envio com erro, o erro some quando o campo fica válido.
- No envio com erro, o foco vai para o primeiro campo inválido.
- Erros do servidor por campo (400 com `campos` no ProblemDetail) aparecem abaixo de cada campo. Erros gerais (401, 422, 503) aparecem num alerta acima do botão de envio (2.8).
- `autocomplete` correto: `username`, `current-password`, `one-time-code`. Login: `autocapitalize="none"` e `spellcheck="false"`.
- Senha: botão interno à direita, 40×40 / 44×44, ícone `Eye` / `EyeOff` (o protótipo usa `UserRound` e `X`, que não comunicam mostrar/ocultar), `aria-label` alterna entre "Mostrar senha" e "Ocultar senha", `aria-controls` aponta para o campo. Campo com `padding-right: 48px`.

### 2.3 Select

**Anatomia:** igual ao campo (rótulo, ajuda, controle, erro). Controle é o `<select>` nativo com `appearance: none`, `padding-right: 36px` e ícone `ChevronDown` 16px `#475569` `aria-hidden` posicionado a 12px da direita, com `pointer-events: none`.

| Estado | Visual |
|---|---|
| Normal / hover / foco / desabilitado / erro | iguais ao campo (2.2) |
| Carregando opções | `disabled`, primeira opção "Carregando…" |
| Sem opções | não renderizar o select; mostrar o texto do motivo (ex.: seletor de instituição com um só vínculo vira texto estático, ver 2.14) |

**Acessibilidade:** usar o `<select>` nativo (teclado, leitor de tela e toque funcionam sem código extra). Não substituir por lista customizada no FE-02. Sobre fundo escuro (sidebar abaixo de 640px), o controle usa fundo `#173452`, texto `#fff` e borda `#9fb0c3` (6,31:1); as `<option>` usam texto `#263548`, como no protótipo.

### 2.4 Tabela

**Anatomia:** painel (2.5) → região rolável → `<table>` com `<caption>`, `<thead>`, `<tbody>` → rodapé de paginação.

| Parte | Medidas |
|---|---|
| `<caption>` | Obrigatório. Texto = título do painel. Se o painel já mostra o mesmo título num h2, o caption fica com `sr-only` e a região usa `aria-labelledby` no h2 |
| Cabeçalho (`th scope="col"`) | fundo `#f8fafc`; texto 12px peso 600 `#475569` (7,24:1); `padding: 12px 16px`; alinhado à esquerda; números alinhados à direita |
| Célula | texto 14px `#263548`; secundário na mesma célula (ex.: CPF mascarado) 12px `#5b6b80`; `padding: 12px 16px` (12px 12px < 640); altura mínima da linha 48px; borda superior 1px `#eef1f5` |
| Hover de linha | fundo `#f8fafc` (só decoração; a linha não é clicável inteira) |
| Ação na linha | botão de texto ou só ícone com `aria-label` que cita o registro ("Abrir prontuário de Ana Souza") |
| Paginação | "Página 2 de 7" 14px `#5b6b80`; botões "Página anterior" / "Próxima página" só ícone com `aria-label`, 40×40 / 44×44, 8px entre eles; página atual com `aria-current="page"`. O back-end devolve `PagedModel` do Spring (página, tamanho, total) |

| Estado | Comportamento |
|---|---|
| Carregando | `aria-busy="true"` na tabela; 5 linhas de esqueleto de 48px com barras `#eef1f5` sem animação; texto `sr-only` com `role="status"`: "Carregando registros…". Não mostrar o esqueleto se a resposta vier em menos de 300ms |
| Vazio | uma linha com `<td colspan>` de todas as colunas: texto 14px `#5b6b80`, centralizado, `padding: 32px 16px`, explicando o motivo ("Nenhum registro encontrado para esta instituição.") |
| Erro | a tabela não aparece; no lugar, alerta de erro (2.8) com o `detail` do ProblemDetail e botão secundário "Tentar de novo" |
| Rolagem em telas pequenas | contêiner `<div role="group" aria-labelledby="{id do caption}" tabindex="0" class="overflow-x-auto">` (grupo, e não `region`, para não repetir o marco do painel de mesmo nome), que permite rolar com o teclado e recebe o contorno de foco. A página não rola na horizontal; só a região. `white-space: nowrap` só em data, CPF e etiqueta |

### 2.5 Painel

**Anatomia:** `<section aria-labelledby="{id do h2}">` → cabeçalho (título, subtítulo, ações) → corpo.

| Parte | Medidas |
|---|---|
| Contêiner | fundo `#fff`; borda 1px `#dfe5eb`; raio 6px; sem sombra; `overflow: hidden` só se não houver contorno de foco encostado na borda (senão o contorno é cortado) |
| Cabeçalho | altura mínima 64px; `padding: 16px 20px` (16px < 640); borda inferior 1px `#eef1f5`; ações à direita, com 8px entre elas; abaixo de 640px as ações descem para baixo do título |
| Título | h2, 16px peso 600 `#12345a` (era 13px) |
| Subtítulo | 14px `#5b6b80` (era 10px `#94a3b8`), 4px abaixo do título |
| Corpo | `padding: 20px` (16px < 640) |

Estados: carregando (esqueleto no corpo, `aria-busy="true"` na seção), vazio (texto explicativo 14px `#5b6b80`), erro (alerta de erro no corpo). O painel em si não tem hover nem foco.

### 2.6 Cartão de indicador

**Anatomia:** faixa superior 2px (decorativa, como no protótipo) → rótulo → valor → nota (opcional) → ícone à direita (opcional).

| Parte | Medidas |
|---|---|
| Contêiner | igual ao painel; `padding: 16px` (era 15px 16px 12px); faixa de 2px com `left/right: 12px` em `--color-borda`, `--color-info`, `--color-acento` ou `--color-sucesso` |
| Rótulo | `<dt>`, 14px peso 500 `#5b6b80` (era 12px `#64748b`) |
| Valor | `<dd>`, 28px peso 600 `#12345a`, `tabular-nums` |
| Nota | 12px `#5b6b80`, só com dado real (ex.: período consultado) |
| Ícone | **[Ajuste sugerido]** 20px, traço 1.75, na cor de texto do tom (ex.: `#1d4ed8`), **sem o quadrado colorido de fundo** (`.metric-icon` de 32px). `aria-hidden="true"` |

Grade de cartões é um `<dl>`; cada cartão é um `<div>` com `<dt>` e `<dd>`. Carregando: valor vira barra de esqueleto 28×64px, `aria-busy="true"` no `<dl>`. Erro: o valor vira "—" e a nota diz "Não foi possível carregar"; um alerta de erro acima da grade dá o detalhe. Sem hover nem foco: o cartão não é clicável. A seta de tendência e o texto "vs. mês anterior" só voltam quando houver dado de comparação no back-end.

Uso real hoje: `GET /auditoria/indicadores` (perfil Auditor/Gestor) devolve `totalAcessos` e `acessosEmergencia` por instituição para um período. O card que usar isso define a tela; o FE-02 só entrega o componente.

### 2.7 Etiqueta de status

**Anatomia:** `[ícone opcional 12px] texto`.

| Propriedade | Valor |
|---|---|
| Forma | **[Ajuste sugerido]** raio 4px (era 999px, a "pílula") |
| Medidas | `padding: 2px 8px`; altura 20px; texto 12px peso 600; `line-height: 16px`; borda 1px na cor de borda do tom |
| Tons | `info`, `sucesso`, `atencao`, `erro`, `neutro` e os cinco de risco (1.1) |
| Quebra | `white-space: nowrap`; se o texto vier do servidor e puder ser longo, `max-width` com `text-overflow: ellipsis` e o texto completo disponível em `sr-only` ou na linha |

**Acessibilidade:** o texto é o significado (cor só reforça). Etiqueta de risco escreve a cor por extenso ("Amarelo"). A etiqueta não é interativa, não recebe foco e não tem hover. Se o estado muda sem recarregar a tela, o anúncio é feito por um `role="status"` da página ("Classificação confirmada: Amarelo"), não pela etiqueta.

### 2.8 Alerta

**Anatomia:** `[ícone 20px] título + corpo + ação opcional + fechar opcional`.

| Parte | Medidas |
|---|---|
| Contêiner | `padding: 12px 16px`; raio 6px; borda 1px na cor de borda do tom; fundo do tom; `gap: 12px` entre ícone e texto |
| Ícone | `Info` (info), `CircleCheck` (sucesso), `TriangleAlert` (atenção), `CircleAlert` (erro); 20px; cor de texto do tom; `aria-hidden`. Sem quadrado de fundo |
| Título | 14px peso 600, cor de texto do tom |
| Corpo | 14px `#334155`, **sem opacidade** (no protótipo a opacidade de 80% derruba o contraste para 3,30–4,34:1) |
| Fechar | só em alerta informativo; só ícone `X`, 32×32 (44×44 < 1024), `aria-label="Fechar aviso"` |

| Tom | Quando aparece depois de uma ação | Quando já está na página ao carregar |
|---|---|---|
| Erro | `role="alert"` | sem `role` |
| Atenção | `role="alert"` | sem `role` |
| Info | `role="status"` | sem `role` |
| Sucesso | `role="status"` | sem `role` |

O alerta não move o foco, salvo quando aparece no lugar de uma tela inteira (ex.: erro ao carregar). O contêiner com `role` precisa existir no DOM antes do texto entrar, senão alguns leitores de tela não anunciam. Alerta de erro e atenção não fecham sozinhos.

### 2.9 Aviso de IA

Texto fixo do título: **"Sugestão gerada por IA — sujeita à validação profissional"**.

**Anatomia:** bloco colado acima do conteúdo gerado pela IA → ícone `Info` 20px `#5b21b6` `aria-hidden` → título fixo → corpo com o campo `aviso` devolvido pela API (quando houver) → metadado "Gerado em {geradoEm} · modelo {modeloVersao}" (campos de `ResumoHistoricoResponseDTO`).

| Parte | Medidas |
|---|---|
| Contêiner | fundo `#f5f3ff`; borda 1px `#ddd6fe`; raio 6px; `padding: 12px 16px` |
| Título | 14px peso 600 `#5b21b6` (8,19:1) |
| Corpo | 14px `#334155` (9,44:1) |
| Metadado | 12px `#5b6b80` |
| Conteúdo da IA | abaixo do aviso, dentro da mesma `<section>`; texto 14px `#263548`; nunca com o mesmo estilo de dado confirmado (sem etiqueta de sucesso, sem negrito de valor oficial) |

| Situação (back-end) | O que mostrar |
|---|---|
| `SOLICITADO` | aviso com o texto "Resumo em geração…" da API; esqueleto de 3 linhas; `role="status"` anuncia uma vez. O front consulta `GET /resumos/{id}` até sair de `SOLICITADO` (BE-25) |
| `GERADO` | aviso + texto da IA + ações do profissional (validar fica para o card da tela) |
| `VALIDADO` | aviso continua (a API continua devolvendo o aviso de IA) + etiqueta `sucesso` "Validado" |
| `FALHOU` | alerta de erro (2.8) com o texto `aviso` da API; sem conteúdo |
| Texto `null` com aviso de restrição | alerta de atenção com o texto `aviso` da API |
| Triagem com `corSugerida` e sem `corConfirmada` | aviso acima da cor sugerida, até o enfermeiro confirmar |
| 503 (IA indisponível) | alerta de erro com o `detail` do ProblemDetail |

**Acessibilidade e regras**

- O aviso não fecha nem some. Sem botão de fechar.
- `<section aria-labelledby="{id do título do aviso}">`; o bloco com o texto da IA tem `aria-describedby` apontando para o corpo do aviso, para o leitor de tela ler a ressalva junto.
- **[Ajuste sugerido]** Sem o quadrado violeta atrás do ícone (`rounded-lg bg-violet-100 p-2` no protótipo) e sem as pílulas "DEMO" e "SIMULAÇÃO IA".

### 2.10 Toast

**Anatomia:** `[ícone 16px] mensagem [fechar]`.

| Parte | Medidas |
|---|---|
| Região | `<div role="status" aria-live="polite" aria-atomic="true">` fixa, sempre no DOM, vazia quando não há toast; canto inferior direito a 24px das bordas (≥ 640); abaixo de 640px, 16px das laterais e do rodapé, largura total menos 32px |
| Toast | fundo `#12345a`; texto 14px peso 500 `#fff` (12,62:1); `padding: 12px 16px`; raio 6px; `--shadow-sobreposto`; largura máxima 400px |
| Ícone | `Check` 16px `#5eead4`, `aria-hidden` |
| Fechar | só ícone `X` 32×32 (44×44 < 1024), `aria-label="Fechar mensagem"`, contorno de foco `#5eead4` |

**Comportamento:** some em 5s; o tempo pausa com o ponteiro em cima ou com o foco dentro; até 3 empilhados, o mais novo embaixo, 8px entre eles. Só para confirmação de ação concluída ("Segredo copiado."). Erro nunca vai em toast: vai em alerta junto da ação. O toast não recebe foco ao aparecer.

### 2.11 Diálogo de confirmação

**Anatomia:** título → mensagem → ações.

| Parte | Medidas |
|---|---|
| Elemento | `<dialog>` aberto com `showModal()` (o resto da página fica inerte e o `Esc` dispara `cancel`), `role="alertdialog"`, `aria-labelledby` no título, `aria-describedby` na mensagem |
| Caixa | largura `min(100% - 32px, 440px)`; `padding: 24px`; raio 6px; fundo `#fff`; `--shadow-dialogo`; `::backdrop` `rgb(15 23 42 / .40)` |
| Título | 20px peso 600 `#12345a` |
| Mensagem | 14px `#263548`, diz o que vai acontecer e se tem volta |
| Ações | à direita, 8px entre elas, ordem no DOM: "Cancelar" (secundário) e depois a confirmação (primário ou perigo, com verbo: "Encerrar atendimento"). Abaixo de 640px empilham em largura total, na mesma ordem do DOM |

| Estado | Comportamento |
|---|---|
| Ao abrir | foco no "Cancelar" quando a ação é destrutiva; no primeiro campo quando o diálogo tem formulário |
| Tab / Shift+Tab | circula só dentro do diálogo |
| Esc | equivale a "Cancelar" |
| Clique fora | não fecha (evita cancelar sem querer) |
| Enviando | os dois botões ficam desabilitados, a confirmação mostra o carregamento, `Esc` é ignorado até a resposta |
| Erro | alerta de erro dentro do diálogo, acima das ações; o diálogo continua aberto |
| Ao fechar | foco volta para o botão que abriu o diálogo; rolagem da página volta a funcionar (travar com `overflow: hidden` no `body` enquanto aberto) |

### 2.12 Sidebar

**Anatomia:** marca → (abaixo de 640px: usuário e seletor de instituição) → `<nav aria-label="Menu principal">` com grupos → rodapé vazio.

| Parte | Medidas |
|---|---|
| Contêiner | `<div id="menu-lateral" class="superficie-escura">` (não `<aside>`: abaixo de 1024px ele vira diálogo, papel que o `aside` não aceita; o marco é o `<nav>`), largura 244px, fundo `#102d4c`, altura total |
| Marca | altura 64px (alinha com a topbar); `padding: 0 20px`; borda inferior 1px `rgb(255 255 255 / .07)`; a marca não é link no FE-02 |
| Rótulo de grupo | `<p id>` 12px peso 700, caixa alta, `letter-spacing: .08em`, `#9fb0c3`; `margin: 16px 12px 8px`. A lista do grupo é `<ul aria-labelledby="{id do rótulo}">` |
| Item | `<a href>` com altura mínima 44px; `padding: 10px 12px`; `gap: 12px`; raio 8px; texto 14px `#c2cedb`; ícone 20px traço 1.8 `aria-hidden` |
| Item hover | fundo `#1b3754`, texto `#fff` |
| Item ativo | `aria-current="page"`; fundo `#223d59`; texto `#fff` peso 600; ícone `#55d6c3`; ponto de 6px `#14b8a6` à direita, `aria-hidden` (forma e peso diferenciam o ativo, além da cor) |
| Foco | contorno 2px `#5eead4` com `outline-offset: -2px` |

**A partir de 1024px:** fixa à esquerda, sempre visível; o conteúdo tem `margin-left: 244px`.

**Abaixo de 1024px (fora da tela):**

| Momento | Comportamento |
|---|---|
| Fechada | `transform: translateX(-100%)` e `inert` (nada dentro recebe foco nem é lido) |
| Abrir | botão "Abrir menu" da topbar (`aria-expanded="false"` → `"true"`, `aria-controls="menu-lateral"`); a sidebar passa a se comportar como diálogo modal (`role="dialog"`, `aria-modal="true"`, `aria-label="Menu principal"`); camada de fundo `rgb(15 23 42 / .40)` atrás; foco vai para o botão "Fechar menu" |
| Aberta | Tab circula dentro da sidebar; rolagem da página travada |
| Fechar | botão "Fechar menu" (só ícone `X`, 44×44, no canto direito da área da marca), `Esc`, toque na camada de fundo ou escolha de um item |
| Depois de fechar | foco volta para "Abrir menu", exceto quando um item foi escolhido: aí o foco vai para o h1 da nova página |

**Menu por perfil.** Os itens vêm do `GET /usuarios/eu`: perfis do vínculo da instituição ativa (`vinculos[].perfis`) mais `PACIENTE` quando estiver em `perfis` (paciente não tem vínculo institucional). Usuário com mais de um perfil vê a união dos itens, sem repetir, na ordem abaixo. Os nomes e grupos são os do protótipo; a coluna "Perfis" segue os `@PreAuthorize` do back-end, que é quem decide de fato. Esconder o item é conveniência, não segurança.

| Grupo | Item (rótulo do protótipo) | Perfis | Base no back-end |
|---|---|---|---|
| VISÃO GERAL | Pacientes | Administrativo | `POST /api/pacientes/busca`, `/admissoes`, `/{id}/conta`, `/{id}/representantes` |
| VISÃO GERAL | Prontuários | Paciente | `GET /api/pacientes/{id}/historico`, `/gerenciados` |
| ATENDIMENTO | Triagem | Enfermeiro | `POST /triagens`, `/{id}/sugestao`, `/{id}/confirmacao`, `GET /triagens/fila` |
| ATENDIMENTO | Atendimentos | Médico, Enfermeiro | `GET /triagens/fila`, `/atendimentos/{id}/historico`; Médico também `/registros`, `/encerramento`, `/resumos` |
| ATENDIMENTO | Leitos | Administrativo | `/leitos` |
| ATENDIMENTO | Internações | Administrativo | `/internacoes`, `/solicitacoes-transferencia` |
| GESTÃO DA REDE | Consentimentos | Paciente | `/api/pacientes/me/consentimentos`, `/{id}/consentimentos`, `/restricoes`, `/autorizacoes`, `/acessos`, `GET /auditoria/meus-acessos` |
| GESTÃO DA REDE | Auditoria | Auditor/Gestor | `/auditoria/registros`, `/emergencias/pendentes`, `/analises` |
| GESTÃO DA REDE | Relatórios | Auditor/Gestor | `GET /auditoria/indicadores` |

Diferenças em relação ao `allowed` do protótipo: o Enfermeiro perde Pacientes e Prontuários; o Médico perde Pacientes, Prontuários e Internações; o Auditor perde Pacientes e Prontuários; o Administrativo deixa de ver tudo (fica com Pacientes, Leitos e Internações). Em todos os casos o back-end recusa essas rotas para esses perfis. O item "Dashboard" sai (seção 4).

Grupo sem nenhum item visível não aparece. As telas de cada item são de outros cards; no FE-02 a rota pode existir com o h1 da página e um texto "Em construção".

### 2.13 Topbar

**[Ajuste sugerido]** Fundo sólido `#ffffff`, sem transparência (`#ffffffed`) e sem `backdrop-filter: blur(12px)`.

**Anatomia e medidas:** `<header>`, `position: sticky; top: 0`, altura 64px (56px < 640), borda inferior 1px `#e9edf2`, `padding: 0 32px` (≥ 1024), `0 24px` (640–1023), `0 12px` (< 640).

| Largura | Esquerda | Direita |
|---|---|---|
| ≥ 1024 | seletor de instituição | usuário (avatar, nome, perfil) · botão "Sair" |
| 640–1023 | "Abrir menu" · seletor de instituição | usuário · "Sair" |
| < 640 | "Abrir menu" · marca | "Sair" só ícone |

| Elemento | Especificação |
|---|---|
| Abrir menu | só ícone `Menu` 20px, 44×44, `aria-label="Abrir menu"`, `aria-expanded`, `aria-controls="menu-lateral"` |
| Seletor de instituição | dados de `vinculos` do `/usuarios/eu` (já vem em ordem alfabética). **2 ou mais vínculos:** rótulo visível "Instituição ativa" 12px peso 600 `#5b6b80` à esquerda do `<select>` (2.3), select com largura entre 220 e 320px. **1 vínculo:** texto estático "Instituição ativa: {nome}", sem select. **0 vínculos (paciente):** nada. Abaixo de 640px o seletor fica no topo da sidebar |
| Troca de instituição | não navega sozinha: recalcula o menu e recarrega os dados da página. Se a página atual não existir no menu da nova instituição, vai para o primeiro item e anuncia por `role="status"`: "Instituição ativa: {nome}. Esta página não está disponível nela." Caso contrário anuncia só "Instituição ativa: {nome}". A escolha vale até o fim da sessão |
| Usuário | avatar 32px (círculo `#eaf2ff`, iniciais 12px 700 `#1d4ed8`, `aria-hidden`), nome 14px 600 `#263548` (campo `nome`), perfil 12px `#5b6b80` (rótulos do protótipo: Paciente, Enfermeiro, Médico, Administrativo, Auditor/Gestor; mais de um, separados por " · "). Não é botão no FE-02. Abaixo de 640px fica no topo da sidebar |
| Sair | botão secundário com `LogOut` 16px `aria-hidden` + texto "Sair" (≥ 640); abaixo disso só ícone, 44×44, `aria-label="Sair do SIGH"`. Descarta o token (o back-end não tem rota de logout) e leva ao login com alerta informativo "Você saiu do SIGH." |

---

### 2.14 Painel por hospital (FE-09)

Grade de blocos (`sm`: 2 colunas, `lg`: 4), cada um com o contêiner do painel (borda `--color-borda`, raio 6px, fundo branco, `padding` 16/20px) e o título em 14px peso 600 `--color-texto-medio`. Só número real da API.

- **Pilha de hospitais:** cartões de 128px de altura, raio 8px, texto branco. O fundo é uma foto genérica de hospital (`src/assets/hospitais/`, decorativa, `aria-hidden`) com um véu sólido por cima, sem gradiente: `--color-primaria`, `--color-primaria-hover`, `--color-veu-verde` (`#115e59`) ou `--color-lateral`, a 80%. Com o véu a 80%, o branco tem pelo menos 4,67:1 mesmo sobre o pixel mais claro da foto (o pior caso é o verde-azulado); sem a foto, fica a cor sólida. Foto e cor vêm da posição do hospital na lista (`aparenciaDoCartao`), para não mudarem com a escolha: a foto troca a cada cartão e a cor anda um passo a mais a cada volta das 4 fotos, então os 16 primeiros hospitais têm combinações diferentes. Quando a instituição tiver foto própria na API, ela deve substituir a genérica.
- **Fotos (Licença Unsplash, uso livre sem atribuição obrigatória; o crédito fica aqui):** `hospital-1.jpg` e `hospital-2.jpg`, de LEDC ([aYvI1HC7wM0](https://unsplash.com/photos/aYvI1HC7wM0) e [RYGYueour3Q](https://unsplash.com/photos/RYGYueour3Q)), recortadas por cima para tirar a placa com o nome do hospital; `hospital-3.jpg`, de LEDC ([JtHwupBN3to](https://unsplash.com/photos/JtHwupBN3to)); `hospital-4.jpg`, de Tasha Kostyuk ([Pk-KuizxQv8](https://unsplash.com/photos/Pk-KuizxQv8)). Nenhuma mostra pessoa nem nome de hospital legível. Os de trás aparecem 44px acima do da frente (o alvo de toque) e ficam 4% menores por nível, até 92%, para o nome não passar de 12px para menos. O texto do cartão é branco puro (com transparência, o de 12px cai abaixo de 4,5:1 no `--color-acento-texto`). No Painel, cada cartão é um `<label>` com um rádio escondido (`sr-only`) num `<fieldset>` com a legenda "Hospital do painel", e as setas trocam de hospital; o foco aparece no cartão (contorno de 2px `--color-foco`). No Início, sem instituição escolhida, os cartões são botões: escolher leva ao Painel, então a seta não pode escolher (WCAG 3.2.2). A troca anima `top` e `transform` em 500ms, e some com `prefers-reduced-motion`.
- **Barra de ocupação:** barra segmentada de 28px, partes separadas por 2px, cantos de 4px, na ordem Ocupado (`--color-info`), Livre (`--color-sucesso`), Em higienização (`--color-atencao`) e Bloqueado (`--color-neutro`), com o cinza longe do verde. A parte com 12% ou mais mostra a porcentagem em branco. A barra tem nome acessível com cada situação, a quantidade e a parte; a legenda repete os nomes e as quantidades. O cinza do bloqueado está abaixo do piso de croma de propósito (leito fora de uso) e nunca aparece sem o texto.
- **Fila por cor:** uma linha por cor com o selo de risco, a barra de 8px na cor do risco sobre o trilho `--color-superficie-desabilitada`, a quantidade e, abaixo, a maior espera, o tempo máximo e a etiqueta de erro "N acima do máximo".
- **Números:** `<dl>` com o rótulo à esquerda e o valor em 20px peso 600 à direita.

## 3. Layouts das telas do FE-02

### 3.1 Fluxo de entrada (o que o back-end devolve)

```
POST /auth/login {login, senha}
  ├─ etapa ACESSO_LIBERADO          → GET /usuarios/eu → shell, primeiro item do menu
  ├─ etapa VALIDAR_SEGUNDO_FATOR    → tela 3.3 (token pendente, vale 5 min)
  └─ etapa CADASTRAR_SEGUNDO_FATOR  → tela 3.4 (token pendente, vale 5 min)
POST /auth/segundo-fator/validacao {codigo: 6 dígitos} → token de acesso (8 h) → GET /usuarios/eu → shell
```

O segundo fator é exigido pelo back-end para Médico, Enfermeiro e Auditor/Gestor. O front não pergunta isso ao usuário: segue a `etapa`.

| Resposta | Onde aparece | Texto |
|---|---|---|
| 400 com `campos` | abaixo de cada campo | o texto de cada campo |
| 401 no login | alerta de erro acima do botão; campo de senha limpo; foco fica no botão | `detail` da API ("Login ou senha inválidos.") |
| 401 no código | erro do campo do código; campo limpo e focado | `detail` da API ("Código do segundo fator inválido.") |
| 401 por token pendente vencido | volta ao login com alerta de atenção | "O tempo para confirmar o segundo fator acabou. Entre de novo." |
| 401 dentro do shell | volta ao login com alerta informativo | "Sua sessão terminou. Entre de novo." |
| 403 em rota do shell | página Sem permissão (3.6) | — |
| 422 | alerta de atenção | `detail` da API |
| Rede ou 500 | alerta de erro | "Não foi possível falar com o servidor. Tente de novo em instantes." |

Rotas: `/entrar`, `/entrar/segundo-fator`, `/entrar/segundo-fator/cadastro`. A falta de permissão aparece no próprio endereço da tela (sem `/sem-permissao`); qualquer rota desconhecida cai em Não encontrada.

### 3.2 Login (senha)

**Estrutura:** página `#f4f6f8`, cartão centralizado na vertical e na horizontal.

| Parte | Especificação |
|---|---|
| Cartão | largura `min(100%, 480px)`; fundo `#fff`; borda 1px `#dfe5eb`; raio 6px; `padding: 32px 40px` (24px 20px < 640); margem da página 28px 16px |
| Marca | logo "S" 36px + "SIGH." 18px 700 + "Rede integrada de saúde" 12px 600 caixa alta `#5b6b80`; 32px abaixo |
| Sobretítulo | "Acesso à plataforma", 12px 600 caixa alta `#1d4ed8` (6,70:1) |
| Título | h1 "Entre na sua conta", 24px 600 `#12345a`, 8px abaixo |
| Texto | "Use suas credenciais institucionais para continuar.", 14px `#5b6b80`, 8px abaixo |
| Formulário | 32px abaixo; 20px entre campos. **Login** (rótulo "Login", sem placeholder, `autocomplete="username"`); **Senha** (com botão mostrar/ocultar, `autocomplete="current-password"`) |
| Área de alerta | entre o último campo e o botão; vazia até haver erro |
| Botão | primário largura total, 44px, "Acessar plataforma" + `ChevronRight` `aria-hidden`; carregando: "Entrando…" |
| Ajuda | 14px `#5b6b80`, 16px abaixo do botão: "Esqueceu a senha? Procure o suporte de TI da sua instituição." (texto estático: não existe rota de redefinição) |

O rótulo do protótipo "CPF ou identificação profissional" com máscara de CPF não corresponde ao back-end: o campo é `login` em texto livre (nos dados de demonstração, `medico.demo`, `paciente.demo`).

**Foco inicial:** campo Login.
**Ordem de tabulação:** Login → Senha → Mostrar senha → Acessar plataforma. Texto de ajuda e marca não recebem foco.

### 3.3 Validar segundo fator

| Parte | Especificação |
|---|---|
| Cartão e marca | iguais ao login |
| Título | h1 "Confirme o segundo fator" |
| Texto | `<p id="mfa-instrucao">` "Abra o aplicativo autenticador e digite o código de 6 dígitos do SIGH. Você tem 5 minutos para concluir esta etapa." 14px `#5b6b80` |
| Campo | rótulo "Código de 6 dígitos"; ajuda "O código muda a cada 30 segundos."; um único `<input>` (não 6 caixas), `inputmode="numeric"`, `autocomplete="one-time-code"`, `pattern="\d{6}"`, `maxlength="6"`; altura 48px, largura máxima 200px, texto 20px 600 `tabular-nums` com `letter-spacing: .25em`; `aria-describedby="mfa-instrucao mfa-ajuda"` (+ erro) |
| Envio | primário largura total "Confirmar código"; carregando "Confirmando…". Não envia sozinho ao completar 6 dígitos (3.2.2) |
| Voltar | botão de texto "Voltar ao login", 16px abaixo; descarta o token pendente |

Erro de validação local (menos de 6 dígitos ou letras): "Digite os 6 números que aparecem no aplicativo."

**Foco inicial:** campo do código (o leitor de tela lê o rótulo, a instrução e a ajuda pelo `aria-describedby`).
**Ordem de tabulação:** Código → Confirmar código → Voltar ao login.

### 3.4 Cadastrar segundo fator

Ao abrir a tela, o front chama `POST /auth/segundo-fator/cadastro` **uma vez**. Cada chamada gera um segredo novo enquanto o fator não estiver ativo, então a chamada não pode se repetir em nova renderização (atenção ao efeito duplicado do `StrictMode` em desenvolvimento). A resposta traz `uriAutenticador` (`otpauth://totp/...?secret=...&issuer=SIGH`). O QR code é gerado no navegador a partir dessa URI; o segredo em texto é o parâmetro `secret` da mesma URI.

| Parte | Especificação |
|---|---|
| Cartão | largura `min(100%, 560px)`; resto igual ao login |
| Título | h1 "Cadastre o segundo fator" |
| Passos | `<ol>` 14px `#263548`, 8px entre itens: 1. "Instale um aplicativo autenticador no celular." 2. "Leia o QR code abaixo ou digite o segredo no aplicativo." 3. "Digite o código de 6 dígitos que o aplicativo mostrar." |
| Bloco do QR | ≥ 640px: duas colunas (QR à esquerda, segredo à direita, 24px entre elas); < 640px: empilhado. QR 192×192px, fundo `#fff` com 16px de margem branca, borda 1px `#dfe5eb`, raio 6px; `<img alt="QR code para cadastrar o SIGH no aplicativo autenticador">` |
| Segredo | rótulo "Segredo para digitar no aplicativo" 14px 500; `<code>` 16px monoespaçado `#263548`, em grupos de 4 caracteres separados por espaço, `user-select: all`; botão secundário "Copiar segredo" (`Copy` `aria-hidden`) → toast "Segredo copiado." Se a cópia falhar: alerta informativo "Não foi possível copiar. Selecione o segredo e copie manualmente." |
| Aviso | 14px `#5b6b80`: "Se você sair desta tela antes de ativar, um novo QR code será gerado na próxima entrada e o atual deixará de valer." |
| Campo do código | igual a 3.3 |
| Envio | primário "Ativar segundo fator" (chama `/auth/segundo-fator/validacao`); carregando "Ativando…"; sucesso → shell |
| Voltar | botão de texto "Voltar ao login" |

| Estado | Comportamento |
|---|---|
| Carregando | lugar do QR com esqueleto 192×192 `#eef1f5`; segredo com barra de esqueleto; `role="status"` "Gerando o QR code…"; campo do código e envio desabilitados |
| 422 "O segundo fator já foi cadastrado." | alerta de atenção com o texto + botão primário "Ir para a confirmação do código" (tela 3.3) |
| Erro de rede | alerta de erro + botão secundário "Tentar de novo" |

O segredo nunca vai para log, armazenamento do navegador ou URL.

**Foco inicial:** h1 (a tela começa com instruções que precisam ser lidas antes do campo).
**Ordem de tabulação:** Copiar segredo → Código → Ativar segundo fator → Voltar ao login.

### 3.5 Shell autenticado

```
≥ 1024px
┌──────────────┬───────────────────────────────────────────────────────────┐
│ SIGH.        │ [Instituição ativa ▾]          (CN) Nome · Perfil  [Sair]  │ 64px
│              ├───────────────────────────────────────────────────────────┤
│ VISÃO GERAL  │ Trilha 12px                                               │
│ ▸ Item ativo │ h1 24px                                                   │
│   Item       │ subtítulo 14px                        [ações da página]   │
│ ATENDIMENTO  │                                                           │
│   Item       │ [painéis / tabelas / cartões]                             │
│   244px      │ respiro 24px × 32px                                       │
└──────────────┴───────────────────────────────────────────────────────────┘

< 640px
┌──────────────────────────────────┐
│ [≡]  SIGH.                  [⎋]  │ 56px
├──────────────────────────────────┤
│ h1, subtítulo, ações empilhadas  │ respiro 16px
│ painéis em uma coluna            │
└──────────────────────────────────┘
```

| Parte | Especificação |
|---|---|
| Link "pular para o conteúdo" | primeiro elemento do `<body>`; texto "Pular para o conteúdo"; escondido até receber foco; ao focar aparece no canto superior esquerdo (8px, 8px), fundo `#12345a`, texto 14px 600 `#fff`, `padding: 12px 16px`, raio 8px, `z-index: 60`; leva a `<main id="conteudo" tabindex="-1">` e move o foco para ele |
| Ordem no DOM | link de pular → `<div id="menu-lateral">` → `<div>` com `<header>` (topbar) e `<main id="conteudo">` |
| Cabeçalho da página | trilha 12px `#5b6b80` (grupo do menu › página, texto sem link); h1 24px 600 `#12345a`; subtítulo 14px `#5b6b80`; ações à direita, abaixo do título quando < 640px; 24px até o conteúdo |
| Conteúdo | grades com 16px entre cartões, 24px entre blocos |
| Rodapé | não há no FE-02 (o do protótipo só tinha texto de demonstração, ver seção 4) |
| Região de toast | no fim do `<body>`, sempre presente (2.10) |
| Carregamento inicial | enquanto `/usuarios/eu` não responde, sidebar e topbar aparecem sem itens e sem usuário, e o conteúdo mostra `role="status"` "Carregando…". Se falhar com 401, vai para o login (3.1) |

**Ordem de tabulação, a partir de 1024px:** Pular para o conteúdo → itens do menu (de cima para baixo) → seletor de instituição → Sair → conteúdo da página (ações do cabeçalho, depois painéis na ordem visual).

**De 640 a 1023px:** Pular para o conteúdo → Abrir menu → seletor de instituição → Sair → conteúdo. A sidebar fechada é `inert` e fica fora da ordem.

**Abaixo de 640px:** Pular para o conteúdo → Abrir menu → Sair → conteúdo. Com a sidebar aberta: Fechar menu → seletor de instituição → itens do menu → (volta a Fechar menu).

### 3.6 Sem permissão

Dentro do shell (o usuário está autenticado; o menu continua disponível).

| Parte | Especificação |
|---|---|
| Bloco | painel centralizado, largura máxima 560px, `padding: 32px`, alinhado à esquerda |
| Código | "Erro 403", 12px 600 `#5b6b80` |
| Título | h1 "Você não tem permissão para acessar esta página" 24px 600 `#12345a` |
| Texto | 14px `#263548`: "Seu perfil na instituição ativa ({nome da instituição}) não dá acesso a esta área. Se você precisa dela, fale com a administração da instituição." Para paciente (sem instituição), a frase termina em "Seu perfil não dá acesso a esta área." |
| Ação | botão primário "Ir para o início" (primeiro item do menu do perfil) |
| Título da aba | "Sem permissão · SIGH" |

**Foco inicial:** h1. **Ordem de tabulação:** (link de pular, menu e topbar como em 3.5) → Ir para o início.

### 3.7 Página não encontrada

| Situação | Layout |
|---|---|
| Usuário autenticado | dentro do shell, mesmo bloco de 3.6 |
| Sem sessão | cartão do login (3.2), sem formulário |

| Parte | Especificação |
|---|---|
| Código | "Erro 404", 12px 600 `#5b6b80` |
| Título | h1 "Página não encontrada" |
| Texto | 14px `#263548`: "O endereço pode estar errado ou a página foi removida." |
| Ação | autenticado: primário "Ir para o início"; sem sessão: primário "Ir para o login" |
| Título da aba | "Página não encontrada · SIGH" |

**Foco inicial:** h1. **Ordem de tabulação:** (shell, se autenticado) → Ir para o início / Ir para o login.

---

## 4. O que não portar do protótipo (sem dado real no back-end)

| Item do protótipo | Onde está | Motivo | No lugar |
|---|---|---|---|
| Item de menu "Dashboard" e as cinco variações de painel inicial por perfil | `navigation`, `Dashboard`, `*Overview` | Todos os números e listas são fixos no código | Rota inicial = primeiro item do menu do perfil. Desde o FE-09, o primeiro item do médico, do enfermeiro, do administrativo e do gestor é o Painel, com números reais de `GET /painel` (seção 2.14) |
| Cartões de indicador com valores (24.892 pacientes, 148 atendimentos, 98,6% de conformidade, "18 min" de espera etc.) e a tendência "vs. mês anterior" | `Dashboard` (`metrics`), `Leitos`, `Auditoria` | Valores inventados; não existe comparação mensal no back-end | Só o componente (2.6). O único indicador real é `GET /auditoria/indicadores` (total de acessos e acessos emergenciais por instituição), para o card do Auditor |
| Gráficos "Ocupação de leitos", "Leitos por categoria" (428 leitos totais), "Acessos por período" e a dependência `recharts` | `occupancy`, `riskDistribution`, `AuditOverview` | Séries fixas no código | Nada no FE-02 |
| Feed "Atividades recentes" e o botão "Mais atividades" | `ActivityList` | Eventos fixos; não há endpoint de feed | Nada |
| Sino, ponto vermelho e painel de notificações | topbar (`showNotifications`) | Não há endpoint de notificação | Nada |
| Botões "Últimos 7 dias" e "Últimos 30 dias" | cabeçalho do Dashboard e das páginas | Não filtram nada (só disparam toast) | Filtro de período só quando a tela usar um endpoint com período (ex.: `/auditoria/indicadores`), no card dessa tela |
| Contador "12" no item Triagem | `nav-counter` | Número fixo | Nada |
| Etiqueta "Rede operacional" | topbar | Estado inventado | Nada |
| Busca global "Buscar pacientes, prontuários..." com atalho ⌘K | topbar | Não há busca global; `POST /api/pacientes/busca` é só do Administrativo e fica na tela Pacientes | Nada na topbar |
| Botão "Configurações" | topbar | Não há tela nem endpoint | Nada |
| Seletor "Entrar como perfil de demonstração" | login | O perfil vem do token | Nada |
| Caixa "Autenticação multifator" | login | O back-end decide pela `etapa` | Telas 3.3 e 3.4 |
| Seletor de instituição no login (lista fixa de 4 hospitais) | login | O login recebe só `login` e `senha`; as instituições vêm de `/usuarios/eu` | Seletor da topbar (2.13) |
| "Esqueci minha senha" com `alert()` | login | Não há rota de redefinição | Texto estático (3.2) |
| Painel de marca do login (`login-brand-panel`) | login | Já está `display: none` em todas as larguras; é código morto | Nada |
| Nomes e saudações fixos ("Bom dia, Camila", "Olá, Mariana") e iniciais fixas | `roleMeta`, sidebar, topbar | Dado inventado | `nome` de `/usuarios/eu` |
| Nota "Ambiente protegido · Conexão segura · LGPD" | rodapé da sidebar | Afirmação que só vale com o perfil `tls` ligado; não é dado | Nada |
| Rodapé "DEMONSTRAÇÃO ACADÊMICA · Dados fictícios · Controle de acesso definitivo deve ser validado pela API Java" e "© 2025" | `footer`, login | Texto de protótipo; a última frase é nota para a equipe | Nada. Se o grupo quiser identificar o ambiente de demonstração (`application-demonstracao`), é decisão da equipe |
| `demoPatients`, `demoAudit`, `demoBeds` | `lib/services.ts` | Dados fictícios | Chamadas reais |
| `apiRequest` com a mensagem "API REST ainda não configurada" e `process.env.NEXT_PUBLIC_API_URL` | `lib/services.ts` | Específico do Next e do modo de demonstração; os caminhos (`/patients`, `/records`...) não batem com os do back-end (`/api/pacientes`, `/triagens`...) | Cliente HTTP do FE-02 com `import.meta.env.VITE_*` e os caminhos reais |
| `@vercel/analytics`, `next/*`, `"use client"` | `layout.tsx`, `sigh-app.tsx` | Fora do stack decidido | Nada |
| `@import 'tw-animate-css'`, `@import 'shadcn/tailwind.css'`, `components/ui/button.tsx`, variante `.dark` | `globals.css` | Fora do stack decidido (Vite + React + TS + Tailwind 4 + lucide-react); não há requisito de tema escuro | Tokens da seção 1 |
| Pílulas "DEMO", "SIMULAÇÃO IA", "Demonstração" | Triagem, sugestão de IA | Marcam simulação | Aviso de IA (2.9) |
| Paginação "Exibindo 3 de 1.284 registros" | Auditoria | Total inventado | Paginação real com `PagedModel` (2.4) |

Fora do escopo do FE-02 (não é para remover, é para outros cards portarem com dado real): mapa de leitos, formulário de triagem, abas do prontuário, linha do tempo clínica, tela de consentimentos e tabela de auditoria.

---

## 5. Ajustes adotados (revertíveis)

Os três ajustes tiram elementos de aparência genérica sem trocar cor, fonte, borda nem proporção do protótipo.

| # | Vício no protótipo | Ajuste mínimo proposto | Onde |
|---|---|---|---|
| A1 | Pílula: `.status-pill` e `.risk-label` com `border-radius: 999px` (mais a pílula "Rede operacional" e as de "DEMO") | Etiqueta com raio 4px, `padding: 2px 8px`, borda 1px no tom | 2.7 |
| A2 | Ícone em quadradinho colorido: `.metric-icon` (32px com fundo tingido), `.activity-icon` (31px) e o quadrado violeta do bloco de IA | Ícone de 20px solto, na cor de texto do tom, sem fundo | 2.6, 2.8, 2.9 |
| A3 | Topbar com `background: #ffffffed` e `backdrop-filter: blur(12px)` | Topbar sólida `#ffffff` com borda inferior 1px `#e9edf2` | 2.13 |

Se a equipe recusar algum ajuste, as correções de acessibilidade continuam valendo: o texto da etiqueta continua em 12px com as cores da seção 1.1, e o ícone no quadrado continua com `aria-hidden`.

---

## 6. Revisão visual das telas de entrada e da marca (aprovada)

Estas decisões valem sobre as seções 3.2 a 3.4, 2.12 e 1.4 onde forem diferentes.

| Item | Decisão |
|---|---|
| Fonte | Plus Jakarta Sans (Google Fonts), embutida no app pelo `@fontsource-variable/plus-jakarta-sans`. O navegador não chama o Google |
| Marca | Logo da equipe em azul: coração e "sigh" recortados da arte original (`src/assets/logo-sigh.png`), com "Rede de hospitais" como texto em `--color-info` (6,7:1). Onde o espaço é pequeno (menu lateral, barra do celular), vai só o coração (`src/assets/logo-coracao.png`) com "SIGH" em texto. Ícone da aba e de atalho: o coração (`public/favicon.png`, `public/apple-touch-icon.png`) |
| Entrada a partir de 1024px | Tela dividida: foto à esquerda com véu azul (`--color-entrada-veu` a 45% e degradê até 95% embaixo, para o texto branco), e o formulário à direita, em fundo branco, com largura máxima de 400px (520px no cadastro do segundo fator). O lado da foto é um `<aside aria-label="Apresentação do SIGH">` com a frase "Cuidar melhor começa por conhecer quem chega." e o texto de apoio |
| Entrada abaixo de 1024px | A mesma foto com o véu vira o fundo da tela, e o formulário fica num cartão branco por cima (raio 6px, `--shadow-dialogo`), que garante o contraste dos campos e do texto |
| Foto | `src/assets/entrada.jpg`, decorativa (`alt=""`). Sem o arquivo, o lado da foto fica com o painel azul. A foto precisa ter licença de uso |
| Botão das telas de entrada | Variante `entrada`: arredondado (`rounded-full`), fundo `--color-entrada` `#2f6c9c` (5,61:1 com o texto branco), hover `#235f8c`. O azul da referência visual, `#4a86b0`, dava 3,94:1 e não passa no WCAG AA |
| Título do login | "Entre na sua conta", sem o sobretítulo "Acesso à plataforma" |
