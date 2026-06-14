// script.js - Main entry point and event listeners

// --- MAIN ENTRY POINT ---
window.onload = function() {
    // Initialize the application
    console.log('NHL 94 Pro Simulator loaded');
    
    // Set up event listeners
    setupEventListeners();
};

function setupEventListeners() {
    // Add event listeners for UI elements
    const startButton = document.getElementById('startNewGameBtn');
    if (startButton) {
        startButton.addEventListener('click', startNewGame);
    }
    
    // Add other event listeners as needed
}

