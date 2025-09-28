import * as THREE from 'three';

export interface InputState {
    x: number;
    z: number;
    active: boolean;
    jump: boolean;
}

export class MarblePhysics {
    private marble: THREE.Mesh | null = null;
    private velocity: THREE.Vector3 = new THREE.Vector3();
    private angularVelocity: THREE.Vector3 = new THREE.Vector3();
    
    // Physics constants
    private gravity: number = 0.015;
    private friction: number = 0.985;
    private airResistance: number = 0.998;
    private acceleration: number = 0.008;
    private maxSpeed: number = 0.4;
    private bounceFactor: number = 0.3;
    private marbleRadius: number = 0.3;
    
    // Ground detection
    private groundLevel: number = 0.3; // Marble radius
    
    // Falling state
    private isFalling: boolean = false;
    private fallStartTime: number = 0;
    
    // Jumping mechanics
    private jumpForce: number = 0.3;
    private canJump: boolean = true;
    private jumpCooldown: number = 0;
    private jumpCooldownTime: number = 0.5; // 0.5 seconds between jumps
    
    // Checkpoint system
    private lastSafePosition: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
    private checkpointUpdateTimer: number = 0;
    private checkpointUpdateInterval: number = 0.5; // Update checkpoint every 0.5 seconds
    
    public initialize(marble: THREE.Mesh): void {
        this.marble = marble;
        this.reset();
    }
    
    public update(deltaTime: number, input: InputState): void {
        if (!this.marble) return;
        
        // Check if falling and handle accordingly
        if (this.isFalling) {
            this.handleFalling(deltaTime);
            return;
        }
        
        // Handle jumping
        this.handleJumping(input, deltaTime);
        
        // Apply input forces
        this.applyInputForces(input, deltaTime);
        
        // Apply physics
        this.applyGravity(deltaTime);
        this.applyFriction();
        this.limitSpeed();
        
        // Update position
        this.updatePosition(deltaTime);
        
        // Handle collisions and ground detection
        this.handleGroundCollision();
        
        // Update marble rotation based on movement
        this.updateRotation(deltaTime);
        
        // Update checkpoint if marble is safe
        this.updateCheckpoint(deltaTime);
    }
    
    private handleJumping(input: InputState, deltaTime: number): void {
        // Update jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }
        
        // Check if we can jump (on ground and cooldown finished)
        const marbleBottom = this.marble!.position.y - this.marbleRadius;
        const isOnGround = marbleBottom <= this.pathSurfaceHeight + 0.1;
        this.canJump = isOnGround && this.jumpCooldown <= 0;
        
        // Handle jump input
        if (input.jump && this.canJump) {
            this.jump();
        }
    }
    
    private jump(): void {
        // Apply upward velocity
        this.velocity.y = this.jumpForce;
        
        // Start cooldown
        this.jumpCooldown = this.jumpCooldownTime;
        this.canJump = false;
        
        // Add slight forward momentum for better jump feel
        const forwardBoost = 0.05;
        this.velocity.z -= forwardBoost; // Negative Z is forward in our coordinate system
    }
    
    private applyInputForces(input: InputState, deltaTime: number): void {
        if (!input.active) return;
        
        // Convert input to world forces
        const forceX = input.x * this.acceleration * deltaTime * 60; // Normalize for 60fps
        const forceZ = input.z * this.acceleration * deltaTime * 60;
        
        // Apply forces with some smoothing
        this.velocity.x += forceX;
        this.velocity.z += forceZ;
    }
    
    private applyGravity(deltaTime: number): void {
        // Always apply gravity
        this.velocity.y -= this.gravity * deltaTime * 60;
    }
    
    private applyFriction(): void {
        // Apply different friction based on whether marble is on ground
        const isOnGround = this.marble!.position.y <= this.groundLevel + 0.1;
        
        if (isOnGround) {
            // Ground friction affects horizontal movement more
            this.velocity.x *= this.friction;
            this.velocity.z *= this.friction;
            this.velocity.y *= 0.95; // Dampen vertical bouncing
        } else {
            // Air resistance affects all movement
            this.velocity.multiplyScalar(this.airResistance);
        }
    }
    
