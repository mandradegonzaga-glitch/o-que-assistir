const API_KEY = 'f956c9480373479f4dcd6da9f1d1b6f1';
        const BASE_URL = 'https://api.themoviedb.org/3';
        const IMG_URL = 'https://image.tmdb.org/t/p/w500';

        // CACHE SYSTEM
        const cache = {
            data: new Map(),
            images: new Map(),
            set(key, value, ttl = 300000) { // 5min default
                this.data.set(key, {
                    value,
                    expiry: Date.now() + ttl
                });
            },
            get(key) {
                const item = this.data.get(key);
                if (!item) return null;
                if (Date.now() > item.expiry) {
                    this.data.delete(key);
                    return null;
                }
                return item.value;
            }
        };

        // DEBOUNCE UTILITY
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // SISTEMA DE AUTENTICAÇÃO E USUÁRIOS
let currentUser = null;
let allUsers = JSON.parse(localStorage.getItem('all_users')) || {};

let state = { type: 'movie', personId: null, tab: 'watchlist', currentMovie: null, rouletteItems: [] };
let user = {
    name: 'Visitante',
    email: '',
    password: '',
    history: [],
    rouletteWins: 0
};

// INIT - Checa autenticação primeiro
checkAuth();
renderLibrary();
initAccessibility();
setupInputWrappers();
checkFirstVisit();
initScrollButton();

function checkAuth() {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        currentUser = savedUser;
        loadUserData();
        document.getElementById('login-overlay').style.display = 'none';
        updateUserDisplay();
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
}

function loadUserData() {
    if (!currentUser || !allUsers[currentUser]) return;
    
    const userData = allUsers[currentUser];
    user = {
        name: userData.name || currentUser,
        email: userData.email || '',
        password: userData.password || null,
        history: userData.history || [],
        rouletteWins: userData.rouletteWins || 0
    };
    
    renderLibrary();
    updateHeader();
}

function saveUserData() {
    if (!currentUser) return;
    
    allUsers[currentUser] = {
        name: user.name,
        email: user.email,
        password: allUsers[currentUser].password, // Mantém a senha original
        history: user.history,
        rouletteWins: user.rouletteWins
    };
    
    localStorage.setItem('all_users', JSON.stringify(allUsers));
}

