/**
 * EDELHART Currency Manager
 * Handles smooth currency switching without page reload or flicker
 */
(function() {
    'use strict';

    const CURRENCY_KEY = 'edelhart: currency';

    const CURRENCIES = {
        VND: { symbol: '₫', rate: 1, locale: 'vi-VN', decimals: 0 },
        USD: { symbol: '$', rate: 25000, locale: 'en-US', decimals: 0 },
        EUR: { symbol: '€', rate: 27000, locale: 'de-DE', decimals: 0 }
    };

    let currentCurrency = 'VND';

    function getStoredCurrency() {
        try {
            return localStorage.getItem(CURRENCY_KEY) || 'VND';
        } catch {
            return 'VND';
        }
    }

    function storeCurrency(currency) {
        try {
            localStorage.setItem(CURRENCY_KEY, currency);
        } catch {}
    }

    function convert(vndAmount, targetCurrency) {
        const config = CURRENCIES[targetCurrency] || CURRENCIES.VND;
        if (!vndAmount || vndAmount === 0) return 0;
        return vndAmount / config.rate;
    }

    function formatPrice(vndAmount, currency) {
        if (!vndAmount || vndAmount === 0) return 'Price on request';

        const config = CURRENCIES[currency] || CURRENCIES.VND;
        const converted = convert(vndAmount, currency);

        const formatted = converted.toLocaleString(config.locale, {
            minimumFractionDigits: config.decimals,
            maximumFractionDigits: config.decimals
        });

        return `${config.symbol}${formatted}`;
    }

    function updateAllPrices() {
        requestAnimationFrame(() => {
            const priceElements = document.querySelectorAll('[data-price-vnd]');

            priceElements.forEach(el => {
                const vnd = parseInt(el.getAttribute('data-price-vnd'), 10);
                el.textContent = formatPrice(vnd, currentCurrency);
            });

            // Update cart total if present
            const cartTotal = document.querySelector('.cart-total[data-price-vnd]');
            if (cartTotal) {
                const vnd = parseInt(cartTotal.getAttribute('data-price-vnd'), 10);
                cartTotal.textContent = formatPrice(vnd, currentCurrency);
            }
        });
    }

    function initSelectors() {
        const selectors = document.querySelectorAll('[data-role="currency-select"], .currency-select');

        selectors.forEach(select => {
            select.value = currentCurrency;

            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);

            newSelect.addEventListener('change', (e) => {
                const newCurrency = e.target.value;
                if (newCurrency !== currentCurrency && CURRENCIES[newCurrency]) {
                    currentCurrency = newCurrency;
                    storeCurrency(newCurrency);
                    updateAllPrices();

                    document.querySelectorAll('[data-role="currency-select"], .currency-select').forEach(s => {
                        if (s !== e.target) s.value = newCurrency;
                    });
                }
            });
        });
    }

    function init() {
        currentCurrency = getStoredCurrency();
        initSelectors();
        updateAllPrices();
    }

    function refresh() {
        updateAllPrices();
    }

    function getCurrent() {
        return currentCurrency;
    }

    function setCurrency(currency) {
        if (CURRENCIES[currency] && currency !== currentCurrency) {
            currentCurrency = currency;
            storeCurrency(currency);
            updateAllPrices();

            document.querySelectorAll('[data-role="currency-select"], .currency-select').forEach(s => {
                s.value = currency;
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CurrencyManager = {
        init,
        refresh,
        getCurrent,
        setCurrency,
        formatPrice,
        convert
    };

})();