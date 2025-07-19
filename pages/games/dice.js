"use strict";

window.VMPR.currentPageScript = {
    init: function() {
        console.log('Dice game initialized.');
        const rollDiceBtn = document.getElementById('roll-dice-btn');
        const playerDiceEl = document.getElementById('player-dice');
        const botDiceEl = document.getElementById('bot-dice');
        const diceResultText = document.getElementById('dice-result-text');
        const diceBetAmountElement = document.getElementById('dice-bet-amount');

        // Глобальные объекты из VMPR
        const tg = window.VMPR.tg;
        const tonConnectUI = window.VMPR.tonConnectUI;
        const stakeAmount = window.VMPR.stakeAmount;
        const updateBalanceUI = window.VMPR.updateBalanceUI;
        const addHistoryEntry = window.VMPR.addHistoryEntry;

        diceBetAmountElement.textContent = stakeAmount.toFixed(2);

        rollDiceBtn.addEventListener('click', () => {
            if (!tonConnectUI.connected) {
                tg.showAlert('Пожалуйста, подключите кошелек TON для игры!');
                return;
            }
            if (window.VMPR.userBalance < stakeAmount) {
                tg.showAlert('Недостаточно TON на балансе для этой ставки!');
                return;
            }

            diceResultText.textContent = "";
            diceResultText.style.color = 'var(--text-color)';
            playerDiceEl.textContent = '?';
            botDiceEl.textContent = '?';

            let playerRoll, botRoll;
            let rollCount = 0;
            const maxRolls = 15;

            const interval = setInterval(() => {
                playerRoll = Math.floor(Math.random() * 6) + 1;
                botRoll = Math.floor(Math.random() * 6) + 1;
                playerDiceEl.textContent = playerRoll;
                botDiceEl.textContent = botRoll;
                rollCount++;
                if (rollCount >= maxRolls) {
                    clearInterval(interval);
                    playerRoll = Math.floor(Math.random() * 6) + 1;
                    botRoll = Math.floor(Math.random() * 6) + 1;
                    playerDiceEl.textContent = playerRoll;
                    botDiceEl.textContent = botRoll;

                    let result;
                    let outcomeType = 'draw';
                    if (playerRoll > botRoll) {
                        result = "Ты выиграл!";
                        outcomeType = 'win';
                        window.VMPR.userBalance += stakeAmount;
                    } else if (botRoll > playerRoll) {
                        result = "Ты проиграл";
                        outcomeType = 'loss';
                        window.VMPR.userBalance -= stakeAmount;
                    } else {
                        result = "Ничья!";
                        outcomeType = 'draw';
                    }
                    diceResultText.textContent = result;
                    diceResultText.style.color = `var(--${outcomeType}-color)`;
                    updateBalanceUI();
                    addHistoryEntry(`Кости | Ставка: ${stakeAmount.toFixed(2)} TON | ${result}`, outcomeType);
                }
            }, 100);
        });
    },
    cleanup: function() {
        console.log('Dice game cleaned up.');
    }
};