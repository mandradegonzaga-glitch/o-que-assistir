# O Que Assistir? - Ideias de Monetização

**Status:** Rascunho para análise
**Última atualização:** 2026-01-30

> Este documento contém ideias e estratégias de monetização para análise futura. Nada aqui está definido - são apenas possibilidades a considerar.

---

## Contexto

Com 88+ features planejadas, o projeto precisa de sustentabilidade financeira para:
- Custos de infraestrutura (hosting, domínio)
- APIs pagas (OpenAI para AI Curator)
- Tempo de desenvolvimento
- Possível expansão futura

---

## Modelos de Monetização Possíveis

### 1. Freemium

**Conceito:** App gratuito com features premium opcionais.

#### Divisão Sugerida

| Gratuito | Premium |
|----------|---------|
| Sortear filmes/séries | Incluído |
| Filtros básicos | Incluído |
| Watchlist (até 50 itens) | Ilimitada |
| Histórico (últimos 30) | Ilimitado |
| 3 badges básicos | Todos os badges |
| Tema padrão | Temas exclusivos |
| Match Mode (3x/dia) | Match Mode ilimitado |
| - | AI Curator |
| - | Sem anúncios |
| - | Share Cards premium |
| - | Estatísticas avançadas |
| - | Badge "Apoiador" exclusivo |
| - | Calendário sync |
| - | Notificações prioritárias |

#### Preço Sugerido
- **Mensal:** R$ 9,90
- **Anual:** R$ 79,90 (2 meses grátis)

#### Prós
- Baixa barreira de entrada
- Usuários gratuitos geram conteúdo/dados
- Conversão natural conforme usuário quer mais

#### Contras
- Precisa encontrar equilíbrio (não castrar demais o free)
- Desenvolvimento de sistema de pagamento
- Gestão de assinaturas

---

### 2. Anúncios Não-Intrusivos

**Conceito:** Monetizar com ads sem destruir a experiência.

#### Locais Aceitáveis

| Local | Tipo | Nível de Intrusão |
|-------|------|-------------------|
| Entre resultados do Top 10 | Banner nativo | Baixa |
| Após 3º sorteio consecutivo | Interstitial leve | Média |
| Tela de carregamento | Banner pequeno | Baixa |
| Footer do perfil | Banner fixo | Muito baixa |

#### O que NUNCA fazer
- Pop-ups que bloqueiam a tela
- Vídeos obrigatórios antes de usar
- Anúncios dentro do modal do filme
- Anúncios durante Match Mode
- Anúncios que parecem conteúdo

#### Receita Estimada
- CPM médio Brasil: R$ 2-5 (AdSense/AdMob)
- 10.000 usuários ativos = R$ 500-1500/mês
- Não sustenta sozinho, funciona como complemento

#### Prós
- Renda passiva
- Não exige pagamento do usuário
- Fácil implementação (AdSense)

#### Contras
- Pode degradar experiência "premium"
- Receita baixa no Brasil
- Usuários usam ad-blockers

---

### 3. Parcerias/Afiliados com Streamings

**Conceito:** Ganhar comissão quando usuário assina streaming via seu link.

#### Programas Disponíveis

| Streaming | Programa de Afiliados | Comissão |
|-----------|----------------------|----------|
| Amazon Prime | Amazon Associates | 1-3% |
| Netflix | Não tem público | - |
| Disney+ | Não tem público | - |
| HBO Max | Não tem público | - |
| Crunchyroll | Tem (verificar) | ~5% |

#### Como Funcionaria
1. Usuário descobre filme no app
2. Clica em "Assistir na Amazon Prime"
3. Link tem tag de afiliado
4. Se assinar, você ganha comissão

#### Prós
- Renda passiva
- Não afeta experiência do usuário
- Alinhado com propósito do app

#### Contras
- Poucos streamings têm programa
- Comissões baixas
- Difícil rastrear conversões

---

### 4. Doações/Apoio Voluntário

**Conceito:** Usuários que amam o projeto contribuem voluntariamente.

#### Plataformas

| Plataforma | Foco | Taxa |
|------------|------|------|
| Apoia.se | Brasil | ~10% |
| Catarse | Brasil (recorrente) | ~13% |
| Ko-fi | Internacional | 0-5% |
| Buy Me a Coffee | Internacional | 5% |
| GitHub Sponsors | Devs | 0% |

#### Benefícios para Apoiadores
- Badge exclusivo "Apoiador" no perfil
- Nome nos créditos do app
- Acesso antecipado a features
- Grupo exclusivo (Discord/Telegram)
- Votação em próximas features

#### Prós
- Zero fricção para maioria dos usuários
- Cria comunidade engajada
- Apoiadores viram embaixadores

#### Contras
- Receita imprevisível
- Não escala (típico R$ 100-500/mês)
- Depende de goodwill

---

### 5. Dados Agregados (B2B) - Longo Prazo

**Conceito:** Vender insights anônimos para indústria do entretenimento.

#### Exemplos de Insights
- "70% dos usuários brasileiros preferem Comédia Romântica aos domingos"
- "Filmes de Terror têm 3x mais engajamento em outubro"
- "Correlação: quem assiste Stranger Things também assiste Dark"
- "Horário de pico de uso: 20h-23h"

#### Compradores Potenciais
- Plataformas de streaming
- Produtoras brasileiras (Globo, etc.)
- Agências de marketing
- Pesquisadores acadêmicos

#### Requisitos
- Volume significativo (100k+ usuários)
- Dados anonimizados (LGPD)
- Transparência nos Terms of Service
- Infraestrutura de relatórios

