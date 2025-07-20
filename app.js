"use strict";

// Глобальный объект для обмена данными и функциями между модулями
window.VMPR = window.VMPR || {};
window.VMPR.tg = null;
window.VMPR.tonConnectUI = null;
window.VMPR.userBalance = 0.00;
window.VMPR.stakeAmount = 1.00; // Фиксированная ставка для демонстрации
window.VMPR.updateBalanceUI = null;
window.VMPR.addHistoryEntry = null;
window.VMPR.currentPageScript = null;

// Функция для динамической загрузки скриптов
function loadScript(src, id = null) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        if (id) {
            script.id = id;
        }
        script.onload = () => {
            console.log(`Script loaded: ${src}`);
            resolve();
        };
        script.onerror = (e) => {
            console.error(`Error loading script: ${src}`, e);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script); // Важно: добавляем в head, чтобы он был доступен
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const mainContentContainer = document.getElementById('main-content-container');
    const usernameElement = document.getElementById('username');
    const userAvatarElement = document.getElementById('user-avatar');
    const balanceElement = document.getElementById('balance-amount');
    const navButtons = document.querySelectorAll('.bottom-nav .nav-btn');

    try {
        // --- Динамическая загрузка Telegram Web App SDK ---
        console.log('Loading Telegram Web App SDK...');
        await loadScript('https://telegram.org/js/telegram-web-app.js', 'telegram-sdk');
        if (!window.Telegram || !window.Telegram.WebApp) {
            throw new Error('Telegram Web App SDK not found after loading.');
        }
        window.VMPR.tg = window.Telegram.WebApp;
        window.VMPR.tg.expand();
        window.VMPR.tg.ready();
        window.VMPR.tg.MainButton.hide();
        console.log('Telegram Web App SDK loaded and initialized.');

        // --- Динамическая загрузка TON Connect SDK ---
        console.log('Loading TON Connect SDK...');
        // Попробуем CDNJS еще раз, но теперь с контролем загрузки
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/ton-connect-sdk/2.3.0/ton-connect-sdk.min.js', 'tonconnect-sdk');
        if (!window.TON_CONNECT_SDK) {
            throw new Error('TON Connect SDK not found after loading.');
        }
        console.log('TON Connect SDK loaded.');

    } catch (error) {
        console.error('CRITICAL ERROR: Failed to load essential SDKs.', error);
        mainContentContainer.innerHTML = `<p style="color: var(--loss-color); text-align: center;">Критическая ошибка загрузки: ${error.message}. Проверьте подключение к интернету.</p>`;
        // Можно показать более наглядное сообщение пользователю через Telegram Web App, если SDK загрузился до этого
        if (window.VMPR.tg) {
             window.VMPR.tg.showAlert(`Критическая ошибка: ${error.message}`);
        }
        return; // Останавливаем выполнение, если базовые SDK не загрузились
    }

    // --- Остальной код app.js (который у вас уже был) ---
    // Начинаем использовать window.VMPR.tg и window.TON_CONNECT_SDK только после успешной загрузки выше

    // --- Получение данных пользователя Telegram ---
    if (window.VMPR.tg.initDataUnsafe && window.VMPR.tg.initDataUnsafe.user) {
        const userId = window.VMPR.tg.initDataUnsafe.user.id;
        try {
            const backendBaseUrl = "https://telegram-webapp-backend.vercel.app";
            const response = await fetch(`${backendBaseUrl}/api/user-data?user_id=${userId}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to fetch user data: ${response.status} ${errorData.detail || response.statusText}`);
            }
            const userData = await response.json();

            usernameElement.textContent = userData.username ? `@${userData.username}` : userData.first_name.trim() || 'Пользователь Telegram';
            userAvatarElement.src = userData.avatar_url || 'assets/user.png';

            console.log("User data from backend:", userData);

        } catch (error) {
            console.error('Ошибка при получении данных пользователя с бэкенда:', error);
            usernameElement.textContent = 'Гость (ошибка загрузки данных)';
            userAvatarElement.src = 'assets/user.png';
            window.VMPR.tg.showAlert(`Ошибка загрузки данных пользователя: ${error.message}`);
        }
    } else {
        usernameElement.textContent = 'Гость (нет данных WebApp)';
        userAvatarElement.src = 'assets/user.png';
    }

    // --- Функция для обновления баланса в UI ---
    window.VMPR.updateBalanceUI = function() {
        balanceElement.textContent = window.VMPR.userBalance.toFixed(2);
    };

    // --- Функция для добавления записи в историю (сохранение в localStorage) ---
    window.VMPR.addHistoryEntry = function(text, type = 'info') {
        let historyData = JSON.parse(localStorage.getItem('gameHistory')) || [];
        historyData.unshift({ text, type, timestamp: new Date().toISOString() });
        historyData = historyData.slice(0, 10);
        localStorage.setItem('gameHistory', JSON.stringify(historyData));

        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.updateHistoryDisplay === 'function') {
            window.VMPR.currentPageScript.updateHistoryDisplay();
        }
    };

    // --- Инициализация TON Connect SDK ---
    window.VMPR.tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
        manifestUrl: 'https://vampir2517.github.io/VMPRstake/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-btn-container' // Это ID для кнопки, которая будет создана TonConnect SDK
    });

    // --- Обновление UI при подключении/отключении кошелька TON ---
    window.VMPR.tonConnectUI.onStatusChange(async (walletInfo) => {
        if (walletInfo) {
            const address = walletInfo.account.address;
            const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

            const TONAPI_KEY = ''; // Вставьте ваш TONAPI_KEY здесь
            const headers = TONAPI_KEY ? { 'Authorization': `Bearer ${TONAPI_KEY}` } : {};

            try {
                const response = await fetch(`https://tonapi.io/v2/accounts/${address}`, { headers });
                
                if (!response.ok) {
                    throw new Error(`Ошибка TonAPI: ${response.statusText}`);
                }
                const data = await response.json();
                if (data && data.balance) {
                    const balanceNano = BigInt(data.balance);
                    window.VMPR.userBalance = Number(balanceNano) / 1_000_000_000;
                    window.VMPR.updateBalanceUI();
                    window.VMPR.addHistoryEntry(`Кошелек подключен: ${shortAddress}`, 'info');
                }
            } catch (error) {
                console.error('Ошибка при получении баланса:', error);
                window.VMPR.tg.showAlert(`Ошибка получения баланса: ${error.message}`);
                window.VMPR.userBalance = 0.00;
                window.VMPR.updateBalanceUI();
            }
        } else {
            if (window.VMPR.tg.initDataUnsafe && window.VMPR.tg.initDataUnsafe.user) {
                const user = window.VMPR.tg.initDataUnsafe.user;
                usernameElement.textContent = user.username ? `@${user.username}` : `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь Telegram';
            } else {
                usernameElement.textContent = 'Гость';
            }
            userAvatarElement.src = 'assets/user.png';
            window.VMPR.userBalance = 0.00;
            window.VMPR.updateBalanceUI();
            window.VMPR.addHistoryEntry('Кошелек отключен', 'info');
        }
    });

    window.VMPR.updateBalanceUI();

    // --- Динамическая загрузка контента страниц ---
    window.VMPR.loadPage = async function(pagePath) {
        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.cleanup === 'function') {
            console.log(`Очистка скрипта для ${pagePath}`);
            window.VMPR.currentPageScript.cleanup();
        }
        const oldScript = document.getElementById('dynamic-page-script');
        if (oldScript) {
            oldScript.remove();
        }
        window.VMPR.currentPageScript = null;

        mainContentContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const htmlResponse = await fetch(`${pagePath}.html`);
            if (!htmlResponse.ok) throw new Error(`Failed to load ${pagePath}.html: ${htmlResponse.statusText}`);
            const html = await htmlResponse.text();
            mainContentContainer.innerHTML = html;

            const script = document.createElement('script');
            script.id = 'dynamic-page-script';
            script.src = `${pagePath}.js`;
            script.onload = () => {
                if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.init === 'function') {
                    window.VMPR.currentPageScript.init();
                }
            };
            script.onerror = (e) => console.error(`Failed to load script ${pagePath}.js`, e);
            document.body.appendChild(script);

            console.log(`Страница ${pagePath} успешно загружена.`);

        } catch (error) {
            console.error('Ошибка загрузки страницы:', error);
            mainContentContainer.innerHTML = `<p style="color: var(--loss-color); text-align: center;">Ошибка загрузки контента: ${error.message}</p>`;
            window.VMPR.tg.showAlert(`Ошибка загрузки страницы: ${error.message}`);
        }
    }

    // --- Обработчики для нижнего навигационного меню ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = button.getAttribute('data-page');
            if (page) {
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                window.VMPR.loadPage(page);
            }
        });
    });

    // --- Обработка кнопок "Назад" ---
    mainContentContainer.addEventListener('click', (event) => {
        const backBtn = event.target.closest('.back-btn');
        if (backBtn) {
            navButtons.forEach(btn => btn.classList.remove('active'));
            const gamesButton = document.querySelector('.bottom-nav .nav-btn[data-page="pages/games/index"]');
            if (gamesButton) {
                gamesButton.classList.add('active');
            }
            window.VMPR.loadPage('pages/games/index');
        }
    });

    // Загружаем начальную страницу (по умолчанию игры)
    const initialPageButton = document.querySelector('.bottom-nav .nav-btn[data-page="pages/games/index"]');
    if (initialPageButton) {
        initialPageButton.classList.add('active');
    }
    window.VMPR.loadPage('pages/games/index');
});