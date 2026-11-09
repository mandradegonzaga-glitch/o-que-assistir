# O Que Assistir - Documentação de Funcionalidades

**Última atualização:** 2026-10-28
**Versão:** 2.8 (segurança, acessibilidade e reaproveitamentos — feature SEDD 008)

---

## Checklist de Funcionalidades

Use este documento para verificar se todas as funcionalidades estão funcionando após cada atualização.

---

## 1. AUTENTICAÇÃO

### 1.1 Tela de Login
- [ ] Exibe overlay de login ao carregar (se não logado)
- [ ] Abas "Entrar" e "Criar Conta" funcionam
- [ ] Campos de email e senha
- [ ] Botão "Entrar" faz login
- [ ] Mensagens de erro aparecem (email/senha incorretos)

### 1.2 Recuperação de Senha (Esqueci minha senha)
- [ ] Link "Esqueceu sua senha?" visível na tela de login
- [ ] Ao clicar, valida se email foi preenchido
- [ ] Confirmação antes de enviar email
- [ ] Envia email de recuperação via Supabase
- [ ] Toast de sucesso/erro apropriado
- [ ] Proteção contra rate limit (muitas tentativas)

### 1.3 Tela de Registro
- [ ] Campo de username
- [ ] Campo de email (validação de formato)
- [ ] Campo de senha (mínimo 6 caracteres)
- [ ] Campo de confirmar senha
- [ ] Indicador de força da senha (fraca/média/forte)
- [ ] Botão "Criar Conta" registra no Supabase
- [ ] Mensagens de erro (usuário existe, senhas não coincidem, etc.)

### 1.4 Login como Convidado
- [ ] Botão "Entrar como Convidado" funciona
- [ ] Convidado não salva dados no Supabase
- [ ] Convidado pode navegar e sortear filmes
- [ ] Exibe "Convidado" no header

### 1.5 Logout
- [ ] Botão de sair visível quando logado
- [ ] Confirmação "Deseja realmente sair?"
- [ ] Limpa sessão do Supabase (se não for convidado)
- [ ] Volta para tela de login
- [ ] Limpa formulários

### 1.6 Persistência de Sessão
- [ ] Ao recarregar, mantém usuário logado
- [ ] Carrega dados do Supabase automaticamente

---

## 2. SELEÇÃO DE TIPO DE CONTEÚDO

### 2.1 Cards de Tipo
- [ ] Card "Filme" selecionável
- [ ] Card "Série" selecionável
- [ ] Card "Dorama" selecionável
- [ ] Visual indica qual está selecionado
- [ ] Salva preferência no localStorage

### 2.2 Comportamento por Tipo
- [ ] Filme: busca em `/movie`
- [ ] Série: busca em `/tv`
- [ ] Dorama: busca em `/tv` com filtro de país (Coreia) e sem animação

