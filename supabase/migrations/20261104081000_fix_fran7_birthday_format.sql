DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'fran7_profiles'
          AND column_name = 'aniversario'
          AND data_type = 'date'
    ) THEN
        EXECUTE $migration$
            ALTER TABLE public.fran7_profiles
            ALTER COLUMN aniversario TYPE text
            USING CASE
                WHEN aniversario IS NULL THEN NULL
                ELSE to_char(aniversario, 'DD/MM')
            END
        $migration$;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS create_cliente_from_auth_user ON auth.users;

CREATE OR REPLACE FUNCTION public.fran7_create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.fran7_profiles (id, nome, telefone, aniversario)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'telefone', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'aniversario', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
