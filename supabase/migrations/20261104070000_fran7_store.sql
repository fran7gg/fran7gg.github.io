CREATE TABLE IF NOT EXISTS public.fran7_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email text NOT NULL DEFAULT '',
    nome text NOT NULL DEFAULT '',
    telefone text NOT NULL DEFAULT '',
    aniversario text,
    role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fran7_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    texto text NOT NULL,
    imagem text NOT NULL DEFAULT '',
    preco numeric(12, 2),
    descricao text NOT NULL DEFAULT '',
    categoria text[] NOT NULL DEFAULT '{}',
    stock integer,
    reservar boolean NOT NULL DEFAULT false,
    imagens_extra text[] NOT NULL DEFAULT '{}',
    vistas text[] NOT NULL DEFAULT '{}',
    cores text[] NOT NULL DEFAULT '{}',
    imagem_costas text NOT NULL DEFAULT '',
    modelo_3d text NOT NULL DEFAULT '',
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fran7_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid NOT NULL REFERENCES public.fran7_products (id) ON DELETE CASCADE,
    cor text NOT NULL,
    tamanho text NOT NULL DEFAULT '',
    preco numeric(12, 2),
    stock integer,
    imagem text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fran7_banners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    imagem text NOT NULL,
    etiqueta text NOT NULL DEFAULT '',
    titulo text NOT NULL DEFAULT '',
    descricao text NOT NULL DEFAULT '',
    texto_botao text NOT NULL DEFAULT '',
    link_botao text NOT NULL DEFAULT '',
    ativo boolean NOT NULL DEFAULT true,
    ordem integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fran7_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pedido text NOT NULL UNIQUE,
    user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    estado text NOT NULL DEFAULT 'aguardando_confirmacao',
    dados jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fran7_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid NOT NULL REFERENCES public.fran7_products (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (produto_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.fran7_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    nome_cliente text NOT NULL DEFAULT '',
    email_cliente text NOT NULL DEFAULT '',
    contacto text NOT NULL DEFAULT '',
    mensagem text NOT NULL,
    resposta text NOT NULL DEFAULT '',
    estado text NOT NULL DEFAULT 'aberta',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fran7_product_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.fran7_products (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    author_name text NOT NULL DEFAULT 'Cliente FRAN7'
        CHECK (char_length(author_name) BETWEEN 1 AND 80),
    comment text NOT NULL
        CHECK (char_length(btrim(comment)) BETWEEN 1 AND 1000),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.fran7_rating_summary
WITH (security_invoker = false)
AS
SELECT
    produto_id,
    round(avg(rating)::numeric, 2) AS average_rating,
    count(*)::integer AS rating_count
FROM public.fran7_ratings
GROUP BY produto_id;

CREATE INDEX IF NOT EXISTS fran7_variants_product_id_idx
    ON public.fran7_variants (produto_id);
CREATE INDEX IF NOT EXISTS fran7_products_active_idx
    ON public.fran7_products (ativo, created_at DESC);
CREATE INDEX IF NOT EXISTS fran7_orders_user_id_idx
    ON public.fran7_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fran7_ratings_product_id_idx
    ON public.fran7_ratings (produto_id);
CREATE INDEX IF NOT EXISTS fran7_support_messages_user_id_idx
    ON public.fran7_support_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fran7_product_comments_product_created_idx
    ON public.fran7_product_comments (product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.fran7_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.fran7_profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.fran7_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.fran7_profiles (id, email, nome, telefone, aniversario)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'telefone', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'aniversario', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fran7_set_profile_role(
    target_user_id uuid,
    new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_role text;
    admin_count integer;
BEGIN
    IF NOT public.fran7_is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar funções.'
            USING ERRCODE = '42501';
    END IF;

    IF new_role IS NULL OR new_role NOT IN ('admin', 'customer') THEN
        RAISE EXCEPTION 'Função inválida.';
    END IF;

    IF target_user_id = (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'Não podes alterar a tua própria função.';
    END IF;

    PERFORM pg_advisory_xact_lock(74192731);

    SELECT role
    INTO current_role
    FROM public.fran7_profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil não encontrado.';
    END IF;

    IF current_role = 'admin' AND new_role = 'customer' THEN
        SELECT count(*)::integer
        INTO admin_count
        FROM public.fran7_profiles
        WHERE role = 'admin';

        IF admin_count <= 1 THEN
            RAISE EXCEPTION 'Não é possível remover o último administrador.';
        END IF;
    END IF;

    UPDATE public.fran7_profiles
    SET role = new_role
    WHERE id = target_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.fran7_set_profile_role(uuid, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.fran7_set_product_comment_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.author_name := 'Cliente FRAN7';
    SELECT COALESCE(NULLIF(p.nome, ''), 'Cliente FRAN7')
    INTO NEW.author_name
    FROM public.fran7_profiles p
    WHERE p.id = NEW.user_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fran7_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_cliente_from_auth_user ON auth.users;
CREATE TRIGGER fran7_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fran7_create_profile();

DROP TRIGGER IF EXISTS fran7_product_comment_author ON public.fran7_product_comments;
CREATE TRIGGER fran7_product_comment_author
    BEFORE INSERT ON public.fran7_product_comments
    FOR EACH ROW EXECUTE FUNCTION public.fran7_set_product_comment_author();

INSERT INTO public.fran7_profiles (id, email, nome, telefone, aniversario)
SELECT
    id,
    COALESCE(email, ''),
    COALESCE(raw_user_meta_data ->> 'nome', ''),
    COALESCE(raw_user_meta_data ->> 'telefone', ''),
    NULLIF(raw_user_meta_data ->> 'aniversario', '')
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

ALTER TABLE public.fran7_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fran7_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fran7_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fran7_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fran7_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fran7_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fran7_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fran7_product_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.fran7_profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.fran7_profiles
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()) OR (SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.fran7_profiles;
CREATE POLICY "profiles_update_own" ON public.fran7_profiles
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()) AND role = 'customer');

DROP POLICY IF EXISTS "products_read_active" ON public.fran7_products;
CREATE POLICY "products_read_active" ON public.fran7_products
    FOR SELECT TO anon, authenticated
    USING (ativo OR (SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "products_admin_manage" ON public.fran7_products;
CREATE POLICY "products_admin_manage" ON public.fran7_products
    FOR ALL TO authenticated
    USING ((SELECT public.fran7_is_admin()))
    WITH CHECK ((SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "variants_read_active_products" ON public.fran7_variants;
CREATE POLICY "variants_read_active_products" ON public.fran7_variants
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.fran7_products p
            WHERE p.id = produto_id
              AND (p.ativo OR (SELECT public.fran7_is_admin()))
        )
    );

DROP POLICY IF EXISTS "variants_admin_manage" ON public.fran7_variants;
CREATE POLICY "variants_admin_manage" ON public.fran7_variants
    FOR ALL TO authenticated
    USING ((SELECT public.fran7_is_admin()))
    WITH CHECK ((SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "banners_read_active" ON public.fran7_banners;
CREATE POLICY "banners_read_active" ON public.fran7_banners
    FOR SELECT TO anon, authenticated
    USING (ativo OR (SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "banners_admin_manage" ON public.fran7_banners;
CREATE POLICY "banners_admin_manage" ON public.fran7_banners
    FOR ALL TO authenticated
    USING ((SELECT public.fran7_is_admin()))
    WITH CHECK ((SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "orders_insert_own" ON public.fran7_orders;
CREATE POLICY "orders_insert_own" ON public.fran7_orders
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "orders_read_own_or_admin" ON public.fran7_orders;
CREATE POLICY "orders_read_own_or_admin" ON public.fran7_orders
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR (SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "orders_admin_update" ON public.fran7_orders;
CREATE POLICY "orders_admin_update" ON public.fran7_orders
    FOR UPDATE TO authenticated
    USING ((SELECT public.fran7_is_admin()))
    WITH CHECK ((SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "ratings_read_public" ON public.fran7_ratings;
DROP POLICY IF EXISTS "ratings_read_own_or_admin" ON public.fran7_ratings;
CREATE POLICY "ratings_read_own_or_admin" ON public.fran7_ratings
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR (SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "ratings_manage_own" ON public.fran7_ratings;
CREATE POLICY "ratings_manage_own" ON public.fran7_ratings
    FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "support_insert_authenticated" ON public.fran7_support_messages;
CREATE POLICY "support_insert_authenticated" ON public.fran7_support_messages
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "support_read_own_or_admin" ON public.fran7_support_messages;
CREATE POLICY "support_read_own_or_admin" ON public.fran7_support_messages
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR (SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "support_admin_update" ON public.fran7_support_messages;
CREATE POLICY "support_admin_update" ON public.fran7_support_messages
    FOR UPDATE TO authenticated
    USING ((SELECT public.fran7_is_admin()))
    WITH CHECK ((SELECT public.fran7_is_admin()));

DROP POLICY IF EXISTS "product_comments_read_public" ON public.fran7_product_comments;
CREATE POLICY "product_comments_read_public" ON public.fran7_product_comments
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "product_comments_insert_own" ON public.fran7_product_comments;
CREATE POLICY "product_comments_insert_own" ON public.fran7_product_comments
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "product_comments_admin_delete" ON public.fran7_product_comments;
CREATE POLICY "product_comments_admin_delete" ON public.fran7_product_comments
    FOR DELETE TO authenticated
    USING ((SELECT public.fran7_is_admin()));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.fran7_products, public.fran7_variants, public.fran7_banners,
    public.fran7_rating_summary TO anon, authenticated;
GRANT SELECT ON public.fran7_ratings TO authenticated;
GRANT SELECT, INSERT ON public.fran7_profiles TO authenticated;
REVOKE UPDATE ON public.fran7_profiles FROM authenticated;
GRANT UPDATE (nome, telefone, aniversario, updated_at)
    ON public.fran7_profiles TO authenticated;
GRANT INSERT, SELECT, UPDATE ON public.fran7_orders TO authenticated;
GRANT INSERT, SELECT, UPDATE ON public.fran7_ratings TO authenticated;
GRANT INSERT, SELECT ON public.fran7_support_messages TO authenticated;
GRANT UPDATE (resposta, estado, updated_at) ON public.fran7_support_messages TO authenticated;
GRANT SELECT ON public.fran7_product_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.fran7_product_comments TO authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'fran7_support_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fran7_support_messages;
    END IF;
END;
$$;
GRANT INSERT, UPDATE, DELETE ON public.fran7_products, public.fran7_variants,
    public.fran7_banners TO authenticated;
GRANT EXECUTE ON FUNCTION public.fran7_is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fran7_set_profile_role(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
