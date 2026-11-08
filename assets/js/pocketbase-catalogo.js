(function() {
    "use strict";

    const PRICE_OVERRIDES = { "Boné FRAN7 Modelo 2": 7000 };
    const PRODUCTS_PER_PAGE = 24;
    const grid = document.getElementById("modelosGrid");

    function mostrarEstado(mensagem) {
        if (!grid) {
            return;
        }
        let status = document.getElementById("pocketbaseStatus");
        if (!status) {
            status = document.createElement("p");
            status.id = "pocketbaseStatus";
            status.setAttribute("role", "status");
            status.style.cssText = "grid-column: 1 / -1; text-align: center;";
        }
        status.textContent = mensagem;
        grid.replaceChildren(status);
    }

    function obterPrecoValido(preco) {
        let texto;
        if (typeof preco === "number") {
            return Number.isFinite(preco) && preco > 0 ? preco : null;
        } else if (typeof preco === "string" && preco.trim()) {
            texto = preco.trim().replace(/\s*(?:Kz|AOA)\s*$/i, "").trim();
        } else {
            return null;
        }

        let valor = Number.NaN;
        if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(texto)) {
            valor = Number(texto.replace(/\./g, "").replace(",", "."));
        } else if (/^\d+(?:,\d+)?$/.test(texto)) {
            valor = Number(texto.replace(",", "."));
        } else if (/^\d+\.\d{1,2}$/.test(texto)) {
            valor = Number(texto);
        }
        return Number.isFinite(valor) && valor > 0 ? valor : null;
    }

    function obterFicheiros(record, field) {
        const value = record[field];
        const files = Array.isArray(value) ? value : typeof value === "string" ? value.split("|") : [];
        return files
            .filter(function(file) { return typeof file === "string" && file.trim(); })
            .map(function(file) { return file.trim(); });
    }

    function obterLista(record, field) {
        const value = record[field];
        if (Array.isArray(value)) return value.map(String);
        return typeof value === "string" ? value.split("|").map(function(item) { return item.trim(); }) : [];
    }

    function criarModelo(record, variants) {
        const nome = typeof record.texto === "string" ? record.texto.trim() : "";
        const nomeImagem = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!nome || !nomeImagem) {
            console.error("Produto Supabase ignorado: falta um nome ou uma imagem válida.", record.id);
            return null;
        }

        const productImage = nomeImagem;
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
        const imagem = imageVariant?.imagem || productImage;
        const priceSource = defaultVariant ? defaultVariant.preco : record.preco;
        const valorPreco = defaultVariant
            ? obterPrecoValido(priceSource)
            : (PRICE_OVERRIDES[nome] || obterPrecoValido(priceSource));
        const preco = valorPreco === null
            ? ""
            : valorPreco.toLocaleString("pt-AO") + " Kz";
        const stock = defaultVariant ? defaultVariant.stock : record.stock;
        const temStockDefinido = stock !== null &&
            stock !== "" &&
            Number.isFinite(Number(stock));
        const semStock = temStockDefinido && Number(stock) <= 0;
        const artigo = document.createElement("article");
        artigo.className = "modelo";
        artigo.dataset.productName = nome;
        artigo.dataset.productId = record.id;
        artigo.dataset.productPrice = preco;
        artigo.dataset.productBaseImage = productImage;
        artigo.dataset.productVariants = JSON.stringify(productVariants);
        artigo.dataset.productDescription =
            typeof record.descricao === "string" ? record.descricao : "";
        artigo.dataset.productReserve = "false";
        artigo.dataset.galleryImages = obterFicheiros(record, "imagens_extra").join("|");
        artigo.dataset.galleryViews = obterLista(record, "vistas").join("|");
        artigo.dataset.galleryColors = obterLista(record, "cores").join("|");
        artigo.dataset.productBackImage = obterFicheiros(record, "imagem_costas")[0] || "";
        artigo.dataset.productModel = obterFicheiros(record, "modelo_3d")[0] || "";

        const imagemContainer = document.createElement("div");
        imagemContainer.className = "modelo-imagem";
        const imagemProduto = document.createElement("img");
        imagemProduto.alt = nome;
        imagemProduto.loading = "lazy";
        imagemProduto.addEventListener("error", function() {
            artigo.remove();
            if (!grid.querySelector(".modelo")) {
                mostrarEstado("Nenhum produto cadastrado no momento.");
            }
        }, { once: true });
        imagemProduto.src = imagem;
        imagemContainer.appendChild(imagemProduto);

        const favorito = document.createElement("button");
        favorito.className = "botao-favorito";
        favorito.type = "button";
        favorito.dataset.favoriteName = nome;
        favorito.dataset.favoriteProductId = record.id;
        favorito.dataset.favoriteImage = imagem;
        favorito.dataset.favoriteBaseImage = productImage;
        favorito.dataset.favoriteVariants = JSON.stringify(productVariants);
        favorito.dataset.favoritePrice = String(valorPreco || 0);
        favorito.dataset.favoriteReserve = "false";
        favorito.dataset.favoriteImages = artigo.dataset.galleryImages;
        favorito.dataset.favoriteViews = artigo.dataset.galleryViews;
        favorito.dataset.favoriteColors = artigo.dataset.galleryColors;
        favorito.dataset.favoriteBackImage = artigo.dataset.productBackImage;
        favorito.dataset.favoriteModel = artigo.dataset.productModel;
        favorito.setAttribute("aria-label", "Adicionar aos favoritos");
        favorito.setAttribute("aria-pressed", "false");
        favorito.innerHTML = '<span class="coracao" aria-hidden="true">♡</span>';
        imagemContainer.appendChild(favorito);
        artigo.appendChild(imagemContainer);

        const info = document.createElement("div");
        info.className = "modelo-info";
        const etiqueta = document.createElement("p");
        etiqueta.className = "modelo-etiqueta";
        etiqueta.textContent = "FRAN7 COLLECTION";
        const titulo = document.createElement("h2");
        titulo.textContent = nome;
        const precoElemento = document.createElement("p");
        precoElemento.className = "modelo-preco";
        precoElemento.textContent = preco;
        const adicionar = document.createElement("button");
        adicionar.className = "fran7-cart-add";
        adicionar.type = "button";
        adicionar.dataset.cartName = nome;
        adicionar.dataset.cartImage = imagem;
        adicionar.dataset.cartPrice = String(valorPreco || 0);
        adicionar.textContent = semStock && productVariants.length === 0
            ? "SEM STOCK"
            : "ESCOLHER OPÇÕES";
        adicionar.setAttribute(
            "aria-label",
            semStock ? nome + " sem stock" : "Escolher opções para " + nome
        );
        adicionar.disabled = semStock && productVariants.length === 0;

        info.append(etiqueta, titulo);
        if (preco) {
            info.appendChild(precoElemento);
        }
        info.appendChild(adicionar);
        artigo.appendChild(info);
        return artigo;
    }

    async function carregarProdutos() {
        if (!grid) {
            return;
        }
        const supabase = window.Fran7Supabase.getClient();
        let page = 1;
        let totalPages = 1;
        const artigos = [];

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
            const produtos = result.data || [];

            if (page === 1 && !produtos.length) {
                mostrarEstado("Nenhum produto cadastrado no momento.");
                return;
            }

            const pageArticles = produtos.map(function(record) {
                record.created = record.created_at;
                return criarModelo(
                    record,
                    record.fran7_variants || []
                );
            }).filter(Boolean);

            if (page === 1) {
                grid.replaceChildren();
            }
            pageArticles.forEach(function(article, index) {
                const image = article.querySelector("img");
                const articleIndex = artigos.length + index;
                image.decoding = "async";
                if (articleIndex < 3) {
                    image.loading = "eager";
                    image.fetchPriority = "high";
                }
                grid.appendChild(article);
            });
            artigos.push.apply(artigos, pageArticles);
            totalPages = Math.ceil((result.count || 0) / PRODUCTS_PER_PAGE);
            page += 1;
        } while (page <= totalPages);

        if (!artigos.length) {
            mostrarEstado("Nenhum produto cadastrado no momento.");
            return;
        }

        window.dispatchEvent(new CustomEvent("fran7-products-loaded", {
            detail: { products: artigos }
        }));
    }

    carregarProdutos().catch(function(error) {
        console.error("Não foi possível carregar produtos do Supabase:", error);
        if (grid.querySelector(".modelo")) {
            const status = document.createElement("p");
            status.id = "pocketbaseStatus";
            status.setAttribute("role", "status");
            status.style.cssText = "grid-column: 1 / -1; text-align: center;";
            status.textContent = "Alguns produtos não puderam ser carregados. Tenta novamente mais tarde.";
            grid.appendChild(status);
        } else {
            mostrarEstado("Não foi possível carregar os produtos. Tenta novamente mais tarde ou contacta o suporte.");
        }
    });
})();
