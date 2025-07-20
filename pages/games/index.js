// Этот скрипт будет загружаться динамически
window.VMPR.currentPageScript = {
    init: function() {
        console.log('Games page script initialized.');
        const gameArea = document.getElementById('game-area');
        const rpsBtn = document.getElementById('rock-paper-scissors-btn');
        const diceBtn = document.getElementById('dice-game-btn');

        rpsBtn.addEventListener('click', this.loadRockPaperScissorsGame);
        diceBtn.addEventListener('click', this.loadDiceGame);

        // Показываем кнопку "Камень, Ножницы, Бумага" активной по умолчанию,
        // если пользователь просто зашел на страницу игр
        if (!gameArea.innerHTML || gameArea.innerHTML.includes('Нажмите на игру')) {
             rpsBtn.classList.add('active-game-selection'); // Добавляем класс для выделения
        }
    },

    cleanup: function() {
        console.log('Games page script cleaned up.');
        const rpsBtn = document.getElementById('rock-paper-scissors-btn');
        const diceBtn = document.getElementById('dice-game-btn');
        if (rpsBtn) rpsBtn.removeEventListener('click', this.loadRockPaperScissorsGame);
        if (diceBtn) diceBtn.removeEventListener('click', this.loadDiceGame);

        const activeGameButton = document.querySelector('.game-selection-buttons .active-game-selection');
        if (activeGameButton) {
            activeGameButton.classList.remove('active-game-selection');
        }
    },

    loadRockPaperScissorsGame: function() {
        const gameArea = document.getElementById('game-area');
        document.querySelectorAll('.game-selection-buttons .game-button').forEach(btn => btn.classList.remove('active-game-selection'));
        document.getElementById('rock-paper-scissors-btn').classList.add('active-game-selection');

        gameArea.innerHTML = `
            <h3>Камень, Ножницы, Бумага</h3>
            <div class="input-group">
                <label for="stake-rps">Ваша ставка (TON):</label>
                <input type="number" id="stake-rps" value="${window.VMPR.stakeAmount.toFixed(2)}" min="0.01" step="0.01">
            </div>
            <div class="rps-choices" style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
                <button class="button rps-choice-btn" data-choice="rock">Камень</button>
                <button class="button rps-choice-btn" data-choice="scissors">Ножницы</button>
                <button class="button rps-choice-btn" data-choice="paper">Бумага</button>
            </div>
            <p id="rps-result"></p>
            <p id="current-balance">Баланс: ${window.VMPR.userBalance.toFixed(2)} TON</p>
        `;

        const rpsChoiceButtons = gameArea.querySelectorAll('.rps-choice-btn');
        rpsChoiceButtons.forEach(button => {
            button.addEventListener('click', window.VMPR.currentPageScript.playRockPaperScissors);
        });

        document.getElementById('current-balance').textContent = `Баланс: ${window.VMPR.userBalance.toFixed(2)} TON`;
    },

    playRockPaperScissors: function(event) {
        const userChoice = event.target.dataset.choice;
        const stakeInput = document.getElementById('stake-rps');
        const stake = parseFloat(stakeInput.value);
        const resultElement = document.getElementById('rps-result');
        const currentBalanceElement = document.getElementById('current-balance');

        if (isNaN(stake) || stake <= 0) {
            window.VMPR.tg.showAlert('Пожалуйста, введите корректную ставку.');
            return;
        }

        if (window.VMPR.deductBalance(stake)) { // Пытаемся списать ставку
            const choices = ['rock', 'paper', 'scissors'];
            const computerChoice = choices[Math.floor(Math.random() * choices.length)];

            let outcome;
            let resultText;

            if (userChoice === computerChoice) {
                outcome = 'draw';
                resultText = `Ничья! (${window.VMPR.currentPageScript.translateChoice(userChoice)} vs ${window.VMPR.currentPageScript.translateChoice(computerChoice)})`;
                window.VMPR.addHistoryEntry(`Ничья: ${stake.toFixed(2)} TON (Ваш: ${window.VMPR.currentPageScript.translateChoice(userChoice)}, Бот: ${window.VMPR.currentPageScript.translateChoice(computerChoice)})`, 'info');
            } else if (
                (userChoice === 'rock' && computerChoice === 'scissors') ||
                (userChoice === 'paper' && computerChoice === 'rock') ||
                (userChoice === 'scissors' && computerChoice === 'paper')
            ) {
                outcome = 'win';
                window.VMPR.addBalance(stake * 2); // Получаем x2 от ставки
                resultText = `Вы выиграли! (+${(stake * 2).toFixed(2)} TON) (${window.VMPR.currentPageScript.translateChoice(userChoice)} vs ${window.VMPR.currentPageScript.translateChoice(computerChoice)})`;
                window.VMPR.addHistoryEntry(`Выигрыш: +${(stake * 2).toFixed(2)} TON (Ваш: ${window.VMPR.currentPageScript.translateChoice(userChoice)}, Бот: ${window.VMPR.currentPageScript.translateChoice(computerChoice)})`, 'win');
            } else {
                outcome = 'loss';
                // Баланс уже списан функцией deductBalance
                resultText = `Вы проиграли! (-${stake.toFixed(2)} TON) (${window.VMPR.currentPageScript.translateChoice(userChoice)} vs ${window.VMPR.currentPageScript.translateChoice(computerChoice)})`;
                window.VMPR.addHistoryEntry(`Проигрыш: -${stake.toFixed(2)} TON (Ваш: ${window.VMPR.currentPageScript.translateChoice(userChoice)}, Бот: ${window.VMPR.currentPageScript.translateChoice(computerChoice)})`, 'loss');
            }

            resultElement.textContent = resultText;
            resultElement.className = '';
            if (outcome === 'win') {
                resultElement.classList.add('win-text');
            } else if (outcome === 'loss') {
                resultElement.classList.add('loss-text');
            } else if (outcome === 'draw') {
                resultElement.classList.add('info-text');
            }
            currentBalanceElement.textContent = `Баланс: ${window.VMPR.userBalance.toFixed(2)} TON`;
        }
    },

    translateChoice: function(choice) {
        switch(choice) {
            case 'rock': return 'Камень';
            case 'paper': return 'Бумага';
            case 'scissors': return 'Ножницы';
            default: return choice;
        }
    },

    loadDiceGame: function() {
        const gameArea = document.getElementById('game-area');
        document.querySelectorAll('.game-selection-buttons .game-button').forEach(btn => btn.classList.remove('active-game-selection'));
        document.getElementById('dice-game-btn').classList.add('active-game-selection');

        gameArea.innerHTML = `
            <h3>Игра в Кости</h3>
            <p>Эта игра пока в разработке!</p>
            <p>Ваш баланс: ${window.VMPR.userBalance.toFixed(2)} TON</p>
        `;
    }
};