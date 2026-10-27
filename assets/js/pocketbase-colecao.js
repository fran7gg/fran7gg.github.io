(function() {
    "use strict";

    const COLLECTION = "produtos_loja";
    const VARIANTS_COLLECTION = "variantes_produto";
    const CATEGORY_VALUES = ["homens", "mulheres", "criancas"];
    const PRODUCTS_PER_PAGE = 24;
    const VARIANT_FILTER_BATCH_SIZE = 40;
    const category = new URLSearchParams(window.location.search).get("categoria");
    const grid = document.querySelector(".produtos-grid");
    const baseUrl = String(
        window.FRAN7_CHECKOUT_CONFIG?.pocketBaseUrl ||
        window.FRAN7_POCKETBASE_URL ||
        ""
    ).replace(/\/+$/, "");

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

    function obterFicheiros(record, field, pb) {
        const value = record[field];
        const files = Array.isArray(value)
            ? value
            : typeof value === "string" ? value.split("|") : [];
        return files
            .filter(function(file) { return typeof file === "string" && file.trim(); })
            .map(function(file) { return pb.files.getURL(record, file.trim()); });
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

    async function carregarVariantes(pb, products) {
        const batches = [];
        for (let index = 0; index < products.length; index += VARIANT_FILTER_BATCH_SIZE) {
            batches.push(products.slice(index, index + VARIANT_FILTER_BATCH_SIZE));
        }

        const results = await Promise.all(batches.map(function(batch) {
            const filter = batch.map(function(product) {
                return 'produto_id = "' + product.id + '"';
            }).join(" || ");
            return pb.collection(VARIANTS_COLLECTION).getFullList({
                sort: "-created",
                filter: filter
            });
        }));
        return results.reduce(function(all, variants) {
            return all.concat(variants);
        }, []);
    }

    function criarCard(record, collection, pb, variants) {
        const name = typeof record.texto === "string" ? record.texto.trim() : "";
        const imageName = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!record.id || !name || !imageName) {
            console.error("Produto da coleção ignorado: falta ID, nome ou imagem.", record.id);
            return null;
        }

        const productImage = pb.files.getURL(record, imageName);
        const productVariants = variants.map(function(variant) {
            const variantImage = typeof variant.imagem === "string" && variant.imagem.trim()
                ? pb.files.getURL(variant, variant.imagem.trim())
                : "";
            return {
                id: variant.id,
                cor: typeof variant.cor === "string" ? variant.cor.trim() : "",
                tamanho: typeof variant.tamanho === "string" ? variant.tamanho.trim() : "",
                preco: variant.preco,
                stock: variant.stock,
                imagem: variantImage
            };
        }).filter(function(variant) {
            if (!variant.cor) {
                console.error("Variante ignorada: preenche a cor no PocketBase.", variant.id);
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
        const images = obterFicheiros(record, "imagens_extra", pb);
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
        article.dataset.productBackImage = obterFicheiros(record, "imagem_costas", pb)[0] || "";
        article.dataset.productModel = obterFicheiros(record, "modelo_3d", pb)[0] || "";

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
        add.textContent = productVariants.length
            ? "ESCOLHER OPÇÕES"
            : isOutOfStock
            ? "SEM STOCK"
            : reserve ? "RESERVAR" : "ADICIONAR AO CARRINHO";
        add.setAttribute("aria-label", isOutOfStock
            ? name + " sem stock"
            : (reserve ? "Reservar " : "Adicionar ") + name + (reserve ? "" : " ao carrinho"));
        add.disabled = isOutOfStock && productVariants.length === 0;

        info.append(label, title);
        info.append(priceElement, add);
        article.append(imageContainer, info);
        return article;
    }

    async function carregarColecao() {
        if (!grid || !CATEGORY_VALUES.includes(category)) {
            return;
        }

        mostrarEstado("A carregar produtos de " + category + "...");
        if (!baseUrl) {
            mostrarEstado("A ligação ao PocketBase cloud ainda não está configurada.");
            return;
        }
        if (typeof window.PocketBase !== "function") {
            throw new Error("A biblioteca PocketBase não foi carregada.");
        }

        const pb = new window.PocketBase(baseUrl);
        const categoryValues = category === "criancas"
            ? ["criancas", "crianças"]
            : [category];
        const categoryFilter = categoryValues.map(function(value) {
            return 'categoria ~ "' + value + '"';
        }).join(" || ");
        let page = 1;
        let totalPages = 1;
        const cards = [];

        do {
            const result = await pb.collection(COLLECTION).getList(page, PRODUCTS_PER_PAGE, {
                sort: "-created",
                filter: categoryFilter
            });
            const products = result.items.filter(function(record) {
                return normalizarCategoria(record.categoria).includes(category);
            });

            if (page === 1 && !products.length) {
                mostrarEstado("Ainda não há produtos nesta coleção. Define categoria = \"" + category + "\" no PocketBase.");
                return;
            }

            const variants = await carregarVariantes(pb, products);
            const variantsByProduct = new Map();
            variants.forEach(function(variant) {
                if (!variantsByProduct.has(variant.produto_id)) {
                    variantsByProduct.set(variant.produto_id, []);
                }
                variantsByProduct.get(variant.produto_id).push(variant);
            });
            const pageCards = products.map(function(record) {
                return criarCard(
                    record,
                    window.FRAN7_COLLECTION_PAGE,
                    pb,
                    variantsByProduct.get(record.id) || []
                );
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
            });
            cards.push.apply(cards, pageCards);
            totalPages = result.totalPages;
            page += 1;
        } while (page <= totalPages);

        if (!cards.length) {
            mostrarEstado("Os produtos desta coleção precisam de nome e imagem válidos no PocketBase.");
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
            status.textContent = "Alguns produtos não puderam ser carregados. Confirma a ligação e as regras de leitura do PocketBase.";
            grid.appendChild(status);
        } else {
            mostrarEstado("Não foi possível carregar esta coleção. Confirma a ligação e as regras de leitura do PocketBase.");
        }
    });
})();
