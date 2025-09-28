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

// Export for debugging (development only)
// @ts-ignore - Vite environment variable
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    (window as any).gameEngine = gameEngine;
}

// PWA Auto-Update Handling
if ('serviceWorker' in navigator) {
    // Handle PWA updates
    window.addEventListener('load', () => {
        navigator.serviceWorker.ready.then((registration) => {
            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60000); // Check every minute
            
            // Listen for new service worker
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content is available, show update notification
                            showUpdateNotification();
                        }
                    });
                }
            });
        });
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
                showUpdateNotification();
            }
        });
    });
}

function showUpdateNotification() {
    // Prevent multiple notifications
    if (document.getElementById('update-notification')) return;
    
    // Create update notification
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
        ">
            <div style="margin-bottom: 10px;">
                🎮 New version available!
            </div>
            <div style="margin-bottom: 15px; font-size: 12px; opacity: 0.8;">
                Refresh to get the latest features and improvements.
            </div>
            <div>
                <button id="update-now" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 8px;
                    font-size: 12px;
                ">Update Now</button>
                <button id="update-later" style="
                    background: transparent;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">Later</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Handle update actions
    document.getElementById('update-now')?.addEventListener('click', () => {
        window.location.reload();
    });
    
    document.getElementById('update-later')?.addEventListener('click', () => {
        notification.remove();
        
        // Auto-update after 5 minutes if user chose "Later"
        setTimeout(() => {
            window.location.reload();
        }, 5 * 60 * 1000);
    });
    
    // Auto-update after 30 seconds if no action taken
    setTimeout(() => {
        if (document.getElementById('update-notification')) {
            window.location.reload();
        }
    }, 30000);
}