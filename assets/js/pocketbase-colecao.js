(function() {
    "use strict";

    const CATEGORY_VALUES = ["homens", "mulheres", "criancas", "destaques"];
    const PRODUCTS_PER_PAGE = 24;
    const category = new URLSearchParams(window.location.search).get("categoria");
    const grid = document.querySelector(".produtos-grid");

    function mostrarEstado(message) {
        const status = document.createElement("p");
        status.className = "estado-colecao";
        status.setAttribute("role", "status");
        status.textContent = message;
        grid.replaceChildren(status);
    }

    function normalizarCategoria(value) {
        const values = Array.isArray(value) ? value : [value];
        return values
            .filter(function(item) { return typeof item === "string"; })
            .map(function(item) {
                return item.trim().toLocaleLowerCase("pt")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
            });
    }

    function obterPreco(preco) {
        if (window.Fran7Checkout?.parsePrice) {
            return window.Fran7Checkout.parsePrice(preco) || 0;
        }
        const texto = String(preco || "").trim().replace(/\s|Kz|AOA/gi, "");
        const normalizado = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(texto)
            ? texto.replace(/\./g, "").replace(",", ".")
            : texto.replace(",", ".");
        const valor = Number(normalizado);
        return Number.isFinite(valor) ? valor : 0;
    }

    function obterFicheiros(record, field) {
        const value = record[field];
        const files = Array.isArray(value)
            ? value
            : typeof value === "string" ? value.split("|") : [];
        return files
            .filter(function(file) { return typeof file === "string" && file.trim(); })
            .map(function(file) { return file.trim(); });
    }

    function obterLista(record, field) {
        const value = record[field];
        if (Array.isArray(value)) {
            return value.map(String);
        }
        return typeof value === "string"
            ? value.split("|").map(function(item) { return item.trim(); })
            : [];
    }

    function criarCard(record, collection, variants) {
        const name = typeof record.texto === "string" ? record.texto.trim() : "";
        const imageName = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!record.id || !name || !imageName) {
            console.error("Produto da coleção ignorado: falta ID, nome ou imagem.", record.id);
            return null;
        }

        const productImage = imageName;
        const productVariants = variants.map(function(variant) {
            return {
                id: variant.id,
                cor: typeof variant.cor === "string" ? variant.cor.trim() : "",
                tamanho: typeof variant.tamanho === "string" ? variant.tamanho.trim() : "",
                preco: variant.preco,
                stock: variant.stock,
                imagem: typeof variant.imagem === "string" ? variant.imagem.trim() : ""
            };
        }).filter(function(variant) {
            if (!variant.cor) {
                console.error("Variante ignorada: preenche a cor no Supabase.", variant.id);
                return false;
            }
            return true;
        });
        const defaultVariant = productVariants.find(function(variant) {
            return variant.tamanho && Number(variant.stock) > 0;
        }) || productVariants.find(function(variant) {
            return Boolean(variant.tamanho);
        }) || null;
        const imageVariant = productVariants.find(function(variant) {
            return Number(variant.stock) > 0 && variant.imagem;
        }) || productVariants.find(function(variant) {
            return Boolean(variant.imagem);
        }) || defaultVariant;
        const image = imageVariant?.imagem || productImage;
        const images = obterFicheiros(record, "imagens_extra");
        const colors = obterLista(record, "cores");
        const views = obterLista(record, "vistas");
        const priceSource = defaultVariant ? defaultVariant.preco : record.preco;
        const price = typeof priceSource === "string" || typeof priceSource === "number"
            ? String(priceSource)
            : "";
        const priceNumber = obterPreco(price);
        const stock = defaultVariant ? defaultVariant.stock : record.stock;
        const isOutOfStock = stock !== null &&
            stock !== "" &&
            Number.isFinite(Number(stock)) &&
            Number(stock) <= 0;
        const reserve = record.reservar === true;
        const article = document.createElement("article");
        article.className = "produto";
        article.dataset.productId = record.id;
        article.dataset.productName = name;
        article.dataset.productPrice = price;
        article.dataset.productBaseImage = productImage;
        article.dataset.productVariants = JSON.stringify(productVariants);
        article.dataset.productDescription =
            typeof record.descricao === "string" ? record.descricao : "";
        article.dataset.productReserve = String(reserve);
        article.dataset.galleryImages = images.join("|");
        article.dataset.galleryColors = colors.join("|");
        article.dataset.galleryViews = views.join("|");
        article.dataset.productBackImage = obterFicheiros(record, "imagem_costas")[0] || "";
        article.dataset.productModel = obterFicheiros(record, "modelo_3d")[0] || "";

        const imageContainer = document.createElement("div");
        imageContainer.className = "produto-imagem";
        const imageElement = document.createElement("img");
        imageElement.src = image;
        imageElement.alt = name;
        imageElement.loading = "lazy";
        imageContainer.appendChild(imageElement);

        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "botao-favorito";
        favorite.dataset.favoriteName = name;
        favorite.dataset.favoriteProductId = record.id;
        favorite.dataset.favoriteImage = image;
        favorite.dataset.favoriteBaseImage = productImage;
        favorite.dataset.favoriteVariants = JSON.stringify(productVariants);
        favorite.dataset.favoritePrice = String(priceNumber);
        favorite.dataset.favoriteReserve = String(reserve);
        favorite.dataset.favoriteImages = article.dataset.galleryImages;
        favorite.dataset.favoriteColors = article.dataset.galleryColors;
        favorite.dataset.favoriteViews = article.dataset.galleryViews;
        favorite.dataset.favoriteBackImage = article.dataset.productBackImage;
        favorite.dataset.favoriteModel = article.dataset.productModel;
        favorite.setAttribute("aria-label", "Adicionar aos favoritos");
        favorite.setAttribute("aria-pressed", "false");
        favorite.innerHTML = '<span class="coracao" aria-hidden="true">♡</span>';
        imageContainer.appendChild(favorite);

        const info = document.createElement("div");
        info.className = "produto-info";
        const label = document.createElement("p");
        label.className = "produto-etiqueta";
        label.textContent = collection.etiqueta;
        const title = document.createElement("h2");
        title.textContent = name;
        const priceElement = document.createElement("p");
        priceElement.className = "produto-preco";
        priceElement.textContent = price || "Consultar preço";

        const add = document.createElement("button");
        add.className = "fran7-cart-add";
        add.type = "button";
        add.dataset.cartName = name;
        add.dataset.cartImage = image;
        add.dataset.cartPrice = String(priceNumber);
        add.textContent = isOutOfStock && productVariants.length === 0
            ? "SEM STOCK"
            : "ESCOLHER OPÇÕES";
        add.setAttribute("aria-label", isOutOfStock
            ? name + " sem stock"
            : "Escolher opções para " + name);
        add.disabled = isOutOfStock && productVariants.length === 0;

        info.append(label, title);
        info.append(priceElement, add);
        article.append(imageContainer, info);
        return article;
    }

    function criarBannerColecao(collection, record) {
        const banner = document.createElement("aside");
        banner.className = "banner-colecao";

        const image = document.createElement("img");
        image.src = record.imagem;
        image.alt = collection.bannerAlt || "Coleção FRAN7 " + collection.titulo;
        image.loading = "lazy";
        image.decoding = "async";
        banner.appendChild(image);

        return banner;
    }

    async function carregarColecao() {
        if (!grid || !CATEGORY_VALUES.includes(category)) {
            return;
        }

        const collection = window.FRAN7_COLLECTION_PAGE;
        mostrarEstado("A carregar produtos de " + category + "...");
        const supabase = window.Fran7Supabase.getClient();
        let bannerRecord = null;
        if (collection.bannerCategoria) {
            try {
                const bannerResult = await supabase
                    .from("fran7_banners")
                    .select("id, imagem")
                    .eq("categoria", collection.bannerCategoria)
                    .eq("ativo", true)
                    .order("ordem", { ascending: true })
                    .limit(1)
                    .maybeSingle();
                if (bannerResult.error) {
                    throw bannerResult.error;
                }
                if (bannerResult.data && typeof bannerResult.data.imagem === "string" &&
                    bannerResult.data.imagem.trim()) {
                    bannerRecord = bannerResult.data;
                } else {
                    console.warn(
                        "Não há banner ativo com a categoria " + collection.bannerCategoria + " em fran7_banners."
                    );
                }
            } catch (error) {
                console.error(
                    "Não foi possível carregar o banner da coleção " + collection.bannerCategoria + ".",
                    error
                );
            }
        }
        let page = 1;
        let totalPages = 1;
        const cards = [];

        do {
            const from = (page - 1) * PRODUCTS_PER_PAGE;
            const to = from + PRODUCTS_PER_PAGE - 1;
            const result = await supabase
                .from("fran7_products")
                .select("*, fran7_variants(*)", { count: "exact" })
                .eq("ativo", true)
                .order("created_at", { ascending: false })
                .range(from, to);
            if (result.error) {
                throw result.error;
            }
            const products = (result.data || []).filter(function(record) {
                record.created = record.created_at;
                return normalizarCategoria(record.categoria).includes(category);
            });

            const pageCards = products.map(function(record) {
                return criarCard(record, collection, record.fran7_variants || []);
            }).filter(Boolean);

            if (page === 1) {
                grid.replaceChildren();
            }
            pageCards.forEach(function(card, index) {
                const image = card.querySelector("img");
                const cardIndex = cards.length + index;
                image.decoding = "async";
                if (cardIndex < 3) {
                    image.loading = "eager";
                    image.fetchPriority = "high";
                }
                grid.appendChild(card);
                if (cardIndex === 3 && bannerRecord) {
                    grid.appendChild(criarBannerColecao(collection, bannerRecord));
                }
            });
            cards.push.apply(cards, pageCards);
            totalPages = Math.ceil((result.count || 0) / PRODUCTS_PER_PAGE);
            page += 1;
        } while (page <= totalPages);

        if (!cards.length) {
            mostrarEstado("Não há produtos disponíveis nesta coleção de momento.");
            return;
        }

        window.dispatchEvent(new CustomEvent("fran7-products-loaded", {
            detail: { products: cards }
        }));
    }

    carregarColecao().catch(function(error) {
        console.error("Não foi possível carregar os produtos da coleção:", error);
        if (grid.querySelector(".produto")) {
            const status = document.createElement("p");
            status.className = "estado-colecao";
            status.setAttribute("role", "status");
            status.textContent = "Alguns produtos não puderam ser carregados. Tenta novamente mais tarde.";
            grid.appendChild(status);
        } else {
            mostrarEstado("Não foi possível carregar esta coleção. Tenta novamente mais tarde ou contacta o suporte.");
        }
    });
})();