    private limitSpeed(): void {
        // Limit horizontal speed
        const horizontalVelocity = new THREE.Vector2(this.velocity.x, this.velocity.z);
        if (horizontalVelocity.length() > this.maxSpeed) {
            horizontalVelocity.normalize().multiplyScalar(this.maxSpeed);
            this.velocity.x = horizontalVelocity.x;
            this.velocity.z = horizontalVelocity.y;
        }
        
        // Limit vertical speed (terminal velocity)
        const maxVerticalSpeed = 1.0;
        if (Math.abs(this.velocity.y) > maxVerticalSpeed) {
            this.velocity.y = Math.sign(this.velocity.y) * maxVerticalSpeed;
        }
    }
    
    private updatePosition(deltaTime: number): void {
        if (!this.marble) return;
        
        // Update position based on velocity
        const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime * 60);
        this.marble.position.add(deltaPosition);
    }
    
    private handleGroundCollision(): void {
        if (!this.marble) return;
        
        const position = this.marble.position;
        
        // Get the actual path surface height at marble position
        const pathSurfaceHeight = this.getPathSurfaceHeight();
        const marbleBottom = position.y - this.marbleRadius;
        
        // Check if marble is at or below path surface
        if (marbleBottom <= pathSurfaceHeight) {
            // Place marble on top of path surface
            position.y = pathSurfaceHeight + this.marbleRadius;
            
            // Bounce if moving downward
            if (this.velocity.y < 0) {
                this.velocity.y = -this.velocity.y * this.bounceFactor;
                
                // Stop very small bounces
                if (Math.abs(this.velocity.y) < 0.01) {
                    this.velocity.y = 0;
                }
            }
        }
    }
    
    private pathSurfaceHeight: number = 0;
    
    private getPathSurfaceHeight(): number {
        // Return the current path surface height (will be updated by game engine)
        return this.pathSurfaceHeight;
    }
    
    public setPathSurfaceHeight(height: number): void {
        this.pathSurfaceHeight = height;
    }
    
    private updateRotation(deltaTime: number): void {
        if (!this.marble || this.velocity.length() < 0.001) return;
        
        // Calculate rotation based on movement
        // The marble should roll in the direction it's moving
        const speed = this.velocity.length();
        const rotationSpeed = speed / this.marbleRadius; // v = ωr
        
        // Calculate rotation axis (perpendicular to velocity)
        const rotationAxis = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x).normalize();
        
        if (rotationAxis.length() > 0) {
            const rotationAngle = rotationSpeed * deltaTime * 60;
            this.marble.rotateOnWorldAxis(rotationAxis, rotationAngle);
        }
        
        // Add some angular velocity for more realistic rolling
        this.angularVelocity.copy(rotationAxis).multiplyScalar(rotationSpeed);
        this.angularVelocity.multiplyScalar(0.95); // Dampen angular velocity
    }
    
    public handlePathCollision(pathNormal: THREE.Vector3, penetrationDepth: number): void {
        if (!this.marble) return;
        
        // Move marble out of collision
        this.marble.position.add(pathNormal.clone().multiplyScalar(penetrationDepth));
        
        // Reflect velocity
        const normalVelocity = this.velocity.dot(pathNormal);
        if (normalVelocity < 0) {
            const reflection = pathNormal.clone().multiplyScalar(2 * normalVelocity * this.bounceFactor);
            this.velocity.sub(reflection);
        }
    }
    
    public addImpulse(impulse: THREE.Vector3): void {
        this.velocity.add(impulse);
    }
    
    private handleFalling(deltaTime: number): void {
        if (!this.marble) return;
        
        // Accelerate downward
        this.velocity.y -= this.gravity * 2 * deltaTime * 60; // Faster falling
        
        // Add some tumbling rotation
        this.marble.rotation.x += this.velocity.length() * deltaTime * 2;
        this.marble.rotation.z += this.velocity.length() * deltaTime * 1.5;
        
        // Update position
        this.updatePosition(deltaTime);
        
        // Check if we've fallen far enough to reset
        const fallTime = Date.now() - this.fallStartTime;
        if (fallTime > 3000) { // 3 seconds of falling
            this.resetAfterFall();
        }
    }
    
    private resetAfterFall(): void {
        // Reset to checkpoint instead of calling external callback
        this.resetToCheckpoint();
    }
    
    public startFalling(): void {
        this.isFalling = true;
        this.fallStartTime = Date.now();
        
        // Add some initial falling velocity
        this.velocity.y = Math.min(this.velocity.y, -0.1);
    }
    
    // Removed fall reset callback - using checkpoint system instead
    
    private updateCheckpoint(deltaTime: number): void {
        if (!this.marble) return;
        
        this.checkpointUpdateTimer += deltaTime;
        
        // Update checkpoint periodically if marble is on ground and moving forward
        if (this.checkpointUpdateTimer >= this.checkpointUpdateInterval) {
            const marbleBottom = this.marble.position.y - this.marbleRadius;
            const isOnGround = marbleBottom <= this.pathSurfaceHeight + 0.5;
            const isMovingForward = this.velocity.z < -0.01; // Negative Z is forward
            const isOnValidPath = this.pathSurfaceHeight > -500; // Not in a gap
            
            if (isOnGround && isOnValidPath && (isMovingForward || this.velocity.length() < 0.01)) {
                // Save current position as safe checkpoint (only if on valid path)
                this.lastSafePosition.copy(this.marble.position);
                this.checkpointUpdateTimer = 0;
                console.log('Safe checkpoint saved at:', this.lastSafePosition);
            }
        }
    }
    
    public resetToCheckpoint(): void {
        if (this.marble) {
            // Reset to last safe position instead of origin
            this.marble.position.copy(this.lastSafePosition);
            this.marble.position.y = Math.max(this.lastSafePosition.y, 2); // Ensure safe height
        }
        
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.isFalling = false;
        this.fallStartTime = 0;
        this.jumpCooldown = 0;
        this.canJump = true;
        
        if (this.marble) {
            this.marble.rotation.set(0, 0, 0);
        }
    }
    
    public reset(): void {
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.isFalling = false;
        this.fallStartTime = 0;
        this.jumpCooldown = 0;
        this.canJump = true;
        
        if (this.marble) {
            this.marble.rotation.set(0, 0, 0);
        }
    }
    
    public setCheckpoint(position: THREE.Vector3): void {
        this.lastSafePosition.copy(position);
    }
    
    public getLastSafePosition(): THREE.Vector3 {
        return this.lastSafePosition.clone();
    }
    
    public getVelocity(): THREE.Vector3 {
        return this.velocity.clone();
    }
    
    public getSpeed(): number {
        return this.velocity.length();
    }
    
    public isMoving(): boolean {
        return this.velocity.length() > 0.001;
    }
    
    public isOnGround(): boolean {
        if (!this.marble) return false;
        const marbleBottom = this.marble.position.y - this.marbleRadius;
        return marbleBottom <= this.pathSurfaceHeight + 0.1;
    }
    
    public isFallingOff(): boolean {
        return this.isFalling;
    }
    
    public canMarbleJump(): boolean {
        return this.canJump;
    }
    
    // Simplified boundary detection - much more reliable
    public checkPathBoundaries(pathPoints: THREE.Vector3[], pathWidth: number): boolean {
        if (!this.marble || pathPoints.length < 2) return false;
        
        const marblePos = this.marble.position;
        
        // Simple distance check to path center
        let closestDistance = Infinity;
        
        for (const point of pathPoints) {
            // Only check horizontal distance (ignore Y)
            const distance = Math.sqrt(
                Math.pow(marblePos.x - point.x, 2) + 
                Math.pow(marblePos.z - point.z, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
            }
        }
        
        // Check if marble is outside path boundaries
        const halfWidth = pathWidth / 2;
        const tolerance = 0.5; // Reasonable tolerance - not too generous
        
        if (closestDistance > halfWidth + this.marbleRadius + tolerance) {
            // Marble is outside path boundaries - start falling immediately!
            console.log('Marble fell off path! Distance:', closestDistance, 'Path width:', pathWidth);
            this.startFalling();
            return true;
        }
        
        return false;
    }
}
