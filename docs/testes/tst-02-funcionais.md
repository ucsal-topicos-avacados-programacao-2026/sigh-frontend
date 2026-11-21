# TST-02 · Testes funcionais de ponta a ponta

Roteiro baseado nas "formas de verificação" dos objetivos da Unidade 1 (ERS, cap. 3.2), executado no sistema de verdade: o site (`npm run dev`) falando com a API no perfil `demonstracao`, com a IA local e dados fictícios. Cada caso foi feito pela tela, como a pessoa faria; o que a tela não mostra (quantos prontuários existem, se a auditoria aceita alteração) foi conferido direto no banco ou na API.

**Resultado:** 14 de 14 casos passaram na rodada final, em 21/11/2026, já com as correções do TST-05.

## Como rodar

1. Suba a API de demonstração (o banco é recriado a cada partida), a IA local (Ollama com `qwen3:8b`) e o front com `npm run dev`.
2. `node e2e/funcionais.mjs` (usa o Playwright do projeto ou o de `PW_LIB`). A senha dos usuários `*.demo` vem de `SIGH_SENHA_DEMONSTRACAO` ou do arquivo de ambiente local, nunca do repositório.
3. O segundo fator é cadastrado e validado pelo próprio script, que gera o código de 6 dígitos a partir do segredo que a tela de cadastro mostra, como um aplicativo autenticador.
4. O resultado vai para `docs/testes/evidencias/tst-02/` (capturas e `resultado.json`). Para rodar de novo, reinicie a API: os autenticadores cadastrados na rodada anterior deixam de existir.

**Ambiente:** macOS 26.6.2, Google Chrome 158, API e banco PostgreSQL 17 locais, IA `qwen3:8b` no Ollama, uma máquina só.

## Resultado

| Caso | Requisito | O que foi testado | Resultado | Evidência |
|---|---|---|---|---|
| CT-01 | RF-001, RN-004 | Mesmo CPF em duas instituições usa o mesmo prontuário | Passou | [1-cadastro-no-publico](evidencias/tst-02/CT-01-1-cadastro-no-publico.jpg), [2-atendimento-aberto-no-publico](evidencias/tst-02/CT-01-2-atendimento-aberto-no-publico.jpg), [3-ja-cadastrado-no-universitario](evidencias/tst-02/CT-01-3-ja-cadastrado-no-universitario.jpg) |
| CT-02 | RF-003, RN-001, RN-008 | Triagem sem histórico só vale com a confirmação do enfermeiro | Passou | [1-sugestao-da-ia](evidencias/tst-02/CT-02-1-sugestao-da-ia.jpg), [2-falta-confirmar](evidencias/tst-02/CT-02-2-falta-confirmar.jpg), [3-na-fila](evidencias/tst-02/CT-02-3-na-fila.jpg) |
| CT-03 | RF-003, RN-005 | Prioridade segue o risco confirmado, sem rebaixar quem não tem histórico | Passou | [1-fila-por-prioridade](evidencias/tst-02/CT-03-1-fila-por-prioridade.jpg) |
| CT-04 | RF-002, RF-003, RF-009 | Triagem com histórico usa só os dados autorizados | Passou | [1-historico-com-restricao](evidencias/tst-02/CT-04-1-historico-com-restricao.jpg) |
| CT-05 | RF-005, RF-006 | Internação só oferece leito livre e o leito passa a ocupado | Passou | [1-escolha-de-leito](evidencias/tst-02/CT-05-1-escolha-de-leito.jpg), [2-leito-ocupado](evidencias/tst-02/CT-05-2-leito-ocupado.jpg) |
| CT-06 | RF-005, RF-006 | Transferência para outro leito do mesmo hospital | Passou | [1-transferencia-interna](evidencias/tst-02/CT-06-1-transferencia-interna.jpg), [2-leitos-depois](evidencias/tst-02/CT-06-2-leitos-depois.jpg) |
| CT-07 | RF-006 | Transferência para outro hospital da rede, com aceite do destino | Passou | [1-pedido-com-vagas-do-destino](evidencias/tst-02/CT-07-1-pedido-com-vagas-do-destino.jpg), [2-aceite-no-destino](evidencias/tst-02/CT-07-2-aceite-no-destino.jpg), [3-internado-no-destino](evidencias/tst-02/CT-07-3-internado-no-destino.jpg) |
| CT-08 | RF-006, RF-007 | Alta com o resumo de internação anexado | Passou | [1-resumo-de-alta-registrado](evidencias/tst-02/CT-08-1-resumo-de-alta-registrado.jpg), [2-alta-com-resumo](evidencias/tst-02/CT-08-2-alta-com-resumo.jpg), [3-leito-livre-de-novo](evidencias/tst-02/CT-08-3-leito-livre-de-novo.jpg) |
| CT-09 | RF-004, RN-008, RF-009 | Resumo por IA confere com o prontuário e não revela o restrito | Passou | [1-resumo-por-ia](evidencias/tst-02/CT-09-1-resumo-por-ia.jpg) |
| CT-10 | RF-010, RN-003 | Acesso de emergência só com justificativa e fica identificado | Passou | [1-emergencia-com-restrito-marcado](evidencias/tst-02/CT-10-1-emergencia-com-restrito-marcado.jpg) |
| CT-11 | RF-008, RF-011 | Os acessos ficam registrados e disponíveis para o paciente e o auditor | Passou | [1-quem-acessou](evidencias/tst-02/CT-11-1-quem-acessou.jpg), [2-fila-de-emergencias](evidencias/tst-02/CT-11-2-fila-de-emergencias.jpg), [3-registro-de-acessos](evidencias/tst-02/CT-11-3-registro-de-acessos.jpg) |
| CT-12 | RF-008, RN-006 | Registro de auditoria não pode ser alterado nem excluído | Passou | — |
| CT-13 | RF-012 | Cada perfil vê e faz só o que é dele | Passou | [1-medico-sem-permissao](evidencias/tst-02/CT-13-1-medico-sem-permissao.jpg) |
| CT-14 | RNF-005, RF-012 | Médico, enfermeiro e auditor só entram depois do segundo fator | Passou | [1-codigo-pedido](evidencias/tst-02/CT-14-1-codigo-pedido.jpg) |


