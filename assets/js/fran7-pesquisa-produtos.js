(function() {
    "use strict";

    const synonyms = [
        ["camisola", "sweater", "hoodie", "sweatshirt", "moletom", "pullover"],
        ["camisa", "camiseta", "tshirt", "tee", "shirt"],
        ["bone", "chapeu", "cap"],
        ["calca", "calcoes", "short", "bermuda"],
        ["tenis", "sapato", "sapatilha", "sneaker", "shoe"],
        ["meia", "sock"]
    ];

    function normalize(value) {
        return String(value || "")
            .toLocaleLowerCase("pt")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\bt[\s-]*shirt\b/g, "tshirt")
            .replace(/\btee[\s-]*shirt\b/g, "tshirt")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function wordForms(word) {
        const forms = [word];
        if (word.length > 4 && word.endsWith("es")) {
            forms.push(word.slice(0, -2));
        }
        if (word.length > 3 && word.endsWith("s")) {
            forms.push(word.slice(0, -1));
        }
        return forms;
    }

    function editDistance(left, right, limit) {
        if (Math.abs(left.length - right.length) > limit) {
            return limit + 1;
        }
        const previous = Array.from({ length: right.length + 1 }, function(_, index) {
            return index;
        });
        let previousPrevious = null;
        for (let row = 1; row <= left.length; row += 1) {
            const current = [row];
            let minimum = row;
            for (let column = 1; column <= right.length; column += 1) {
                current[column] = Math.min(
                    current[column - 1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)
                );
                if (
                    previousPrevious &&
                    row > 1 &&
                    column > 1 &&
                    left[row - 1] === right[column - 2] &&
                    left[row - 2] === right[column - 1]
                ) {
                    current[column] = Math.min(current[column], previousPrevious[column - 2] + 1);
                }
                minimum = Math.min(minimum, current[column]);
            }
            if (minimum > limit) {
                return limit + 1;
            }
            previousPrevious = previous.slice();
            previous.splice(0, previous.length, ...current);
        }
        return previous[right.length];
    }

    function equivalentWords(left, right) {
        return synonyms.some(function(group) {
            return group.includes(left) && group.includes(right);
        });
    }

    function wordMatches(queryWord, productWord) {
        const queryForms = wordForms(queryWord);
        const productForms = wordForms(productWord);
        if (queryForms.some(function(queryForm) {
            return productForms.some(function(productForm) {
                return productForm === queryForm ||
                    (queryForm.length >= 3 && productForm.startsWith(queryForm)) ||
                    (productForm.length >= 3 && queryForm.startsWith(productForm)) ||
                    equivalentWords(queryForm, productForm);
            });
        })) {
            return true;
        }

        const shortest = Math.min(queryWord.length, productWord.length);
        if (shortest < 4) {
            return false;
        }
        return editDistance(queryWord, productWord, shortest >= 12 ? 2 : 1) <=
            (shortest >= 12 ? 2 : 1);
    }

    function matches(query, searchableText) {
        const queryWords = normalize(query).split(/\s+/).filter(Boolean);
        if (!queryWords.length) {
            return true;
        }
        const productWords = normalize(searchableText).split(/\s+/).filter(Boolean);
        return queryWords.every(function(queryWord) {
            return productWords.some(function(productWord) {
                return wordMatches(queryWord, productWord);
            });
        });
    }

    window.Fran7ProductSearch = {
        normalize: normalize,
        matches: matches
    };
})();
