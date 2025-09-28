import { GameEngine } from './core/GameEngine';

// Initialize the game engine
const gameEngine = new GameEngine();

// Setup mobile reset button
const resetButton = document.getElementById('resetButton');
if (resetButton) {
    resetButton.addEventListener('click', () => {
        gameEngine.resetMarble();
    });
}

// Start the game when page loads
window.addEventListener('load', () => {
    gameEngine.start();
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        gameEngine.pause();
    } else {
        gameEngine.resume();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Cleanup will be handled by GameEngine destructor
});

// Export for debugging
(window as any).gameEngine = gameEngine;