document.addEventListener('DOMContentLoaded', () => {
    // --- Базовая инициализация ---
    const tg = window.Telegram.WebApp;
    tg.expand();

    // --- Инициализация TON Connect ---
    const tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
        manifestUrl: 'https://VAMPIR2615.github.io/vmpr-stake/tonconnect-manifest.json', // Замени на свою ссылку!
        buttonRootId: 'ton-connect-btn-container' // Мы создадим этот контейнер
    });

    // --- Элементы UI ---
    const balanceElement = document.getElementById('balance-amount');
    const connectButton = document.getElementById('ton-connect-btn');
    const usernameElement = document.getElementById('username');
    
    // --- Обновление UI при подключении/отключении кошелька ---
    tonConnectUI.onStatusChange(walletInfo => {
        if (walletInfo) {
            // Кошелек подключен
            const address = walletInfo.account.address;
            const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
            usernameElement.textContent = shortAddress; // Показываем адрес вместо имени
            connectButton.textContent = '📤'; // Кнопка "Выйти"
            // Здесь можно будет запросить баланс, но это требует доп. логики
        } else {
            // Кошелек отключен
            usernameElement.textContent = 'Vampir2615'; // Возвращаем ник
            connectButton.textContent = '➕'; // Кнопка "Подключить"
            balanceElement.textContent = '0.00';
        }
    });
    
    // Назначаем действие на нашу кастомную кнопку
    connectButton.addEventListener('click', () => {
        if (tonConnectUI.connected) {
            tonConnectUI.disconnect();
        } else {
            tonConnectUI.openModal();
        }
    });


    // --- Логика переключения вкладок (остается без изменений) ---
    const tabs = document.querySelectorAll('.tab');
    const gameButtons = document.querySelectorAll('.game-btn[data-tab]');
    const backButtons = document.querySelectorAll('.back-btn');

    function showTab(tabId) {
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        const targetTab = document.getElementById(tabId + '-tab') || document.getElementById(tabId);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    gameButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            if (tabId) {
                showTab(tabId);
            }
        });
    });

    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            showTab('main');
        });
    });

    // --- Логика игры "Кости" (остается без изменений) ---
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const playerDiceEl = document.getElementById('player-dice');
    const botDiceEl = document.getElementById('bot-dice');
    const diceResultText = document.querySelector('#game-dice-tab .result-text');

    rollDiceBtn.addEventListener('click', () => {
        diceResultText.textContent = "";
        let playerRoll, botRoll;
        const interval = setInterval(() => {
            playerRoll = Math.floor(Math.random() * 6) + 1;
            botRoll = Math.floor(Math.random() * 6) + 1;
            playerDiceEl.textContent = playerRoll;
            botDiceEl.textContent = botRoll;
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            playerRoll = Math.floor(Math.random() * 6) + 1;
            botRoll = Math.floor(Math.random() * 6) + 1;
            playerDiceEl.textContent = playerRoll;
            botDiceEl.textContent = botRoll;

            if (playerRoll > botRoll) {
                diceResultText.textContent = "Ты выиграл!";
                diceResultText.style.color = 'var(--win)';
            } else if (botRoll > playerRoll) {
                diceResultText.textContent = "Ты проиграл";
                diceResultText.style.color = 'var(--loss)';
            } else {
                diceResultText.textContent = "Ничья!";
                diceResultText.style.color = 'var(--text-color)';
            }
        }, 1000);
    });
});