## Achados e correções (TST-05)

| Achado | Caso | Correção |
|---|---|---|
| O resumo da IA aparecia com os asteriscos do Markdown ("\*\*Diagnósticos anteriores\*\*") e hifens no lugar de títulos e listas | CT-09 | FE-10, PR #11: o texto da IA aparece formatado, sem interpretar HTML vindo dela. O CT-09 passou a conferir que não sobra asterisco |
| Um perfil sem permissão recebia 400 (requisição inválida) em vez de 403 quando a requisição vinha incompleta; a paciente pedindo a auditoria sem o período, por exemplo. Afetava 126 combinações de rota e perfil | CT-13 | BE-28, sigh-backend PR #31: o perfil é conferido antes de a requisição ser lida. O CT-13 passou a conferir o 403 sem o período |

Durante a escrita do roteiro, os ajustes foram do próprio script, não do sistema. A revisão de QA do roteiro também apertou cinco conferências: o CT-12 passou a exigir a mensagem do gatilho de imutabilidade (antes, UPDATE e TRUNCATE falhavam por outro motivo e o caso passava sem provar a proteção), o CT-02 passou a exigir a sugestão da IA, o CT-03 a exigir Amarelos e Verdes na fila, o CT-04 a conferir no banco as fontes que a IA usou, e o CT-11 a esperar a fila terminar de carregar.

## O que cada caso conferiu

### CT-01 · Mesmo CPF em duas instituições usa o mesmo prontuário

**Esperado:** No 2º hospital, a busca acha o paciente já cadastrado e o atendimento é aberto no prontuário existente, sem cadastro duplicado.

**Observado:**
- Há 1 cadastro com o CPF (banco: 1).
- Os 2 atendimentos (Público e Universitário) estão no mesmo prontuário (banco: 1 prontuário, 2 atendimentos).
- No Universitário a tela mostrou "Paciente já cadastrado na rede" com nome e nascimento, e pediu só o motivo.

### CT-02 · Triagem sem histórico só vale com a confirmação do enfermeiro

**Esperado:** A IA sugere a cor (identificada como sugestão). Fechando sem confirmar, o paciente continua aguardando triagem; só depois da confirmação ele entra na fila.

**Observado:**
- A IA devolveu a sugestão de cor, identificada como "Sugestão gerada por IA — sujeita à validação profissional".
- Sem confirmação, o paciente fica em "Aguardando triagem", marcado "Falta confirmar", e não entra na fila.
- Depois de confirmar Laranja, o paciente aparece na fila de atendimento.

