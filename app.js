"use strict"; // Добавлен строгий режим

document.addEventListener('DOMContentLoaded', () => {
    // --- Инициализация Telegram Web App ---
    const tg = window.Telegram.WebApp;
    tg.expand(); // Разворачиваем приложение на весь экран
    tg.ready();  // Сообщаем Telegram, что приложение готово

    // --- Инициализация TON Connect SDK ---
    // Убедитесь, что manifestUrl точно соответствует URL вашего приложения и манифеста!
    const tonConnectUI = new TON_CONNECT_SDK.TonConnectUI({
        manifestUrl: 'https://vampir2517.github.io/VMPRstake/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-btn-container' // SDK сам вставит кнопку подключения сюда
    });

    // --- Элементы UI ---
    const usernameElement = document.getElementById('username');
    const balanceElement = document.getElementById('balance-amount');
    const historyList = document.getElementById('history-list');

    // --- Переменные для состояния игры (для демонстрации) ---
    let userBalance = 0.00; // Баланс пользователя, будет обновляться с блокчейна
    const stakeAmount = 1.00; // Фиксированная ставка для демонстрации

    // --- Функция для обновления баланса в UI ---
    function updateBalanceUI() {
        balanceElement.textContent = userBalance.toFixed(2);
    }

    // --- Функция для добавления записи в историю ---
    function addHistoryEntry(text, type = 'info') {
        const listItem = document.createElement('li');
        listItem.textContent = text;
        if (type === 'win') {
            listItem.classList.add('win');
        } else if (type === 'loss') {
            listItem.classList.add('loss');
        } else if (type === 'draw') {
            listItem.classList.add('draw');
        }
        // Добавляем новый элемент в начало списка
        historyList.prepend(listItem);
        // Ограничиваем количество записей в истории (например, до 10)
        while (historyList.children.length > 10) {
            historyList.removeChild(historyList.lastChild);
        }
    }

    // --- Обновление UI при подключении/отключении кошелька TON ---
    tonConnectUI.onStatusChange(async (walletInfo) => {
        if (walletInfo) {
            // Кошелек подключен
            const address = walletInfo.account.address;
            const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`; // Исправлен шаблонный литерал
            usernameElement.textContent = shortAddress; // Показываем сокращенный адрес

            // --- Получение баланса TON с блокчейна ---
            // ВНИМАНИЕ: Для реального приложения вам понадобится получить свой API-ключ от TonAPI (tonapi.io)
            // и вставить его вместо 'ВАШ_TONAPI_КЛЮЧ'. Без ключа запросы могут быть ограничены.
            const TONAPI_KEY = ''; // Оставьте пустым, если Canvas предоставляет его автоматически, иначе вставьте свой ключ.

            if (!TONAPI_KEY) {
                console.warn('ВНИМАНИЕ: TONAPI_KEY не установлен. Баланс может не обновляться.');
                tg.showAlert('Для получения актуального баланса TONAPI_KEY должен быть установлен.');
            }

            const headers = TONAPI_KEY ? { 'Authorization': `Bearer ${TONAPI_KEY}` } : {};

            try {
                const response = await fetch(`https://tonapi.io/v2/accounts/${address}`, { headers });
                if (!response.ok) {
                    throw new Error(`Ошибка TonAPI: ${response.statusText}`);
                }
                const data = await response.json();
                if (data && data.balance) {
                    const balanceNano = BigInt(data.balance); // Баланс в нанотонах
                    userBalance = Number(balanceNano) / 1_000_000_000; // Конвертируем в TON
                    updateBalanceUI();
                    addHistoryEntry(`Кошелек подключен: ${shortAddress}`, 'info');
                }
            } catch (error) {
                console.error('Ошибка при получении баланса:', error);
                tg.showAlert(`Ошибка получения баланса: ${error.message}`); // Используйте tg.showAlert для уведомлений
                userBalance = 0.00; // Сбрасываем баланс при ошибке
                updateBalanceUI();
            }

        } else {
            // Кошелек отключен
            usernameElement.textContent = 'Vampir2615'; // Возвращаем ник
            userBalance = 0.00;
            updateBalanceUI();
            addHistoryEntry('Кошелек отключен', 'info');
        }
    });

    // --- Логика переключения вкладок ---
    const tabs = document.querySelectorAll('.tab');
    // Используем querySelectorAll для game-btn, так как data-tab может быть на разных элементах
    const gameButtons = document.querySelectorAll('.game-btn[data-tab]');
    const backButtons = document.querySelectorAll('.back-btn');

    function showTab(tabId) {
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        // Убедимся, что ID вкладок соответствуют. Например, 'main-tab' для main
        const targetTab = document.getElementById(tabId + '-tab') || document.getElementById(tabId);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    // Изначально показываем главную вкладку
    showTab('main'); 

    gameButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // event.stopPropagation(); // Можно добавить, если есть проблемы с всплытием
            const tabId = button.getAttribute('data-tab');
            if (tabId) {
                showTab(tabId);
            }
        });
    });

    backButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // event.stopPropagation();
            showTab('main');
        });
    });

    // --- Демонстрационная логика игры "Камень, Ножницы, Бумага" (КНБ) ---
    const rpsChoiceButtons = document.querySelectorAll('#game-rps-tab .choice-btn');
    const rpsResultText = document.getElementById('rps-result-text');
    const rpsBetAmountElement = document.getElementById('rps-bet-amount');
    rpsBetAmountElement.textContent = stakeAmount.toFixed(2); // Отображаем ставку

    rpsChoiceButtons.forEach(button => {
        button.addEventListener('click', async () => {
            if (!tonConnectUI.connected) {
                tg.showAlert('Пожалуйста, подключите кошелек TON для игры!');
                return;
            }
            if (userBalance < stakeAmount) {
                tg.showAlert('Недостаточно TON на балансе для этой ставки!');
                return;
            }

            rpsResultText.textContent = "Играем...";
            rpsResultText.style.color = 'var(--text-color)';

            // Демонстрация клиентской логики (НЕБЕЗОПАСНО ДЛЯ РЕАЛЬНЫХ СТАВОК)
            setTimeout(() => {
                const choices = ['rock', 'scissors', 'paper'];
                const botChoice = choices[Math.floor(Math.random() * choices.length)];
                const playerChoice = button.getAttribute('data-choice'); // Получаем выбор игрока здесь

                let result;
                let outcomeType = 'draw';
                if (playerChoice === botChoice) {
                    result = "Ничья!";
                } else if (
                    (playerChoice === 'rock' && botChoice === 'scissors') ||
                    (playerChoice === 'scissors' && botChoice === 'paper') ||
                    (playerChoice === 'paper' && botChoice === 'rock')
                ) {
                    result = "Ты выиграл!";
                    outcomeType = 'win';
                    userBalance += stakeAmount; // Только для демонстрации
                } else {
                    result = "Ты проиграл";
                    outcomeType = 'loss';
                    userBalance -= stakeAmount; // Только для демонстрации
                }

                rpsResultText.textContent = `${result} Бот выбрал ${getEmoji(botChoice)}.`;
                rpsResultText.style.color = `var(--${outcomeType}-color)`;
                updateBalanceUI();
                addHistoryEntry(`КНБ | Ставка: ${stakeAmount.toFixed(2)} TON | ${result}`, outcomeType);
            }, 1000); // Имитация задержки сети
        });
    });

    function getEmoji(choice) {
        switch (choice) {
            case 'rock': return '🪨';
            case 'scissors': return '✂️';
            case 'paper': return '📄';
            default: return '';
        }
    }

    // --- Демонстрационная логика игры "Кости" ---
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const playerDiceEl = document.getElementById('player-dice');
    const botDiceEl = document.getElementById('bot-dice');
    const diceResultText = document.getElementById('dice-result-text');
    const diceBetAmountElement = document.getElementById('dice-bet-amount');
    diceBetAmountElement.textContent = stakeAmount.toFixed(2); // Отображаем ставку

    rollDiceBtn.addEventListener('click', () => {
        if (!tonConnectUI.connected) {
            tg.showAlert('Пожалуйста, подключите кошелек TON для игры!');
            return;
        }
        if (userBalance < stakeAmount) {
            tg.showAlert('Недостаточно TON на балансе для этой ставки!');
            return;
        }

        diceResultText.textContent = "";
        diceResultText.style.color = 'var(--text-color)';
        playerDiceEl.textContent = '?';
        botDiceEl.textContent = '?';

        // Демонстрация клиентской логики (НЕБЕЗОПАСНО ДЛЯ РЕАЛЬНЫХ СТАВОК)
        let playerRoll, botRoll;
        let rollCount = 0;
        const maxRolls = 15; // Количество "перебросов" для анимации

        const interval = setInterval(() => {
            playerRoll = Math.floor(Math.random() * 6) + 1;
            botRoll = Math.floor(Math.random() * 6) + 1;
            playerDiceEl.textContent = playerRoll;
            botDiceEl.textContent = botRoll;
            rollCount++;
            if (rollCount >= maxRolls) {
                clearInterval(interval);
                // Финальный бросок после анимации
                playerRoll = Math.floor(Math.random() * 6) + 1;
                botRoll = Math.floor(Math.random() * 6) + 1;
                playerDiceEl.textContent = playerRoll;
                botDiceEl.textContent = botRoll;

                let result;
                let outcomeType = 'draw';
                if (playerRoll > botRoll) {
                    result = "Ты выиграл!";
                    outcomeType = 'win';
                    userBalance += stakeAmount; // Только для демонстрации
                } else if (botRoll > playerRoll) {
                    result = "Ты проиграл";
                    outcomeType = 'loss';
                    userBalance -= stakeAmount; // Только для демонстрации
                } else {
                    result = "Ничья!";
                    outcomeType = 'draw';
                }
                diceResultText.textContent = result;
                diceResultText.style.color = `var(--${outcomeType}-color)`;
                updateBalanceUI();
                addHistoryEntry(`Кости | Ставка: ${stakeAmount.toFixed(2)} TON | ${result}`, outcomeType);
            }
        }, 100); // Скорость анимации
    });
});