function updateUserDisplay() {
    const displayEl = document.getElementById('user-display');
    const avatarEl = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (currentUser) {
        const displayName = currentUser === 'guest' ? 'Convidado' : currentUser;
        displayEl.textContent = displayName;
        avatarEl.textContent = currentUser === 'guest' ? '👤' : currentUser[0].toUpperCase();
        logoutBtn.style.display = 'block';
    } else {
        displayEl.textContent = 'Convidado';
        avatarEl.textContent = '?';
        logoutBtn.style.display = 'none';
    }
}
        
        // Event listeners
        window.onclick = function(e) {
            if (e.target.classList.contains('modal-overlay')) {
                closeModalWithAnimation(e.target);
            }
        }

        // KEYBOARD SUPPORT
        document.addEventListener('keydown', (e) => {
            // ESC fecha modais
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(modal => {
                    if (modal.style.display === 'flex') {
                        closeModalWithAnimation(modal);
                    }
                });
                const onboarding = document.getElementById('onboarding-overlay');
                if (onboarding && onboarding.style.display === 'flex') {
                    skipOnboarding();
                }
            }
        });

        function closeModalWithAnimation(modal) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.animation = '';
                if(modal.id === 'modal-resultado') {
                    document.getElementById('trailer-frame').src = '';
                }
            }, 300);
        }

        // RIPPLE EFFECT
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('ripple') || e.target.closest('.ripple')) {
                const button = e.target.classList.contains('ripple') ? e.target : e.target.closest('.ripple');
                const ripple = document.createElement('span');
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                    animation: ripple-effect 0.6s ease-out;
                `;

                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            }
        });

	// FUNÇÕES DE LOGIN/CADASTRO
function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
    });
    document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        const loginTab = document.querySelectorAll('.login-tab')[0];
        loginTab.classList.add('active');
        loginTab.setAttribute('aria-selected', 'true');
        loginTab.setAttribute('tabindex', '0');
        document.getElementById('login-form').classList.add('active');
    } else {
        const registerTab = document.querySelectorAll('.login-tab')[1];
        registerTab.classList.add('active');
        registerTab.setAttribute('aria-selected', 'true');
        registerTab.setAttribute('tabindex', '0');
        document.getElementById('register-form').classList.add('active');
    }
}

// PASSWORD STRENGTH CHECKER
function checkPasswordStrength(password) {
    const bar = document.getElementById('password-strength-bar');
    if (!password) {
        bar.className = 'password-strength-bar';
        bar.style.width = '0';
        return;
    }

    let strength = 0;
    if (password.length >= 4) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) {
        bar.className = 'password-strength-bar weak';
    } else if (strength <= 3) {
        bar.className = 'password-strength-bar medium';
    } else {
        bar.className = 'password-strength-bar strong';
    }
}

function registerUser() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');

    if (!username || !password || !confirm) {
        errorEl.textContent = '❌ Preencha todos os campos!';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 4) {
        errorEl.textContent = '❌ A senha deve ter pelo menos 4 caracteres!';
        errorEl.style.display = 'block';
        return;
    }

    if (password !== confirm) {
        errorEl.textContent = '❌ As senhas não coincidem!';
        errorEl.style.display = 'block';
        return;
    }

    if (allUsers[username]) {
        errorEl.textContent = '❌ Este usuário já existe!';
        errorEl.style.display = 'block';
        return;
    }

    // Criar novo usuário
    allUsers[username] = {
        name: username,
        email: '',
        password: password,
        history: [],
        rouletteWins: 0,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem('all_users', JSON.stringify(allUsers));
    
    showToast('✅ Conta criada com sucesso!');
    
    // Fazer login automático
    currentUser = username;
    localStorage.setItem('current_user', username);
    loadUserData();
    document.getElementById('login-overlay').style.display = 'none';
    updateUserDisplay();
}

function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
        errorEl.textContent = '❌ Preencha todos os campos!';
        errorEl.style.display = 'block';
        return;
    }

    if (!allUsers[username]) {
        errorEl.textContent = '❌ Usuário não encontrado!';
        errorEl.style.display = 'block';
        return;
    }

    if (allUsers[username].password !== password) {
        errorEl.textContent = '❌ Senha incorreta!';
        errorEl.style.display = 'block';
        return;
    }

    currentUser = username;
    localStorage.setItem('current_user', username);
    loadUserData();
    document.getElementById('login-overlay').style.display = 'none';
    updateUserDisplay();
    showToast(`👋 Bem-vindo(a), ${username}!`);
}

function loginAsGuest() {
    currentUser = 'guest';
    localStorage.setItem('current_user', 'guest');
    
    if (!allUsers['guest']) {
        allUsers['guest'] = {
            name: 'Convidado',
            email: '',
            password: null,
            history: [],
            rouletteWins: 0
        };
        localStorage.setItem('all_users', JSON.stringify(allUsers));
    }
    
    loadUserData();
    document.getElementById('login-overlay').style.display = 'none';
    updateUserDisplay();
    showToast('👋 Bem-vindo(a), Convidado!');
}

function logout() {
    if (confirm('Deseja realmente sair?')) {
        saveUserData();
        currentUser = null;
        localStorage.removeItem('current_user');
        document.getElementById('login-overlay').style.display = 'flex';
        updateUserDisplay();
        
        // Limpar formulários
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
        
        showToast('👋 Até logo!');
    }
}

        // NAVEGAÇÃO
        function switchMode(mode) {
            document.querySelectorAll('.mode-tab').forEach(el => {
                el.classList.remove('active');
                el.setAttribute('aria-selected', 'false');
                el.setAttribute('tabindex', '-1');
            });
            event.target.classList.add('active');
            event.target.setAttribute('aria-selected', 'true');
            event.target.setAttribute('tabindex', '0');

            document.getElementById('view-discover').style.display = mode === 'discover' ? 'block' : 'none';
            document.getElementById('view-roulette').style.display = mode === 'roulette' ? 'block' : 'none';

            // Salvar preferência
            localStorage.setItem('last_mode', mode);
        }

        // KEYBOARD NAVIGATION FOR TABS
        function handleTabKey(event, mode) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                switchMode(mode);
            }
        }

        // KEYBOARD NAVIGATION FOR CARDS
        function handleCardKey(event, type) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selecionarTipo(type);
            }
        }

        function selecionarTipo(t) {
    state.type = t;

    // Update visual and accessibility states
    ['movie', 'tv', 'dorama'].forEach(type => {
        const btn = document.getElementById(`btn-${type}`);
        const isSelected = t === type;
        btn.className = `card ${isSelected ? 'selected' : ''}`;
        btn.setAttribute('aria-checked', isSelected);
        btn.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    // Salvar preferência
    localStorage.setItem('last_type', t);
}

        function switchTab(t) {
            state.tab = t;

            // Update visual and accessibility states
            const watchlistTab = document.getElementById('tab-watchlist');
            const vistosTab = document.getElementById('tab-vistos');

            if (t === 'watchlist') {
                watchlistTab.style.color = 'var(--primary)';
                watchlistTab.setAttribute('aria-selected', 'true');
                watchlistTab.setAttribute('tabindex', '0');
                vistosTab.style.color = '#888';
                vistosTab.setAttribute('aria-selected', 'false');
                vistosTab.setAttribute('tabindex', '-1');
            } else {
                vistosTab.style.color = 'var(--primary)';
                vistosTab.setAttribute('aria-selected', 'true');
                vistosTab.setAttribute('tabindex', '0');
                watchlistTab.style.color = '#888';
                watchlistTab.setAttribute('aria-selected', 'false');
                watchlistTab.setAttribute('tabindex', '-1');
            }

            // Save preference
            localStorage.setItem('last_library_tab', t);

            renderLibrary();
        }

        // PERFIL
        function abrirPerfil() {
            document.getElementById('profile-name').value = user.name;
            document.getElementById('profile-email').value = user.email || '';
            document.getElementById('profile-password').value = user.password || '';
            document.getElementById('profile-avatar-large').innerText = user.name.charAt(0).toUpperCase();
            document.getElementById('stats-count').innerText = user.history.length;
            document.getElementById('stats-wins').innerText = user.rouletteWins || 0;
            renderBadges();
            document.getElementById('modal-profile').style.display = 'flex';
        }

        function salvarPerfil() {
    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const password = document.getElementById('profile-password').value;
    
    if(!name) {
        showToast("❌ Digite um nome válido!", "error");
        return;
    }
    
    user.name = name;
    user.email = email;
    if(password) user.password = password;
    
    saveUserData(); // MUDOU AQUI
    updateHeader();
    document.getElementById('modal-profile').style.display = 'none';
    showToast("✅ Perfil salvo com sucesso!");
}

        function updateHeader() {
    document.getElementById('user-display').innerText = user.name;
    document.getElementById('user-avatar').innerText = user.name.charAt(0).toUpperCase();
}

        function renderBadges() {
            const container = document.getElementById('badges-container');
            container.innerHTML = '';
            const h = user.history;
            
            const badges = [
                { name: 'Iniciante', desc: 'Assistiu 1 filme/série', icon: '🍿', check: h.length >= 1 },
                { name: 'Cinéfilo', desc: 'Assistiu 10 filmes/séries', icon: '🎬', check: h.length >= 10 },
                { name: 'Crítico', desc: 'Assistiu 50 itens', icon: '🧐', check: h.length >= 50 },
                { name: 'Maratonista', desc: 'Assistiu 5 séries', icon: '📺', check: h.filter(i=>i.type==='tv').length >= 5 },
                { name: 'Rei do Terror', desc: '3 filmes de terror', icon: '👻', check: h.filter(i=>i.genres?.includes(27)).length >= 3 },
                { name: 'Comediante', desc: '3 comédias', icon: '😂', check: h.filter(i=>i.genres?.includes(35)).length >= 3 },
                { name: 'Romântico', desc: '3 romances', icon: '💘', check: h.filter(i=>i.genres?.includes(10749)).length >= 3 },
                { name: 'Sci-Fi Nerd', desc: '3 ficções científicas', icon: '👽', check: h.filter(i=>i.genres?.includes(878)).length >= 3 },
                { name: 'Adrenalina', desc: '3 filmes de ação', icon: '💥', check: h.filter(i=>i.genres?.includes(28)).length >= 3 },
                { name: 'Apostador', desc: 'Ganhou 5x na roleta', icon: '🎰', check: user.rouletteWins >= 5 },
                { name: 'Old School', desc: 'Filme antes de 2000', icon: '📼', check: h.some(i=>parseInt(i.year)<2000) }
            ];

            badges.forEach(b => {
                const unlocked = b.check;
                container.innerHTML += `
                    <div class="badge-item ${unlocked ? 'unlocked' : ''}">
                        <div class="badge-icon">${b.icon}</div>
                        <div class="badge-info">
                            <h4>${b.name}</h4>
                            <p>${b.desc}</p>
                        </div>
                    </div>`;
            });
        }

        // TOAST (Enhanced)
        function showToast(msg, type="success") {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.className = `toast show ${type}`;
            t.setAttribute('role', 'status');
            t.setAttribute('aria-live', 'polite');

            // Animate entrance
            t.style.animation = 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

            setTimeout(() => {
                t.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                setTimeout(() => {
                    t.classList.remove('show');
                    t.style.animation = '';
                }, 400);
            }, 2600);
        }

        // FILTRO ATOR (com debounce implementado via input)
        async function buscarPessoa(val) {
            if(val.length < 3) {
                document.getElementById('actor-list').style.display = 'none';
                return;
            }

            // Check cache
            const cacheKey = `person_${val}`;
            const cached = cache.get(cacheKey);
            if (cached) {
                renderPersonSuggestions(cached);
                return;
            }

            try {
                const res = await fetch(`${BASE_URL}/search/person?api_key=${API_KEY}&query=${val}&language=pt-BR`);
                const data = await res.json();

                // Cache results
                cache.set(cacheKey, data.results);

                renderPersonSuggestions(data.results);
            } catch(e) {
                console.error('Erro ao buscar pessoa:', e);
            }
        }

        function renderPersonSuggestions(results) {
            const box = document.getElementById('actor-list');
            box.innerHTML = '';
            box.style.display = 'block';

            results.slice(0,5).forEach((p) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.setAttribute('role', 'option');
                item.setAttribute('tabindex', '0');
                item.onclick = () => selectPerson(p.id, p.name);
                item.onkeydown = (e) => {
                    if (e.key === 'Enter') selectPerson(p.id, p.name);
                };
                item.innerHTML = `<img class="suggestion-img" src="${p.profile_path ? IMG_URL+p.profile_path : 'https://via.placeholder.com/30'}" alt="${p.name}"> ${p.name}`;
                box.appendChild(item);
            });
        }

        function selectPerson(id, name) {
            state.personId = id;
            document.getElementById('actor-input').value = '';
            document.getElementById('actor-list').style.display = 'none';
            document.getElementById('selected-person').style.display = 'flex';
            document.getElementById('person-name').innerText = name;
        }

        function limparPessoa() { 
            state.personId = null; 
            document.getElementById('selected-person').style.display = 'none'; 
        }

        // LÓGICA PRINCIPAL
        async function sortearFilme() {
            const btn = event.target;
            btn.innerText = "⏳ Buscando...";
            btn.disabled = true;
            btn.classList.add('loading');

            const endpoint = state.type === 'dorama' ? 'tv' : state.type;
let url = `${BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&language=pt-BR&sort_by=popularity.desc&vote_count.gte=50`;
            
            const genre = document.getElementById('input-genero').value;
            const prov = document.getElementById('input-provider').value;
            const dur = document.getElementById('duration-select').value;
            const yearFrom = document.getElementById('year-from').value;
            const yearTo = document.getElementById('year-to').value;
	
		// Filtro especial para doramas (Coreia e Japão) - SEM ANIME
            if(state.type === 'dorama') {
                url += '&with_origin_country=KR&without_genres=16'; // Apenas Coreia, sem animação
            }
		

            if(genre) url += `&with_genres=${genre}`;
            if(prov) url += `&with_watch_providers=${prov}&watch_region=BR`;
            if(state.personId) url += `&with_people=${state.personId}`;
            if(dur) {
                if(dur === 'short') url += `&with_runtime.lte=90`;
                if(dur === 'medium') url += `&with_runtime.gte=90&with_runtime.lte=120`;
                if(dur === 'long') url += `&with_runtime.gte=120`;
            }
            if(yearFrom || yearTo) {
                const startYear = yearFrom || '1900';
                const endYear = yearTo || '2025';
                url += `&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31`;
                if(endpoint === 'tv') {
                    url = url.replace('primary_release_date', 'first_air_date');
                }
            }
            
            const randomPage = Math.floor(Math.random() * 5) + 1;
            
            try {
                let res = await fetch(url + `&page=${randomPage}`);
                let data = await res.json();
                
                if(!data.results || data.results.length === 0) {
                    res = await fetch(url + `&page=1`);
                    data = await res.json();
                }

                const valid = data.results.filter(m => m.poster_path);
                
                if(valid.length > 0) {
                    abrirModal(valid[Math.floor(Math.random() * valid.length)]);
                } else {
                    showToast("❌ Nada encontrado com esses filtros!", "error");
                }
            } catch(e) {
                console.error(e);
                showToast("❌ Erro na API.", "error");
            }
            btn.innerText = "✨ Sortear Agora";
            btn.disabled = false;
            btn.classList.remove('loading');
        }

        // SKELETON LOADERS
        function showSkeletonLoader() {
            const area = document.getElementById('results-area');
            area.innerHTML = '';
            area.style.display = 'grid';
            for (let i = 0; i < 10; i++) {
                area.innerHTML += '<div class="skeleton-card"></div>';
            }
        }

        function hideSkeletonLoader() {
            const area = document.getElementById('results-area');
            area.innerHTML = '';
        }

        async function mostrarTop10() {
            const btn = event.target;
            btn.innerText = "⏳ Carregando...";
            btn.disabled = true;
            btn.classList.add('loading');

            showSkeletonLoader();
            
            try {
                const genero = document.getElementById('input-genero').value;
                const yearFrom = document.getElementById('year-from').value;
                const yearTo = document.getElementById('year-to').value;

const endpoint = state.type === 'dorama' ? 'tv' : state.type;
                let url = `${BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&language=pt-BR&sort_by=popularity.desc&vote_count.gte=100`;

                // Filtro especial para doramas - SEM ANIME
                if(state.type === 'dorama') {
                    url += '&with_origin_country=KR&without_genres=16';
                }

                if (genero) url += `&with_genres=${genero}`;

                if(yearFrom || yearTo) {
                    const startYear = yearFrom || '1900';
                    const endYear = yearTo || '2025';
                    url += `&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31`;
                    if(endpoint === 'tv') {
                        url = url.replace('primary_release_date', 'first_air_date');
                    }
                }

                const res = await fetch(url);
                const data = await res.json();
                renderResults(data.results.slice(0,10), true);
                showToast("✅ Top 10 carregado!");
            } catch(e) {
                showToast("❌ Erro ao carregar Top 10", "error");
            } finally {
                btn.innerText = "🔥 Ver Top 10";
                btn.disabled = false;
                btn.classList.remove('loading');
            }
        }


        function renderResults(list, rank=false) {
            const area = document.getElementById('results-area');
            area.innerHTML = '';
            area.style.display = 'grid';

            if(list.length === 0) {
                area.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <div class="empty-state-icon">🔍</div>
                        <h3 class="empty-state-title">Nenhum resultado encontrado</h3>
                        <p class="empty-state-desc">Tente ajustar seus filtros ou fazer uma nova busca</p>
                        <button class="empty-state-cta ripple" onclick="document.getElementById('direct-search').focus()">
                            🎬 Nova Busca
                        </button>
                    </div>
                `;
                return;
            }

            list.forEach((f, i) => {
                if(f.poster_path) {
                    const title = f.title || f.name;
                    const item = document.createElement('div');
                    item.className = 'result-item';
                    item.setAttribute('role', 'button');
                    item.setAttribute('tabindex', '0');
                    item.setAttribute('aria-label', `${title}${rank ? `, posição ${i+1}` : ''}`);
                    item.onclick = () => carregarDetalhes(f.id, state.type);
                    item.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            carregarDetalhes(f.id, state.type);
                        }
                    };

                    item.innerHTML = `
                        ${rank ? `<div class="result-rank">${i+1}º</div>` : ''}
                        <img src="${IMG_URL + f.poster_path}" alt="${title}" loading="lazy">
                        <div class="result-title-preview">${title}</div>
                    `;

                    area.appendChild(item);
                }
            });
        }
