# Configuração da loja FRAN7 no Supabase

A loja usa as tabelas `fran7_*` criadas pela migração
`migrations/20261104070000_fran7_store.sql`. A tabela antiga `clientes_fran7`
não é apagada nem alterada.

## 1. Criar as tabelas e permissões

No projeto `fran7`, abre **SQL Editor**, cola o conteúdo da migração acima e
executa-o. A migração cria os perfis, produtos, variantes, encomendas,
classificações, comentários de produtos e mensagens de suporte, com políticas
RLS ativadas.

## 2. Configurar a chave pública no site

Em **Project Settings → API Keys**, copia a chave **publishable** (ou a chave
`anon` legada) e coloca-a em `assets/js/fran7-checkout-config.js`, no campo
`anonKey` de `FRAN7_SUPABASE_CONFIG`.

Essa chave pública é usada no navegador e só é segura com as políticas RLS da
migração aplicadas. **Nunca** coloques uma chave `secret` ou `service_role`
nesse ficheiro, no site ou no GitHub.

## 3. Dar acesso de administrador à tua conta

A migração cria um perfil para cada utilizador Supabase existente com a função
`customer`. No SQL Editor, substitui o endereço de exemplo pelo e-mail da tua
conta e executa:

```sql
UPDATE public.fran7_profiles
SET role = 'admin'
WHERE id = (
    SELECT id
    FROM auth.users
    WHERE lower(email) = lower('o-teu-email@example.com')
);
```

O painel `admin-suporte.html` só aceita contas cuja função seja `admin`.
Utilizadores novos continuam a ser `customer`.

## 4. Publicar a função de eliminação de conta

Na raiz do repositório, com a Supabase CLI instalada e ligada ao projeto
`pqvnqloukcwwtavdyjry`, executa:

```sh
supabase functions deploy fran7-delete-account
```

A função usa `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor da Edge Function;
não copies essa chave para o site. A função `fran7-ia` existente não é alterada.

## 5. Confirmar autenticação e recuperação de palavra-passe

Em **Authentication → URL Configuration**, configura o URL publicado do site
como **Site URL** e adiciona os URLs do site e de desenvolvimento a
**Redirect URLs**. A recuperação usa `redefinir-palavra-passe.html`.

O envio de e-mails de confirmação e recuperação depende das definições de
Authentication/SMTP do projeto. Testa o registo, início de sessão e recuperação
antes de anunciar a loja.

## 6. Inserir produtos

Em **Table Editor**, adiciona linhas em `fran7_products`. `texto` é o nome do
produto, `imagem` deve ser um URL HTTPS público, `preco` é numérico e
`categoria` é uma lista (por exemplo `{homens,destaques}`). As categorias de
coleção usadas pelo site são `homens`, `mulheres` e `criancas`; `destaques`
mostra o produto na página inicial.

Para tamanhos e cores, adiciona linhas em `fran7_variants` e associa cada uma
ao `id` do produto em `produto_id`. Também aí `imagem` deve ser um URL público.
Sem produtos e imagens válidos, as páginas de catálogo aparecem vazias.

## 7. Comentários de produtos

Os comentários são guardados em `fran7_product_comments` e ficam visíveis
publicamente. Só utilizadores autenticados podem publicar; cada comentário é
associado ao produto e à conta que o publicou.

Se o esquema principal já tiver sido aplicado, executa também, no SQL Editor,
o conteúdo de `migrations/20261104083000_fran7_product_comments.sql`.

## Backups

O plano gratuito pode pausar projetos pouco usados e não substitui backups.
Exporta periodicamente os dados importantes e guarda a cópia fora do Supabase.
