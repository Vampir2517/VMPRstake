"use strict";

// Глобальный объект для обмена данными и функциями между модулями
window.VMPR = window.VMPR || {};
window.VMPR.tg = null;
window.VMPR.tonConnectUI = null;
window.VMPR.userBalance = 0.00;
window.VMPR.stakeAmount = 1.00; // Фиксированная ставка для демонстрации
window.VMPR.updateBalanceUI = null; // Функция для обновления UI баланса
window.VMPR.addHistoryEntry = null; // Функция для добавления записи в историю
window.VMPR.currentPageScript = null; // Для отслеживания текущего загруженного скрипта

document.addEventListener('DOMContentLoaded', async () => {
    // --- Инициализация Telegram Web App ---
    const tg = window.Telegram.WebApp;
    window.VMPR.tg = tg; // Сохраняем в глобальную переменную
    tg.expand();
    tg.ready();

    // --- Элементы UI из index.html ---
    const usernameElement = document.getElementById('username');
    const userAvatarElement = document.getElementById('user-avatar');
    const balanceElement = document.getElementById('balance-amount');
    const mainContentContainer = document.getElementById('main-content-container');
    const navButtons = document.querySelectorAll('.bottom-nav .nav-btn');

    // --- Получение данных пользователя Telegram и аватара ---
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        usernameElement.textContent = user.username ? `@${user.username}` : `${firstName} ${lastName}`.trim() || 'Пользователь Telegram';

        // Аватар: Telegram Web App напрямую не предоставляет аватара.
        // Вы можете использовать заглушку на основе ID, как показано ниже,
        // или свой сервер, который может получать аватар через Bot API.
        // Для демонстрации используем Gravatar-подобный сервис или простую заглушку.
        userAvatarElement.src = `https://api.adorable-avatars.com/avatars/40/${user.id}.png`; // Пример с Adorable Avatars
        // userAvatarElement.src = `https://i.pravatar.cc/40?u=${user.id}`; // Другой пример заглушки
        // Если у вас есть URL аватара через ваш сервер:
        // userAvatarElement.src = `https://your-backend.com/get_avatar?user_id=${user.id}`;
    } else {
        usernameElement.textContent = 'Гость';
        userAvatarElement.src = 'assets/user.png'; // Заглушка по умолчанию
    }

    // --- Функция для обновления баланса в UI ---
    window.VMPR.updateBalanceUI = function() {
        balanceElement.textContent = window.VMPR.userBalance.toFixed(2);
    };

    // --- Функция для добавления записи в историю (сохранение в localStorage) ---
    window.VMPR.addHistoryEntry = function(text, type = 'info') {
        let historyData = JSON.parse(localStorage.getItem('gameHistory')) || [];
        historyData.unshift({ text, type, timestamp: new Date().toISOString() });
        historyData = historyData.slice(0, 10); // Ограничиваем количество записей
        localStorage.setItem('gameHistory', JSON.stringify(historyData));

        // Если страница истории активна, обновим ее
        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.updateHistoryDisplay === 'function') {
            window.VMPR.currentPageScript.updateHistoryDisplay();
        }
    };

    // --- Инициализация TON Connect SDK ---
    window.VMPR.tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
        manifestUrl: 'https://vampir2517.github.io/VMPRstake/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-btn-container'
    });

    // --- Обновление UI при подключении/отключении кошелька TON ---
    window.VMPR.tonConnectUI.onStatusChange(async (walletInfo) => {
        if (walletInfo) {
            const address = walletInfo.account.address;
            const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
            usernameElement.textContent = shortAddress;

            const TONAPI_KEY = ''; // ВАШ_TONAPI_КЛЮЧ, если нужен. Оставьте пустым для TonApi Testnet или если Canvas предоставляет
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
                tg.showAlert(`Ошибка получения баланса: ${error.message}`);
                window.VMPR.userBalance = 0.00;
                window.VMPR.updateBalanceUI();
            }
        } else {
            // Кошелек отключен, возвращаем Telegram-ник
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                const user = tg.initDataUnsafe.user;
                usernameElement.textContent = user.username ? `@${user.username}` : `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь Telegram';
            } else {
                usernameElement.textContent = 'Гость';
            }
            window.VMPR.userBalance = 0.00;
            window.VMPR.updateBalanceUI();
            window.VMPR.addHistoryEntry('Кошелек отключен', 'info');
        }
    });

    window.VMPR.updateBalanceUI(); // Инициализация отображения баланса

    // --- Динамическая загрузка контента страниц ---
    async function loadPage(pagePath) {
        // 1. Очистка предыдущего скрипта
        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.cleanup === 'function') {
            window.VMPR.currentPageScript.cleanup();
        }
        const oldScript = document.getElementById('dynamic-page-script');
        if (oldScript) {
            oldScript.remove();
        }
        window.VMPR.currentPageScript = null; // Сбрасываем текущий скрипт

        try {
            // 2. Загрузка HTML
            const htmlResponse = await fetch(`${pagePath}.html`);
            if (!htmlResponse.ok) throw new Error(`Failed to load ${pagePath}.html`);
            const html = await htmlResponse.text();
            mainContentContainer.innerHTML = html;

            // 3. Загрузка JS (после HTML)
            const script = document.createElement('script');
            script.id = 'dynamic-page-script'; // Уникальный ID для легкого удаления
            script.src = `${pagePath}.js`;
            script.onload = () => {
                // После загрузки скрипта, вызываем его инициализацию
                if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.init === 'function') {
                    window.VMPR.currentPageScript.init();
                }
            };
            script.onerror = (e) => console.error(`Failed to load script ${pagePath}.js`, e);
            document.body.appendChild(script);

            console.log(`Страница ${pagePath} успешно загружена.`);

        } catch (error) {
            console.error('Ошибка загрузки страницы:', error);
            tg.showAlert(`Ошибка загрузки страницы: ${error.message}`);
        }
    }

    // --- Обработчики для нижнего навигационного меню ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = button.getAttribute('data-page');
            if (page) {
                // Убираем active класс со всех кнопок
                navButtons.forEach(btn => btn.classList.remove('active'));
                // Добавляем active класс к нажатой кнопке
                button.classList.add('active');
                loadPage(page);
            }
        });
    });

    // --- Обработка кнопок "Назад" (делегирование событий) ---
    // Это позволит кнопкам "Назад" работать на любой динамически загруженной странице
    mainContentContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('back-btn')) {
            // Активируем кнопку "Игры" в нижнем меню и загружаем страницу игр
            navButtons.forEach(btn => btn.classList.remove('active'));
            const gamesButton = document.querySelector('.bottom-nav .nav-btn[data-page="pages/games/index"]');
            if (gamesButton) {
                gamesButton.classList.add('active');
            }
            loadPage('pages/games/index');
        }
    });

    // Загружаем начальную страницу (по умолчанию игры)
    loadPage('pages/games/index');
});