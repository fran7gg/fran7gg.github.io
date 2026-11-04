(function() {
    "use strict";

    const CATEGORY = "destaques";
    const grid = document.querySelector("#produtos .produtos-grid");

    function mostrarEstado(message) {
        if (!grid) {
            return;
        }
        const status = document.createElement("p");
        status.className = "estado-destaques";
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

    function formatarPreco(value) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value.toLocaleString("pt-AO") + " Kz";
        }
        if (typeof value !== "string" || !value.trim()) {
            return "";
        }

        const text = value.trim();
        if (/Kz|AOA/i.test(text)) {
            return text;
        }
        const normalized = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text)
            ? text.replace(/\./g, "").replace(",", ".")
            : text.replace(",", ".");
        const price = Number(normalized);
        return Number.isFinite(price)
            ? price.toLocaleString("pt-AO") + " Kz"
            : text;
    }

    function obterPrecoNumerico(value) {
        if (window.Fran7Checkout?.parsePrice) {
            return window.Fran7Checkout.parsePrice(value) || 0;
        }
        const normalized = String(value || "").trim()
            .replace(/\s|Kz|AOA/gi, "")
            .replace(/\./g, "")
            .replace(",", ".");
        const price = Number(normalized);
        return Number.isFinite(price) ? price : 0;
    }

    function obterImagemUrl(record, collection, fileName) {
        return fileName;
    }

    function criarCartao(record, variants) {
        const name = typeof record.texto === "string" ? record.texto.trim() : "";
        const imageName = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!record.id || !name || !imageName) {
            console.error("Produto em destaque ignorado: falta ID, nome ou imagem.", record.id);
            return null;
        }

        const productImage = obterImagemUrl(record, COLLECTION, imageName);
        const productVariants = variants.map(function(variant) {
            const variantImageName = typeof variant.imagem === "string" ? variant.imagem.trim() : "";
            return {
                id: variant.id,
                cor: typeof variant.cor === "string" ? variant.cor.trim() : "",
                tamanho: typeof variant.tamanho === "string" ? variant.tamanho.trim() : "",
                preco: variant.preco,
                stock: variant.stock,
                imagem: variantImageName
                    ? obterImagemUrl(variant, VARIANTS_COLLECTION, variantImageName)
                    : ""
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
        const imageUrl = imageVariant?.imagem || productImage;
        const priceSource = defaultVariant ? defaultVariant.preco : record.preco;
        const price = formatarPreco(priceSource);
        const priceNumber = obterPrecoNumerico(priceSource);
        const description = typeof record.descricao === "string"
            ? record.descricao.trim()
            : "";
        const stock = defaultVariant ? defaultVariant.stock : (record.stock ?? record.estoque);
        const outOfStock = stock !== null && stock !== "" &&
            Number.isFinite(Number(stock)) && Number(stock) <= 0;
        const article = document.createElement("article");
        article.className = "produto";
        article.dataset.productId = record.id;
        article.dataset.productName = name;
        article.dataset.productPrice = price;
        article.dataset.productBaseImage = productImage;
        article.dataset.productDescription = description;
        article.dataset.productReserve = "false";
        article.dataset.productVariants = JSON.stringify(productVariants);
        article.dataset.aiModel = name;

        const imageContainer = document.createElement("div");
        imageContainer.className = "produto-imagem";
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = name;
        image.loading = "lazy";
        imageContainer.appendChild(image);

        const favoriteWrapper = document.createElement("div");
        favoriteWrapper.className = "favorito-produto";
        const favorite = document.createElement("button");
        favorite.className = "botao-favorito";
        favorite.type = "button";
        favorite.dataset.favoriteName = name;
        favorite.dataset.favoriteProductId = record.id;
        favorite.dataset.favoritePrice = String(priceNumber);
        favorite.dataset.favoriteImage = imageUrl;
        favorite.dataset.favoriteBaseImage = productImage;
        favorite.dataset.favoriteVariants = JSON.stringify(productVariants);
        favorite.dataset.favoriteReserve = "false";
        favorite.setAttribute("aria-label", "Adicionar aos favoritos");
        favorite.setAttribute("aria-pressed", "false");
        favorite.innerHTML = '<span class="coracao" aria-hidden="true">♡</span>';
        favoriteWrapper.appendChild(favorite);
        imageContainer.appendChild(favoriteWrapper);

        const info = document.createElement("div");
        info.className = "produto-info";
        const tag = document.createElement("div");
        tag.className = "produto-tag";
        tag.textContent = "FRAN7 COLLECTION";
        const title = document.createElement("h3");
        title.textContent = name;
        const descriptionElement = document.createElement("p");
        descriptionElement.textContent = description || "Nova coleção";
        const priceElement = document.createElement("div");
        priceElement.className = "preco";
        priceElement.textContent = price || "Consultar preço";
        const add = document.createElement("a");
        add.href = "#";
        add.className = "botao-produto";
        add.textContent = productVariants.length
            ? "ESCOLHER OPÇÕES"
            : outOfStock ? "SEM STOCK" : "VER PRODUTO";
        if (outOfStock && productVariants.length === 0) {
            add.setAttribute("aria-disabled", "true");
            add.addEventListener("click", function(event) {
                event.preventDefault();
            });
        } else {
            add.addEventListener("click", function(event) {
                event.preventDefault();
                if (typeof window.adicionarAoCarrinho !== "function") {
                    console.error("A função de adicionar ao carrinho não está disponível.");
                    return;
                }
                window.adicionarAoCarrinho(event, name, priceNumber, imageUrl);
            });
        }

        info.append(tag, title, descriptionElement);
        info.append(priceElement, add);
        article.append(imageContainer, info);
        return article;
    }

    async function carregarDestaques() {
        if (!grid) {
            return;
        }
        mostrarEstado("A carregar destaques...");

        const result = await window.Fran7Supabase.getClient()
            .from("fran7_products")
            .select("*, fran7_variants(*)")
            .eq("ativo", true)
            .contains("categoria", [CATEGORY])
            .order("created_at", { ascending: false });
        if (result.error) {
            throw result.error;
        }
        const products = result.data || [];
        const cards = products.map(function(record) {
            return criarCartao(record, record.fran7_variants || []);
        }).filter(Boolean);
        if (!cards.length) {
            mostrarEstado("Ainda não há produtos em destaque no Supabase.");
            return;
        }
        grid.replaceChildren.apply(grid, cards);
        window.dispatchEvent(new CustomEvent("fran7-products-loaded", {
            detail: { products: cards }
        }));
    }

    carregarDestaques().catch(function(error) {
        console.error("Não foi possível carregar os destaques do Supabase.", error);
        mostrarEstado("Não foi possível carregar os destaques. Verifica a ligação ao Supabase.");
    });
})();
