ALTER TABLE public.fran7_banners
    ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'banner_1';

ALTER TABLE public.fran7_banners
    DROP CONSTRAINT IF EXISTS fran7_banners_categoria_check;

ALTER TABLE public.fran7_banners
    ADD CONSTRAINT fran7_banners_categoria_check
    CHECK (categoria IN ('banner_1', 'banner_2', 'homens', 'mulheres', 'criancas'));

CREATE INDEX IF NOT EXISTS fran7_banners_category_active_order_idx
    ON public.fran7_banners (categoria, ativo, ordem);

COMMENT ON COLUMN public.fran7_banners.categoria IS
    'banner_1: carrossel do topo; banner_2: Descubra a FRAN7; homens, mulheres e criancas: banner após o quarto produto da coleção.';
