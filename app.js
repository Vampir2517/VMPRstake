"use strict";

// Глобальные переменные для доступа из других модулей
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
    tg.expand(); // Разворачиваем приложение на весь экран
    tg.ready();  // Сообщаем Telegram, что приложение готово

    // --- Элементы UI ---
    const usernameElement = document.getElementById('username');
    const userAvatarElement = document.getElementById('user-avatar');
    const balanceElement = document.getElementById('balance-amount');
    const mainContentContainer = document.getElementById('main-content-container');
    const historyList = document.createElement('ul'); // В app.js больше не будет истории, она в history.html
    historyList.id = 'history-list';
    historyList.classList.add('history-list');

    // --- Получение данных пользователя Telegram ---
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        usernameElement.textContent = user.username ? `@${user.username}` : `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь Telegram';
        // Telegram Web App не предоставляет прямой доступ к аватару.
        // Для аватара обычно требуется серверная часть, использующая Bot API.
        // Пока оставим заглушку или можно использовать Gravatar по user.id, если хотите.
        // userAvatarElement.src = `URL_К_АВАТАРУ_ЧЕРЕЗ_БОТА_API_ИЛИ_ЗАГЛУШКА`;
        userAvatarElement.src = `https://i.pravatar.cc/40?u=${user.id}`; // Пример Gravatar-подобной заглушки
    } else {
        usernameElement.textContent = 'Vampir2615'; // Дефолтное значение
    }

    // --- Функция для обновления баланса в UI ---
    window.VMPR.updateBalanceUI = function() {
        balanceElement.textContent = window.VMPR.userBalance.toFixed(2);
    };

    // --- Функция для добавления записи в историю (будет использоваться модулями) ---
    // Это теперь функция-заглушка или для отладки, т.к. история будет в отдельном файле
    window.VMPR.addHistoryEntry = function(text, type = 'info') {
        // Логика добавления записи в DOM теперь должна быть в history.js
        // Эта функция будет вызываться модулями игр и передавать данные
        // которые history.js будет слушать или запрашивать.
        console.log(`История добавлена (имитация): ${text} (${type})`);
        // В реальном приложении:
        // 1. Отправка на бэкенд
        // 2. Сохранение в localStorage (для демо)
        let historyData = JSON.parse(localStorage.getItem('gameHistory')) || [];
        historyData.unshift({ text, type, timestamp: new Date().toISOString() });
        // Ограничиваем количество записей
        historyData = historyData.slice(0, 10); 
        localStorage.setItem('gameHistory', JSON.stringify(historyData));

        // Если страница истории открыта, обновим ее
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
            // Кошелек подключен
            const address = walletInfo.account.address;
            const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
            usernameElement.textContent = shortAddress; // Показываем сокращенный адрес

            const TONAPI_KEY = ''; // ВАШ_TONAPI_КЛЮЧ, если нужен
            if (!TONAPI_KEY) {
                console.warn('ВНИМАНИЕ: TONAPI_KEY не установлен. Баланс может не обновляться.');
                // tg.showAlert('Для получения актуального баланса TONAPI_KEY должен быть установлен.');
            }
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
            // Кошелек отключен
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                const user = tg.initDataUnsafe.user;
                usernameElement.textContent = user.username ? `@${user.username}` : `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь Telegram';
            } else {
                usernameElement.textContent = 'Vampir2615';
            }
            window.VMPR.userBalance = 0.00;
            window.VMPR.updateBalanceUI();
            window.VMPR.addHistoryEntry('Кошелек отключен', 'info');
        }
    });

    window.VMPR.updateBalanceUI(); // Первичное обновление баланса

    // --- Динамическая загрузка контента ---
    async function loadContent(pagePath) {
        // Удаляем предыдущие скрипты
        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.cleanup === 'function') {
            window.VMPR.currentPageScript.cleanup(); // Вызываем функцию очистки, если она есть
        }
        const oldScript = document.getElementById('dynamic-script');
        if (oldScript) {
            oldScript.remove();
        }

        try {
            const response = await fetch(`${pagePath}.html`);
            if (!response.ok) throw new Error(`Failed to load ${pagePath}.html`);
            const html = await response.text();
            mainContentContainer.innerHTML = html;

            const script = document.createElement('script');
            script.id = 'dynamic-script';
            script.src = `${pagePath}.js`;
            script.onload = () => {
                // После загрузки скрипта, можно вызвать его инициализацию
                // предполагается, что каждый скрипт экспортирует функцию init()
                if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.init === 'function') {
                    window.VMPR.currentPageScript.init();
                }
            };
            script.onerror = (e) => console.error(`Failed to load script ${pagePath}.js`, e);
            document.body.appendChild(script);

            // Добавляем класс 'active' только к загруженному контенту, если нужно.
            // В данной структуре, main-menu-content всегда будет видимым,
            // а загружаемый контент будет его заменять.
            // Поэтому, удаляем класс active с main-menu-content при загрузке.
            const mainMenuContent = document.getElementById('main-menu-content');
            if (mainMenuContent) {
                mainMenuContent.classList.remove('active');
            }

        } catch (error) {
            console.error('Ошибка загрузки контента:', error);
            tg.showAlert(`Ошибка загрузки страницы: ${error.message}`);
            // В случае ошибки возвращаемся к главному меню
            showMainMenu();
        }
    }

    // --- Отображение главного меню ---
    function showMainMenu() {
        // Удаляем предыдущие скрипты
        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.cleanup === 'function') {
            window.VMPR.currentPageScript.cleanup();
        }
        const oldScript = document.getElementById('dynamic-script');
        if (oldScript) {
            oldScript.remove();
        }
        window.VMPR.currentPageScript = null; // Сбрасываем текущий скрипт

        const mainMenuHtml = `
            <div id="main-menu-content" class="tab active">
                <button class="game-btn" data-target-page="games/rps">🎮 Камень, Ножницы, Бумага</button>
                <button class="game-btn" data-target-page="games/dice">🎲 Кости</button>
                <button class="game-btn" data-target-page="history/history">📜 История</button>
            </div>
        `;
        mainContentContainer.innerHTML = mainMenuHtml;
        setupMainMenuButtons(); // Перенастраиваем слушатели кнопок главного меню
    }

    // --- Настройка кнопок главного меню ---
    function setupMainMenuButtons() {
        document.querySelectorAll('#main-menu-content .game-btn').forEach(button => {
            button.removeEventListener('click', handleGameButtonClick); // Избегаем дублирования слушателей
            button.addEventListener('click', handleGameButtonClick);
        });
    }

    function handleGameButtonClick(event) {
        const pagePath = event.currentTarget.getAttribute('data-target-page');
        if (pagePath) {
            loadContent(pagePath);
        }
    }

    // Инициализация кнопок главного меню при загрузке
    setupMainMenuButtons();

    // Слушатель для кнопок "Назад"
    // Эти кнопки будут внутри загружаемого контента, поэтому мы вешаем слушатель на основной контейнер, используя делегирование событий.
    mainContentContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('back-btn')) {
            showMainMenu();
        }
    });
});