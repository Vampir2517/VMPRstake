"use strict";

// Функция инициализации для этой страницы
window.VMPR.currentPageScript = {
    init: function() {
        console.log('RPS game initialized.');
        const rpsChoiceButtons = document.querySelectorAll('#game-rps-content .choice-btn');
        const rpsResultText = document.getElementById('rps-result-text');
        const rpsBetAmountElement = document.getElementById('rps-bet-amount');

        // Убедитесь, что global VMPR объекты доступны
        const tg = window.VMPR.tg;
        const tonConnectUI = window.VMPR.tonConnectUI;
        const userBalance = window.VMPR.userBalance; // Получаем текущий баланс
        const stakeAmount = window.VMPR.stakeAmount;
        const updateBalanceUI = window.VMPR.updateBalanceUI;
        const addHistoryEntry = window.VMPR.addHistoryEntry;

        rpsBetAmountElement.textContent = stakeAmount.toFixed(2);

        rpsChoiceButtons.forEach(button => {
            button.addEventListener('click', async () => {
                // Перепроверяем баланс и подключение перед каждой игрой
                if (!tonConnectUI.connected) {
                    tg.showAlert('Пожалуйста, подключите кошелек TON для игры!');
                    return;
                }
                if (window.VMPR.userBalance < stakeAmount) { // Используем актуальный баланс из VMPR
                    tg.showAlert('Недостаточно TON на балансе для этой ставки!');
                    return;
                }

                const playerChoice = button.getAttribute('data-choice');
                rpsResultText.textContent = "Играем...";
                rpsResultText.style.color = 'var(--text-color)';

                // Демонстрация клиентской логики (НЕБЕЗОПАСНО ДЛЯ РЕАЛЬНЫХ СТАВОК)
                setTimeout(() => {
                    const choices = ['rock', 'scissors', 'paper'];
                    const botChoice = choices[Math.floor(Math.random() * choices.length)];

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
                        window.VMPR.userBalance += stakeAmount; // Только для демонстрации
                    } else {
                        result = "Ты проиграл";
                        outcomeType = 'loss';
                        window.VMPR.userBalance -= stakeAmount; // Только для демонстрации
                    }

                    rpsResultText.textContent = `${result} Бот выбрал ${getEmoji(botChoice)}.`;
                    rpsResultText.style.color = `var(--${outcomeType}-color)`;
                    updateBalanceUI(); // Обновляем баланс в UI
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
    },
    cleanup: function() {
        console.log('RPS game cleaned up.');
        // Здесь можно убрать специфические слушатели событий, если они не будут убраны GC
        // Например, если вы добавляли их не через делегирование
    }
};