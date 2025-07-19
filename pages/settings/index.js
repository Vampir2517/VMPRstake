"use strict";

window.VMPR.currentPageScript = {
    init: function() {
        console.log('Settings page initialized.');
        const walletStatusElement = document.getElementById('settings-wallet-status');
        if (walletStatusElement && window.VMPR.tonConnectUI) {
            walletStatusElement.textContent = window.VMPR.tonConnectUI.connected ? 'Да' : 'Нет';
        }
    },
    cleanup: function() {
        console.log('Settings page cleaned up.');
    }
};