### CT-03 · Prioridade segue o risco confirmado, sem rebaixar quem não tem histórico

**Esperado:** O paciente sem histórico, confirmado como Laranja, fica na fila acima dos Amarelos e Verdes, que chegaram antes dele.

**Observado:**
- A fila tem pacientes Amarelos e Verdes para comparar.
- Na fila, o paciente sem histórico (Laranja) está na posição 2, acima do 1º Amarelo (3) e do 1º Verde (4).

### CT-04 · Triagem com histórico usa só os dados autorizados

**Esperado:** O histórico que o enfermeiro vê traz os registros da paciente, avisa que há informação restrita e não mostra o registro restrito.

**Observado:**
- O histórico mostra a alergia a dipirona registrada antes.
- O histórico avisa que há informações restritas pelo paciente.
- O registro restrito (episódio depressivo) não aparece.
- A sugestão da IA usou 4 registro(s) do histórico (Alergias, Clínica geral, Clínica geral, Medicamentos).
- O registro restrito não está entre as fontes que a IA usou na triagem (banco).
- A triagem da paciente com histórico foi confirmada como Laranja e ela entrou na fila.

### CT-05 · Internação só oferece leito livre e o leito passa a ocupado

**Esperado:** A escolha de leito mostra só os livres; depois de internar, o leito escolhido fica ocupado.

**Observado:**
- A lista de leitos mostra só os livres do hospital (ENF-101,ENF-103,UTI-102).
- O leito ENF-103 passou de livre para ocupado.

### CT-06 · Transferência para outro leito do mesmo hospital

**Esperado:** O paciente vai para o leito escolhido, que fica ocupado; o leito anterior vai para higienização.

**Observado:**
- O leito de destino UTI-102 ficou ocupado.
- O leito anterior ENF-103 foi para "Em higienização".

### CT-07 · Transferência para outro hospital da rede, com aceite do destino

**Esperado:** A origem pede e vê as vagas do destino; o destino aceita escolhendo um leito livre; o paciente continua no mesmo prontuário e o leito da origem vai para higienização.

**Observado:**
- O destino escolhe entre os leitos livres da categoria pedida (ENF-302).
- O paciente continua com um único prontuário depois da transferência.
- O leito da origem (UTI-102) foi para "Em higienização".

### CT-08 · Alta com o resumo de internação anexado

**Esperado:** O médico registra o resumo de alta; o administrativo do hospital onde o paciente está dá a alta com esse resumo; o leito vai para higienização e depois volta a livre.

**Observado:**
- O paciente saiu da lista de internados.
- O leito ENF-302 foi para "Em higienização" com a alta.
- Concluída a higienização, o leito ENF-302 voltou a livre.
- A internação ficou com a data de alta e o resumo anexado (banco).

### CT-09 · Resumo por IA confere com o prontuário e não revela o restrito

**Esperado:** O resumo aparece como sugestão da IA, traz a alergia e o medicamento registrados e não menciona o registro restrito.

**Observado:**
- O resumo traz a alergia a dipirona.
- O resumo traz o medicamento registrado (salbutamol).
- O resumo traz o diagnóstico de asma.
- O resumo não menciona o registro restrito (episódio depressivo).
- O resumo aparece formatado, sem asteriscos de Markdown (FE-10).
- Trecho do resumo: "Resumo do histórico por IA Um apoio para a leitura. O prontuário original está logo abaixo, sempre. Sugestão gerada por IA — sujeita à validação profissional Resumo gerado por IA, sujeito à validação profissional. Os registros originais continuam disponíveis. Gerado em 21/11/2026 às 05:27 · modelo q…"

### CT-10 · Acesso de emergência só com justificativa e fica identificado

**Esperado:** Sem justificativa suficiente a emergência é recusada; com justificativa, o registro restrito aparece marcado.

**Observado:**
- Com justificativa curta, a emergência é recusada e a tela explica o tamanho mínimo.
- Depois da justificativa, o registro restrito aparece, marcado como restrito.

### CT-11 · Os acessos ficam registrados e disponíveis para o paciente e o auditor

**Esperado:** A paciente vê quem consultou o prontuário, com a emergência marcada; o auditor vê os acessos e analisa a emergência, que sai da fila.

