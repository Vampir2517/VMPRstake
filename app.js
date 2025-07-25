"use strict";

// Глобальный объект для обмена данными и функциями между модулями
window.VMPR = window.VMPR || {};
window.VMPR.tg = null;
window.VMPR.tonConnectUI = null; // Он будет null, так как SDK не загружается
window.VMPR.userBalance = 100.00; // Устанавливаем начальный баланс для теста
window.VMPR.stakeAmount = 1.00; // Фиксированная ставка для демонстрации
window.VMPR.updateBalanceUI = null;
window.VMPR.addHistoryEntry = null;
window.VMPR.currentPageScript = null;

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
        document.body.appendChild(script);
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

    // --- Инициализация TON Connect SDK (ПОЛНОСТЬЮ ОТКЛЮЧЕНО) ---
    console.warn('TON Connect SDK временно отключен, все связанные вызовы удалены/закомментированы.');

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
            
            // --- ЛОГИКА АВАТАРКИ ---
            // Сначала пытаемся использовать аватарку из БД
            if (userData.avatar_url) {
                userAvatarElement.src = userData.avatar_url;
                // Если аватарка из БД не загрузилась (битая ссылка, ошибка сети), используем локальную заглушку
                userAvatarElement.onerror = () => {
                    userAvatarElement.src = 'assets/user.png'; 
                    console.warn('Не удалось загрузить аватарку пользователя из БД, используется локальная заглушка.');
                    userAvatarElement.onerror = null; // Предотвращаем бесконечный цикл ошибок
                };
            } else {
                // Если avatar_url из БД пустой или отсутствует, сразу используем локальную заглушку
                userAvatarElement.src = 'assets/user.png';
                console.log('avatar_url из БД отсутствует, используется локальная заглушка.');
            }
            // --- КОНЕЦ ЛОГИКИ АВАТАРКИ ---

            console.log("User data from backend:", userData);

        } catch (error) {
            console.error('Ошибка при получении данных пользователя с бэкенда:', error);
            usernameElement.textContent = 'Гость (ошибка загрузки данных)';
            userAvatarElement.src = 'assets/user.png'; // Используем заглушку при ошибке загрузки данных
            window.VMPR.tg.showAlert(`Ошибка загрузки данных пользователя: ${error.message}`);
        }
    } else {
        usernameElement.textContent = 'Гость (нет данных WebApp)';
        userAvatarElement.src = 'assets/user.png'; // Используем заглушку, если нет данных WebApp
    }

    // --- Функции для работы с балансом ---
    window.VMPR.updateBalanceUI = function() {
        balanceElement.textContent = window.VMPR.userBalance.toFixed(2);
    };

    window.VMPR.deductBalance = function(amount) {
        if (window.VMPR.userBalance >= amount) {
            window.VMPR.userBalance = parseFloat((window.VMPR.userBalance - amount).toFixed(2));
            window.VMPR.updateBalanceUI();
            window.VMPR.addHistoryEntry(`Снято: ${amount.toFixed(2)} TON`, 'loss');
            return true;
        } else {
            window.VMPR.tg.showAlert('Недостаточно средств на балансе!');
            return false;
        }
    };

    window.VMPR.addBalance = function(amount) {
        window.VMPR.userBalance = parseFloat((window.VMPR.userBalance + amount).toFixed(2));
        window.VMPR.updateBalanceUI();
        window.VMPR.addHistoryEntry(`Начислено: ${amount.toFixed(2)} TON`, 'win');
    };

    // Обновляем UI баланса при загрузке страницы
    window.VMPR.updateBalanceUI();

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

    // Загружаем начальную страницу (по умолчанию игры) при первом запуске приложения
    const initialPageButton = document.querySelector('.bottom-nav .nav-btn[data-page="pages/games/index"]');
    if (initialPageButton) {
        initialPageButton.classList.add('active');
    }
    window.VMPR.loadPage('pages/games/index');
});