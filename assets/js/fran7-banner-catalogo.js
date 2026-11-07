(function() {
    "use strict";

    const section = document.querySelector("[data-fran7-catalog-banner]");
    if (!section) {
        return;
    }

    const image = section.querySelector(".catalogo-banner-imagem");
    if (!image) {
        console.error("Banner de catálogo sem elemento de imagem.");
        return;
    }

    async function carregarBanner() {
        try {
            const result = await window.Fran7Supabase.getClient()
                .from("fran7_banners")
                .select("id, imagem")
                .eq("categoria", "banner_2")
                .eq("ativo", true)
                .order("ordem", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (result.error) {
                throw result.error;
            }

            if (!result.data || typeof result.data.imagem !== "string" || !result.data.imagem.trim()) {
                console.warn("Não há banner ativo com a categoria banner_2 em fran7_banners.");
                section.hidden = true;
                return;
            }

            image.addEventListener("error", function() {
                console.error("Não foi possível carregar a imagem do banner de catálogo.", result.data.id);
                section.hidden = true;
            }, { once: true });

            image.src = result.data.imagem.trim();
            image.hidden = false;
            section.hidden = false;
        } catch (error) {
            console.error("Não foi possível carregar o banner de catálogo do Supabase.", error);
            section.hidden = true;
        }
    }

    carregarBanner();
})();
