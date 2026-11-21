# TST-03 · Acessibilidade (WCAG 2.1 AA) e responsividade

Avaliação das telas reais, no Chrome, em três tamanhos (celular, tablet e computador) e também a 320 px de largura, que é o reflow do WCAG 1.4.10 (equivale a abrir a tela de 1280 px com zoom de 400%). Combina ferramenta automática com conferências que a ferramenta não faz sozinha.

**Resultado:** na rodada final, em 21/11/2026, as 20 telas e estados avaliados ficaram sem violações do axe nos três tamanhos, sem rolagem lateral (nem a 320 px) e com foco visível em todas as 210 paradas de Tab. O QR e o segredo da tela de cadastro do segundo fator ficam cobertos nas capturas. A primeira rodada achou três problemas, corrigidos no TST-05 (abaixo).

## O que foi conferido em cada tela

- **axe-core 4.14** com as regras WCAG 2.0 e 2.1, níveis A e AA, inclusive **contraste de cor**, que nos testes de unidade fica desligado porque o jsdom não calcula cor. Aqui o navegador calcula. A exceção é texto sobre foto (o painel da tela de entrada e os cartões dos hospitais): o axe não mede contraste sobre imagem e devolve esses pontos como "incompleto". Eles foram calculados à mão no FE-02 e no FE-09, considerando o pixel mais claro da foto atrás do véu, e passam de 4,5:1.
- **Rolagem lateral:** a página não pode ficar mais larga que a tela, o que indicaria conteúdo cortado. Medido em 390, 768, 1280 e 320 px.
- **Só teclado (computador):** a partir do topo, Tab até o foco dar a volta. Cada parada precisa ter foco visível, ocupar espaço na tela e não estar em área inerte; o foco não pode ficar preso. Foco visível quer dizer que o contorno ou a sombra mudam quando o elemento recebe o foco: o estilo de cada elemento é gravado antes, então botões e cartões que têm sombra o tempo todo não passam por isso. Conferi que a regra pega o problema: tirando o estilo de foco da tela de entrada, as 4 paradas dela são acusadas. Nos diálogos, o foco fica dentro do diálogo, como deve.
- **Telas e estados:** entrada (normal, senha errada e cadastro do segundo fator), página não encontrada, início com dois vínculos, painel (administrativo e gestor), pacientes (paciente encontrado e cadastro novo), leitos, internações (lista e diálogo de internar), triagem (lista e diálogo), atendimentos, atendimento do paciente, auditoria, relatórios, meu prontuário e consentimentos.

## Como rodar

Com a API de demonstração recém-iniciada, a IA local e `npm run dev`: `node e2e/acessibilidade.mjs`. As capturas de página inteira de cada tela e tamanho, e o `resultado.json` com as violações e as paradas de Tab, vão para `docs/testes/evidencias/tst-03/`.

**Ambiente:** macOS 26.6.2, Google Chrome 158, axe-core 4.14.1.

## Resultado da rodada final

