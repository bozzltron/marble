import * as THREE from 'three';
import { InputState } from '../physics/MarblePhysics';

export class InputManager {
    private keys: { [key: string]: boolean } = {};
    private touchInput: { x: number; z: number; active: boolean } = { x: 0, z: 0, active: false };
    private lastTouchX: number = 0;
    private lastTouchY: number = 0;
    private touchSensitivity: number = 0.002;
    private keyboardAcceleration: number = 1.0;
    
    // Smoothing for touch input
    private smoothedTouchInput: { x: number; z: number } = { x: 0, z: 0 };
    private touchSmoothingFactor: number = 0.15;
    
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
        
        // Mouse events (for desktop testing)
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        
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
        
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
            this.touchInput.active = true;
            
            // Reset smoothed input
            this.smoothedTouchInput.x = 0;
            this.smoothedTouchInput.z = 0;
        }
        
        // Handle multi-touch for jumping (two fingers = jump)
        if (event.touches.length >= 2) {
            this.handleJumpInput();
        }
    }
    
    private onTouchMove(event: TouchEvent): void {
        event.preventDefault();
        
        if (!this.touchInput.active || event.touches.length === 0) return;
        
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;
        
        // Convert screen coordinates to game coordinates
        // Invert Y because screen Y increases downward but game Z increases forward
        const rawInputX = deltaX * this.touchSensitivity;
        const rawInputZ = deltaY * this.touchSensitivity;
        
        // Apply smoothing to reduce jitter
        this.smoothedTouchInput.x = this.lerp(this.smoothedTouchInput.x, rawInputX, this.touchSmoothingFactor);
        this.smoothedTouchInput.z = this.lerp(this.smoothedTouchInput.z, rawInputZ, this.touchSmoothingFactor);
        
        this.touchInput.x = this.smoothedTouchInput.x;
        this.touchInput.z = this.smoothedTouchInput.z;
        
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
    }
    
    private onTouchEnd(event: TouchEvent): void {
        event.preventDefault();
        this.touchInput.active = false;
        this.touchInput.x = 0;
        this.touchInput.z = 0;
        this.smoothedTouchInput.x = 0;
        this.smoothedTouchInput.z = 0;
    }
    
    // Mouse events for desktop testing
    private mouseDown: boolean = false;
    
    private onMouseDown(event: MouseEvent): void {
        this.mouseDown = true;
        this.lastTouchX = event.clientX;
        this.lastTouchY = event.clientY;
        this.touchInput.active = true;
    }
    
    private onMouseMove(event: MouseEvent): void {
        if (!this.mouseDown) return;
        
        const deltaX = event.clientX - this.lastTouchX;
        const deltaY = event.clientY - this.lastTouchY;
        
        const rawInputX = deltaX * this.touchSensitivity;
        const rawInputZ = deltaY * this.touchSensitivity;
        
        this.smoothedTouchInput.x = this.lerp(this.smoothedTouchInput.x, rawInputX, this.touchSmoothingFactor);
        this.smoothedTouchInput.z = this.lerp(this.smoothedTouchInput.z, rawInputZ, this.touchSmoothingFactor);
        
        this.touchInput.x = this.smoothedTouchInput.x;
        this.touchInput.z = this.smoothedTouchInput.z;
        
        this.lastTouchX = event.clientX;
        this.lastTouchY = event.clientY;
    }
    
    private onMouseUp(_event: MouseEvent): void {
        this.mouseDown = false;
        this.touchInput.active = false;
        this.touchInput.x = 0;
        this.touchInput.z = 0;
        this.smoothedTouchInput.x = 0;
        this.smoothedTouchInput.z = 0;
    }
    
    private onVisibilityChange(): void {
        if (document.hidden) {
            // Clear all input when tab becomes hidden
            this.keys = {};
            this.touchInput.active = false;
            this.touchInput.x = 0;
            this.touchInput.z = 0;
            this.mouseDown = false;
        }
    }
    
    private handleJumpInput(): void {
        const now = Date.now();
        if (now - this.lastJumpTime > this.jumpCooldown) {
            this.jumpPressed = true;
            this.lastJumpTime = now;
        }
    }
    
    private lerp(a: number, b: number, factor: number): number {
        return a + (b - a) * factor;
    }
    
    public getInput(pathDirection?: THREE.Vector3): InputState {
        let inputX = 0;
        let inputZ = 0;
        let active = false;
        let jump = false;
        
        // Raw input values
        let rawForward = 0;
        let rawRight = 0;
        
        // Keyboard input (desktop)
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            rawRight -= this.keyboardAcceleration;
            active = true;
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            rawRight += this.keyboardAcceleration;
            active = true;
        }
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            rawForward += this.keyboardAcceleration;
            active = true;
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            rawForward -= this.keyboardAcceleration;
            active = true;
        }
        
        // Jump input (keyboard)
        if (this.keys[' '] || this.keys['Space']) {
            jump = true;
        }
        
        // Touch input (mobile) - overrides keyboard if active
        if (this.touchInput.active) {
            rawRight = this.touchInput.x;
            rawForward = -this.touchInput.z; // Invert Z for forward/backward
            active = true;
        }
        
        // Touch jump input
        if (this.jumpPressed) {
            jump = true;
            this.jumpPressed = false; // Reset after reading
        }
        
        // Transform input relative to path direction
        if (pathDirection && (rawForward !== 0 || rawRight !== 0)) {
            // Calculate right vector perpendicular to path direction
            const rightVector = new THREE.Vector3()
                .crossVectors(pathDirection, new THREE.Vector3(0, 1, 0))
                .normalize();
            
            // Transform input to world coordinates
            const forwardComponent = pathDirection.clone().multiplyScalar(rawForward);
            const rightComponent = rightVector.multiplyScalar(rawRight);
            
            const worldInput = forwardComponent.add(rightComponent);
            
            inputX = worldInput.x;
            inputZ = worldInput.z;
        } else {
            // Fallback to raw input if no path direction
            inputX = rawRight;
            inputZ = -rawForward; // Negative Z is forward in world space
        }
        
        return {
            x: inputX,
            z: inputZ,
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
    
    public setTouchSensitivity(sensitivity: number): void {
        this.touchSensitivity = Math.max(0.0001, Math.min(0.01, sensitivity));
    }
    
    public getTouchSensitivity(): number {
        return this.touchSensitivity;
    }
    
    public setKeyboardAcceleration(acceleration: number): void {
        this.keyboardAcceleration = Math.max(0.1, Math.min(2.0, acceleration));
    }
    
    public getKeyboardAcceleration(): number {
        return this.keyboardAcceleration;
    }
    
    // Auto-adjust sensitivity based on device
    public autoAdjustSensitivity(): void {
        const isMobile = 'ontouchstart' in window;
        const isTablet = window.innerWidth > 768 && isMobile;
        
        if (isMobile && !isTablet) {
            // Phone - higher sensitivity for smaller screens
            this.touchSensitivity = 0.003;
            this.touchSmoothingFactor = 0.2;
        } else if (isTablet) {
            // Tablet - medium sensitivity
            this.touchSensitivity = 0.002;
            this.touchSmoothingFactor = 0.15;
        } else {
            // Desktop - lower sensitivity for mouse
            this.touchSensitivity = 0.001;
            this.touchSmoothingFactor = 0.1;
        }
    }
    
    public cleanup(): void {
        // Remove event listeners
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
        window.removeEventListener('keyup', this.onKeyUp.bind(this));
        window.removeEventListener('touchstart', this.onTouchStart.bind(this));
        window.removeEventListener('touchmove', this.onTouchMove.bind(this));
        window.removeEventListener('touchend', this.onTouchEnd.bind(this));
        window.removeEventListener('touchcancel', this.onTouchEnd.bind(this));
        window.removeEventListener('mousedown', this.onMouseDown.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));
        window.removeEventListener('mouseup', this.onMouseUp.bind(this));
        document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
    }
}
