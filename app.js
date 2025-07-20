"use strict";

// Глобальный объект для обмена данными и функциями между модулями
window.VMPR = window.VMPR || {};
window.VMPR.tg = null;
window.VMPR.tonConnectUI = null; // Оставляем, но он будет null
window.VMPR.userBalance = 0.00;
window.VMPR.stakeAmount = 1.00; // Фиксированная ставка для демонстрации
window.VMPR.updateBalanceUI = null;
window.VMPR.addHistoryEntry = null;
window.VMPR.currentPageScript = null;

// Функция loadScript больше не нужна для TON Connect и Telegram SDK, так как они теперь статически в index.html
// Ее можно удалить или оставить для динамической загрузки других страниц, как она и используется ниже.
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
        document.body.appendChild(script); // Добавляем в body, так как это динамический контент
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const mainContentContainer = document.getElementById('main-content-container');
    const usernameElement = document.getElementById('username');
    const userAvatarElement = document.getElementById('user-avatar');
    const balanceElement = document.getElementById('balance-amount');
    const navButtons = document.querySelectorAll('.bottom-nav .nav-btn');

    // --- Инициализация Telegram Web App SDK ---
    if (window.Telegram && window.Telegram.WebApp) {
        window.VMPR.tg = window.Telegram.WebApp;
        window.VMPR.tg.expand();
        window.VMPR.tg.ready();
        window.VMPR.tg.MainButton.hide();
        console.log('Telegram Web App SDK initialized.');
    } else {
        console.error('Telegram Web App SDK not found or failed to initialize.');
        mainContentContainer.innerHTML = `<p style="color: var(--loss-color); text-align: center;">Критическая ошибка: Не удалось инициализировать Telegram Web App SDK.</p>`;
        return; 
    }

    // --- Инициализация TON Connect SDK (ОТКЛЮЧЕНО) ---
    // window.VMPR.tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({ ... });
    // Поскольку TON Connect SDK временно отключен, window.VMPR.tonConnectUI останется null.
    // Если вам позже понадобится кнопка подключения кошелька, вы можете добавить ее вручную
    // и временно заглушить ее функциональность.
    console.warn('TON Connect SDK временно отключен.');
    // Возможно, стоит добавить кнопку-заглушку, чтобы пользователи не видели, что чего-то не хватает
    // Если она не нужна прямо сейчас, можно пропустить.

    // --- Получение данных пользователя Telegram ---
    if (window.VMPR.tg.initDataUnsafe && window.VMPR.tg.initDataUnsafe.user) {
        const userId = window.VMPR.tg.initDataUnsafe.user.id;
        try {
            // URL вашего бэкенда на Vercel
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
        historyData = historyData.slice(0, 10); // Ограничиваем историю 10 записями
        localStorage.setItem('gameHistory', JSON.stringify(historyData));

        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.updateHistoryDisplay === 'function') {
            window.VMPR.currentPageScript.updateHistoryDisplay();
        }
    };

    // --- Обновление UI при подключении/отключении кошелька TON ---
    // ЭТОТ БЛОК УДАЛЕН ИЛИ ЗАКОММЕНТИРОВАН, так как TON Connect отключен.
    // window.VMPR.tonConnectUI.onStatusChange(async (walletInfo) => { ... });

    // Обновляем UI баланса при загрузке страницы (теперь он всегда будет 0.00, пока не подключим TON Connect)
    window.VMPR.updateBalanceUI();

    // --- Динамическая загрузка контента страниц ---
    window.VMPR.loadPage = async function(pagePath) {
        // Очистка предыдущего скрипта страницы, если он был
        if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.cleanup === 'function') {
            console.log(`Очистка скрипта для ${pagePath}`);
            window.VMPR.currentPageScript.cleanup();
        }
        const oldScript = document.getElementById('dynamic-page-script');
        if (oldScript) {
            oldScript.remove();
        }
        window.VMPR.currentPageScript = null;

        // Показываем спиннер загрузки
        mainContentContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            // Загружаем HTML-контент страницы
            const htmlResponse = await fetch(`${pagePath}.html`);
            if (!htmlResponse.ok) throw new Error(`Failed to load ${pagePath}.html: ${htmlResponse.statusText}`);
            const html = await htmlResponse.text();
            mainContentContainer.innerHTML = html; // Вставляем HTML в контейнер

            // Загружаем соответствующий JavaScript для страницы
            const script = document.createElement('script');
            script.id = 'dynamic-page-script';
            script.src = `${pagePath}.js`;
            script.onload = () => {
                // Если скрипт успешно загружен и имеет функцию init, вызываем ее
                if (window.VMPR.currentPageScript && typeof window.VMPR.currentPageScript.init === 'function') {
                    window.VMPR.currentPageScript.init();
                }
            };
            script.onerror = (e) => console.error(`Failed to load script ${pagePath}.js`, e);
            document.body.appendChild(script); // Добавляем скрипт в конец body

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
                // Удаляем класс 'active' со всех кнопок
                navButtons.forEach(btn => btn.classList.remove('active'));
                // Добавляем класс 'active' к нажатой кнопке
                button.classList.add('active');
                window.VMPR.loadPage(page); // Загружаем новую страницу
            }
        });
    });

    // --- Обработка кнопок "Назад" (для страниц с кнопкой "Назад") ---
    mainContentContainer.addEventListener('click', (event) => {
        const backBtn = event.target.closest('.back-btn');
        if (backBtn) {
            navButtons.forEach(btn => btn.classList.remove('active'));
            // Активируем кнопку "Игры" при возврате
            const gamesButton = document.querySelector('.bottom-nav .nav-btn[data-page="pages/games/index"]');
            if (gamesButton) {
                gamesButton.classList.add('active');
            }
            window.VMPR.loadPage('pages/games/index'); // Возвращаемся на страницу игр
        }
    });

    // Загружаем начальную страницу (по умолчанию игры) при первом запуске приложения
    const initialPageButton = document.querySelector('.bottom-nav .nav-btn[data-page="pages/games/index"]');
    if (initialPageButton) {
        initialPageButton.classList.add('active');
    }
    window.VMPR.loadPage('pages/games/index');
});