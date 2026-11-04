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

CREATE INDEX IF NOT EXISTS fran7_product_comments_product_created_idx
    ON public.fran7_product_comments (product_id, created_at DESC);

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

DROP TRIGGER IF EXISTS fran7_product_comment_author ON public.fran7_product_comments;
CREATE TRIGGER fran7_product_comment_author
    BEFORE INSERT ON public.fran7_product_comments
    FOR EACH ROW EXECUTE FUNCTION public.fran7_set_product_comment_author();

ALTER TABLE public.fran7_product_comments ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT ON public.fran7_product_comments TO anon, authenticated;
GRANT INSERT ON public.fran7_product_comments TO authenticated;
GRANT DELETE ON public.fran7_product_comments TO authenticated;

NOTIFY pgrst, 'reload schema';
