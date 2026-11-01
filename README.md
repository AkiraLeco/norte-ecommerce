# NORTE — E-commerce de moda (React + Express + SQLite local)

Loja virtual completa: vitrine, catálogo com filtros, página de produto com variações (cor × tamanho), carrinho, checkout transacional, área do cliente e painel administrativo. Todos os dados ficam em um arquivo **SQLite local** (`server/database/loja.db`), acessado só pelo servidor Node via `better-sqlite3`; o navegador conversa apenas com a API Express.

## Requisitos
- Node.js 18+ (testado no Node 24) e npm.

## Instalação e execução
```bash
npm install        # instala client e server (npm workspaces)
npm run dev        # API em :3001 + loja em http://localhost:5173
```
Na primeira execução o banco é criado, as tabelas são geradas, um administrador é criado e, se o catálogo estiver vazio, os **dados demonstrativos** são inseridos. O banco **não** é recriado nas execuções seguintes.

Contas de demonstração:

| Perfil  | E-mail             | Senha        |
|---------|--------------------|--------------|
| Admin   | admin@loja.com     | admin123     |
| Cliente | cliente@loja.com   | cliente123   |

> Troque a senha do admin (variáveis `ADMIN_EMAIL`/`ADMIN_PASSWORD` antes do primeiro start) em qualquer uso real.

Painel: http://localhost:5173/admin (aparece também em "Minha conta" para admins).

## Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | API + frontend com recarga automática |
| `npm start` | gera o build do React e serve tudo pela API (porta 3001) |
| `npm run db:init` | cria/atualiza tabelas (idempotente) |
| `npm run db:seed` | insere dados demonstrativos se o catálogo estiver vazio |
| `npm run db:restore-demo` | **apaga** catálogo, pedidos e clientes e restaura os dados demo (faz backup antes) |
| `npm run db:backup` | cópia consistente do banco em `server/database/backups/` |
| `npm test` | teste ponta a ponta da API em um banco temporário |

## Configuração (`.env`)
Copie `.env.example` para `.env` (opcional em desenvolvimento). Em produção `JWT_SECRET` é obrigatório. Nenhuma credencial vai para o frontend.

## Estrutura
```
client/src   components · pages (+admin) · context · hooks · services · styles
server       config · database (database.js, init.js, seed.js, backup.js, loja.db)
             models · controllers · routes · middlewares · utils · uploads/{products,categories,banners}
```

## Banco de dados
Tabelas: users, products, categories, product_images, product_variants, sizes, colors, inventory, carts, cart_items, orders, order_items, addresses, coupons, store_settings (+ favorites, banners, order_history). Chaves estrangeiras ativas, índices, `CHECK`s, WAL e transações nas operações críticas (pedido, cancelamento, sincronização de carrinho, produto/variações).
**Valores monetários são inteiros em centavos.** Cada combinação cor × tamanho é uma variação com estoque próprio.

## Regras importantes
- **Checkout**: o servidor recalcula preços, valida estoque, cupom e frete, baixa o estoque e grava o pedido numa única transação (qualquer falha desfaz tudo). Cancelar um pedido devolve estoque e cupom.
- **Pagamento**: nenhum pagamento é simulado como processado. Os métodos são de **confirmação manual** (Pix, transferência, retirada), configuráveis em Admin → Configurações; o pedido fica "Aguardando pagamento" até o admin confirmar. O `payment_method` é um identificador pronto para uma futura integração com gateway.
- **Carrinho**: visitantes usam `localStorage` (só variação + quantidade; preços sempre vêm do banco); ao entrar, o carrinho é mesclado ao carrinho salvo no SQLite. O checkout exige login.
- **Frete**: valor fixo com frete grátis acima de um mínimo (configurável).
- **Segurança**: bcrypt (bcryptjs), JWT com expiração, papéis verificados no banco a cada requisição, validação com Zod, consultas parametrizadas, Helmet (CSP), rate limiting (extra no login/cadastro), CORS por origem, upload restrito a imagens (JPG/PNG/WEBP/AVIF/GIF, 5 MB).

## API (resumo)
`/api/auth/{register,login,me}` · `/api/products` (+ `/filters`, `/:id`, imagens) · `/api/categories` · `/api/cart` (`/items`, `/sync`, `/resolve`) · `/api/orders` (`/:id`, `/:id/status`) · `/api/inventory` · `/api/favorites` · `/api/coupons` (`/validate`) · `/api/admin/{dashboard,customers,settings,banners,backup}` · `/api/settings` · `/api/addresses`.

## Imagens
Os produtos demonstrativos usam ilustrações SVG geradas localmente (`server/database/artwork.js`) — sem dependência externa. No painel, envie fotos reais por produto (e por cor); elas vão para `server/uploads/*`.