// MODAL
        async function carregarDetalhes(id, type) {
            const endpoint = type === 'dorama' ? 'tv' : type;
            const res = await fetch(`${BASE_URL}/${endpoint}/${id}?api_key=${API_KEY}&language=pt-BR`);
            const f = await res.json();
            f.media_type = endpoint;
            abrirModal(f);
        }

        async function abrirModal(f) {
            state.currentMovie = f;
            const mediaType = f.media_type || state.type;
            const type = mediaType === 'dorama' ? 'tv' : mediaType;
            
            document.getElementById('m-title').innerText = f.title || f.name;
            document.getElementById('m-desc').innerText = f.overview || "Sem sinopse.";
            document.getElementById('m-rating').innerText = `⭐ ${f.vote_average ? f.vote_average.toFixed(1) : 'N/A'}`;
            document.getElementById('m-year').innerText = (f.release_date || f.first_air_date || '').split('-')[0];
            document.getElementById('m-poster').src = f.backdrop_path ? IMG_URL + f.backdrop_path : (f.poster_path ? IMG_URL + f.poster_path : '');

            // Elenco
            try {
                const cRes = await fetch(`${BASE_URL}/${type}/${f.id}/credits?api_key=${API_KEY}&language=pt-BR`);
                const cData = await cRes.json();
                const castDiv = document.getElementById('cast-list');
                castDiv.innerHTML = '';
                cData.cast.slice(0,8).forEach(a => {
                    castDiv.innerHTML += `<div class="cast-item"><img src="${a.profile_path ? IMG_URL+a.profile_path : 'https://via.placeholder.com/60'}" class="cast-photo"><br>${a.name}</div>`;
                });
            } catch(e) {}

            // Trailer
            try {
                const vRes = await fetch(`${BASE_URL}/${type}/${f.id}/videos?api_key=${API_KEY}&language=pt-BR`);
                let vData = await vRes.json();
                if(vData.results.length === 0) {
                    const vResEn = await fetch(`${BASE_URL}/${type}/${f.id}/videos?api_key=${API_KEY}&language=en-US`);
                    vData = await vResEn.json();
                }
                const trailer = vData.results.find(v => v.site === 'YouTube');
                const vidArea = document.getElementById('video-area');
                if(trailer) {
                    vidArea.style.display = 'block';
                    document.getElementById('trailer-frame').src = `https://www.youtube-nocookie.com/embed/${trailer.key}`;
                } else { 
                    vidArea.style.display = 'none'; 
                }
            } catch(e) {}

            // Streaming
            try {
                const pRes = await fetch(`${BASE_URL}/${type}/${f.id}/watch/providers?api_key=${API_KEY}`);
                const pData = await pRes.json();
                const provDiv = document.getElementById('m-providers');
                provDiv.innerHTML = '';
                if(pData.results?.BR?.flatrate) {
                    const link = pData.results.BR.link;
                    pData.results.BR.flatrate.forEach(p => {
                        provDiv.innerHTML += `<a href="${link}" target="_blank"><img src="${IMG_URL+p.logo_path}" class="provider-logo" title="Ver no ${p.provider_name}"></a>`;
                    });
                } else { 
                    provDiv.innerHTML = '<span style="color:#666; font-size:0.8rem">Indisponível em streaming</span>'; 
                }
            } catch(e) {}

            // Botões
            const vistos = user.history || [];
            const wl = JSON.parse(localStorage.getItem('watchlist_obj')) || [];
            
            const btnV = document.getElementById('btn-visto');
            const btnS = document.getElementById('btn-salvar');
            
            btnV.innerText = vistos.find(i=>i.id===f.id) ? "✅ JÁ VISTO" : "✅ Já Vi";
            btnV.disabled = !!vistos.find(i=>i.id===f.id);
            btnS.innerText = wl.find(i=>i.id===f.id) ? "❌ Remover" : "⭐ Salvar";
            
            btnV.onclick = () => { 
                salvarHistorico(f); 
                fecharModal(); 
            };
            btnS.onclick = () => { 
                toggleWatchlist(f); 
                fecharModal(); 
            };

            document.getElementById('modal-resultado').style.display = 'flex';
        }

        function fecharModal() {
            document.getElementById('modal-resultado').style.display = 'none';
            document.getElementById('trailer-frame').src = "";
        }

        // DADOS
        function salvarHistorico(f) {
            if(user.history.find(h => h.id === f.id)) return;
            const entry = {
                id: f.id,
                title: f.title || f.name,
                poster: f.poster_path,
                type: f.media_type || state.type,
                year: (f.release_date || f.first_air_date || '').split('-')[0],
                genres: f.genres ? f.genres.map(g => g.id) : f.genre_ids
            };
            user.history.push(entry);
            saveUserData();

            let vistos = JSON.parse(localStorage.getItem('vistos_obj')) || [];
            vistos.push(entry);
            localStorage.setItem('vistos_obj', JSON.stringify(vistos));

            showToast("✅ Marcado como visto!");
            renderLibrary();

            // Check badge unlocks
            checkBadgeUnlock('Iniciante');
            checkBadgeUnlock('Cinéfilo');
        }

        function toggleWatchlist(f) {
            let wl = JSON.parse(localStorage.getItem('watchlist_obj')) || [];
            if(wl.find(i => i.id === f.id)) {
                wl = wl.filter(i => i.id !== f.id);
                showToast("🗑️ Removido!");
            } else {
                wl.push({ 
                    id: f.id, 
                    poster: f.poster_path, 
                    title: f.title || f.name, 
                    type: f.media_type || state.type 
                });
                showToast("⭐ Salvo!");
            }
            localStorage.setItem('watchlist_obj', JSON.stringify(wl));
            renderLibrary();
        }

        function renderLibrary() {
            const key = state.tab === 'watchlist' ? 'watchlist_obj' : 'vistos_obj';
            const list = key === 'vistos_obj' ? user.history : (JSON.parse(localStorage.getItem(key)) || []);
            const div = document.getElementById('library-content');

            if(list.length === 0) {
                const isWatchlist = state.tab === 'watchlist';
                div.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <div class="empty-state-icon">${isWatchlist ? '⭐' : '✅'}</div>
                        <h3 class="empty-state-title">${isWatchlist ? 'Sua lista está vazia' : 'Nenhum item assistido ainda'}</h3>
                        <p class="empty-state-desc">${isWatchlist ? 'Comece adicionando filmes e séries que deseja assistir!' : 'Marque filmes como assistidos para construir seu histórico'}</p>
                        <button class="empty-state-cta ripple" onclick="switchTab('${isWatchlist ? 'vistos' : 'watchlist'}'); setTimeout(() => window.scrollTo({top:0, behavior:'smooth'}), 100)">
                            ${isWatchlist ? '📺 Ver Assistidos' : '⭐ Ver Lista'}
                        </button>
                    </div>
                `;
                return;
            }

            const movies = list.filter(i => i.type === 'movie' || !i.type);
            const tvs = list.filter(i => i.type === 'tv');
            
            let html = '';
            if(movies.length > 0) {
                html += `<div style="grid-column:1/-1; color:#888; font-size:0.8rem; border-bottom:1px solid #333; margin-top:20px">FILMES (${movies.length})</div>`;
                movies.forEach(f => {
                    html += `<div class="library-item" onclick="carregarDetalhes(${f.id}, 'movie')"><button class="remove-btn" onclick="event.stopPropagation(); removeLibItem('${key}', ${f.id})">✕</button><img src="${IMG_URL+f.poster}"></div>`;
                });
            }
            if(tvs.length > 0) {
                html += `<div style="grid-column:1/-1; color:#888; font-size:0.8rem; border-bottom:1px solid #333; margin-top:20px">SÉRIES (${tvs.length})</div>`;
                tvs.forEach(f => {
                    html += `<div class="library-item" onclick="carregarDetalhes(${f.id}, 'tv')"><button class="remove-btn" onclick="event.stopPropagation(); removeLibItem('${key}', ${f.id})">✕</button><img src="${IMG_URL+f.poster}"></div>`;
                });
            }
            div.innerHTML = html;
        }

        function removeLibItem(key, id) {
    if(key === 'vistos_obj') {
        user.history = user.history.filter(i => i.id !== id);
        saveUserData(); // MUDOU AQUI
    } else {
        let list = JSON.parse(localStorage.getItem(key)) || [];
        list = list.filter(i => i.id !== id);
        localStorage.setItem(key, JSON.stringify(list));
    }
    renderLibrary();
}
// ROLETA
        function addRoletaItem() {
            const val = document.getElementById('roulette-input').value.trim();
            if(val) {
                state.rouletteItems.push(val);
                renderRoleta();
                document.getElementById('roulette-input').value = '';
                showToast("✅ Item adicionado!");
            }
        }

        function addCurrentToRoulette() {
            if(state.currentMovie) {
                const title = state.currentMovie.title || state.currentMovie.name;
                state.rouletteItems.push(title);
                renderRoleta();
                showToast("🎰 Adicionado à Roleta!");
                fecharModal();
                switchMode('roulette');
            }
        }

        function renderRoleta() {
            const pool = document.getElementById('roulette-pool');
            pool.innerHTML = state.rouletteItems.map((i, idx) => 
                `<div class="pool-tag">${i} <span onclick="removeRoletaItem(${idx})" style="cursor:pointer; color:#ff5555">✕</span></div>`
            ).join('');
            
            if(state.rouletteItems.length > 0) {
                desenharRoleta();
            }
        }

        function removeRoletaItem(idx) {
            state.rouletteItems.splice(idx, 1);
            renderRoleta();
        }

        function desenharRoleta() {
            const wheel = document.getElementById('roulette-wheel');
            wheel.innerHTML = '';
            
            if(state.rouletteItems.length === 0) return;
            
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 320;
            wheel.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            const items = state.rouletteItems;
            const sliceAngle = (2 * Math.PI) / items.length;
            const colors = ['#e50914', '#ff4757', '#c23616', '#e84118', '#b71c1c'];
            
            items.forEach((item, i) => {
                const startAngle = i * sliceAngle - Math.PI / 2;
                const endAngle = startAngle + sliceAngle;
                
                ctx.beginPath();
                ctx.arc(160, 160, 160, startAngle, endAngle);
                ctx.lineTo(160, 160);
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
                ctx.strokeStyle = '#0a0a0a';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                ctx.save();
                ctx.translate(160, 160);
                ctx.rotate(startAngle + sliceAngle / 2);
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Inter';
                const text = item.length > 20 ? item.substring(0, 18) + '...' : item;
                ctx.fillText(text, 110, 5);
                ctx.restore();
            });
        }

        function girarRoleta() {
            if(state.rouletteItems.length < 2) {
                showToast("❌ Adicione pelo menos 2 itens!", "error");
                return;
            }

            desenharRoleta();

            const wheel = document.getElementById('roulette-wheel');
            const center = document.getElementById('roulette-result');
            const items = state.rouletteItems;

            const winnerIndex = Math.floor(Math.random() * items.length);
            const winner = items[winnerIndex];

            const sliceAngle = 360 / items.length;
            const spins = 5 + Math.random() * 3;
            const winnerAngle = winnerIndex * sliceAngle;
            const totalRotation = (spins * 360) + (360 - winnerAngle);

            center.innerText = '🎰';
            wheel.style.transform = `rotate(${totalRotation}deg)`;

            setTimeout(() => {
                center.innerText = '🎉';
                showToast(`🎉 Vencedor: ${winner}`, "achievement");
                createConfetti();

                user.rouletteWins = (user.rouletteWins || 0) + 1;
                saveUserData();

                // Check for badge unlock
                checkBadgeUnlock('Apostador');

                setTimeout(() => {
                    wheel.style.transition = 'none';
                    wheel.style.transform = 'rotate(0deg)';
                    setTimeout(() => {
                        wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
                        desenharRoleta();
                        center.innerText = '🎲';
                    }, 50);
                }, 2000);
            }, 4000);
        }

        // CONFETTI EFFECT
        function createConfetti() {
            const colors = ['#e50914', '#ffd700', '#ff4757', '#46d369', '#ff69b4'];
            const confettiCount = 50;

            for (let i = 0; i < confettiCount; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.left = Math.random() * 100 + '%';
                    confetti.style.top = '-10px';
                    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.animation = `confetti-fall ${2 + Math.random() * 2}s linear forwards`;
                    confetti.style.animationDelay = Math.random() * 0.5 + 's';

                    document.body.appendChild(confetti);

                    setTimeout(() => confetti.remove(), 4000);
                }, i * 30);
            }
        }

        // BADGE UNLOCK CHECKER
        function checkBadgeUnlock(badgeName) {
            const badges = {
                'Iniciante': user.history.length >= 1,
                'Cinéfilo': user.history.length >= 10,
                'Apostador': user.rouletteWins >= 5
            };

            if (badges[badgeName]) {
                const wasUnlocked = localStorage.getItem(`badge_${badgeName}`);
                if (!wasUnlocked) {
                    localStorage.setItem(`badge_${badgeName}`, 'true');
                    showToast(`🏆 Conquista desbloqueada: ${badgeName}!`, "achievement");
                }
            }
        }

        function limparRoleta() { 
            if(state.rouletteItems.length === 0) return;
            if(confirm('Deseja limpar toda a lista da roleta?')) {
                state.rouletteItems = []; 
                renderRoleta(); 
                document.getElementById('roulette-result').innerText = '🎲';
                document.getElementById('roulette-wheel').innerHTML = '';
                showToast("🗑️ Lista limpa!");
            }
        }

        // UTILITY FUNCTIONS
        function clearInput(inputId) {
            const input = document.getElementById(inputId);
            input.value = '';
            input.focus();
            const wrapper = input.closest('.input-wrapper');
            if (wrapper) wrapper.classList.remove('has-value');

            if (inputId === 'actor-input') {
                document.getElementById('actor-list').style.display = 'none';
            }
        }

        function toggleClearButton(input) {
            const wrapper = input.closest('.input-wrapper');
            if (wrapper) {
                if (input.value.length > 0) {
                    wrapper.classList.add('has-value');
                } else {
                    wrapper.classList.remove('has-value');
                }
            }
        }

        function setupInputWrappers() {
            document.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', function() {
                    toggleClearButton(this);
                });
            });
        }

        // ACCESSIBILITY INIT
        function initAccessibility() {
            // Restore last preferences
            const lastMode = localStorage.getItem('last_mode');
            const lastType = localStorage.getItem('last_type');
            const lastTab = localStorage.getItem('last_library_tab');

            if (lastMode && lastMode !== 'discover') {
                const tab = document.querySelector(`[onclick*="${lastMode}"]`);
                if (tab) tab.click();
            }

            if (lastType && lastType !== 'movie') {
                selecionarTipo(lastType);
            }

            if (lastTab && lastTab !== 'watchlist') {
                switchTab(lastTab);
            }

            // Add keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + K para focar na busca
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    document.getElementById('direct-search').focus();
                }

                // Ctrl/Cmd + S para sortear
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    const btn = document.querySelector('[onclick="sortearFilme()"]');
                    if (btn && !btn.disabled) btn.click();
                }
            });
        }

        // ONBOARDING SYSTEM
        let onboardingStep = 0;
        const onboardingSteps = [
            {
                icon: '🎬',
                title: 'Bem-vindo!',
                desc: 'Descubra filmes e séries de forma inteligente com filtros personalizados'
            },
            {
                icon: '✨',
                title: 'Sorteio Inteligente',
                desc: 'Use filtros avançados e deixe o algoritmo escolher a melhor opção para você'
            },
            {
                icon: '🎰',
                title: 'Roleta Personalizada',
                desc: 'Crie sua própria roleta com filmes e deixe a sorte decidir!'
            }
        ];

        function checkFirstVisit() {
            const hasVisited = localStorage.getItem('has_visited');
            if (!hasVisited) {
                setTimeout(() => {
                    document.getElementById('onboarding-overlay').style.display = 'flex';
                }, 500);
            }
        }

        function nextOnboarding() {
            onboardingStep++;

            if (onboardingStep >= onboardingSteps.length) {
                finishOnboarding();
                return;
            }

            const step = onboardingSteps[onboardingStep];
            document.getElementById('onboarding-icon').innerText = step.icon;
            document.getElementById('onboarding-title').innerText = step.title;
            document.getElementById('onboarding-desc').innerText = step.desc;

            // Update dots
            document.querySelectorAll('.onboarding-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === onboardingStep);
            });

            if (onboardingStep === onboardingSteps.length - 1) {
                document.getElementById('onboarding-btn').innerText = 'Começar Agora!';
            }
        }

        function finishOnboarding() {
            localStorage.setItem('has_visited', 'true');
            const overlay = document.getElementById('onboarding-overlay');
            overlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.animation = '';
            }, 300);
        }

        function skipOnboarding() {
            finishOnboarding();
        }

        // MOBILE GESTURES
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });

        function handleSwipe() {
            const swipeThreshold = 100;
            const diff = touchStartX - touchEndX;

            // Swipe left/right on modals to close
            const modal = document.querySelector('.modal-overlay[style*="display: flex"]');
            if (modal && Math.abs(diff) > swipeThreshold) {
                closeModalWithAnimation(modal);
            }
        }

        // SCROLL TO TOP
        function initScrollButton() {
            const scrollBtn = document.getElementById('scroll-top');

            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    scrollBtn.classList.add('visible');
                } else {
                    scrollBtn.classList.remove('visible');
                }
            });
        }

        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // SEARCH HISTORY
        function saveSearchHistory(query) {
            let history = JSON.parse(localStorage.getItem('search_history')) || [];
            history = history.filter(item => item !== query);
            history.unshift(query);
            history = history.slice(0, 5); // Keep last 5
            localStorage.setItem('search_history', JSON.stringify(history));
        }

        function getSearchHistory() {
            return JSON.parse(localStorage.getItem('search_history')) || [];
        }

        // Enhanced search with history
        async function buscarDireto() {
            const query = document.getElementById('direct-search').value;
            const area = document.getElementById('results-area');

            if(query.length < 2) {
                showToast("❌ Digite pelo menos 2 caracteres", "error");
                return;
            }

            saveSearchHistory(query);

            area.innerHTML = '<p style="color:#888; grid-column:1/-1;">Buscando...</p>';
            area.style.display = 'grid';

            showSkeletonLoader();

            try {
                const endpoint = state.type === 'dorama' ? 'tv' : state.type;

                // Check cache first
                const cacheKey = `search_${endpoint}_${query}`;
                const cached = cache.get(cacheKey);

                let data;
                if (cached) {
                    data = cached;
                } else {
                    const res = await fetch(`${BASE_URL}/search/${endpoint}?api_key=${API_KEY}&query=${query}&language=pt-BR`);
                    data = await res.json();
                    cache.set(cacheKey, data);
                }

                area.innerHTML = '';

                if(data.results.length === 0) {
                    area.innerHTML = `
                        <div class="empty-state" style="grid-column: 1/-1;">
                            <div class="empty-state-icon">🔍</div>
                            <h3 class="empty-state-title">Nenhum resultado para "${query}"</h3>
                            <p class="empty-state-desc">Tente palavras diferentes ou verifique a ortografia</p>
                        </div>
                    `;
                    return;
                }

                renderResults(data.results);
            } catch(e) {
                console.error(e);
                showToast("❌ Erro na busca", "error");
            }
        }

        // COMPARTILHAR
        async function compartilhar() {
            if(state.currentMovie) {
                const title = state.currentMovie.title || state.currentMovie.name;
                const rating = state.currentMovie.vote_average ? state.currentMovie.vote_average.toFixed(1) : 'N/A';
                const text = `🎬 ${title}\n⭐ ${rating}/10\n\nDescubra em: ${window.location.href}`;

                if(navigator.share) {
                    try {
                        await navigator.share({
                            title: 'O Que Assistir?',
                            text: text,
                            url: window.location.href
                        });
                        showToast("✅ Compartilhado com sucesso!");
                    } catch(e) {
                        if(e.name !== 'AbortError') {
                            copyToClipboard(text);
                        }
                    }
                } else {
                    copyToClipboard(text);
                }
            }
        }

        function copyToClipboard(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast("📋 Copiado para área de transferência!");
                }).catch(() => {
                    showToast("❌ Erro ao copiar", "error");
                });
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast("📋 Copiado para área de transferência!");
                } catch(e) {
                    showToast("❌ Erro ao copiar", "error");
                }
                document.body.removeChild(textarea);
            }
        }