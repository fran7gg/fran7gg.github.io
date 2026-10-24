(function() {
    "use strict";

    const overlay = document.createElement("div");
    overlay.className = "fran7-notice-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="fran7-notice-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fran7NoticeTitle" aria-describedby="fran7NoticeMessage">
            <div class="fran7-notice-icon" aria-hidden="true">i</div>
            <h2 class="fran7-notice-title" id="fran7NoticeTitle"></h2>
            <p class="fran7-notice-message" id="fran7NoticeMessage"></p>
            <div class="fran7-notice-actions"></div>
        </section>`;
    document.body.appendChild(overlay);

    const title = overlay.querySelector(".fran7-notice-title");
    const message = overlay.querySelector(".fran7-notice-message");
    const actions = overlay.querySelector(".fran7-notice-actions");
    let resolveCurrent = null;
    let previousFocus = null;

    function close(result) {
        if (overlay.hidden) return;
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        window.setTimeout(function() {
            overlay.hidden = true;
            if (previousFocus && typeof previousFocus.focus === "function") {
                previousFocus.focus();
            }
            if (resolveCurrent) {
                resolveCurrent(result);
                resolveCurrent = null;
            }
        }, 220);
    }

    function button(label, primary, onClick) {
        const control = document.createElement("button");
        control.type = "button";
        control.className = "fran7-notice-button" + (primary ? " fran7-notice-button-primary" : "");
        control.textContent = label;
        control.addEventListener("click", onClick);
        return control;
    }

    function show(text, options, isConfirm) {
        const config = options || {};
        if (resolveCurrent) {
            resolveCurrent(false);
        }
        previousFocus = document.activeElement;
        title.textContent = config.title || (isConfirm ? "Confirmar ação" : "FRAN7");
        message.textContent = String(text || "");
        actions.replaceChildren();

        return new Promise(function(resolve) {
            resolveCurrent = resolve;
            if (isConfirm) {
                actions.appendChild(button(config.cancelText || "Cancelar", false, function() { close(false); }));
            }
            actions.appendChild(button(config.confirmText || "Continuar", true, function() { close(true); }));
            overlay.hidden = false;
            document.body.style.overflow = "hidden";
            requestAnimationFrame(function() {
                overlay.classList.add("is-open");
                actions.querySelector(".fran7-notice-button-primary").focus();
            });
        });
    }

    overlay.addEventListener("click", function(event) {
        if (event.target === overlay) close(false);
    });
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && !overlay.hidden) close(false);
    });

    window.Fran7Notify = {
        alert: function(text, options) {
            return show(text, options, false);
        },
        confirm: function(text, options) {
            return show(text, options, true);
        }
    };
})();