### 2.3 Temas Dinâmicos por Tipo
- [ ] Filme: tema vermelho (#e50914)
- [ ] Série: tema amarelo/dourado (#f59e0b)
- [ ] Dorama: tema rosa (#ec4899)
- [ ] Cores mudam em toda a interface ao trocar tipo
- [ ] Transições suaves entre temas

---

## 3. FILTROS DE BUSCA

### 3.1 Filtro de Gênero
- [ ] Dropdown com lista de gêneros
- [ ] Emojis indicadores por gênero (🎬 Ação, 😂 Comédia, etc.)
- [ ] Opção "Todos os gêneros"
- [ ] Aplica filtro na busca

### 3.2 Filtro de Streaming
- [ ] Dropdown com plataformas e emojis identificadores
- [ ] 🔴 Netflix, 🏰 Disney+, 📦 Prime Video, 🟦 HBO Max, etc.
- [ ] Opção "📺 Onde: Todos"
- [ ] Filtra por disponibilidade no Brasil

### 3.3 Filtro de Ator/Diretor
- [ ] Campo de busca com autocomplete
- [ ] Sugestões aparecem ao digitar (mínimo 3 caracteres)
- [ ] Foto e nome da pessoa nas sugestões
- [ ] Ao selecionar, mostra tag com nome
- [ ] Botão X para limpar seleção
- [ ] Aplica filtro `with_people` na busca

### 3.4 Filtro de Duração
- [ ] Opções com emojis: ⏱️ Qualquer, ⚡ Rapidinho, 🎬 Padrão, 🎞️ Longo
- [ ] Rapidinho (<90m), Padrão (90-120m), Longo (>120m)
- [ ] Aplica filtro de runtime

### 3.5 Filtro "Parecido com..."
- [ ] Campo de texto para digitar título
- [ ] Se preenchido (>2 chars), busca recomendações/similares
- [ ] Ignora outros filtros quando ativo
- [ ] Mostra toast indicando o título encontrado
- [ ] Texto de ajuda abaixo do campo

### 3.6 Filtro de Ano
- [ ] Campo "De (ano)"
- [ ] Campo "Até (ano)"
- [ ] Aplica filtro de data de lançamento
- [ ] Máximo = ano atual (não fixo)
- [ ] Só "De" preenchido vai até o fim do ano atual
- [ ] Texto de ajuda abaixo dos campos; teclado numérico no celular

---

## 4. AÇÕES PRINCIPAIS

### 4.1 Sortear Filme
- [ ] Botão "✨ Sortear Agora"
- [ ] Mostra "⏳ Buscando..." enquanto carrega
- [ ] Aplica todos os filtros selecionados
- [ ] Sorteia aleatório entre resultados
- [ ] Abre modal com detalhes
- [ ] Se campo "Parecido com..." preenchido, busca similares

### 4.2 Ver Top 10
- [ ] Botão "🔥 Ver Top 10"
- [ ] Mostra skeleton loader enquanto carrega
- [ ] Exibe grid com 10 resultados mais populares
- [ ] Filtra por gênero selecionado
- [ ] Filtra por streaming selecionado
- [ ] Filtra por período de anos
- [ ] Cada item mostra posição (1º, 2º, etc.)
- [ ] Clicável para abrir detalhes

### 4.3 Busca Direta
- [ ] Campo de busca específica
- [ ] Busca ao pressionar Enter ou clicar botão
- [ ] Mínimo 2 caracteres
- [ ] Salva histórico de buscas
- [ ] Exibe resultados em grid

### 4.4 Histórico de Sorteios
- [ ] Armazena últimos 50 sorteios
- [ ] Persistente (Supabase para logados, localStorage para convidados)
- [ ] Navegação ⏪ ⏩ no modal de resultado
- [ ] Indicador de posição (ex: "3/10")
- [ ] Botão "⏪ Histórico" na tela principal com contador
- [ ] Modal com grid de thumbnails clicáveis
- [ ] Opção de limpar histórico

### 4.5 Lista "Não Tenho Interesse" (Blacklist)
- [ ] Botão "🚫 Ignorar" no modal de resultado
- [ ] Filmes ignorados nunca aparecem em sorteios
- [ ] Persistente (Supabase para logados, localStorage para convidados)
- [ ] Visualizar lista no perfil
- [ ] Remover itens individuais da blacklist
- [ ] Opção de limpar toda a blacklist

---

## 5. MODAL DE DETALHES

### 5.1 Informações Exibidas
- [ ] Título do filme/série
- [ ] Poster/backdrop
- [ ] Sinopse
- [ ] Nota (⭐ X.X)
- [ ] Ano de lançamento

### 5.2 Elenco
- [ ] Lista de atores principais (até 8)
- [ ] Foto de cada ator
- [ ] Nome do ator
- [ ] Se falhar: "Não foi possível carregar o elenco." (não mostra o elenco do título anterior)

### 5.3 Trailer
- [ ] Player do YouTube embutido
- [ ] Busca trailer em PT-BR primeiro
- [ ] Fallback para EN-US
- [ ] Esconde área se não houver trailer

### 5.4 Streaming
- [ ] Logos das plataformas disponíveis no Brasil
- [ ] Link para assistir (JustWatch)
- [ ] Mensagem se indisponível
- [ ] Se falhar: "Não foi possível verificar onde assistir."

### 5.4.1 Crítica externa
- [ ] Botão "Ver no IMDb" (oculto se o título não tiver IMDb ID; séries via external_ids)
- [ ] Botão "Ver no Rotten Tomatoes" (busca pelo título original)

### 5.5 Ações do Modal
- [ ] Botão "✅ Já Vi" - marca como assistido
- [ ] Botão "⭐ Salvar" - adiciona à watchlist
- [ ] Botão "🎰 Adicionar à Roleta"
- [ ] Botão "Gerar ingresso": baixa só a imagem do ingresso
- [ ] Botão "Compartilhar": abre as opções (outros apps, WhatsApp, amigos do app)
- [ ] Fechar modal (X ou clique fora)
- [ ] Tecla ESC fecha modal
- [ ] Ao abrir, foco vai para o modal; Tab/Shift+Tab ficam presos dentro
- [ ] Ao fechar, foco volta ao elemento que abriu

---

## 6. BIBLIOTECA DO USUÁRIO

### 6.1 Abas
- [ ] Aba "⭐ Quero Assistir" (watchlist)
- [ ] Aba "✅ Já Assistidos" (histórico)
- [ ] Visual indica aba ativa
- [ ] Salva última aba no localStorage

### 6.2 Watchlist
- [ ] Lista itens salvos do Supabase
- [ ] Separação por tipo (Filmes / Séries)
- [ ] Contagem de itens
- [ ] Poster clicável (abre detalhes)
- [ ] Botão X para remover
- [ ] Estado vazio com mensagem e CTA

### 6.3 Histórico (Já Assistidos)
- [ ] Lista do Supabase (user.history)
- [ ] Separação por tipo
- [ ] Contagem de itens
- [ ] Poster clicável
- [ ] Botão X para remover
- [ ] Estado vazio com mensagem

---

## 7. ROLETA PERSONALIZADA

### 7.1 Modo Roleta
- [ ] Aba "🎰 Roleta" no topo
- [ ] Alterna entre Descobrir e Roleta

### 7.2 Adicionar Itens
- [ ] Campo de texto para adicionar manualmente
- [ ] Botão "+" para adicionar
- [ ] Adicionar do modal (botão "🎰 Adicionar à Roleta")

### 7.3 Lista de Itens
- [ ] Exibe tags com nomes
- [ ] Botão X para remover cada item
- [ ] Botão "Limpar Tudo"

### 7.4 Roleta Visual
- [ ] Canvas com fatias coloridas
- [ ] Nomes nas fatias
- [ ] Indicador no topo

### 7.5 Girar Roleta
- [ ] Botão "🎰 Girar Roleta!"
- [ ] Mínimo 2 itens para girar
- [ ] Animação de rotação (4 segundos)
- [ ] Resultado aleatório
- [ ] Toast com vencedor
- [ ] Efeito de confetti
- [ ] Incrementa contador de vitórias (Supabase)

---

## 8. PERFIL DO USUÁRIO

### 8.1 Abrir Perfil
- [ ] Clique no avatar/nome no header
- [ ] Abre modal de perfil

### 8.2 Dados do Perfil
- [ ] Avatar com inicial do nome
- [ ] Campo nome editável
- [ ] Campo email editável
- [ ] Estatísticas (total assistidos, vitórias roleta)

### 8.3 Badges/Conquistas
- [ ] Lista de badges possíveis
- [ ] Visual diferente para desbloqueados/bloqueados
- [ ] Badges:
  - [ ] Iniciante (1 assistido)
  - [ ] Cinéfilo (10 assistidos)
  - [ ] Crítico (50 assistidos)
  - [ ] Maratonista (5 séries)
  - [ ] Rei do Terror (3 terror)
  - [ ] Comediante (3 comédia)
  - [ ] Romântico (3 romance)
  - [ ] Sci-Fi Nerd (3 ficção científica)
  - [ ] Adrenalina (3 ação)
  - [ ] Apostador (5 vitórias roleta)
  - [ ] Old School (filme antes de 2000)
  - [ ] Madrugador (marcou algo como visto entre 0h e 4h59)
  - [ ] Social: Turma (1 amigo), Popular (5 amigos), Indicador (1 indicação), Curador (10 indicações), Bilheteiro (compartilhou um ingresso), Par Perfeito (primeiro match)
  - [ ] O leitor de tela diz se cada conquista está desbloqueada ou bloqueada
  - [ ] Bloqueada com meta maior que 1 mostra quanto falta ("4 de 10") e uma barrinha; desbloqueadas e as de meta 1 não mostram contagem

### 8.4 Salvar Perfil
- [ ] Botão "💾 Salvar"
- [ ] Atualiza no Supabase
- [ ] Toast de confirmação
- [ ] Atualiza header

### 8.5 Alterar Senha
- [ ] Campo "Nova senha" (mínimo 6 caracteres)
- [ ] Campo "Confirmar nova senha"
- [ ] Botão "🔒 Alterar Senha"
- [ ] Validação: senhas coincidem
- [ ] Validação: mínimo 6 caracteres
- [ ] Atualiza no Supabase Auth
- [ ] Toast de confirmação
- [ ] Limpa campos após sucesso
- [ ] Bloqueado para convidados

### 8.6 Deletar Conta
- [ ] Seção "Zona de Perigo" (colapsável)
- [ ] Aviso sobre ação irreversível
- [ ] Botão "🗑️ Deletar Minha Conta"
- [ ] Confirmação dupla (2 confirms)
- [ ] Deleta dados do Supabase:
  - [ ] user_badges
  - [ ] user_preferences
  - [ ] watchlist
  - [ ] watch_history
  - [ ] profiles
- [ ] Faz logout automático
- [ ] Volta para tela de login
- [ ] Toast de confirmação
- [ ] Bloqueado para convidados

---

## 9. NAVEGAÇÃO E UX

### 9.1 Modos de Visualização
- [ ] Aba "Descobrir"
- [ ] Aba "Roleta"
- [ ] Salva preferência

### 9.2 Responsividade
- [ ] Layout mobile funcional
- [ ] Cards adaptáveis
- [ ] Modal responsivo
- [ ] Gestos de swipe para fechar modal
- [ ] Nada sob o notch/barra de gestos; alvos de toque com 44px; ✕ da biblioteca visível no toque
- [ ] Controles de episódios em 2 colunas no celular; textos longos não estouram a tela
- [ ] Série: temporadas e episódios aparecem com conta e como convidado (convidado salva no aparelho e tem Em Andamento); "Já Vi" sempre ativo, marca todas as temporadas, abre o "Como foi?" e tira de Quero Assistir e Em Andamento; "Vi até aqui" em cada episódio marca ele e os anteriores (também de temporadas passadas); desmarcar a série esconde o "Como foi?"
- [ ] Link com filtros e `titulo=` restaura a tela e abre o título (convidado: depois de entrar)
- [ ] Banner de instalação nunca cobre o FECHAR
- [ ] Convidado: lista, vistos, roleta e episódios continuam depois de recarregar; ao criar conta, o app oferece trazer tudo (episódios inclusive)
- [ ] Perfil mostra sequência, recorde, nível, XP e 26 conquistas em 4 categorias (Jornada, Gêneros, Hábitos, Social)
- [ ] Filtros em pílulas (clima, gênero com Natal, logos de onde assistir, duração), "Mais filtros" com contador e seção recolhível com resumo
- [ ] Busca, Top 10 e Lançamentos no alto do Início; a lista aberta fecha pela mesma pílula ou por "Fechar"
- [ ] Sorteio em baralho de ingressos: embaralha, vira no sorteado e vibra no celular
- [ ] Gavetas no celular: janelas sobem de baixo e fecham puxando a alça para baixo
- [ ] Filme, Série e Dorama em 3 pílulas numa fileira, a escolhida na cor do tipo
- [ ] Acabamento: animações mais rápidas, botões que afundam ao encostar (sem a onda), hover que não prende no celular, toque sem atraso e título comprido sem cortar palavra
- [ ] Celular: barra embaixo com Início, Roleta, Sortear (no meio, sorteia de qualquer tela), Match e Biblioteca; Biblioteca em tela própria
- [ ] "Continue assistindo" no alto do Início, com o próximo episódio e o progresso; "Ver tudo" abre Em Andamento
- [ ] Indicações do dia (no fim do Início; Filme, Série e Dorama, trocam à meia-noite; com 5+ títulos assistidos, pelos gêneros que a pessoa mais assiste, com "Porque você curte X"; com menos, iguais para todos) num painel com botão no canto inferior direito; abre sozinho só na primeira entrada do dia, nunca sobre login, boas-vindas ou link; bolinha quando há novas; Esc fecha; tocar abre o título
- [ ] Desafio do dia (muda à meia-noite, nunca repete o de ontem, +25 XP) e meta da semana (assistir 3 títulos de segunda a domingo, +50 XP) no perfil; o desafio aparece no aviso ao entrar
- [ ] Perfil: "Seu DNA" com os gêneros que mais assiste em % (top 5 com barra + Outros sem barra e com os nomes, somando 100), filmes/séries/doramas, década favorita e títulos nos últimos 6 meses; sem títulos, convida a marcar; com poucos, avisa que está se formando
- [ ] Perfil, no DNA: horas assistidas (aprox.) e ator mais visto (em 2+ títulos); reabrir não busca de novo no TMDB; sem conexão mostra "—"; sair da conta apaga os detalhes guardados
- [ ] Match: duas pessoas votam nos mesmos títulos; só aparece o que coincidiu; swipe, botões e setas funcionam
- [ ] Amigos (botão ao lado do perfil): convidar por link, adicionar por usuário exato, aceitar, recusar; contador de pedidos na aba
- [ ] Perfil do amigo: assistidos, lista, conquistas e o que os dois querem ver; só entre amigos aceitos
- [ ] Enviar Match para amigo; convites aparecem na aba Match
- [ ] Match por link: votar, enviar por link ou email; quem abre vota sem conta, vê o resultado e pode devolvê-lo
- [ ] Match ao vivo: cada um no seu celular, ao mesmo tempo; entrar por link `?ao-vivo=CÓDIGO`, pelo código digitado ou pelo convite de amigo; cada um vê até onde o outro chegou; votos só são trocados quando os dois terminam; terceira pessoa não entra
- [ ] Match ao vivo: recarregar a página no meio volta ao mesmo cartão, e o outro vê "voltou!"
- [ ] "Seus matches" na tela do Match: partidas com match, com quem e quando; abrir título, salvar todos em Quero Assistir, apagar com desfazer
- [ ] Avisos de Amigos: pedido, aceite, indicação e convite de Match viram aviso no app e no contador; opção "Avisar neste aparelho" (notificação do sistema com o app em segundo plano)
- [ ] Ingresso tem QR code que abre o título pela câmera
- [ ] Ingresso novo: imagem grande no topo, Tipo · Ano · Nota · Duração (ou Temporadas); sem imagem de paisagem mostra o pôster inteiro; sem pôster, cena do episódio, fotos do elenco ou ícone do tipo
- [ ] "Compartilhar": no celular envia ingresso, texto e link juntos; no computador baixa o ingresso e copia o texto com o link
- [ ] "Sortear outro" aparece em título sorteado e não repete os últimos sorteios
- [ ] Modal abre na hora; seções mostram "Carregando..." e falham separadamente
- [ ] Filtro de clima: envia gêneros diferentes para filme e série; escolher gênero limpa o clima e vice-versa
- [ ] Minhas plataformas (perfil): marcar filtra os sorteios; continua após recarregar; desmarcar tudo tira a opção
- [ ] Conquista nova mostra o bilhete; vencedor da roleta em destaque; perfil mostra "n de 12 conquistas"

### 9.3 Acessibilidade
- [ ] Labels ARIA
- [ ] Zoom com pinça liberado (sem `user-scalable=no`)
- [ ] Modais com `role="dialog"` e fundo inerte
- [ ] Todos os controles clicáveis são `<button>` (perfil, abas, cards, biblioteca, roleta)
- [ ] Setas/Home/End nas abas e no seletor de tipo (Filme/Série/Dorama)
- [ ] Botões só com ícone têm nome para leitor de tela (‹ › do histórico, × do banner, ✕ dos ignorados, logos de streaming)
- [ ] Campos do perfil e de troca de senha com `<label>` visível (clicar no rótulo foca o campo)
- [ ] Ícones SVG decorativos ocultos do leitor de tela; título da tela de login anunciado
- [ ] Contraste mínimo 4.5:1 em todos os textos nos 3 temas (Série/Dorama com texto escuro sobre o accent)
- [ ] Foco por teclado sempre visível (outline 2px), sem o elemento mudar de forma
- [ ] Login e boas-vindas prendem o foco (Tab não sai da tela); Esc fecha só as boas-vindas
- [ ] Imagens não "pulam" ao carregar; pessoas sem foto mostram a silhueta local (sem serviço externo)
- [ ] Confirmações usam o diálogo do app (foco em "Cancelar"; Esc e clique fora cancelam); nenhum `alert`/`confirm` do navegador
- [ ] Remover um item (✕) da biblioteca, roleta ou ignorados mostra "Desfazer" por 5 s (botão ou Ctrl+Z)
- [ ] Gerenciador de senhas reconhece os campos de login e cadastro; email e usuário sem sublinhado de ortografia
- [ ] Navegação por teclado
- [ ] Foco visível
- [ ] Roles semânticos
- [ ] Atalhos de teclado:
  - [ ] Ctrl+K = foco na busca
  - [ ] Ctrl+S = sortear
  - [ ] ESC = fechar modal

### 9.4 Scroll e Navegação
- [ ] Botão "voltar ao topo" aparece ao rolar
- [ ] Scroll suave

### 9.5 Feedback Visual
- [ ] Toasts de sucesso/erro
- [ ] Efeito ripple nos botões
- [ ] Skeleton loaders
- [ ] Estados de loading nos botões

---

## 10. ONBOARDING

### 10.1 Primeira Visita
- [ ] Overlay de boas-vindas
- [ ] 3 slides explicativos
- [ ] Indicadores de progresso (dots)
- [ ] Botão "Começar" / "Próximo"
- [ ] Botão "Pular"
- [ ] Salva `has_visited` no localStorage

---

## 11. CACHE E PERFORMANCE

### 11.1 Cache de API
- [ ] Cache de buscas de pessoa (5 min)
- [ ] Cache de buscas de título (5 min)
- [ ] Evita requisições duplicadas

### 11.2 Lazy Loading
- [ ] Imagens com `loading="lazy"`

### 11.3 Debounce
- [ ] Busca de pessoa com debounce

---

## 12. INTEGRAÇÕES

### 12.1 TMDB API
- [ ] Discover movies/tv
- [ ] Search movies/tv/person
- [ ] Movie/TV details
- [ ] Credits (elenco)
- [ ] Videos (trailers)
- [ ] Watch providers
- [ ] Recommendations
- [ ] Similar

### 12.2 Supabase
- [ ] Auth (registro, login, logout)
- [ ] Profiles (perfil do usuário)
- [ ] Watch History (histórico)
- [ ] Watchlist (lista de desejos)
- [ ] User Preferences (preferências)
- [ ] User Badges (conquistas)

---

## 13. COMPARTILHAMENTO

### 13.1 Compartilhar Filme
- [ ] Botão "Compartilhar" no modal abre as opções
- [ ] Celular: compartilhar do sistema (WhatsApp e outros) com ingresso, texto e link juntos
- [ ] Computador: "Baixar ingresso e copiar texto"; "WhatsApp" abre o WhatsApp Web com o texto e copia o ingresso para colar (Ctrl/Cmd+V)
- [ ] Celular sem compartilhar do sistema (ex.: fora de HTTPS): baixa o ingresso para anexar pelo clipe
- [ ] Texto: título, tipo, ano, nota, sinopse, elenco, onde assistir e link

### 13.2 Ingresso
- [ ] Cor do tipo: âmbar Filme, teal Série, rosa Dorama (série coreana conta como dorama)
- [ ] Pôster, título, sinopse cortada para caber, até 4 nomes do elenco, logos de onde assistir (nomes, se algum logo falhar) e QR code que abre o título

### 13.3 Indicar para amigos
- [ ] No "Compartilhar", botões com os amigos; cada título vai uma vez só para cada amigo
- [ ] Quem recebe vê em Amigos > "Indicações para você", com quem indicou; abrir mostra o título; apagar tem desfazer
- [ ] Exige `database/title_shares.sql`; sem ele, aparece "Envio para amigos indisponível"

---

## 14. ARMAZENAMENTO LOCAL

### 14.1 localStorage (preferências)
- [ ] `last_mode` - último modo (discover/roulette)
- [ ] `last_type` - último tipo (movie/tv/dorama)
- [ ] `last_library_tab` - última aba da biblioteca
- [ ] `has_visited` - já viu onboarding
- [ ] `search_history` - histórico de buscas
- [ ] `pwa_install_dismissed` - banner de instalação dispensado

---

## 15. PWA (Progressive Web App)

### 15.1 Instalação
- [ ] Manifest.json configurado
- [ ] Pode ser instalado no celular/desktop
- [ ] Ícone na tela inicial
- [ ] Abre em modo standalone (sem barra do navegador)
- [ ] Banner de instalação após 30s de uso
- [ ] Botão "Instalar" funcional

### 15.2 Service Worker
- [ ] Registro automático do SW
- [ ] Cache de recursos estáticos (HTML, CSS, JS)
- [ ] Cache de imagens (Cache First)
- [ ] Cache de API TMDB (Network First)
- [ ] Funciona offline (recursos cacheados)

### 15.3 Atalhos do App
- [ ] Atalho "Sortear Filme"
- [ ] Atalho "Sortear Série"
- [ ] Atalho "Roleta"

### 15.4 Atualizações
- [ ] Detecta nova versão do SW
- [ ] Prompt para atualizar
- [ ] Recarrega automaticamente após atualização

---

## 16. DESIGN SYSTEM (Cinematic Luxury)

### 16.1 Visual
- [ ] Tema ultra-dark (#050505)
- [ ] Efeito de textura noise vintage
- [ ] Gradientes ambiente com cor do tema
- [ ] Ícones SVG inline (sem emojis nos botões)
- [ ] Tipografia Inter com letter-spacing ajustado
- [ ] Bordas sutis com transparência

### 16.2 Cards de Tipo
- [ ] Ícone SVG para cada tipo (claquete, TV, coração)
- [ ] Borda inferior colorida indicando tema
- [ ] Efeito glow ao selecionar
- [ ] Transições suaves

### 16.3 Badges/Conquistas
- [ ] 11 cores temáticas diferentes
- [ ] Efeito de brilho ao desbloquear
- [ ] Ícones SVG personalizados
- [ ] Gradiente de fundo por cor

### 16.4 Performance
- [ ] Transições específicas (não "all")
- [ ] will-change para elementos animados
- [ ] Sem backdrop-filter em elementos frequentes
- [ ] Otimizado para 60fps

---

## Histórico de Versões

| Data | Versão | Mudanças |
|------|--------|----------|
| 2026-11-03 | 2.10 | Conquistas mostram quanto falta, desafio do dia e meta da semana, indicações do dia (filme, série e dorama) num painel flutuante |
| 2026-11-03 | 2.9 | Ingresso na cor do tipo e compartilhar completo, indicações entre amigos, conquistas sociais, Match ao vivo (que sobrevive a recarregar), lista do Match, avisos de Amigos |
| 2026-10-28 | 2.8 | Escape contra XSS, zoom liberado, modais acessíveis, buscas com `&`/`#`, ano atual nos filtros, links IMDb/RT, conquista Madrugador, avisos de falha no modal (SEDD 008) |
| 2026-01-30 | 2.7 | Top 10 agora filtra por streaming (além de gênero e ano) |
| 2026-01-30 | 2.6 | PWA (instalável como app), Service Worker, cache offline |
| 2026-01-30 | 2.5 | Design Cinematic Luxury, temas dinâmicos, ícones SVG, otimização performance |
| 2026-01-30 | 2.4 | Histórico de sorteios + Blacklist (não tenho interesse) |
| 2026-01-30 | 2.3 | Esqueci minha senha (recuperação via email) |
| 2026-01-30 | 2.2 | Alterar senha, deletar conta |
| 2026-01-30 | 2.1 | Adicionado campo "Parecido com..." |
| 2026-01-30 | 2.0 | Migração para Supabase, campo email no registro, login por email |
| - | 1.0 | Versão inicial com localStorage |

---

## Notas de Teste

### Ambiente de Teste
- Navegador: Chrome/Firefox/Safari
- Dispositivos: Desktop, Mobile
- Conexão: Online obrigatória (Supabase), offline parcial (cache)
- PWA: Testar via HTTPS ou localhost

### Arquivos do Projeto
- `index.html` - Página principal
- `src/styles/style.css` - Estilos (Design System Cinematic Luxury)
- `src/main.js` - Ponto de entrada (módulos ES, sem build)
- `src/app/` - Funcionalidades (login, descobrir, modal, episódios, biblioteca, roleta...)
- `src/ui/` - Modais, avisos, navegação e ícones
- `src/api/` - Supabase e cliente TMDB
- `src/domain/`, `src/utils/` - Lógica pura com testes
- `src/` - Módulos puros testados (`tests/`); o legacy mantém espelhos comentados
- `manifest.json` - Configuração PWA
- `sw.js` - Service Worker (lista de arquivos e `CACHE_VERSION` gerados por `npm run sw:assets`; o teste `tests/pwa/sw.test.js` avisa quando estão desatualizados)
- `icons/` - Ícones do app (SVG e PNG)

### Credenciais de Teste
- Supabase URL: `https://wzelzstndxtqnboravze.supabase.co`
- TMDB API: chave guardada como segredo `TMDB_API_KEY` da função `tmdb` no Supabase

### Usuário de Teste
- Criar novo usuário para cada bateria de testes
- Ou usar modo convidado para testes rápidos

---

## Bugs Conhecidos

| # | Descrição | Status | Prioridade |
|---|-----------|--------|------------|
| B1 | Service worker servia JS antigo do cache; correções não chegavam | **Corrigido** 2026-10-28 (SEDD 008 T001-014) | Alta |
| B2 | Banner "Instalar App" cobria o botão FECHAR do modal | **Corrigido** 2026-10-30 (SEDD 008 T001-026) | Média |
| B5 | Filtro "Até (ano)" ignorado em séries | **Corrigido** 2026-10-30 (SEDD 008 T001-035) | Alta |
| B6 | Dois cliques seguidos em títulos podiam abrir o primeiro | **Corrigido** 2026-10-30 (SEDD 008 T001-035) | Média |
| B3 | Perfil (`.user-pill`) e abas eram `div` — sem foco por teclado | **Corrigido** 2026-10-28 (SEDD 008 T001-012) | Alta |
| B4 | Com a tela de login aberta, o Tab escapava para a página de trás | **Corrigido** 2026-10-28 (SEDD 008 T001-019) | Média |

---

## Melhorias Futuras

### Implementadas
| # | Funcionalidade | Versão |
|---|----------------|--------|
| ✅ | PWA (instalável como app) | v2.6 |
| ✅ | Modo offline (cache SW) | v2.6 |
| ✅ | Temas dinâmicos por tipo | v2.5 |
| ✅ | Ícones SVG (substituindo emojis) | v2.5 |

---

### 🔥 ENGAJAMENTO DIÁRIO (Retenção)

Funcionalidades para fazer o usuário voltar todo dia.

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 1 | 🎬 **Filme do Dia** ✅ (filme, série e dorama) | Alta | Recomendação curada que muda a cada 24h. Seção especial na home com countdown |
| 2 | 🔥 **Streak de Filmes** | Alta | Contador de dias consecutivos marcando filmes como vistos. Perde se ficar 1 dia sem marcar |
| 3 | 🎯 **Desafio Diário** ✅ | Alta | Mini-missão diária: "Avalie 3 filmes", "Descubra um terror", "Adicione algo à lista". Recompensa: XP/pontos |
| 4 | 📦 **Caixa Mistério** | Média | Abrir 1x por dia para ganhar: badge raro, boost de XP, tema exclusivo, ou recomendação especial |
| 5 | 🧠 **Quiz Diário** | Média | Pergunta sobre cinema/séries. Acertar dá pontos. Ranking semanal dos mais acertadores |
| 6 | 📅 **Meta Semanal** ✅ | Média | "Assistir 3 filmes esta semana" com barra de progresso. Recompensa ao completar |
| 7 | 🎁 **Bônus de Login** | Média | Recompensas crescentes por dias consecutivos (dia 1: 10pts, dia 7: 100pts, dia 30: badge especial) |
| 8 | ⏰ **Oferta Relâmpago** | Baixa | Recomendação especial que expira em 6h. Cria urgência para abrir o app |

---

### 🎮 GAMIFICAÇÃO

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 9 | 🏆 **Sistema de XP/Níveis** | Alta | Ganhar XP por ações (assistir, avaliar, compartilhar). Subir de nível desbloqueia rewards |
| 10 | 🥇 **Ranking Global** | Média | Leaderboard mensal dos usuários mais ativos. Top 10 ganha destaque |
| 11 | 🎖️ **Badges Raros** | Média | Conquistas difíceis: "Maratonista Supremo" (100 filmes), "Crítico de Elite" (50 avaliações) |
| 12 | 🎰 **Roleta de Prêmios** | Baixa | Usar pontos acumulados para girar roleta e ganhar badges/temas |

---

### 📸 COMPARTILHAMENTO & SOCIAL

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 13 | 📸 **Gerador de Stories** | Alta | Imagem estilo Spotify Wrapped com pôster, nota e frase para Instagram/WhatsApp |
| 14 | 🎁 **Recomendar para Amigo** | Alta | Botão "Enviar para..." gera link/mensagem pronta para WhatsApp |
| 15 | 💬 **Reações Rápidas** ✅ | Média | Emojis de reação no modal (🔥😢😂🤯) para feedback rápido sem escrever (feito em 2026-11-06: "Como foi?" no título assistido, visível para amigos) |
| 16 | 📊 **Comparar Gostos** ✅ | Média | "Você e [amigo] têm 73% de compatibilidade cinematográfica" (feito em 2026-11-06, no perfil do amigo) |
| 17 | 👥 **Sistema de Amigos** | Baixa | Adicionar amigos, ver o que estão assistindo, sugerir filmes |
| 18 | 🎉 **Watch Party** | Baixa | Criar sala virtual para decidir filme juntos (votação em grupo) |

---

### 🔍 DESCOBERTA INTELIGENTE

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 19 | 🎲 **Modo "Surpreenda-me"** ✅ | Alta | Sorteia de gênero que o usuário NUNCA assistiu - forçar sair da zona de conforto (feito em 2026-11-06: o gênero que a pessoa menos vê, só bem avaliados) |
| 20 | 📅 **Lançamentos da Semana** ✅ | Alta | Seção automática com novidades das plataformas de streaming (feito em 2026-11-06: botão "Lançamentos", 45 dias para filmes no digital e 60 para séries) |
| 21 | 🌍 **Filtro por País** ✅ | Média | Descobrir cinema francês, japonês, indiano, etc. (feito em 2026-11-06: 15 países) |
| 22 | 🎬 **Maratona por Pessoa** | Média | "Filmografia Tarantino", "Todos os filmes com Denzel Washington" |
| 23 | ⏰ **"Tenho X minutos"** | Média | Slider para definir tempo exato disponível (ex: 95 minutos) |
| 24 | 🔄 **Filtragem Colaborativa** | Alta | Sistema aprende com escolhas. Botões "Gostei"/"Não Gostei" melhoram recomendações |

---

### 📂 ORGANIZAÇÃO & LISTAS

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 25 | 📂 **Listas Personalizadas** ✅ | Alta | Criar coleções: "Maratona Halloween", "Filmes com Namorada". Emoji personalizável (feito em 2026-11-06, com modelos, coleções prontas, ordem arrastando e link público) |
| 26 | 📅 **Agendar Filme** | Média | Cria evento no Google Calendar/celular: "Sexta 20h: Ver Matrix" |
| 27 | 📊 **DNA do Usuário** ✅ | Média | Gráfico visual no perfil: "40% Terror, 30% Comédia, 30% Ação" |
| 28 | 💬 **Notas Pessoais** | Baixa | Campo para anotar "Vi com a Ana", "Recomendação do João" |
| 29 | 🔖 **Tags Customizadas** | Baixa | Adicionar tags próprias: #datenight #comfamily #mindblown |

---

### 🔗 INTEGRAÇÕES EXTERNAS

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 30 | 📱 **Deep Links Streaming** | Alta | Botão "Assistir Agora" abre direto no app Netflix/Prime/Disney+ |
| 31 | 🍅 **Links para Críticas** | Média | Ícones IMDb/Rotten Tomatoes/Letterboxd no modal |
| 32 | 🎧 **Trilha Sonora** | Baixa | Link para playlist do filme no Spotify |
| 33 | 📖 **"Baseado no Livro"** | Baixa | Indicar se tem livro e link para Amazon/Skoob |
| 34 | 🔄 **Importar de Letterboxd** | Baixa | Migrar histórico de outras plataformas via CSV |

---

### ⚙️ QUALIDADE DE VIDA

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 35 | 🖼️ **Upload de Avatar** | Média | Foto de perfil personalizada |
| 36 | 🎨 **Temas Personalizáveis** | Baixa | Usuário escolhe cores além das 3 padrão |
| 37 | 📤 **Exportar Dados** | Baixa | Baixar histórico em CSV/JSON |
| 38 | 🎙️ **Busca por Voz** | Baixa | "Quero um filme de ação dos anos 90" |
| 39 | 🌙 **Modo Noturno Auto** | Baixa | Escurece mais após 22h |
| 40 | 🔔 **Notificações Push** | Média | Lembrar de filmes agendados, novos lançamentos |
| 41 | ⚡ **Sync Real-time** | Média | Supabase Realtime para atualizações instantâneas |

---

### Detalhamento: Engajamento Diário

#### 🎬 Filme do Dia (Prioridade Alta)
- Algoritmo seleciona 1 filme/série por dia baseado em:
  - Popularidade atual
  - Gêneros que o usuário gosta
  - Novidades nas plataformas
- Seção destacada na home com timer "Expira em 23:45:12"
- Marcar como "Visto" ou "Quero Ver" dá bônus de XP
- Histórico dos "Filmes do Dia" anteriores

#### 🔥 Streak de Filmes (Prioridade Alta)
- Contador visível no perfil: "🔥 12 dias seguidos"
- Marcar 1+ filme como visto por dia mantém o streak
- Se perder, mostra "Maior streak: 45 dias"
- Badges por milestones: 7 dias, 30 dias, 100 dias, 365 dias
- Notificação às 20h: "Não perca seu streak de 12 dias!"

#### 🎯 Desafio Diário (Prioridade Alta)
- 3 desafios rotativos por dia, ex:
  - "Avalie 2 filmes que você já viu" (+20 XP)
  - "Adicione 1 filme à sua lista" (+10 XP)
  - "Descubra algo do gênero Terror" (+30 XP)
  - "Compartilhe uma recomendação" (+50 XP)
- Completar todos = bônus extra
- Desafios semanais mais difíceis com rewards melhores

#### 📦 Caixa Mistério (Prioridade Média)
- Disponível 1x por dia (reseta à meia-noite)
- Animação de abrir a caixa
- Prêmios possíveis:
  - Badge comum/raro/lendário
  - Boost de XP (2x por 24h)
  - Tema de cor exclusivo
  - "Filme Secreto" - recomendação especial
  - Pontos extras

---

### Detalhamento: Principais Features

#### 📸 Gerador de Stories (Prioridade Alta)
- Ao clicar em "Compartilhar", gera imagem PNG/JPG
- Layout bonito com: pôster, título, nota (estrelas), frase
- Formatos: Story (9:16), Post (1:1), Twitter (16:9)
- Usa Canvas API para gerar a imagem
- Download direto ou compartilhar via Web Share API

#### 📂 Listas Personalizadas (Prioridade Alta)
- Nova tabela `user_collections` no Supabase
- Modal "Salvar em..." com listas existentes + criar nova
- Ícone/emoji personalizável por lista
- Ordenar itens dentro da lista (drag & drop)
- Compartilhar lista com link público

#### 🎲 Modo "Surpreenda-me" (Prioridade Alta)
- Analisa histórico do usuário
- Identifica gêneros NUNCA ou POUCO assistidos
- Sorteia filme desses gêneros
- Mensagem: "Você quase nunca assiste Documentários. Que tal experimentar?"
- Bônus de XP maior por sair da zona de conforto

---

## 🚀 FEATURES PREMIUM (Experiência Awwwards)

### 🎭 UX & FILTROS AVANÇADOS

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 42 | 🎭 **Filtro por Vibe (Mood Picker)** | Alta | Barra de "vibes" acima dos filtros: 🧠 Explodir a mente, 😭 Pra chorar, ⚡ Adrenalina, 🧸 Conforto |
| 43 | 🙈 **Sessão às Escuras (Blind Watch)** ✅ | Alta | Esconde pôster/título, mostra só sinopse/nota/duração. Botão "Arriscar e Assistir" (feito em 2026-11-06) |
| 44 | ⏱️ **Slider "Tenho X minutos"** | Média | Range slider para tempo exato disponível (60-180 min) |

---

### ✨ POLISH VISUAL (Awwwards Level)

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 45 | ✨ **Efeito 3D Tilt nos Pôsteres** ✅ | Alta | Pôster inclina seguindo o mouse + brilho especular (glare). Biblioteca: vanilla-tilt.js (3kb) (feito em 2026-11-06, com código próprio, sem biblioteca) |
| 46 | 🔊 **Sound Design (UI Sounds)** | Média | Sons sutis: click ao trocar aba, roleta girando, sucesso ao desbloquear. Botão Mute nas config |
| 47 | 🎨 **Cor Dominante do Pôster** | Média | Extrair cor principal da imagem (Color Thief) para usar no fundo do modal/card |

---

### 📸 COMPARTILHAMENTO VISUAL

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 48 | 🎟️ **Gerador de Ingresso** | Alta | Imagem estilizada como ingresso de cinema vintage com pôster, nota e nome do usuário |
| 49 | 📸 **Share Card Dinâmico** | Alta | Canvas API gera imagem 9:16 com cor dominante do pôster, capa em destaque, estrelas |
| 50 | 🖼️ **Formatos de Export** | Média | Story (9:16), Post (1:1), Twitter (16:9), WhatsApp Status |

---

### 🤝 MULTIPLAYER & SOCIAL

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 51 | 🤝 **Match Mode (Tinder para Filmes)** | Alta | Criar sessão, convidar amigo, ambos swipam. Match = confetes + filme vencedor |
| 52 | 🍿 **Listas Colaborativas Real-time** | Alta | Dois usuários editam mesma lista simultaneamente (como Google Docs) |
| 53 | 🏆 **Leaderboard Semanal** | Média | Ranking de amigos por filmes vistos/pontos. Reset todo domingo |
| 54 | 📊 **Comparar Perfis** ✅ | Média | "Você e Ana têm 73% de compatibilidade cinematográfica" (feito em 2026-11-06, junto com o #16) |

---

### 🎮 MINIGAMES & GAMIFICAÇÃO

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 55 | ⚔️ **Cine-Batalha (ELO System)** ✅ | Alta | Dois pôsteres lado a lado, "Qual prefere?". Aprende preferências sem formulários (feito em 2026-11-06 como mata-mata de 8, sem ELO) |
| 56 | 🧠 **Quiz de Cinema** | Média | Perguntas diárias sobre filmes. Acertar = XP. Ranking semanal |
| 57 | 🧩 **Adivinhe o Filme** | Média | Mostra frame/cena borrada, usuário adivinha qual filme é |
| 58 | 🔤 **Palavras Cruzadas Cinema** | Baixa | Crossword com nomes de filmes/atores/diretores |
| 59 | 🃏 **Jogo da Memória** | Baixa | Pares de pôsteres para virar e combinar |
| 60 | 🎯 **Jogo da Velha Temático** | Baixa | Cada casa é um gênero, ganha quem assistiu filme daquele gênero |

---

### 🧠 INTELIGÊNCIA & DESCOBERTA

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 61 | 🧠 **AI Curator (Chatbot)** | Alta | Chat flutuante: "Quero terror psicológico no espaço tipo Alien". IA devolve JSON que preenche Grid |
| 62 | 📱 **CineTok (Feed de Trailers)** | Alta | Aba vertical estilo TikTok com trailers em loop. Swipe up = próximo |
| 63 | 📈 **Life Stats (Estatísticas)** ✅ | Média | "342 horas assistindo", "Ator mais visto: Adam Sandler", "Década favorita: 1980" (feito em 2026-11-05, no DNA do perfil) |
| 64 | 🎬 **Descobrir por Cena** | Baixa | Upload de screenshot, IA identifica qual filme é |

---

### 📝 COMUNIDADE & REVIEWS

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 65 | ⭐ **Avaliação 5 Estrelas** | Alta | SVG customizado com gradiente, partículas CSS ao dar 5 estrelas |
| 66 | 🔥 **Reações Rápidas** | Alta | Botões emoji grandes: 🔥 Épico, 😢 Emocionante, 😂 Engraçado, 🤯 Mind-blowing |
| 67 | 💬 **Micro-Reviews** | Média | Comentários curtos com avatar, data, estrelas e reação |
| 68 | 🙈 **Sistema Anti-Spoiler** | Alta | Checkbox "Contém Spoilers" → texto borrado com botão "Ver Spoiler" |
| 69 | ⚠️ **Alerta de Spoilers** | Média | "Cuidado! Alto índice de reviravoltas marcado pela comunidade" |

---

### 📺 RASTREAMENTO DE SÉRIES (TV Show Time Style)

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 70 | 📺 **Tracker de Episódios** | Alta | Modal de série vira diário de maratona com lista de episódios, thumbnails e checks |
| 71 | 🎬 **Seletor de Temporadas** | Alta | Scroll horizontal com botões T1, T2, T3... Temporada atual destacada |
| 72 | 📸 **Thumbnails de Episódios** | Alta | Imagem still de cada episódio (TMDB fornece), título e data de exibição |
| 73 | ✅ **Check Satisfatório** | Alta | Botão grande que fica verde ao marcar, imagem dessatura (sensação de concluído) |
| 74 | 📊 **Barra de Progresso** | Alta | Linha fina no topo de cada temporada mostrando % assistido |
| 75 | ⏭️ **Próximo Episódio** | Alta | Destaca automaticamente o primeiro episódio não assistido |
| 76 | 🔙 **Marcar Anteriores** | Alta | Ao marcar ep. 5, pergunta: "Marcar os 4 anteriores também?" |
| 77 | ⭐ **Avaliação por Episódio** | Média | Só aparece opção de nota após marcar como visto |
| 78 | 🔔 **Lembrete de Episódio Novo** | Média | Notificação quando série em andamento lança novo episódio |
| 79 | 📅 **Calendário de Lançamentos** | Média | Agenda visual com próximos episódios das séries que você acompanha |
| 80 | 🏃 **Modo Maratona** | Baixa | Timer que conta quanto tempo você está maratonando + pause para snacks |

---

### ⏭️ UP NEXT & CALENDÁRIO (Central de Acompanhamento)

| # | Funcionalidade | Prioridade | Descrição |
|---|----------------|------------|-----------|
| 81 | ⏭️ **Widget "Up Next"** | Alta | Card fixo na home mostrando próximo episódio a assistir de cada série em andamento |
| 82 | 📅 **Calendário de Episódios** | Alta | Visualização mensal/semanal com lançamentos das séries que acompanha |
| 83 | ⏰ **Countdown de Lançamento** | Alta | "Stranger Things S5E01 em 3 dias 14h 22min" com barra de progresso |
| 84 | 🎬 **Próximos Filmes** | Alta | Seção de filmes aguardados com data de estreia e countdown (parcial em 2026-11-07: o título sem streaming mostra "Nos cinemas" ou "Estreia nos cinemas em DD/MM", pelas datas do Brasil) |
| 85 | 🔔 **Notificação D-Day** | Média | Push no dia do lançamento: "Hoje lança o episódio que você esperava!" |
| 86 | 📌 **Fixar no Calendário** | Média | Adicionar filme/série ao calendário mesmo sem estar assistindo |
| 87 | 🔄 **Sync com Google Calendar** | Baixa | Exportar lançamentos para agenda pessoal |
| 88 | 📊 **Resumo Semanal** | Média | "Esta semana: 3 episódios novos, 1 filme estreia" |

---

## 📋 DETALHAMENTO: FEATURES PREMIUM

### 🎭 Filtro por Vibe (Mood Picker)

**Conceito:** Usuários modernos escolhem pelo sentimento, não pelo gênero técnico.

**Implementação:**
```javascript
const vibes = {
  '🧠 Explodir a mente': [878, 53, 9648],      // Sci-Fi + Thriller + Mystery
  '😭 Pra chorar': [18, 10749],                 // Drama + Romance
  '⚡ Adrenalina Pura': [28, 12],               // Ação + Aventura
  '🧸 Conforto': [16, 35, 10751],               // Animação + Comédia + Família
  '👻 Noite do Terror': [27, 53],               // Terror + Thriller
  '🌙 Date Night': [10749, 35],                 // Romance + Comédia
  '🧐 Pra Pensar': [99, 36, 18],               // Documentário + História + Drama
  '🚀 Sci-Fi Trip': [878, 14]                   // Sci-Fi + Fantasia
};
```

**UI:** Barra horizontal com scroll, chips clicáveis com emoji + label. Ao clicar, preenche `input-genero` automaticamente.

**Dica de Melhoria:** Permitir usuário criar suas próprias vibes customizadas.

---

### ✨ Efeito 3D Tilt nos Pôsteres

**Implementação com vanilla-tilt.js:**
```javascript
VanillaTilt.init(document.querySelectorAll(".poster-card"), {
  max: 15,           // Inclinação máxima (graus)
  speed: 400,        // Velocidade da transição
  glare: true,       // Efeito de brilho
  "max-glare": 0.3,  // Intensidade do glare
  scale: 1.05        // Zoom sutil ao hover
});
```

**CSS Puro (alternativa sem biblioteca):**
```css
.poster-card {
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}
.poster-card:hover {
  transform: perspective(1000px) rotateX(var(--rotateX)) rotateY(var(--rotateY));
}
```

**Dica de Melhoria:** Adicionar reflexo embaixo do card (pseudo-element com gradient + blur).

---

### 🔊 Sound Design (UI Sounds)

**Biblioteca de Sons Sugeridos:**
| Ação | Som | Duração |
|------|-----|---------|
| Trocar aba | Click suave/pop | 50ms |
| Sortear (roleta) | Tic-tic-tic desacelerando | 2-3s |
| Resultado aparecer | Swoosh + brilho | 300ms |
| Conquista desbloqueada | Fanfarra etérea/mágica | 1s |
| Adicionar à lista | Plop satisfatório | 100ms |
| Match (modo casal) | Explosão de confete | 1.5s |
| Erro | Buzz suave | 200ms |

**Implementação:**
```javascript
const sounds = {
  click: new Audio('sounds/click.mp3'),
  success: new Audio('sounds/success.mp3'),
  roulette: new Audio('sounds/roulette.mp3')
};

// Preload
Object.values(sounds).forEach(s => s.load());

// Usar
function playSound(name) {
  if (!userPrefs.muted) {
    sounds[name].currentTime = 0;
    sounds[name].play();
  }
}
```

**Dica de Melhoria:** Usar Web Audio API para controle de volume/pitch dinâmico. Sons mais graves à noite (modo noturno).

---

### 🤝 Match Mode (Tinder para Filmes)

**Fluxo:**
1. Usuário cria "Sessão" → recebe código/link único
2. Convida amigo(a) via WhatsApp/link
3. Ambos entram na sessão → veem mesmos 10-20 filmes
4. Interface: Swipe direita (❤️) ou esquerda (❌)
5. **MATCH:** Quando ambos dão like → confetes + filme vencedor

**Implementação Supabase Realtime:**
```javascript
// Criar sessão
const session = await supabase
  .from('match_sessions')
  .insert({ host_id: userId, filters: currentFilters })
  .select().single();

// Escutar votos do parceiro
supabase.channel(`session:${sessionId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'session_votes' },
    (payload) => checkForMatch(payload.new)
  )
  .subscribe();
```

**Tabelas Supabase:**
```sql
CREATE TABLE match_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES users(id),
  guest_id UUID REFERENCES users(id),
  filters JSONB,
  movies INT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE session_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES match_sessions(id),
  user_id UUID REFERENCES users(id),
  movie_id INT,
  vote BOOLEAN, -- true = like, false = dislike
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Dica de Melhoria:** Adicionar chat em tempo real durante a sessão. Countdown de 10s para cada decisão (pressão!).

---

### ⚔️ Cine-Batalha (Sistema ELO)

**Conceito:** Dois pôsteres lado a lado. Usuário escolhe qual prefere. Sistema aprende preferências.

**Algoritmo ELO Simplificado:**
```javascript
function updateELO(winnerRating, loserRating, K = 32) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const newWinner = winnerRating + K * (1 - expected);
  const newLoser = loserRating + K * (0 - (1 - expected));
  return { winner: newWinner, loser: newLoser };
}
```

**Fluxo:**
1. Sistema sorteia 2 filmes de gêneros/épocas diferentes
2. Usuário clica no preferido
3. Ratings são atualizados (tabela `user_movie_ratings`)
4. Próxima batalha considera ratings para matchmaking interessante
5. Após 20 batalhas: mostra "Seu Top 10 Pessoal" ordenado por ELO

**Gamificação:**
- Badge "Crítico de Sofá" após 50 batalhas
- Badge "Juiz Supremo" após 200 batalhas
- XP por batalha completada

**Dica de Melhoria:** Modo "Batalha Temática" (só terror vs terror, só anos 80, etc).

---

### 🧠 AI Curator (Chatbot Contextual)

**Prompt Engineering para LLM:**
```
Você é um curador de cinema. O usuário vai descrever o que quer assistir.
Responda APENAS com um JSON válido no formato:
{
  "genres": [28, 878],
  "keywords": ["space", "aliens"],
  "year_min": 2010,
  "year_max": 2024,
  "vote_average_min": 7.0,
  "similar_to": "Alien"
}
Não explique. Não converse. Apenas o JSON.
```

**Implementação:**
```javascript
async function aiCurator(userMessage) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: CURATOR_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3
    })
  });

  const data = await response.json();
  const filters = JSON.parse(data.choices[0].message.content);
  applyFiltersAndSearch(filters);
}
```

**UI:** Botão flutuante no canto inferior direito. Chat minimalista, transparente sobre o fundo dark.

**Dica de Melhoria:** Cache de respostas similares. Mostrar "Entendi! Buscando filmes de terror psicológico no espaço..." antes do resultado.

---

### 📱 CineTok (Feed Vertical de Trailers)

**Implementação:**
```javascript
async function loadTrailers() {
  const trending = await fetch(`${TMDB_BASE}/trending/movie/week?api_key=${KEY}`);
  const movies = trending.results;

  for (const movie of movies) {
    const videos = await fetch(`${TMDB_BASE}/movie/${movie.id}/videos?api_key=${KEY}`);
    const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
      trailerQueue.push({
        movieId: movie.id,
        title: movie.title,
        youtubeId: trailer.key
      });
    }
  }
}
```

**UI:**
- Tela cheia, vídeo em loop (YouTube embed ou vídeo direto)
- Swipe up = próximo trailer
- Botões flutuantes: ❤️ Salvar, 🎲 Add à Roleta, ℹ️ Ver Detalhes
- Barra de progresso mostrando quantos trailers já viu

**Dica de Melhoria:** Preload do próximo trailer enquanto assiste o atual. Detecção de "watch time" para inferir interesse.

---

### 🙈 Sessão às Escuras (Blind Watch)

**UI:**
```html
<div class="blind-watch-card">
  <div class="poster-hidden">
    <span class="mystery-icon">🎬❓</span>
    <p>Filme Misterioso</p>
  </div>
  <div class="blind-info">
    <p class="genre">Terror | Suspense</p>
    <p class="rating">⭐ 7.8</p>
    <p class="duration">⏱️ 112 min</p>
    <p class="synopsis">"Um grupo de astronautas enfrenta uma ameaça desconhecida..."</p>
  </div>
  <button class="btn-reveal">🎰 Arriscar e Assistir!</button>
</div>
```

**Gamificação:**
- Badge "Corajoso" após assistir 5 filmes às cegas
- Badge "Destemido" após 20 filmes
- Badge "Lendário" após 50 filmes (com pelo menos 3 de nota < 6.0)

**Dica de Melhoria:** Nível de dificuldade: Fácil (mostra gênero), Médio (só nota), Hardcore (só duração).

---

### 📝 Cine-Social: Sistema Anti-Spoiler

**CSS para Blur de Spoiler:**
```css
.comment-spoiler {
  position: relative;
  filter: blur(8px);
  user-select: none;
  transition: filter 0.3s ease;
}

.comment-spoiler::before {
  content: '👁️ Clique para revelar spoiler';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.8);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  filter: none;
  z-index: 10;
}

.comment-spoiler.revealed {
  filter: none;
  user-select: auto;
}
.comment-spoiler.revealed::before {
  display: none;
}
```

**Alerta Inteligente:**
```javascript
async function checkSpoilerLevel(movieId) {
  const { data } = await supabase
    .from('comments')
    .select('has_spoiler')
    .eq('movie_id', movieId);

  const spoilerRate = data.filter(c => c.has_spoiler).length / data.length;

  if (spoilerRate > 0.4) {
    showWarning('⚠️ Cuidado! A comunidade marcou este título com alto índice de reviravoltas.');
  }
}
```

**Dica de Melhoria:** Sistema de votação "Este comentário contém spoiler?" para moderação comunitária.

---

### 📈 Life Stats (Estatísticas de Tempo de Vida)

**Dados a Calcular:**
```javascript
async function calculateLifeStats(userId) {
  const history = await getUserHistory(userId);

  return {
    totalHours: history.reduce((sum, m) => sum + (m.runtime || 0), 0) / 60,
    totalMovies: history.filter(m => m.type === 'movie').length,
    totalSeries: history.filter(m => m.type === 'tv').length,
    favoriteGenre: getMostFrequent(history.flatMap(m => m.genres)),
    favoriteDecade: getMostFrequent(history.map(m => Math.floor(m.year / 10) * 10)),
    favoriteActor: await getMostWatchedActor(history),
    longestStreak: user.maxStreak,
    rarestBadge: getRarestBadge(user.badges),
    avgRating: history.reduce((sum, m) => sum + m.userRating, 0) / history.length
  };
}
```

**Cards Visuais (Estilo Spotify Wrapped):**
- "Você já gastou **342 horas** assistindo filmes"
- "Seu ator mais assistido é **Adam Sandler** (Infelizmente 😅)"
- "Sua década favorita é **1980** 📼"
- "Você é **73% Drama, 15% Comédia, 12% Terror**"

**Dica de Melhoria:** Gerar imagem compartilhável "Meu Ano em Filmes" estilo Wrapped anual.

---

### 📺 Rastreamento de Séries (TV Show Time Style)

**Conceito:** Transformar o modal de série em um "Diário de Maratonas" com experiência viciante de tracking.

#### 1. Interface Principal (UI)

**Seletor de Temporadas:**
```html
<div class="season-selector">
  <button class="season-btn active" data-season="1">T1</button>
  <button class="season-btn" data-season="2">T2</button>
  <button class="season-btn" data-season="3">T3</button>
  <!-- Scroll horizontal em mobile -->
</div>
<div class="season-progress">
  <div class="progress-bar" style="width: 70%"></div>
  <span class="progress-text">7/10 episódios</span>
</div>
```

**Card de Episódio:**
```html
<div class="episode-card" data-episode="1">
  <img class="episode-still" src="tmdb-still-url.jpg" alt="S01E01">
  <div class="episode-info">
    <span class="episode-number">S01E01</span>
    <h4 class="episode-title">Pilot</h4>
    <span class="episode-date">20/01/2008</span>
  </div>
  <div class="episode-actions">
    <button class="btn-check" aria-label="Marcar como visto">
      <svg class="check-icon">...</svg>
    </button>
    <div class="episode-rating hidden">
      <!-- Aparece só após marcar como visto -->
      ⭐⭐⭐⭐⭐
    </div>
  </div>
</div>
```

#### 2. CSS - Efeitos Visuais

```css
/* Card de Episódio */
.episode-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.episode-card:hover {
  background: rgba(255,255,255,0.06);
  transform: translateX(4px);
}

/* Thumbnail do Episódio */
.episode-still {
  width: 120px;
  height: 68px;
  object-fit: cover;
  border-radius: 8px;
  transition: filter 0.5s ease;
}

/* Estado: Visto */
.episode-card.watched {
  opacity: 0.7;
}

.episode-card.watched .episode-still {
  filter: grayscale(70%) brightness(0.8);
}

.episode-card.watched .btn-check {
  background: var(--accent-primary);
  color: white;
  transform: scale(1.1);
}

/* Botão Check - Animação Satisfatória */
.btn-check {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-check:hover {
  transform: scale(1.15);
  border-color: var(--accent-primary);
}

.btn-check.checked {
  animation: checkPop 0.4s ease;
}

@keyframes checkPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1.1); }
}

/* Barra de Progresso */
.season-progress {
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
  margin: 8px 0;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  transition: width 0.5s ease;
}

/* Próximo Episódio Destacado */
.episode-card.next-up {
  border-left: 3px solid var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.episode-card.next-up::before {
  content: '▶ PRÓXIMO';
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 10px;
  background: var(--accent-primary);
  padding: 2px 8px;
  border-radius: 4px;
}
```

#### 3. JavaScript - Lógica Inteligente

```javascript
// Buscar episódios de uma temporada (TMDB API)
async function loadSeasonEpisodes(seriesId, seasonNumber) {
  const url = `${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}&language=pt-BR`;
  const res = await fetch(url);
  const data = await res.json();

  return data.episodes.map(ep => ({
    id: ep.id,
    number: ep.episode_number,
    name: ep.name,
    overview: ep.overview,
    still: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
    airDate: ep.air_date,
    runtime: ep.runtime,
    voteAverage: ep.vote_average
  }));
}

// Marcar episódio como visto
async function markEpisodeWatched(seriesId, seasonNum, episodeNum, markPrevious = false) {
  const episodesToMark = markPrevious
    ? Array.from({ length: episodeNum }, (_, i) => i + 1)
    : [episodeNum];

  for (const epNum of episodesToMark) {
    await supabase.from('episode_progress').upsert({
      user_id: currentUser.id,
      series_id: seriesId,
      season: seasonNum,
      episode: epNum,
      watched_at: new Date().toISOString()
    });
  }

  updateProgressBar(seriesId, seasonNum);
  highlightNextEpisode(seriesId, seasonNum);

  // Feedback visual
  playSound('check');
  showToast(`Episódio${markPrevious ? 's' : ''} marcado${markPrevious ? 's' : ''}!`);
}

// Pergunta se quer marcar anteriores
function askMarkPrevious(episodeNum, callback) {
  if (episodeNum <= 1) {
    callback(false);
    return;
  }

  showConfirmDialog({
    title: 'Marcar anteriores?',
    message: `Deseja marcar os ${episodeNum - 1} episódios anteriores como vistos também?`,
    confirmText: 'Sim, marcar todos',
    cancelText: 'Não, só este',
    onConfirm: () => callback(true),
    onCancel: () => callback(false)
  });
}

// Destacar próximo episódio não assistido
function highlightNextEpisode(seriesId, seasonNum) {
  const episodes = document.querySelectorAll('.episode-card');
  let foundNext = false;

  episodes.forEach(card => {
    card.classList.remove('next-up');
    if (!foundNext && !card.classList.contains('watched')) {
      card.classList.add('next-up');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      foundNext = true;
    }
  });
}

// Calcular progresso da temporada
async function getSeasonProgress(seriesId, seasonNum, totalEpisodes) {
  const { data } = await supabase
    .from('episode_progress')
    .select('episode')
    .eq('user_id', currentUser.id)
    .eq('series_id', seriesId)
    .eq('season', seasonNum);

  const watched = data?.length || 0;
  return {
    watched,
    total: totalEpisodes,
    percentage: Math.round((watched / totalEpisodes) * 100)
  };
}
```

#### 4. Schema Supabase

```sql
-- Tabela de progresso de episódios
CREATE TABLE episode_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  series_id INT NOT NULL,
  season INT NOT NULL,
  episode INT NOT NULL,
  watched_at TIMESTAMP DEFAULT NOW(),
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(user_id, series_id, season, episode)
);

-- Índices para performance
CREATE INDEX idx_episode_progress_user ON episode_progress(user_id);
CREATE INDEX idx_episode_progress_series ON episode_progress(series_id, season);

-- View para progresso geral de uma série
CREATE VIEW series_progress AS
SELECT
  user_id,
  series_id,
  COUNT(*) as episodes_watched,
  MAX(watched_at) as last_watched
FROM episode_progress
GROUP BY user_id, series_id;
```

#### 5. Minhas Sugestões de Melhoria

**🎯 Loop de Dopamina Aprimorado:**
- **Confete ao completar temporada:** Animação de celebração quando atinge 100%
- **Badge por temporada:** "Completou Breaking Bad S1" com ícone da série
- **Som satisfatório:** "Ding" ao marcar, "Ta-da!" ao completar temporada

**📊 Estatísticas de Maratona:**
```javascript
// Mostrar no perfil
const marathonStats = {
  longestBinge: '8 episódios seguidos (Breaking Bad)',
  avgEpisodesPerDay: 2.3,
  fastestSeasonComplete: '3 dias (Stranger Things S4)',
  totalEpisodesWatched: 847
};
```

**⏰ "Ritmo de Maratona":**
- Detectar quando usuário marca vários episódios seguidos
- Mostrar: "🔥 Maratona detectada! 5 episódios em 2h"
- Badge "Maratonista" após 10+ episódios em um dia

**📅 Integração com Calendário:**
```javascript
// Séries em andamento que o usuário acompanha
async function getUpcomingEpisodes() {
  const mySeries = await getUserWatchingSeries();
  const upcoming = [];

  for (const series of mySeries) {
    const nextEp = await getNextAiringEpisode(series.id);
    if (nextEp) {
      upcoming.push({
        series: series.name,
        episode: `S${nextEp.season}E${nextEp.episode}`,
        airDate: nextEp.air_date,
        daysUntil: daysDiff(new Date(), new Date(nextEp.air_date))
      });
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}
```

**🔔 Notificações Inteligentes:**
- "Stranger Things S5E01 lança amanhã!"
- "Você parou na metade de Breaking Bad há 1 semana. Continuar?"
- "Novo episódio de The Last of Us disponível!"

**📱 Swipe Gestures (Mobile):**
- Swipe direita no card = marcar como visto
- Swipe esquerda = pular (não quer ver agora)
- Long press = avaliar

**🎮 Modo Watch Party para Séries:**
- Criar sessão de maratona com amigo
- Ambos marcam episódios juntos
- Ver quem está "na frente" na série

**💬 Discussão por Episódio:**
- Mini-chat/comentários específicos de cada episódio
- Tudo com sistema anti-spoiler (só vê comentários de eps que já assistiu)

---

### ⏭️ Up Next & Calendário (Central de Acompanhamento)

**Conceito:** Uma central que mostra tudo que você precisa assistir e o que está por vir.

#### 1. Widget "Up Next" na Home

**UI - Card Compacto:**
```html
<section class="up-next-section">
  <h2>⏭️ Continuar Assistindo</h2>
  <div class="up-next-carousel">
    <!-- Card para cada série em andamento -->
    <div class="up-next-card" onclick="openEpisode(seriesId, season, episode)">
      <div class="up-next-poster">
        <img src="series-poster.jpg" alt="Breaking Bad">
        <div class="episode-badge">S02E05</div>
        <div class="progress-ring">
          <svg><!-- Círculo de progresso da temporada --></svg>
          <span>45%</span>
        </div>
      </div>
      <div class="up-next-info">
        <h4>Breaking Bad</h4>
        <p class="episode-title">Breakage</p>
        <span class="episode-duration">47 min</span>
      </div>
      <button class="btn-play-now">▶</button>
    </div>
  </div>
</section>
```

**CSS:**
```css
.up-next-section {
  margin: 24px 0;
}

.up-next-carousel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 8px 0;
}

.up-next-card {
  flex: 0 0 280px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 0.2s, background 0.2s;
}

.up-next-card:hover {
  background: rgba(255,255,255,0.08);
  transform: scale(1.02);
}

.up-next-poster {
  position: relative;
  width: 60px;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
}

.episode-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: var(--accent-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}

.progress-ring {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
}

.btn-play-now {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-primary);
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  margin-left: auto;
  transition: transform 0.2s;
}

.btn-play-now:hover {
  transform: scale(1.15);
}
```

#### 2. Calendário de Lançamentos

**UI - Visualização Semanal:**
```html
<section class="calendar-section">
  <div class="calendar-header">
    <h2>📅 Esta Semana</h2>
    <div class="calendar-nav">
      <button onclick="prevWeek()">◀</button>
      <span id="week-range">27 Jan - 02 Fev</span>
      <button onclick="nextWeek()">▶</button>
    </div>
  </div>

  <div class="calendar-grid">
    <!-- Cada dia da semana -->
    <div class="calendar-day">
      <div class="day-header">
        <span class="day-name">Seg</span>
        <span class="day-number">27</span>
      </div>
      <div class="day-releases">
        <div class="release-item series">
          <img src="poster.jpg" alt="">
          <div class="release-info">
            <span class="release-title">The Last of Us</span>
            <span class="release-detail">S02E03</span>
          </div>
        </div>
      </div>
    </div>
    <!-- Repete para Ter, Qua, Qui, Sex, Sab, Dom -->
  </div>
</section>
```

**CSS:**
```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-day {
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 12px;
  min-height: 120px;
}

.day-header {
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.day-name {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
}

.day-number {
  font-size: 18px;
  font-weight: bold;
}

.calendar-day.today {
  background: rgba(var(--accent-primary-rgb), 0.15);
  border: 1px solid var(--accent-primary);
}

.calendar-day.today .day-number {
  color: var(--accent-primary);
}

.release-item {
  display: flex;
  gap: 8px;
  padding: 6px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(255,255,255,0.05);
}

.release-item img {
  width: 32px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}

.release-item.movie {
  border-left: 3px solid #e50914;
}

.release-item.series {
  border-left: 3px solid #6366f1;
}
```

#### 3. Countdown de Lançamentos

**UI - Card com Timer:**
```html
<div class="countdown-card">
  <div class="countdown-poster">
    <img src="stranger-things.jpg" alt="">
    <div class="countdown-overlay">
      <span class="countdown-label">LANÇA EM</span>
      <div class="countdown-timer">
        <div class="time-unit">
          <span class="time-value" id="days">03</span>
          <span class="time-label">dias</span>
        </div>
        <div class="time-separator">:</div>
        <div class="time-unit">
          <span class="time-value" id="hours">14</span>
          <span class="time-label">horas</span>
        </div>
        <div class="time-separator">:</div>
        <div class="time-unit">
          <span class="time-value" id="minutes">22</span>
          <span class="time-label">min</span>
        </div>
      </div>
    </div>
  </div>
  <div class="countdown-info">
    <h3>Stranger Things</h3>
    <p>Temporada 5, Episódio 1</p>
    <button class="btn-notify">🔔 Lembrar</button>
  </div>
</div>
```

**JavaScript - Timer:**
```javascript
function startCountdown(releaseDate, elementId) {
  const updateTimer = () => {
    const now = new Date().getTime();
    const target = new Date(releaseDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      document.getElementById(elementId).innerHTML = '🎉 DISPONÍVEL!';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.querySelector(`#${elementId} #days`).textContent = String(days).padStart(2, '0');
    document.querySelector(`#${elementId} #hours`).textContent = String(hours).padStart(2, '0');
    document.querySelector(`#${elementId} #minutes`).textContent = String(minutes).padStart(2, '0');
  };

  updateTimer();
  setInterval(updateTimer, 60000); // Atualiza a cada minuto
}
```

#### 4. JavaScript - Lógica Principal

```javascript
// Buscar próximo episódio de cada série que o usuário acompanha
async function getUpNextEpisodes() {
  const { data: watchingSeries } = await supabase
    .from('series_following')
    .select('series_id')
    .eq('user_id', currentUser.id);

  const upNext = [];

  for (const { series_id } of watchingSeries) {
    // Buscar último episódio assistido
    const { data: lastWatched } = await supabase
      .from('episode_progress')
      .select('season, episode')
      .eq('user_id', currentUser.id)
      .eq('series_id', series_id)
      .order('season', { ascending: false })
      .order('episode', { ascending: false })
      .limit(1)
      .single();

    // Buscar info da série no TMDB
    const seriesInfo = await fetch(
      `${BASE_URL}/tv/${series_id}?api_key=${API_KEY}&language=pt-BR`
    ).then(r => r.json());

    // Calcular próximo episódio
    let nextSeason = lastWatched?.season || 1;
    let nextEpisode = (lastWatched?.episode || 0) + 1;

    // Verificar se precisa avançar para próxima temporada
    const currentSeasonInfo = seriesInfo.seasons.find(s => s.season_number === nextSeason);
    if (currentSeasonInfo && nextEpisode > currentSeasonInfo.episode_count) {
      nextSeason++;
      nextEpisode = 1;
    }

    // Buscar info do episódio
    const episodeInfo = await fetch(
      `${BASE_URL}/tv/${series_id}/season/${nextSeason}/episode/${nextEpisode}?api_key=${API_KEY}&language=pt-BR`
    ).then(r => r.json()).catch(() => null);

    if (episodeInfo && !episodeInfo.status_code) {
      upNext.push({
        seriesId: series_id,
        seriesName: seriesInfo.name,
        seriesPoster: seriesInfo.poster_path,
        season: nextSeason,
        episode: nextEpisode,
        episodeName: episodeInfo.name,
        runtime: episodeInfo.runtime,
        still: episodeInfo.still_path,
        progress: calculateSeasonProgress(series_id, nextSeason, currentSeasonInfo.episode_count)
      });
    }
  }

  return upNext;
}

// Buscar próximos lançamentos das séries que acompanha
async function getUpcomingReleases() {
  const { data: watchingSeries } = await supabase
    .from('series_following')
    .select('series_id')
    .eq('user_id', currentUser.id);

  const releases = [];

  for (const { series_id } of watchingSeries) {
    const seriesInfo = await fetch(
      `${BASE_URL}/tv/${series_id}?api_key=${API_KEY}&language=pt-BR`
    ).then(r => r.json());

    // Verificar próximo episódio a ser lançado
    if (seriesInfo.next_episode_to_air) {
      const nextEp = seriesInfo.next_episode_to_air;
      releases.push({
        type: 'series',
        id: series_id,
        title: seriesInfo.name,
        poster: seriesInfo.poster_path,
        releaseDate: nextEp.air_date,
        detail: `S${String(nextEp.season_number).padStart(2,'0')}E${String(nextEp.episode_number).padStart(2,'0')}`,
        episodeName: nextEp.name
      });
    }
  }

  // Buscar filmes na watchlist com data de lançamento futura
  const { data: watchlistMovies } = await supabase
    .from('watchlist')
    .select('tmdb_id')
    .eq('user_id', currentUser.id)
    .eq('type', 'movie');

  for (const { tmdb_id } of watchlistMovies || []) {
    const movieInfo = await fetch(
      `${BASE_URL}/movie/${tmdb_id}?api_key=${API_KEY}&language=pt-BR`
    ).then(r => r.json());

    if (movieInfo.release_date && new Date(movieInfo.release_date) > new Date()) {
      releases.push({
        type: 'movie',
        id: tmdb_id,
        title: movieInfo.title,
        poster: movieInfo.poster_path,
        releaseDate: movieInfo.release_date,
        detail: 'Estreia nos cinemas'
      });
    }
  }

  // Ordenar por data mais próxima
  return releases.sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate));
}

