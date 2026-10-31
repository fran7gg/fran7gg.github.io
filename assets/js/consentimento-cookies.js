(function() {
    "use strict";

    const CONSENT_COOKIE = "fran7_cookie_consent";
    const CONSENT_VERSION = 1;
    const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
    const GOOGLE_TAG_ID = "G-GPZEHQ9KJH";
    const GOOGLE_DISABLE_KEY = "ga-disable-" + GOOGLE_TAG_ID;

    let analyticsEnabled = false;
    let analyticsInitialized = false;
    let analyticsScript = null;

    function isValidConsent(consent) {
        return consent &&
            consent.version === CONSENT_VERSION &&
            typeof consent.analytics === "boolean";
    }

    function readCookieConsent() {
        const cookie = document.cookie
            .split(";")
            .map(function(value) { return value.trim(); })
            .find(function(value) { return value.indexOf(CONSENT_COOKIE + "=") === 0; });

        if (!cookie) return null;

        const consent = JSON.parse(decodeURIComponent(cookie.slice(CONSENT_COOKIE.length + 1)));
        return isValidConsent(consent) ? consent : null;
    }

    function readConsent() {
        try {
            const consent = readCookieConsent();
            if (consent) return consent;
        } catch (error) {
            console.warn("Não foi possível ler a preferência de cookies da FRAN7.", error);
        }

        try {
            const consent = JSON.parse(window.localStorage.getItem(CONSENT_COOKIE));
            return isValidConsent(consent) &&
                typeof consent.expiresAt === "number" &&
                consent.expiresAt > Date.now()
                ? consent
                : null;
        } catch (error) {
            console.warn("Não foi possível ler a preferência de cookies da FRAN7 no armazenamento local.", error);
            return null;
        }
    }

    function saveConsent(analytics) {
        const consent = {
            version: CONSENT_VERSION,
            analytics: analytics,
            updatedAt: new Date().toISOString(),
            expiresAt: Date.now() + COOKIE_MAX_AGE * 1000
        };
        const secure = window.location.protocol === "https:" ? "; Secure" : "";

        try {
            document.cookie = CONSENT_COOKIE + "=" +
                encodeURIComponent(JSON.stringify(consent)) +
                "; Max-Age=" + COOKIE_MAX_AGE +
                "; Path=/; SameSite=Lax" + secure;

            const savedCookie = readCookieConsent();
            if (savedCookie && savedCookie.analytics === analytics) return true;
        } catch (error) {
            console.warn("Não foi possível guardar a preferência de cookies da FRAN7 num cookie.", error);
        }

        try {
            window.localStorage.setItem(CONSENT_COOKIE, JSON.stringify(consent));
            const saved = JSON.parse(window.localStorage.getItem(CONSENT_COOKIE));
            if (isValidConsent(saved) && saved.analytics === analytics) return true;
        } catch (error) {
            console.error("Não foi possível guardar a preferência de cookies da FRAN7 no armazenamento local.", error);
        }

        console.error("O navegador não conseguiu guardar a preferência de cookies da FRAN7.");
        return false;
    }

    function initializeAnalytics() {
        if (!analyticsEnabled) return;

        window[GOOGLE_DISABLE_KEY] = false;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function() {
            window.dataLayer.push(arguments);
        };

        if (!analyticsInitialized) {
            window.gtag("js", new Date());
            analyticsInitialized = true;
        }
        window.gtag("config", GOOGLE_TAG_ID);
    }

    function enableAnalytics() {
        analyticsEnabled = true;
        window[GOOGLE_DISABLE_KEY] = false;

        if (analyticsScript) {
            if (analyticsScript.dataset.loaded === "true") initializeAnalytics();
            return;
        }

        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function() {
            window.dataLayer.push(arguments);
        };

        analyticsScript = document.createElement("script");
        analyticsScript.async = true;
        analyticsScript.src = "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_TAG_ID;
        analyticsScript.onload = function() {
            analyticsScript.dataset.loaded = "true";
            initializeAnalytics();
        };
        analyticsScript.onerror = function() {
            console.error("Não foi possível carregar o Google Analytics após a autorização.");
            analyticsScript.remove();
            analyticsScript = null;
        };
        document.head.appendChild(analyticsScript);
    }

    function clearAnalyticsCookies() {
        document.cookie.split(";").forEach(function(value) {
            const name = value.trim().split("=")[0];
            if (!/^_ga(?:_|$)/.test(name)) return;

            document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
            document.cookie = name + "=; Max-Age=0; Path=/; Domain=" +
                window.location.hostname + "; SameSite=Lax";
        });
    }

    function setAnalytics(enabled) {
        analyticsEnabled = enabled;
        if (enabled) {
            enableAnalytics();
            return;
        }

        window[GOOGLE_DISABLE_KEY] = true;
        clearAnalyticsCookies();
    }

    function createConsentPanel() {
        const wrapper = document.createElement("div");
        wrapper.className = "fran7-cookie-layer";
        wrapper.innerHTML = `
            <section class="fran7-cookie-panel" aria-labelledby="fran7CookieTitle">
                <div class="fran7-cookie-summary" data-cookie-summary>
                    <p class="fran7-cookie-eyebrow">FRAN7 · PRIVACIDADE</p>
                    <h2 id="fran7CookieTitle">A tua privacidade importa</h2>
                    <p class="fran7-cookie-copy">Usamos cookies necessários para o funcionamento do site. Com a tua autorização, também usamos cookies de análise para perceber como a loja é utilizada. Podes aceitar, rejeitar ou escolher as tuas preferências.</p>
                    <div class="fran7-cookie-actions">
                        <button class="fran7-cookie-button fran7-cookie-button-secondary" type="button" data-cookie-action="reject">Rejeitar cookies</button>
                        <button class="fran7-cookie-button fran7-cookie-button-secondary" type="button" data-cookie-action="customize">Personalizar a minha escolha</button>
                        <button class="fran7-cookie-button fran7-cookie-button-primary" type="button" data-cookie-action="accept">Aceitar cookies</button>
                    </div>
                </div>
                <div class="fran7-cookie-settings" data-cookie-settings hidden>
                    <p class="fran7-cookie-eyebrow">AS TUAS PREFERÊNCIAS</p>
                    <h2>Personalizar cookies</h2>
                    <p class="fran7-cookie-copy">Os cookies necessários mantêm funções essenciais do site. Os cookies de análise só são ativados se os autorizares.</p>
                    <div class="fran7-cookie-category">
                        <div>
                            <strong>Cookies necessários</strong>
                            <p>Essenciais ao funcionamento e à segurança do site.</p>
                        </div>
                        <span class="fran7-cookie-required">Sempre ativos</span>
                    </div>
                    <label class="fran7-cookie-category fran7-cookie-toggle">
                        <span>
                            <strong>Cookies de análise</strong>
                            <p>Google Analytics ajuda-nos a compreender a utilização da loja.</p>
                        </span>
                        <input type="checkbox" data-cookie-analytics>
                    </label>
                    <div class="fran7-cookie-actions">
                        <button class="fran7-cookie-button fran7-cookie-button-secondary" type="button" data-cookie-action="back">Voltar</button>
                        <button class="fran7-cookie-button fran7-cookie-button-primary" type="button" data-cookie-action="save">Guardar a minha escolha</button>
                    </div>
                </div>
                <p class="fran7-cookie-error" data-cookie-error role="status" hidden>Não foi possível guardar a tua escolha neste navegador. Verifica as definições de cookies e tenta novamente.</p>
            </section>
        `;

        document.body.appendChild(wrapper);
        return wrapper;
    }

    function initialize() {
        if (!document.body) {
            console.error("Não foi possível inicializar as preferências de cookies da FRAN7: falta o elemento body.");
            return;
        }

        const savedConsent = readConsent();

        if (savedConsent) {
            setAnalytics(savedConsent.analytics);
            return;
        }

        const path = window.location.pathname;
        const isIndexPage = path === "/" || /\/index\.html$/i.test(path);
        if (!isIndexPage) return;

        const panel = createConsentPanel();
        const summary = panel.querySelector("[data-cookie-summary]");
        const settings = panel.querySelector("[data-cookie-settings]");
        const analyticsCheckbox = panel.querySelector("[data-cookie-analytics]");
        const errorMessage = panel.querySelector("[data-cookie-error]");

        function showSettings() {
            const consent = readConsent();
            analyticsCheckbox.checked = Boolean(consent && consent.analytics);
            errorMessage.hidden = true;
            summary.hidden = true;
            settings.hidden = false;
            analyticsCheckbox.focus();
        }

        function showSummary() {
            errorMessage.hidden = true;
            settings.hidden = true;
            summary.hidden = false;
            panel.wrapper.querySelector('[data-cookie-action="customize"]').focus();
        }

        function saveChoice(analytics) {
            errorMessage.hidden = true;
            if (!saveConsent(analytics)) {
                errorMessage.hidden = false;
                return;
            }
            setAnalytics(analytics);
            panel.hidden = true;
        }

        panel.addEventListener("click", function(event) {
            const button = event.target.closest("[data-cookie-action]");
            if (!button) return;

            switch (button.dataset.cookieAction) {
                case "reject":
                    saveChoice(false);
                    break;
                case "accept":
                    saveChoice(true);
                    break;
                case "customize":
                    showSettings();
                    break;
                case "back":
                    showSummary();
                    break;
                case "save":
                    saveChoice(analyticsCheckbox.checked);
                    break;
            }
        });

        panel.hidden = false;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