| Tela | Celular (390 px) | Tablet (768 px) | Computador (1280 px) | 320 px (reflow) | Teclado (computador) |
|---|---|---|---|---|---|
| Entrada | [sem violações](evidencias/tst-03/entrada-celular.jpg) | [sem violações](evidencias/tst-03/entrada-tablet.jpg) | [sem violações](evidencias/tst-03/entrada-computador.jpg) | cabe na tela | 4 paradas, foco visível em todas |
| Entrada com erro de senha | [sem violações](evidencias/tst-03/entrada-com-erro-de-senha-celular.jpg) | [sem violações](evidencias/tst-03/entrada-com-erro-de-senha-tablet.jpg) | [sem violações](evidencias/tst-03/entrada-com-erro-de-senha-computador.jpg) | cabe na tela | 4 paradas, foco visível em todas |
| Segundo fator: cadastro | [sem violações](evidencias/tst-03/segundo-fator-cadastro-celular.jpg) | [sem violações](evidencias/tst-03/segundo-fator-cadastro-tablet.jpg) | [sem violações](evidencias/tst-03/segundo-fator-cadastro-computador.jpg) | cabe na tela | 4 paradas, foco visível em todas |
| Página não encontrada | [sem violações](evidencias/tst-03/pagina-nao-encontrada-celular.jpg) | [sem violações](evidencias/tst-03/pagina-nao-encontrada-tablet.jpg) | [sem violações](evidencias/tst-03/pagina-nao-encontrada-computador.jpg) | cabe na tela | 2 paradas, foco visível em todas |
| Início com dois vínculos | [sem violações](evidencias/tst-03/inicio-com-dois-vinculos-celular.jpg) | [sem violações](evidencias/tst-03/inicio-com-dois-vinculos-tablet.jpg) | [sem violações](evidencias/tst-03/inicio-com-dois-vinculos-computador.jpg) | cabe na tela | 5 paradas, foco visível em todas |
| Painel | [sem violações](evidencias/tst-03/painel-celular.jpg) | [sem violações](evidencias/tst-03/painel-tablet.jpg) | [sem violações](evidencias/tst-03/painel-computador.jpg) | cabe na tela | 11 paradas, foco visível em todas |
| Pacientes · paciente encontrado | [sem violações](evidencias/tst-03/pacientes-paciente-encontrado-celular.jpg) | [sem violações](evidencias/tst-03/pacientes-paciente-encontrado-tablet.jpg) | [sem violações](evidencias/tst-03/pacientes-paciente-encontrado-computador.jpg) | cabe na tela | 11 paradas, foco visível em todas |
| Pacientes · cadastro novo | [sem violações](evidencias/tst-03/pacientes-cadastro-novo-celular.jpg) | [sem violações](evidencias/tst-03/pacientes-cadastro-novo-tablet.jpg) | [sem violações](evidencias/tst-03/pacientes-cadastro-novo-computador.jpg) | cabe na tela | 14 paradas, foco visível em todas |
| Leitos | [sem violações](evidencias/tst-03/leitos-celular.jpg) | [sem violações](evidencias/tst-03/leitos-tablet.jpg) | [sem violações](evidencias/tst-03/leitos-computador.jpg) | cabe na tela | 19 paradas, foco visível em todas |
| Internações | [sem violações](evidencias/tst-03/internacoes-celular.jpg) | [sem violações](evidencias/tst-03/internacoes-tablet.jpg) | [sem violações](evidencias/tst-03/internacoes-computador.jpg) | cabe na tela | 22 paradas, foco visível em todas |
| Internações · diálogo de internar | [sem violações](evidencias/tst-03/internacoes-dialogo-de-internar-celular.jpg) | [sem violações](evidencias/tst-03/internacoes-dialogo-de-internar-tablet.jpg) | [sem violações](evidencias/tst-03/internacoes-dialogo-de-internar-computador.jpg) | cabe na tela | 4 paradas, foco visível em todas |
| Triagem | [sem violações](evidencias/tst-03/triagem-celular.jpg) | [sem violações](evidencias/tst-03/triagem-tablet.jpg) | [sem violações](evidencias/tst-03/triagem-computador.jpg) | cabe na tela | 19 paradas, foco visível em todas |
| Triagem · diálogo de triagem | [sem violações](evidencias/tst-03/triagem-dialogo-de-triagem-celular.jpg) | [sem violações](evidencias/tst-03/triagem-dialogo-de-triagem-tablet.jpg) | [sem violações](evidencias/tst-03/triagem-dialogo-de-triagem-computador.jpg) | cabe na tela | 9 paradas, foco visível em todas |
| Atendimentos | [sem violações](evidencias/tst-03/atendimentos-celular.jpg) | [sem violações](evidencias/tst-03/atendimentos-tablet.jpg) | [sem violações](evidencias/tst-03/atendimentos-computador.jpg) | cabe na tela | 14 paradas, foco visível em todas |
| Atendimento do paciente | [sem violações](evidencias/tst-03/atendimento-do-paciente-celular.jpg) | [sem violações](evidencias/tst-03/atendimento-do-paciente-tablet.jpg) | [sem violações](evidencias/tst-03/atendimento-do-paciente-computador.jpg) | cabe na tela | 13 paradas, foco visível em todas |
| Painel do gestor | [sem violações](evidencias/tst-03/painel-do-gestor-celular.jpg) | [sem violações](evidencias/tst-03/painel-do-gestor-tablet.jpg) | [sem violações](evidencias/tst-03/painel-do-gestor-computador.jpg) | cabe na tela | 7 paradas, foco visível em todas |
| Auditoria | [sem violações](evidencias/tst-03/auditoria-celular.jpg) | [sem violações](evidencias/tst-03/auditoria-tablet.jpg) | [sem violações](evidencias/tst-03/auditoria-computador.jpg) | cabe na tela | 15 paradas, foco visível em todas |
| Relatórios | [sem violações](evidencias/tst-03/relatorios-celular.jpg) | [sem violações](evidencias/tst-03/relatorios-tablet.jpg) | [sem violações](evidencias/tst-03/relatorios-computador.jpg) | cabe na tela | 11 paradas, foco visível em todas |
| Meu prontuário | [sem violações](evidencias/tst-03/meu-prontuario-celular.jpg) | [sem violações](evidencias/tst-03/meu-prontuario-tablet.jpg) | [sem violações](evidencias/tst-03/meu-prontuario-computador.jpg) | cabe na tela | 10 paradas, foco visível em todas |
| Consentimentos | [sem violações](evidencias/tst-03/consentimentos-celular.jpg) | [sem violações](evidencias/tst-03/consentimentos-tablet.jpg) | [sem violações](evidencias/tst-03/consentimentos-computador.jpg) | cabe na tela | 12 paradas, foco visível em todas |