#### Prós
- Alta receita potencial
- Não afeta usuário final
- Diferencial competitivo

#### Contras
- Precisa de escala grande
- Complexidade técnica/jurídica
- Esforço de vendas B2B

---

## Modelo Híbrido Recomendado

### Fases de Implementação

```
FASE 1: Construção (0 - 5.000 usuários)
├── Gratuito total
├── Link discreto "Apoiar o projeto"
├── Foco: product-market fit
└── Receita esperada: R$ 0-500/mês

FASE 2: Validação (5.000 - 20.000 usuários)
├── Freemium leve (2-3 features premium)
├── Anúncios sutis (1-2 locais)
├── Afiliado Amazon Prime
├── Doações ativas
└── Receita esperada: R$ 1.000-3.000/mês

FASE 3: Escala (20.000+ usuários)
├── Freemium completo
├── Assinatura R$ 9,90/mês
├── Parcerias com streamings
├── Possível: dados agregados B2B
└── Receita esperada: R$ 5.000-15.000/mês
```

---

## Features que Justificam Pagamento

Baseado nas 88 features planejadas, estas têm maior valor percebido:

| Feature | Justificativa |
|---------|---------------|
| AI Curator | Custo real de API (OpenAI) |
| Match Mode Ilimitado | Feature social única no mercado |
| Temas Exclusivos | Personalização/vaidade |
| Share Cards Premium | Templates bonitos para Stories |
| Life Stats Completo | Dados detalhados de consumo |
| Listas Ilimitadas | Power users precisam |
| Experiência Sem Anúncios | Limpeza visual |
| Badge "Apoiador" | Status social no app |
| Calendário Sync | Export para Google Calendar |
| Notificações Prioritárias | Saber antes dos outros |
| CineTok Ilimitado | Feed de trailers |
| Cine-Batalha Avançado | Modos especiais |

---

## Projeção de Receita

### Cenário: 10.000 usuários ativos/mês

| Fonte | Cálculo | Receita Mensal |
|-------|---------|----------------|
| Premium R$ 9,90 | 3% conversão = 300 | R$ 2.970 |
| Anúncios | CPM R$ 3 | R$ 300-500 |
| Afiliados | 0.5% cliques | R$ 100-200 |
| Doações | 20 apoiadores médios | R$ 200-400 |
| **Total** | | **R$ 3.500-4.000** |

### Custos Estimados

| Item | Custo Mensal |
|------|--------------|
| Domínio (.com.br) | ~R$ 3 |
| Hosting/CDN | R$ 0-50 (Vercel/Netlify free tier) |
| Supabase | R$ 0-100 (free tier generoso) |
| OpenAI API (AI Curator) | R$ 100-300 |
| **Total** | **R$ 100-450** |

### Lucro Potencial
- **Receita:** R$ 3.500-4.000
- **Custos:** R$ 100-450
- **Sobra:** R$ 3.000-3.900/mês

---

## Implementação Técnica (Notas)

### Sistema de Assinatura

**Opções de Payment Gateway:**
- Stripe (internacional, bem documentado)
- PagSeguro (brasileiro, PIX)
- Mercado Pago (brasileiro, popular)
- Hotmart (recorrência fácil)

**Schema Supabase:**
```sql
-- Adicionar à tabela users
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN subscription_id TEXT; -- ID do gateway

-- Tabela de histórico de pagamentos
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  gateway TEXT, -- 'stripe', 'mercadopago', etc
  gateway_payment_id TEXT,
  status TEXT, -- 'pending', 'completed', 'failed', 'refunded'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Verificação no Frontend:**
```javascript
const PREMIUM_FEATURES = [
  'ai_curator',
  'unlimited_match',
  'premium_themes',
  'advanced_stats',
  'no_ads'
];

function canAccess(feature) {
  if (!PREMIUM_FEATURES.includes(feature)) return true;
  return currentUser?.subscription_tier === 'premium';
}

function requirePremium(feature, callback) {
  if (canAccess(feature)) {
    callback();
  } else {
    showUpgradeModal(feature);
  }
}
```

---

## Considerações Éticas

### O que fazer
- Ser transparente sobre o que é grátis vs pago
- Garantir que versão free ainda seja útil
- Respeitar dados do usuário (LGPD)
- Anúncios claramente marcados como tal
- Facilitar cancelamento de assinatura

### O que NÃO fazer
- Dark patterns para forçar upgrade
- Vender dados individuais
- Anúncios disfarçados de conteúdo
- Dificultar cancelamento
- Mudar termos sem aviso

---

## Próximos Passos (Quando Decidir)

1. [ ] Definir quais features serão premium
2. [ ] Escolher gateway de pagamento
3. [ ] Implementar sistema de tiers no Supabase
4. [ ] Criar página de pricing
5. [ ] Configurar webhook de pagamentos
6. [ ] Testar fluxo completo
7. [ ] Criar página de "Apoiar" (doações)
8. [ ] Cadastrar no Amazon Associates

---

## Referências

- [Stripe Docs](https://stripe.com/docs)
- [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- [Supabase Auth + Stripe](https://supabase.com/docs/guides/auth/auth-stripe)
- [Amazon Associates Brasil](https://associados.amazon.com.br/)
- [Apoia.se para Criadores](https://apoia.se/)

---

**Nota:** Este documento é apenas um brainstorm. Decisões finais devem considerar:
- Objetivo pessoal do projeto (portfólio vs produto)
- Tempo disponível para desenvolvimento
- Feedback real de usuários
- Análise da concorrência
- Aspectos legais (MEI, notas fiscais, etc.)
