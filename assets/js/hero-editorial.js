(function() {
    "use strict";

    const banner = document.querySelector("[data-hero-editorial]");
    if (!banner) return;

    let products = [];
    const featuredButton = banner.querySelector("[data-editorial-featured]");
    const featuredImage = featuredButton.querySelector("img");
    const colorLabel = banner.querySelector("[data-editorial-color]");
    const nameLabel = banner.querySelector("[data-editorial-name]");
    const status = banner.querySelector("[data-editorial-status]");
    const showcase = banner.querySelector(".hero-editorial-showcase");
    const autoplayToggle = banner.querySelector("[data-editorial-toggle]");
    const autoplayLabel = banner.querySelector("[data-editorial-toggle-label]");
    const autoplayIcon = banner.querySelector("[data-editorial-toggle-icon]");
    const lightbox = banner.querySelector("[data-editorial-lightbox]");
    const lightboxImage = lightbox.querySelector("img");
    const lightboxClose = lightbox.querySelector("[data-editorial-close]");
    let selectedProduct = 0;
    let returnFocus = featuredButton;
    let userPaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let currentCarouselSlide = null;
    let currentCarouselIndex = 0;

    function normalizeColor(value) {
        return value.trim().toLocaleLowerCase("pt")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function buildProducts(records) {
        const editorialProducts = [];
        (records || []).forEach(function(record) {
            const name = typeof record.texto === "string" ? record.texto.trim() : "";
            const baseImage = typeof record.imagem === "string" ? record.imagem.trim() : "";
            const variants = Array.isArray(record.fran7_variants) ? record.fran7_variants : [];
            if (!record.id || !name || (!baseImage && !variants.some(function(variant) {
                return typeof variant.imagem === "string" && variant.imagem.trim();
            }))) {
                console.error("Produto do banner editorial ignorado: falta ID, nome ou imagem.", record.id);
                return;
            }

            const seenColors = new Set();
            variants.forEach(function(variant) {
                const color = typeof variant.cor === "string" ? variant.cor.trim() : "";
                const image = typeof variant.imagem === "string" ? variant.imagem.trim() : "";
                if (!color || !image) return;

                const normalizedColor = normalizeColor(color);
                if (seenColors.has(normalizedColor)) return;
                seenColors.add(normalizedColor);
                if (!baseImage) return;
                editorialProducts.push({
                    id: record.id + ":" + normalizedColor,
                    color: color,
                    name: name,
                    image: image
                });
            });

            if (seenColors.size) return;

            const colors = Array.isArray(record.cores)
                ? record.cores.filter(function(color) {
                    return typeof color === "string" && color.trim();
                })
                : [];
            editorialProducts.push({
                id: record.id,
                color: colors.length ? colors.join(" · ") : "FRAN7",
                name: name,
                image: baseImage
            });
        });
        return editorialProducts;
    }

    function broadcastPauseState() {
        document.dispatchEvent(new CustomEvent("fran7:carousel-autoplay", {
            detail: { paused: userPaused }
        }));
    }

    function updateAutoplayControl() {
        autoplayToggle.setAttribute("aria-pressed", String(userPaused));
        autoplayToggle.setAttribute(
            "aria-label",
            (userPaused ? "Retomar" : "Pausar") + " troca automática dos produtos"
        );
        autoplayLabel.textContent = userPaused ? "Retomar" : "Pausar";
        autoplayIcon.textContent = userPaused ? "▶" : "Ⅱ";
    }

    function selectProduct(index, animate) {
        if (!products.length) return;
        selectedProduct = (index + products.length) % products.length;
        const product = products[selectedProduct];
        featuredImage.src = product.image;
        featuredImage.hidden = false;
        featuredImage.alt = product.name + " " + product.color.split(" · ")[0].toLowerCase();
        featuredButton.setAttribute("aria-label", "Ampliar " + featuredImage.alt);
        colorLabel.textContent = product.color;
        nameLabel.textContent = product.name;

        banner.querySelectorAll("[data-editorial-product]").forEach(function(button) {
            const sideIndex = button.dataset.editorialSide === "previous" ?
                (selectedProduct + products.length - 1) % products.length :
                (selectedProduct + 1) % products.length;
            const sideProduct = products[sideIndex];
            const image = button.querySelector("img");
            image.hidden = false;
            button.dataset.editorialProduct = String(sideIndex);
            button.setAttribute(
                "aria-label",
                "Ver " + sideProduct.name + " " + sideProduct.color.split(" · ")[0].toLowerCase()
            );
            image.src = sideProduct.image;
            image.alt = sideProduct.name + " " + sideProduct.color.split(" · ")[0].toLowerCase();
        });

        if (animate) {
            const productsToAnimate = banner.querySelectorAll(".hero-editorial-product");
            productsToAnimate.forEach(function(element) {
                element.classList.remove("is-changing");
                void element.offsetWidth;
                element.classList.add("is-changing");
            });
        }
    }

    function openLightbox(src, alt, trigger) {
        returnFocus = trigger;
        lightboxImage.src = src;
        lightboxImage.alt = alt;
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
        lightboxClose.focus();
    }

    function closeLightbox() {
        if (lightbox.hidden) return;
        lightbox.hidden = true;
        lightboxImage.src = "";
        document.body.style.overflow = "";
        returnFocus.focus();
    }

    banner.addEventListener("click", function(event) {
        const productButton = event.target.closest("[data-editorial-product]");
        if (productButton) {
            selectProduct(Number(productButton.dataset.editorialProduct), true);
        }
    });

    autoplayToggle.addEventListener("click", function() {
        userPaused = !userPaused;
        updateAutoplayControl();
        broadcastPauseState();
    });

    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function(event) {
        if (event.matches) {
            userPaused = true;
            updateAutoplayControl();
            broadcastPauseState();
        }
    });

    document.addEventListener("fran7:carousel-change", function(event) {
        const slideId = event.detail.slideId;
        if (currentCarouselSlide === slideId) return;
        currentCarouselIndex = event.detail.index;

        if (currentCarouselSlide !== null) {
            if (products.length) selectProduct((selectedProduct + 1) % products.length, true);
        } else {
            if (products.length) selectProduct(currentCarouselIndex % products.length, false);
        }
        currentCarouselSlide = slideId;
    });

    featuredButton.addEventListener("click", function() {
        if (!products.length) return;
        openLightbox(products[selectedProduct].image, featuredImage.alt, featuredButton);
    });

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function(event) {
        if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") closeLightbox();
    });

    featuredImage.addEventListener("animationend", function(event) {
        if (event.animationName !== "editorial-product-image-swap") return;
        banner.querySelectorAll(".hero-editorial-product.is-changing").forEach(function(element) {
            element.classList.remove("is-changing");
        });
    });

    updateAutoplayControl();
    broadcastPauseState();

    async function loadProducts() {
        try {
            const result = await window.Fran7Supabase.getClient()
                .from("fran7_products")
                .select("id, texto, imagem, cores, created_at, fran7_variants(id, cor, imagem)")
                .eq("ativo", true)
                .order("created_at", { ascending: false })
                .limit(100);
            if (result.error) throw result.error;

            products = buildProducts(result.data);
            if (!products.length) {
                showcase.setAttribute("aria-busy", "false");
                status.textContent = "Ainda não há produtos ativos com imagens no catálogo do Supabase.";
                return;
            }

            banner.classList.add("is-ready");
            showcase.setAttribute("aria-busy", "false");
            status.hidden = true;
            banner.querySelectorAll("[data-editorial-product]").forEach(function(button) {
                button.disabled = false;
            });
            featuredButton.disabled = false;

            selectProduct(currentCarouselIndex % products.length, false);
        } catch (error) {
            console.error("Não foi possível carregar os produtos do banner editorial no Supabase.", error);
            showcase.setAttribute("aria-busy", "false");
            status.textContent = "Não foi possível carregar os produtos. Tenta novamente mais tarde.";
        }
    }

    loadProducts();
})();
