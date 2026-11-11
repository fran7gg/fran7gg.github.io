(function() {
    "use strict";

    const ROTATION_INTERVAL = 4500;
    const MAX_BANNERS = 5;
    const section = document.querySelector("[data-fran7-catalog-banner]");
    if (!section) {
        return;
    }

    const slidesContainer = section.querySelector("[data-catalog-banner-slides]");
    const indicatorsContainer = section.querySelector("[data-catalog-banner-indicators]");
    if (!slidesContainer || !indicatorsContainer) {
        console.error("Banner de catálogo sem áreas de imagens ou indicadores.");
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeIndex = 0;
    let timer = null;
    let slides = [];
    let indicators = [];

    function showSlide(index) {
        if (!slides.length) return;
        activeIndex = (index + slides.length) % slides.length;
        slides.forEach(function(slide, slideIndex) {
            const active = slideIndex === activeIndex;
            slide.classList.toggle("is-active", active);
            indicators[slideIndex].setAttribute("aria-current", String(active));
        });
    }

    function stopRotation() {
        window.clearInterval(timer);
        timer = null;
    }

    function startRotation() {
        stopRotation();
        if (slides.length < 2 || reduceMotion.matches || document.hidden) return;
        timer = window.setInterval(function() {
            showSlide(activeIndex + 1);
        }, ROTATION_INTERVAL);
    }

    function validateImage(record) {
        const source = typeof record.imagem === "string" ? record.imagem.trim() : "";
        let url;
        try {
            url = new URL(source, window.location.href);
        } catch (error) {
            console.error("Banner de catálogo ignorado: URL da imagem inválida.", record.id, error);
            return Promise.resolve(null);
        }

        if ((url.protocol !== "http:" && url.protocol !== "https:") || !record.id) {
            console.error("Banner de catálogo ignorado: falta ID ou URL HTTP(S) válido.", record.id);
            return Promise.resolve(null);
        }

        return new Promise(function(resolve) {
            const image = new Image();
            image.onload = function() {
                if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                    resolve({ id: record.id, src: url.href });
                    return;
                }
                console.error("Banner de catálogo ignorado: a imagem não contém conteúdo visual.", record.id);
                resolve(null);
            };
            image.onerror = function() {
                console.error("Banner de catálogo ignorado: não foi possível carregar a imagem.", record.id);
                resolve(null);
            };
            image.src = url.href;
        });
    }

    function removeFailedImage(slide, indicator, recordId) {
        console.error("Não foi possível carregar a imagem do banner de catálogo.", recordId);
        const removedIndex = slides.indexOf(slide);
        if (removedIndex < 0) return;

        slides.splice(removedIndex, 1);
        indicators.splice(removedIndex, 1);
        slide.remove();
        indicator.remove();

        if (!slides.length) {
            stopRotation();
            section.hidden = true;
            return;
        }
        const nextIndex = activeIndex - (removedIndex < activeIndex ? 1 : 0);
        showSlide(Math.min(nextIndex, slides.length - 1));
        startRotation();
    }

    async function carregarBanner() {
        try {
            const result = await window.Fran7Supabase.getClient()
                .from("fran7_banners")
                .select("id, imagem")
                .eq("categoria", "banner_2")
                .eq("ativo", true)
                .order("ordem", { ascending: true })
                .limit(MAX_BANNERS);

            if (result.error) {
                throw result.error;
            }

            const records = result.data || [];
            if (!records.length) {
                console.warn("Não há banner ativo com a categoria banner_2 em fran7_banners.");
                section.hidden = true;
                return;
            }

            const checkedImages = await Promise.all(records.map(validateImage));
            const seenImages = new Set();
            const validImages = checkedImages.filter(function(image) {
                if (!image || seenImages.has(image.src)) return false;
                seenImages.add(image.src);
                return true;
            });
            if (!validImages.length) {
                section.hidden = true;
                return;
            }

            validImages.forEach(function(record, index) {
                const slide = document.createElement("img");
                slide.className = "catalogo-banner-imagem";
                slide.alt = "";
                slide.loading = index === 0 ? "eager" : "lazy";
                if (index === 0) slide.fetchPriority = "high";

                const indicator = document.createElement("button");
                indicator.className = "catalogo-banner-indicador";
                indicator.type = "button";
                indicator.setAttribute("aria-label", "Mostrar imagem " + (index + 1));
                indicator.setAttribute("aria-current", "false");
                indicator.addEventListener("click", function() {
                    showSlide(indicators.indexOf(indicator));
                    startRotation();
                });

                slide.addEventListener("error", function() {
                    removeFailedImage(slide, indicator, record.id);
                }, { once: true });
                slide.src = record.src;
                slidesContainer.appendChild(slide);
                indicatorsContainer.appendChild(indicator);
                slides.push(slide);
                indicators.push(indicator);
            });

            showSlide(0);
            section.hidden = false;
            startRotation();
        } catch (error) {
            console.error("Não foi possível carregar o banner de catálogo do Supabase.", error);
            section.hidden = true;
        }
    }

    document.addEventListener("visibilitychange", function() {
        if (document.hidden) {
            stopRotation();
        } else {
            startRotation();
        }
    });
    reduceMotion.addEventListener("change", startRotation);

    carregarBanner();
})();
