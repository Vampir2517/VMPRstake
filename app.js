document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand(); // Расширяем приложение на весь экран

    // --- Переключение вкладок ---
    const tabs = document.querySelectorAll('.tab');
    const gameButtons = document.querySelectorAll('.game-btn[data-tab]');
    const backButtons = document.querySelectorAll('.back-btn');

    function showTab(tabId) {
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(tabId + '-tab').classList.add('active');
    }

    gameButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            if(tabId) {
                showTab(tabId);
            }
        });
    });

    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            showTab('main');
        });
    });
    
    // --- Логика игры "Кости" ---
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const playerDiceEl = document.getElementById('player-dice');
    const botDiceEl = document.getElementById('bot-dice');
    const diceResultText = document.querySelector('#game-dice-tab .result-text');

    rollDiceBtn.addEventListener('click', () => {
        // Анимация броска
        let playerRoll, botRoll;
        const interval = setInterval(() => {
            playerRoll = Math.floor(Math.random() * 6) + 1;
            botRoll = Math.floor(Math.random() * 6) + 1;
            playerDiceEl.textContent = playerRoll;
            botDiceEl.textContent = botRoll;
        }, 100);

        // Показываем результат через 1 секунду
        setTimeout(() => {
            clearInterval(interval);
            
            // Финальный результат
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

    // TODO: Добавить логику для "Камень-Ножницы-Бумага"
    // TODO: Добавить интеграцию с TON Connect
});