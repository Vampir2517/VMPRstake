"use strict";

window.VMPR.currentPageScript = {
    init: function() {
        console.log('History page initialized.');
        this.updateHistoryDisplay();
        // Добавляем эту функцию в глобальный объект, чтобы app.js мог вызвать ее
        window.VMPR.currentPageScript.updateHistoryDisplay = this.updateHistoryDisplay;
    },
    updateHistoryDisplay: function() {
        const historyList = document.getElementById('history-list');
        if (!historyList) {
            console.error('History list element not found.');
            return;
        }
        historyList.innerHTML = ''; // Очищаем список перед обновлением

        const historyData = JSON.parse(localStorage.getItem('gameHistory')) || [];

        if (historyData.length === 0) {
            const listItem = document.createElement('li');
            listItem.textContent = 'История пуста.';
            historyList.appendChild(listItem);
            return;
        }

        historyData.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.textContent = entry.text;
            if (entry.type) {
                listItem.classList.add(entry.type);
            }
            historyList.appendChild(listItem);
        });
    },
    cleanup: function() {
        console.log('History page cleaned up.');
        window.VMPR.currentPageScript.updateHistoryDisplay = undefined;
    }
};