## Achados da primeira rodada e correções (TST-05)

| Achado | Onde | Critério | Correção |
|---|---|---|---|
| "Cancelar pedido" era lido como "Cancelar o pedido de" seguido do nome do paciente: o nome acessível não começava pelo texto visível, e quem usa comando de voz falando "Cancelar pedido" não acionava o botão. Na revisão, achei o mesmo em "Continuar triagem" | Internações (pedidos enviados) e Triagem | 2.5.3 Rótulo no nome (A) | FE-12, PR #13. Um teste de unidade passou a conferir isso nas duas listas |
| A 320 px, a tabela "Quem acessou" alargava a página uns 10 px, cortando a borda do painel e criando rolagem lateral | Meu prontuário | 1.4.10 Reflow (AA) | FE-11, PR #12 |

O mesmo roteiro também levou ao FE-10 e ao BE-28, que saíram do TST-02.

## Falso alarme conferido

Nos campos de data, a última parada do Tab é o botão do calendário, que fica dentro do campo. O script não consegue ler o contorno dele pelo estilo do campo; olhando a tela, o Chrome desenha o contorno azul de foco nele. O script passou a contar essa parada como visível.

## O que ficou de fora (verificação manual)

**Leitor de tela:** o axe confere nomes, papéis e rótulos que o leitor de tela usa, e todos passaram. A escuta real com o VoiceOver é manual e não foi feita nesta rodada. Roteiro sugerido, cerca de 10 minutos (Cmd+F5 liga e desliga o VoiceOver no Mac):

1. Entrada: o leitor anuncia "Login", "Senha" e o botão "Acessar plataforma"; com senha errada, lê o alerta.
2. Painel: os cartões dos hospitais são lidos como botões de opção de "Hospital do painel", com o marcado; as setas trocam de hospital.
3. Triagem: abrir o diálogo, ouvir "Sugestão gerada por IA" e as opções de classificação de risco.
4. Internações: os botões dizem a ação e o paciente ("Internar Ana Souza Exemplo").
5. Meu prontuário: a tabela "Quem acessou" é lida com os cabeçalhos das colunas.

**Tablet e celular de verdade:** os tamanhos foram simulados no Chrome do computador. Toque e teclado virtual não foram testados num aparelho.
