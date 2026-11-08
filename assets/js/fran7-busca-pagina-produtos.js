(function() {
    "use strict";

    const form = document.getElementById("pesquisaProdutosForm");
    const input = document.getElementById("pesquisaProdutos");
    const status = document.getElementById("pesquisaProdutosEstado");
    const grid = document.querySelector("#modelosGrid, .produtos-grid, #favoritosGrid");
    const productSearch = window.Fran7ProductSearch;

    if (!form || !input || !status || !grid || !productSearch) {
        return;
    }

    function obterCartoes() {
        return Array.from(grid.children).filter(function(child) {
            return child.classList.contains("modelo") ||
                child.classList.contains("produto") ||
                child.classList.contains("favorito-card");
        });
    }

    function atualizarUrl(query) {
        if (!window.history?.replaceState) {
            return;
        }
        const url = new URL(window.location.href);
        if (query) {
            url.searchParams.set("pesquisa", query);
        } else {
            url.searchParams.delete("pesquisa");
        }
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }

    function pesquisar() {
        const query = input.value.trim();
        const cards = obterCartoes();
        let visibleCount = 0;

        cards.forEach(function(card) {
            const text = [
                card.dataset.productName,
                card.dataset.productDescription,
                card.textContent
            ].join(" ");
            const matches = productSearch.matches(query, text);
            card.hidden = !matches;
            if (matches) {
                visibleCount += 1;
            }
        });

        status.hidden = !query;
        if (query) {
            status.textContent = visibleCount === 1
                ? "1 produto encontrado."
                : visibleCount + " produtos encontrados.";
        }
    }

    input.addEventListener("input", function() {
        atualizarUrl(input.value.trim());
        pesquisar();
    });
    form.addEventListener("submit", function(event) {
        event.preventDefault();
        atualizarUrl(input.value.trim());
        pesquisar();
    });

    const initialQuery = new URLSearchParams(window.location.search).get("pesquisa") || "";
    if (initialQuery) {
        input.value = initialQuery;
        pesquisar();
    }
    if (window.location.hash === "#pesquisarProdutos") {
        input.focus({ preventScroll: true });
    }

    const observer = new MutationObserver(pesquisar);
    observer.observe(grid, { childList: true });
})();
