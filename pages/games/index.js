"use strict";

window.VMPR.currentPageScript = {
    init: function() {
        console.log('Games menu initialized.');
        const gameButtons = document.querySelectorAll('#games-menu-content .game-btn');
        gameButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const gamePagePath = event.currentTarget.getAttribute('data-game-page');
                if (gamePagePath && window.VMPR.loadPage) {
                    window.VMPR.loadPage(gamePagePath);
                }
            });
        });
    },
    cleanup: function() {
        console.log('Games menu cleaned up.');
        // Здесь нет специфических слушателей, которые нужно убирать, если они не добавляются динамически.
    }
};