**Observado:**
- A paciente vê o acesso do enfermeiro (consulta ao histórico na triagem).
- A paciente vê os acessos do médico.
- O acesso de emergência aparece marcado para a paciente.
- Com a análise registrada, a emergência saiu da fila do auditor.
- O registro de acessos do auditor lista os acessos feitos no teste.

### CT-12 · Registro de auditoria não pode ser alterado nem excluído

**Esperado:** Nenhuma tela oferece editar ou excluir; no banco, UPDATE, DELETE e TRUNCATE na auditoria são recusados.

**Observado:**
- A tela de auditoria não tem nenhum botão de editar, excluir ou apagar.
- "UPDATE" na auditoria foi recusado pelo gatilho de imutabilidade ("Registros de auditoria não podem ser alterados nem excluídos.").
- "DELETE" na auditoria foi recusado pelo gatilho de imutabilidade ("Registros de auditoria não podem ser alterados nem excluídos.").
- "TRUNCATE" na auditoria foi recusado pelo gatilho de imutabilidade ("Registros de auditoria não podem ser alterados nem excluídos.").
- A auditoria continua com os mesmos 7 registros.

### CT-13 · Cada perfil vê e faz só o que é dele

**Esperado:** O menu de cada um dos cinco perfis mostra só as telas dele; abrir a tela de outro perfil mostra "sem permissão", e a API recusa com 403.

**Observado:**
- Menu do paciente: Meu prontuário, Consentimentos.
- Menu do enfermeiro: Painel, Triagem, Atendimentos.
- Menu do médico: Painel, Atendimentos.
- Menu do administrativo: Painel, Pacientes, Leitos, Internações.
- Menu do auditor: Painel, Auditoria, Relatórios.
- O médico, ao abrir /leitos, vê "Você não tem permissão para acessar esta página".
- A API recusa o médico cadastrando leito (HTTP 403).
- A API recusa a paciente lendo o registro de acessos da auditoria (HTTP 403).
- Mesmo sem o período (requisição incompleta), a paciente recebe 403, e não 400 (BE-28; HTTP 403).
- A API recusa o enfermeiro na fila de um hospital onde ele não tem vínculo (HTTP 403).

### CT-14 · Médico, enfermeiro e auditor só entram depois do segundo fator

**Esperado:** Depois da senha, o token pendente não abre nada; código errado é recusado; com o código certo o acesso é liberado. Administrativo e paciente não pedem código.

**Observado:**
- medico.demo: depois da senha, a API pede o segundo fator.
- medico.demo: com o token pendente, a área protegida é recusada (HTTP 403).
- medico.demo: código errado recusado (HTTP 401).
- medico.demo: com o código certo, o acesso é liberado.
- medico.demo: com o token final, a área protegida responde (HTTP 200).
- enfermeiro.demo: depois da senha, a API pede o segundo fator.
- enfermeiro.demo: com o token pendente, a área protegida é recusada (HTTP 403).
- enfermeiro.demo: código errado recusado (HTTP 401).
- enfermeiro.demo: com o código certo, o acesso é liberado.
- enfermeiro.demo: com o token final, a área protegida responde (HTTP 200).
- auditor.demo: depois da senha, a API pede o segundo fator.
- auditor.demo: com o token pendente, a área protegida é recusada (HTTP 403).
- auditor.demo: código errado recusado (HTTP 401).
- auditor.demo: com o código certo, o acesso é liberado.
- auditor.demo: com o token final, a área protegida responde (HTTP 200).
- administrativo.demo: entra só com a senha, como prevê o RNF-005.
- paciente.demo: entra só com a senha, como prevê o RNF-005.
- Na tela, sem o código, tentar abrir /atendimentos volta para a entrada.

## Limites

- Os testes conferem o fluxo do sistema. Eles não comprovam a adequação clínica das sugestões e dos resumos da IA (a ERS diz isso no RF-003); essa validação foi feita no TST-06, com profissional de saúde.
- O resumo por IA foi comparado com um prontuário conhecido (Ana Souza Exemplo): alergia, medicamento e diagnóstico presentes, registro restrito ausente. Outro modelo ou outra rodada podem escrever diferente; o caso confere fatos, não o texto exato.
- Os dados são os da demonstração mais o paciente criado pelo próprio teste, com CPF novo a cada rodada. Como um CPF válido sorteado pode ser o de alguém, ele fica coberto em todas as capturas.
