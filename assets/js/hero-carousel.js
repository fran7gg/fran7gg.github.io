(function() {
    "use strict";

    const AUTOPLAY_INTERVAL = 4500;
    const carousel = document.querySelector("[data-fran7-carousel]");
    if (!carousel) return;

    const track = carousel.querySelector("[data-carousel-track]");
    const indicatorsContainer = carousel.querySelector("[data-carousel-indicators]");
    const status = carousel.querySelector("[data-carousel-status]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function showError(message, error) {
        console.error(message, error);
        status.textContent = message;
        status.hidden = false;
        carousel.classList.add("is-unavailable");
    }

    function addText(parent, tagName, className, value) {
        if (typeof value !== "string" || !value.trim()) return;

        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = value.trim();
        parent.appendChild(element);
    }

    function addButton(parent, label, destination) {
        if (typeof label !== "string" || !label.trim() ||
            typeof destination !== "string" || !destination.trim()) {
            return;
        }

        const address = destination.trim();
        const explicitScheme = /^[a-z][a-z\d+.-]*:/i.test(address);
        let url;
        try {
            url = new URL(address, window.location.href);
        } catch (error) {
            console.error("Botão do banner ignorado: o endereço no Supabase não é válido.", destination, error);
            return;
        }

        if (
            (explicitScheme && url.protocol !== "http:" && url.protocol !== "https:") ||
            (address.startsWith("//") && url.protocol !== "http:" && url.protocol !== "https:")
        ) {
            console.error("Botão do banner ignorado: só são aceites endereços HTTP ou HTTPS.", destination);
            return;
        }

        const button = document.createElement("a");
        button.className = "fran7-carousel-link";
        button.href = url.href;
        button.textContent = label.trim();
        parent.appendChild(button);
    }

    function isVideoUrl(source) {
        try {
            const url = new URL(source, window.location.href);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                throw new TypeError("Só são aceites endereços HTTP ou HTTPS.");
            }
            return /\.(mp4|webm|ogv)$/i.test(url.pathname);
        } catch (error) {
            console.error("Banner do Supabase ignorado: o endereço da mídia não é válido.", source, error);
            return null;
        }
    }

    function createSlide(record, index) {
        const mediaUrl = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!record.id || !mediaUrl) {
            console.error("Banner do Supabase ignorado: falta o ID ou o URL da mídia.", record.id);
            return null;
        }

        const slide = document.createElement("figure");
        slide.className = "fran7-carousel-slide";
        slide.dataset.carouselSlide = "";
        slide.setAttribute("aria-hidden", "true");
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");

        const videoUrl = isVideoUrl(mediaUrl);
        if (videoUrl === null) return null;
        let media;
        if (videoUrl) {
            media = document.createElement("video");
            media.src = mediaUrl;
            media.muted = true;
            media.playsInline = true;
            media.preload = index === 0 ? "auto" : "none";
            media.controls = reduceMotion.matches;
            media.setAttribute("aria-label", "Vídeo da campanha FRAN7 " + (index + 1));
        } else {
            media = document.createElement("img");
            media.src = mediaUrl;
            media.alt = "Imagem da campanha FRAN7 " + (index + 1);
            media.loading = index === 0 ? "eager" : "lazy";
            if (index === 0) media.fetchPriority = "high";
        }
        slide.appendChild(media);

        const eyebrow = typeof record.etiqueta === "string" ? record.etiqueta.trim() : "";
        const title = typeof record.titulo === "string" ? record.titulo.trim() : "";
        const description = typeof record.descricao === "string" ? record.descricao.trim() : "";
        const buttonText = typeof record.texto_botao === "string" ? record.texto_botao.trim() : "";

        if (eyebrow || title || description || buttonText) {
            const caption = document.createElement("figcaption");
            caption.className = "fran7-carousel-caption";

            addText(caption, "p", "fran7-carousel-eyebrow", eyebrow);
            addText(caption, "h2", "fran7-carousel-title", title);
            addText(caption, "p", "fran7-carousel-description", description);
            const actions = document.createElement("div");
            actions.className = "fran7-carousel-actions";
            addButton(actions, buttonText, record.link_botao);
            if (actions.childElementCount) caption.appendChild(actions);
            slide.appendChild(caption);
        }

        media.addEventListener("error", function() {
            console.error("Não foi possível carregar a mídia do banner do Supabase.", record.id);
            slide.remove();
            const indicator = Array.from(
                indicatorsContainer.querySelectorAll("[data-carousel-indicator]")
            ).find(function(item) {
                return item.dataset.carouselRecord === record.id;
            });
            if (indicator) indicator.remove();
            updateCarousel();
            startAutoplay();
        }, { once: true });

        return slide;
    }

    let activeIndex = 0;
    let timer = null;
    let slides = [];

    function updateCarousel() {
        slides = Array.from(track.querySelectorAll("[data-carousel-slide]"));

        if (!slides.length) {
            stopAutoplay();
            carousel.classList.add("is-unavailable");
            status.textContent = "Não há banners ativos na coleção do Supabase.";
            status.hidden = false;
            indicatorsContainer.hidden = true;
            return;
        }

        const indicators = Array.from(
            indicatorsContainer.querySelectorAll("[data-carousel-indicator]")
        );
        activeIndex = Math.min(activeIndex, slides.length - 1);
        slides.forEach(function(slide, slideIndex) {
            const active = slideIndex === activeIndex;
            slide.classList.toggle("is-active", active);
            slide.setAttribute("aria-hidden", String(!active));
            slide.setAttribute("aria-label", (slideIndex + 1) + " de " + slides.length);
            slide.inert = !active;

            const video = slide.querySelector("video");
            if (!video) return;

            video.controls = active && reduceMotion.matches;
            if (active && !reduceMotion.matches) {
                video.play().catch(function(error) {
                    console.error("Não foi possível reproduzir automaticamente o vídeo do banner.", error);
                    if (slides[activeIndex] === slide) {
                        video.controls = true;
                        if (slides.length > 1) {
                            timer = window.setTimeout(function() {
                                showSlide(activeIndex + 1);
                                startAutoplay();
                            }, AUTOPLAY_INTERVAL);
                        }
                    }
                });
            } else {
                video.pause();
                if (video.readyState > 0) video.currentTime = 0;
            }
        });

        indicators.forEach(function(indicator, indicatorIndex) {
            const active = indicatorIndex === activeIndex;
            indicator.dataset.carouselIndicator = String(indicatorIndex);
            indicator.setAttribute("aria-current", String(active));
            indicator.setAttribute("aria-label", "Mostrar banner " + (indicatorIndex + 1) + " de " + slides.length);
        });

        status.hidden = true;
        indicatorsContainer.hidden = slides.length < 2;
        carousel.classList.remove("is-unavailable");
    }

    function showSlide(index) {
        if (!slides.length) return;
        activeIndex = (index + slides.length) % slides.length;
        updateCarousel();
    }

    function stopAutoplay() {
        window.clearTimeout(timer);
        timer = null;
        if (activeVideo && activeVideoEndHandler) {
            activeVideo.removeEventListener("ended", activeVideoEndHandler);
        }
        activeVideo = null;
        activeVideoEndHandler = null;
    }

    let activeVideo = null;
    let activeVideoEndHandler = null;

    function startAutoplay() {
        stopAutoplay();
        if (slides.length < 2 || reduceMotion.matches || document.hidden) return;

        const activeSlide = slides[activeIndex];
        const video = activeSlide && activeSlide.querySelector("video");
        if (video) {
            activeVideo = video;
            activeVideoEndHandler = function() {
                showSlide(activeIndex + 1);
                startAutoplay();
            };
            video.addEventListener("ended", activeVideoEndHandler, { once: true });
            return;
        }

        timer = window.setTimeout(function() {
            showSlide(activeIndex + 1);
            startAutoplay();
        }, AUTOPLAY_INTERVAL);
    }

    indicatorsContainer.addEventListener("click", function(event) {
        const indicator = event.target.closest("[data-carousel-indicator]");
        if (!indicator) return;
        showSlide(Number(indicator.dataset.carouselIndicator));
        startAutoplay();
    });

    document.addEventListener("visibilitychange", function() {
        if (document.hidden) {
            stopAutoplay();
            slides.forEach(function(slide) {
                const video = slide.querySelector("video");
                if (video) video.pause();
            });
        } else {
            updateCarousel();
            startAutoplay();
        }
    });
    reduceMotion.addEventListener("change", function() {
        updateCarousel();
        startAutoplay();
    });

    async function loadBanners() {
        try {
            const supabase = window.Fran7Supabase.getClient();
            let result = await supabase
                .from("fran7_banners")
                .select("*")
                .eq("ativo", true)
                .eq("categoria", "banner_1")
                .order("ordem", { ascending: true })
                .limit(50);
            if (result.error) {
                const missingCategoryColumn =
                    result.error.code === "42703" ||
                    result.error.code === "PGRST204" ||
                    (String(result.error.message || "").toLowerCase().includes("categoria") &&
                        String(result.error.message || "").toLowerCase().includes("schema cache"));
                if (!missingCategoryColumn) {
                    throw result.error;
                }

                console.warn(
                    "A coluna categoria ainda não existe em fran7_banners. A carregar os banners antigos; aplica a migração de categorias para separar as áreas."
                );
                result = await supabase
                    .from("fran7_banners")
                    .select("*")
                    .eq("ativo", true)
                    .order("ordem", { ascending: true })
                    .limit(50);
                if (result.error) {
                    throw result.error;
                }
            }

            (result.data || []).forEach(function(record, index) {
                const slide = createSlide(record, index);
                if (!slide) return;

                const indicator = document.createElement("button");
                indicator.className = "fran7-carousel-dot";
                indicator.type = "button";
                indicator.dataset.carouselIndicator = String(track.children.length);
                indicator.dataset.carouselRecord = record.id;
                indicator.setAttribute("aria-current", "false");
                indicator.setAttribute("aria-label", "Mostrar imagem " + (track.children.length + 1));

                track.appendChild(slide);
                indicatorsContainer.appendChild(indicator);
            });

            activeIndex = 0;
            updateCarousel();
            startAutoplay();
        } catch (error) {
            showError(
                "Não foi possível carregar a coleção de banners do Supabase.",
                error
            );
        }
    }

    loadBanners();
})();
