ALTER TABLE public.fran7_profiles
    DROP CONSTRAINT IF EXISTS fran7_profiles_role_check;

ALTER TABLE public.fran7_profiles
    ADD CONSTRAINT fran7_profiles_role_check
    CHECK (role IN ('customer', 'admin', 'support_agent'));

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

    IF new_role IS NULL OR new_role NOT IN ('admin', 'customer', 'support_agent') THEN
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

    IF current_role = 'admin' AND new_role <> 'admin' THEN
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

CREATE OR REPLACE FUNCTION public.fran7_can_access_support()
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
          AND role IN ('admin', 'support_agent')
    );
$$;

REVOKE ALL ON FUNCTION public.fran7_can_access_support() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fran7_can_access_support() TO authenticated;

DROP POLICY IF EXISTS "support_insert_authenticated" ON public.fran7_support_messages;
CREATE POLICY "support_insert_authenticated" ON public.fran7_support_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.uid())
        AND estado = 'aberta'
        AND resposta = ''
    );

DROP POLICY IF EXISTS "support_read_own_or_admin" ON public.fran7_support_messages;
CREATE POLICY "support_read_own_or_agent" ON public.fran7_support_messages
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR (SELECT public.fran7_can_access_support())
    );

DROP POLICY IF EXISTS "support_admin_update" ON public.fran7_support_messages;
CREATE POLICY "support_agent_update" ON public.fran7_support_messages
    FOR UPDATE TO authenticated
    USING ((SELECT public.fran7_can_access_support()))
    WITH CHECK ((SELECT public.fran7_can_access_support()));

REVOKE INSERT ON public.fran7_support_messages FROM authenticated;
GRANT INSERT (user_id, nome_cliente, email_cliente, contacto, mensagem)
    ON public.fran7_support_messages TO authenticated;

NOTIFY pgrst, 'reload schema';