// Agrupar releases por dia da semana
function groupReleasesByDay(releases) {
  const grouped = {};
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  releases.forEach(release => {
    const date = new Date(release.releaseDate);
    const dayKey = date.toISOString().split('T')[0];

    if (!grouped[dayKey]) {
      grouped[dayKey] = {
        dayName: weekDays[date.getDay()],
        dayNumber: date.getDate(),
        isToday: isSameDay(date, new Date()),
        releases: []
      };
    }

    grouped[dayKey].releases.push(release);
  });

  return grouped;
}
```

#### 5. Schema Supabase Adicional

```sql
-- Tabela de séries que o usuário está acompanhando
CREATE TABLE series_following (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  series_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  notify_new_episodes BOOLEAN DEFAULT true,
  UNIQUE(user_id, series_id)
);

-- Tabela de filmes aguardados (com lançamento futuro)
CREATE TABLE movies_anticipated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  movie_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  notify_release BOOLEAN DEFAULT true,
  UNIQUE(user_id, movie_id)
);

-- Índices
CREATE INDEX idx_series_following_user ON series_following(user_id);
CREATE INDEX idx_movies_anticipated_user ON movies_anticipated(user_id);
```

#### 6. Notificações Push

```javascript
// Verificar e enviar notificações de lançamentos
async function checkAndNotifyReleases() {
  const releases = await getUpcomingReleases();
  const today = new Date().toISOString().split('T')[0];

  for (const release of releases) {
    if (release.releaseDate === today) {
      sendPushNotification({
        title: `🎬 Lançamento Hoje!`,
        body: release.type === 'series'
          ? `${release.title} ${release.detail} já está disponível!`
          : `${release.title} estreia hoje nos cinemas!`,
        icon: `https://image.tmdb.org/t/p/w92${release.poster}`,
        data: { type: release.type, id: release.id }
      });
    }

    // Notificar 1 dia antes
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (release.releaseDate === tomorrow.toISOString().split('T')[0]) {
      sendPushNotification({
        title: `⏰ Amanhã!`,
        body: `${release.title} ${release.detail} lança amanhã!`,
        icon: `https://image.tmdb.org/t/p/w92${release.poster}`
      });
    }
  }
}

