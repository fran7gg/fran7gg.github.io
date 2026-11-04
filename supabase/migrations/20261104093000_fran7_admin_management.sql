ALTER TABLE public.fran7_profiles
    ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';

UPDATE public.fran7_profiles p
SET email = COALESCE(u.email, '')
FROM auth.users u
WHERE u.id = p.id;

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
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
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
GRANT EXECUTE ON FUNCTION public.fran7_set_profile_role(uuid, text)
    TO authenticated;

REVOKE UPDATE ON public.fran7_profiles FROM authenticated;
GRANT UPDATE (nome, telefone, aniversario, updated_at)
    ON public.fran7_profiles TO authenticated;

NOTIFY pgrst, 'reload schema';
