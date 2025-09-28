import * as THREE from 'three';
import { InputState } from '../physics/MarblePhysics';

export class InputManager {
    private keys: { [key: string]: boolean } = {};
    private touchInput: { x: number; z: number; active: boolean } = { x: 0, z: 0, active: false };
    private keyboardAcceleration: number = 3.5; // Very aggressive keyboard steering
    
    // Jump input state
    private jumpPressed: boolean = false;
    private lastJumpTime: number = 0;
    private jumpCooldown: number = 200; // 200ms cooldown for touch jump
    
    constructor() {
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Keyboard events
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Touch events
        window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        window.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
        
        
        // Prevent context menu on long press
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle visibility change to pause input
        document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
    }
    
    private onKeyDown(event: KeyboardEvent): void {
        this.keys[event.key] = true;
        
        // Prevent arrow keys from scrolling the page
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
            event.preventDefault();
        }
    }
    
    private onKeyUp(event: KeyboardEvent): void {
        this.keys[event.key] = false;
    }
    
    private onTouchStart(event: TouchEvent): void {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            // Determine if this is a tap for steering or jumping
            this.handleTouchTap(touch.clientX, touch.clientY);
        }
    }
    
    private handleTouchTap(x: number, _y: number): void {
        const screenWidth = window.innerWidth;
        
        // Divide screen into three zones: left, center (marble), right
        const leftZone = screenWidth * 0.33;
        const rightZone = screenWidth * 0.67;
        
        if (x < leftZone) {
            // Left tap - extremely aggressive left steering
            this.touchInput.active = true;
            this.touchInput.x = -4.0; // Extremely aggressive left steering
            this.touchInput.z = 0;
            
            // Hold steering longer for maximum effect
            setTimeout(() => {
                this.touchInput.active = false;
                this.touchInput.x = 0;
            }, 600);
            
        } else if (x > rightZone) {
            // Right tap - extremely aggressive right steering
            this.touchInput.active = true;
            this.touchInput.x = 4.0; // Extremely aggressive right steering
            this.touchInput.z = 0;
            
            // Hold steering longer for maximum effect
            setTimeout(() => {
                this.touchInput.active = false;
                this.touchInput.x = 0;
            }, 600);
            
        } else {
            // Center tap - jump
            this.handleJumpInput();
        }
    }
    
    private onTouchMove(event: TouchEvent): void {
        event.preventDefault();
        // Touch move disabled for tap-based controls
        // All input is handled by tap zones in onTouchStart
    }
    
    private onTouchEnd(event: TouchEvent): void {
        event.preventDefault();
        // Touch end simplified for tap-based controls
        // Input is handled immediately in onTouchStart, no need for end processing
    }
    
    
    private onVisibilityChange(): void {
        if (document.hidden) {
            // Clear all input when tab becomes hidden
            this.keys = {};
            this.touchInput.active = false;
            this.touchInput.x = 0;
            this.touchInput.z = 0;
        }
    }
    
    private handleJumpInput(): void {
        const now = Date.now();
        if (now - this.lastJumpTime > this.jumpCooldown) {
            this.jumpPressed = true;
            this.lastJumpTime = now;
        }
    }
    
    
    public getInput(_pathDirection?: THREE.Vector3): InputState {
        let inputX = 0;
        let active = false;
        let jump = false;
        
        // Keyboard input (desktop) - only left/right steering
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            inputX -= this.keyboardAcceleration;
            active = true;
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            inputX += this.keyboardAcceleration;
            active = true;
        }
        
        // Jump input (keyboard)
        if (this.keys[' '] || this.keys['Space']) {
            jump = true;
        }
        
        // Touch input (mobile) - only horizontal steering
        if (this.touchInput.active) {
            inputX = this.touchInput.x * 5; // Extremely aggressive touch sensitivity for steering
            active = true;
            // Touch steering active
        }
        
        // Touch jump input
        if (this.jumpPressed) {
            jump = true;
            this.jumpPressed = false; // Reset after reading
        }
        
        return {
            x: inputX,
            z: 0, // No Z input needed - auto-forward handles this
            active: active,
            jump: jump
        };
    }
    
    public isResetRequested(): boolean {
        return this.keys['Enter'] || this.keys[' '];
    }
    
    public clearResetRequest(): void {
        this.keys['Enter'] = false;
        this.keys[' '] = false;
    }
    
    
    public setKeyboardAcceleration(acceleration: number): void {
        this.keyboardAcceleration = Math.max(0.1, Math.min(2.0, acceleration));
    }
    
    public getKeyboardAcceleration(): number {
        return this.keyboardAcceleration;
    }
    
    
    public cleanup(): void {
        // Remove event listeners
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
        window.removeEventListener('keyup', this.onKeyUp.bind(this));
        window.removeEventListener('touchstart', this.onTouchStart.bind(this));
        window.removeEventListener('touchmove', this.onTouchMove.bind(this));
        window.removeEventListener('touchend', this.onTouchEnd.bind(this));
        window.removeEventListener('touchcancel', this.onTouchEnd.bind(this));
        document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
    }
}