// Executar verificação diária
if ('serviceWorker' in navigator) {
  // Registrar periodic sync para verificar lançamentos
  navigator.serviceWorker.ready.then(registration => {
    registration.periodicSync.register('check-releases', {
      minInterval: 24 * 60 * 60 * 1000 // 1 dia
    });
  });
}
```

#### 7. Melhorias Adicionais Sugeridas

**📊 Widget de Resumo:**
```html
<div class="weekly-summary">
  <h3>📊 Sua Semana</h3>
  <div class="summary-stats">
    <div class="stat">
      <span class="stat-value">3</span>
      <span class="stat-label">episódios novos</span>
    </div>
    <div class="stat">
      <span class="stat-value">1</span>
      <span class="stat-label">filme estreia</span>
    </div>
    <div class="stat">
      <span class="stat-value">5</span>
      <span class="stat-label">para assistir</span>
    </div>
  </div>
</div>
```

**🎯 "Minha Fila" Inteligente:**
- Ordenação automática: episódios mais antigos primeiro (evitar spoilers)
- Agrupar por "Curtos" (<30min) e "Longos" (>45min)
- Filtro por tempo: "Tenho 1 hora" → mostra o que cabe

**📱 Widget para Tela Inicial (PWA):**
- Mini-widget mostrando próximo episódio
- Tap = abre direto no modal do episódio

---

## 🎯 PRIORIZAÇÃO RECOMENDADA

### Fase 1 - Quick Wins (Alto Impacto, Baixo Esforço)
1. 🎭 Filtro por Vibe (Mood Picker)
2. ✨ Efeito 3D Tilt nos Pôsteres
3. 🙈 Sessão às Escuras
4. 🔥 Reações Rápidas (emojis)

### Fase 2 - Engajamento (Retenção Diária)
5. 🔥 Streak de Filmes
6. 🎬 Filme do Dia
7. 📦 Caixa Mistério
8. ⚔️ Cine-Batalha
9. 📺 **Rastreamento de Séries** ⭐ (Alto impacto!)
10. ⏭️ **Up Next Widget** ⭐ (Mostra próximo episódio)

### Fase 3 - Social & Viral
11. 📸 Share Card Dinâmico
12. 🤝 Match Mode
13. 🍿 Listas Colaborativas
14. 🏆 Leaderboard

### Fase 4 - Premium Features
15. 🧠 AI Curator
16. 📱 CineTok
17. 🔊 Sound Design
18. 📈 Life Stats
19. 📅 **Calendário de Lançamentos** ⭐ (Séries + Filmes)
20. ⏰ **Countdown de Estreias** (Com notificações)

---

**Mantenha este documento atualizado a cada mudança no projeto!**
