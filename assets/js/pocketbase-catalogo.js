(function() {
    "use strict";

    const POCKETBASE_URL = window.FRAN7_CHECKOUT_CONFIG?.pocketBaseUrl ||
        window.FRAN7_POCKETBASE_URL || "http://127.0.0.1:8090";
    const COLLECTION = "produtos_loja";
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

    function obterFicheiros(record, field, pb) {
        const value = record[field];
        const files = Array.isArray(value) ? value : typeof value === "string" ? value.split("|") : [];
        return files
            .filter(function(file) { return typeof file === "string" && file.trim(); })
            .map(function(file) { return pb.files.getURL(record, file.trim()); });
    }

    function obterLista(record, field) {
        const value = record[field];
        if (Array.isArray(value)) return value.map(String);
        return typeof value === "string" ? value.split("|").map(function(item) { return item.trim(); }) : [];
    }

    function criarModelo(record, pb) {
        const nome = typeof record.texto === "string" ? record.texto.trim() : "";
        const nomeImagem = typeof record.imagem === "string" ? record.imagem.trim() : "";
        if (!nome || !nomeImagem) {
            console.error("Produto PocketBase ignorado: falta um nome ou uma imagem válida.", record.id);
            return null;
        }

        const imagem = pb.files.getURL(record, nomeImagem);
        const valorPreco = obterPrecoValido(record.preco);
        const preco = valorPreco === null
            ? ""
            : valorPreco.toLocaleString("pt-AO") + " Kz";
        const temStockDefinido = record.stock !== null &&
            record.stock !== "" &&
            Number.isFinite(Number(record.stock));
        const semStock = temStockDefinido && Number(record.stock) <= 0;
        const artigo = document.createElement("article");
        artigo.className = "modelo";
        artigo.dataset.productName = nome;
        artigo.dataset.productPrice = preco;
        artigo.dataset.productDescription =
            typeof record.descricao === "string" ? record.descricao : "";
        artigo.dataset.productReserve = "false";
        artigo.dataset.galleryImages = obterFicheiros(record, "imagens_extra", pb).join("|");
        artigo.dataset.galleryViews = obterLista(record, "vistas").join("|");
        artigo.dataset.galleryColors = obterLista(record, "cores").join("|");
        artigo.dataset.productBackImage = obterFicheiros(record, "imagem_costas", pb)[0] || "";
        artigo.dataset.productModel = obterFicheiros(record, "modelo_3d", pb)[0] || "";

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
        favorito.dataset.favoriteImage = imagem;
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
        adicionar.textContent = semStock ? "SEM STOCK" : "ADICIONAR AO CARRINHO";
        adicionar.setAttribute(
            "aria-label",
            semStock ? nome + " sem stock" : "Adicionar " + nome + " ao carrinho"
        );
        adicionar.disabled = semStock;

        info.append(etiqueta, titulo);
        if (preco) {
            info.appendChild(precoElemento);
        }
        info.appendChild(adicionar);
        artigo.appendChild(info);
        return artigo;
    }

    async function carregarProdutos() {
        if (!grid || typeof window.PocketBase !== "function") {
            throw new Error("A biblioteca PocketBase não foi carregada.");
        }

        const pb = new window.PocketBase(POCKETBASE_URL);
        const produtos = await pb.collection(COLLECTION).getFullList({
            sort: "-created"
        });

        if (!produtos.length) {
            mostrarEstado("Nenhum produto cadastrado no momento.");
            return;
        }

        const artigos = produtos
            .map(function(record) {
                return criarModelo(record, pb);
            })
            .filter(Boolean);

        if (!artigos.length) {
            mostrarEstado("Nenhum produto cadastrado no momento.");
            return;
        }

        grid.replaceChildren.apply(grid, artigos);
    }

    carregarProdutos().catch(function(error) {
        console.error("Não foi possível carregar produtos do PocketBase:", error);
        mostrarEstado("Não foi possível carregar os produtos. Verifica a ligação ao PocketBase e tenta novamente.");
    });
})();
