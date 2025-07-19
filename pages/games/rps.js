"use strict";

window.VMPR.currentPageScript = {
    init: function() {
        console.log('RPS game initialized.');
        const rpsChoiceButtons = document.querySelectorAll('#game-rps-content .choice-btn');
        const rpsResultText = document.getElementById('rps-result-text');
        const rpsBetAmountElement = document.getElementById('rps-bet-amount');

        // Глобальные объекты из VMPR
        const tg = window.VMPR.tg;
        const tonConnectUI = window.VMPR.tonConnectUI;
        const stakeAmount = window.VMPR.stakeAmount;
        const updateBalanceUI = window.VMPR.updateBalanceUI;
        const addHistoryEntry = window.VMPR.addHistoryEntry;

        rpsBetAmountElement.textContent = stakeAmount.toFixed(2);

        rpsChoiceButtons.forEach(button => {
            button.addEventListener('click', async () => {
                if (!tonConnectUI.connected) {
                    tg.showAlert('Пожалуйста, подключите кошелек TON для игры!');
                    return;
                }
                if (window.VMPR.userBalance < stakeAmount) {
                    tg.showAlert('Недостаточно TON на балансе для этой ставки!');
                    return;
                }

                rpsResultText.textContent = "Играем...";
                rpsResultText.style.color = 'var(--text-color)';

                setTimeout(() => {
                    const choices = ['rock', 'scissors', 'paper'];
                    const botChoice = choices[Math.floor(Math.random() * choices.length)];
                    const playerChoice = button.getAttribute('data-choice');

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
                        window.VMPR.userBalance += stakeAmount;
                    } else {
                        result = "Ты проиграл";
                        outcomeType = 'loss';
                        window.VMPR.userBalance -= stakeAmount;
                    }

                    rpsResultText.textContent = `${result} Бот выбрал ${getEmoji(botChoice)}.`;
                    rpsResultText.style.color = `var(--${outcomeType}-color)`;
                    updateBalanceUI();
                    addHistoryEntry(`КНБ | Ставка: ${stakeAmount.toFixed(2)} TON | ${result}`, outcomeType);
                }, 1000);
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
        // Слушатели событий на button элементах автоматически удаляются,
        // когда эти элементы удаляются из DOM при загрузке новой страницы.
        // Если бы вы добавляли глобальные слушатели или таймеры, их нужно было бы здесь очищать.
    }
};