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
    private friction: number = 0.975; // Reduced friction for more responsive steering
    private airResistance: number = 0.998;
    private acceleration: number = 0.025; // Extremely aggressive steering acceleration
    private maxSpeed: number = 0.4;
    private bounceFactor: number = 0.3;
    private marbleRadius: number = 0.3;
    private autoForwardSpeed: number = 0.3; // Constant forward rolling speed (increased for visibility)
    
    // Ground detection
    private groundLevel: number = 0.3; // Marble radius
    
    // Falling state
    private isFalling: boolean = false;
    private fallStartTime: number = 0;
    private fallTimeout: number = 3000; // Reset after 3 seconds of falling
    
    // Jumping mechanics
    private jumpForce: number = 0.3;
    private canJump: boolean = true;
    private jumpCooldown: number = 0;
    private jumpCooldownTime: number = 0.5; // 0.5 seconds between jumps
    
    // Checkpoint system
    private lastSafePosition: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
    private checkpointUpdateTimer: number = 0;
    private checkpointUpdateInterval: number = 0.5; // Update checkpoint every 0.5 seconds
    
    // Performance optimization - reuse objects to avoid allocations
    private tempVector: THREE.Vector3 = new THREE.Vector3();
    private tempVector2: THREE.Vector3 = new THREE.Vector3();
    
    // Improved collision detection with raycasting
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private rayDirection: THREE.Vector3 = new THREE.Vector3(0, -1, 0); // Downward ray
    
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
        // Always apply constant forward motion along the path
        const pathDirection = this.getPathDirection();
        
        // Use temp vector to avoid allocation
        this.tempVector.copy(pathDirection).multiplyScalar(this.autoForwardSpeed);
        
        // Apply auto-forward motion directly to velocity
        this.velocity.x = this.tempVector.x;
        this.velocity.z = this.tempVector.z;
        
        // Apply left/right steering if input is active
        if (input.active && Math.abs(input.x) > 0.01) {
            // Calculate right vector (perpendicular to path direction) - reuse temp vector
            this.tempVector2.set(0, 1, 0);
            this.tempVector.crossVectors(pathDirection, this.tempVector2).normalize();
            
            // Apply extremely aggressive steering force
            this.tempVector.multiplyScalar(input.x * this.acceleration * deltaTime * 120); // Maximum steering responsiveness
            this.velocity.x += this.tempVector.x;
            this.velocity.z += this.tempVector.z;
        }
    }
    
    private pathDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
    
    public setPathDirection(direction: THREE.Vector3): void {
        this.pathDirection = direction.clone().normalize();
    }
    
    private getPathDirection(): THREE.Vector3 {
        return this.pathDirection.clone();
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
        
        // Update position based on velocity (reuse temp vector to avoid allocation)
        this.tempVector.copy(this.velocity).multiplyScalar(deltaTime * 60);
        this.marble.position.add(this.tempVector);
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
        
        // Check if we've fallen far enough or too long to reset
        const fallTime = Date.now() - this.fallStartTime;
        const hasFallenTooLong = fallTime > this.fallTimeout;
        const hasFallenTooFar = this.marble.position.y < -100; // Account for new elevation limits
        
        if (hasFallenTooLong || hasFallenTooFar) {
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
            const isOnValidPath = this.pathSurfaceHeight > -500; // Not in a gap
            
            if (isOnGround && isOnValidPath) {
                // Save current position as safe checkpoint (only if on valid path)
                // Removed movement requirement - save checkpoint whenever on valid ground
                this.lastSafePosition.copy(this.marble.position);
                this.checkpointUpdateTimer = 0;
                // Safe checkpoint saved
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
    
    // Improved collision detection using raycasting
    public checkPathCollisionWithRaycasting(pathMeshes: THREE.Mesh[]): boolean {
        if (!this.marble || pathMeshes.length === 0) return false;
        
        const marblePos = this.marble.position;
        
        // Cast ray downward from marble position
        this.raycaster.set(marblePos, this.rayDirection);
        
        // Check intersection with path meshes
        const intersections = this.raycaster.intersectObjects(pathMeshes);
        
        if (intersections.length > 0) {
            const closestIntersection = intersections[0];
            const distanceToPath = closestIntersection.distance;
            
            // If marble is close to path surface, it's on the path
            if (distanceToPath <= this.marbleRadius + 0.5) {
                // Update path surface height for physics
                this.pathSurfaceHeight = closestIntersection.point.y;
                return true;
            }
        }
        
        // No valid path found - marble should fall
        this.pathSurfaceHeight = -1000;
        return false;
    }
    
    // Check if marble is within path boundaries using multiple rays
    public checkPathBoundariesWithRaycasting(pathMeshes: THREE.Mesh[]): boolean {
        if (!this.marble || pathMeshes.length === 0) return true;
        
        const marblePos = this.marble.position;
        const checkRadius = this.marbleRadius + 0.2; // Slightly larger than marble
        
        // Cast rays in multiple directions around the marble
        const rayDirections = [
            new THREE.Vector3(0, -1, 0),      // Down
            new THREE.Vector3(1, -1, 0).normalize(),   // Down-right
            new THREE.Vector3(-1, -1, 0).normalize(),  // Down-left
            new THREE.Vector3(0, -1, 1).normalize(),   // Down-forward
            new THREE.Vector3(0, -1, -1).normalize(),  // Down-backward
        ];
        
        let validIntersections = 0;
        
        for (const direction of rayDirections) {
            this.raycaster.set(marblePos, direction);
            const intersections = this.raycaster.intersectObjects(pathMeshes);
            
            if (intersections.length > 0 && intersections[0].distance <= checkRadius + 1.0) {
                validIntersections++;
            }
        }
        
        // If we have at least 2 valid intersections, marble is on path
        return validIntersections >= 2;
    }
    
}
