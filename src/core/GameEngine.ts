import * as THREE from 'three';
import { PathGenerator } from '../procedural/PathGenerator';
import { MarblePhysics } from '../physics/MarblePhysics';
import { InputManager } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { ChunkManager } from '../procedural/ChunkManager';
import { LandscapeManager } from '../procedural/LandscapeManager';

export class GameEngine {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private pathGenerator!: PathGenerator;
    private marblePhysics!: MarblePhysics;
    private inputManager!: InputManager;
    private audioManager!: AudioManager;
    private chunkManager!: ChunkManager;
    private landscapeManager!: LandscapeManager;
    
    private marble!: THREE.Mesh;
    private isRunning: boolean = false;
    private lastTime: number = 0;
    
    // Performance tracking
    private frameCount: number = 0;
    private lastFPSUpdate: number = 0;
    
    // Performance optimizations - cache expensive calculations
    private isMobile: boolean = false;
    private cachedPathDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
    private pathDirectionUpdateTimer: number = 0;
    private pathDirectionUpdateInterval: number = 0.1; // Update every 100ms instead of every frame
    
    // Reusable vectors to avoid allocations in camera update
    private tempCameraOffset: THREE.Vector3 = new THREE.Vector3();
    private tempTargetPosition: THREE.Vector3 = new THREE.Vector3();
    private tempLookTarget: THREE.Vector3 = new THREE.Vector3();
    
    constructor() {
        this.initializeRenderer();
        this.initializeScene();
        this.initializeCamera();
        this.initializeManagers();
        this.initializeMarble();
        this.setupEventListeners();
        
        // Initialize cached values
        this.isMobile = window.innerWidth <= 768;
    }
    
    private initializeRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance' // Optimize for mobile
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Mobile optimizations
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        document.body.appendChild(this.renderer.domElement);
    }
    
    private initializeScene(): void {
        this.scene = new THREE.Scene();
    }
    
    private initializeCamera(): void {
        const isMobile = window.innerWidth <= 768;
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        
        // Mobile-optimized camera position
        const cameraDistance = isMobile ? 8 : 10;
        const cameraHeight = isMobile ? 6 : 8;
        this.camera.position.set(0, cameraHeight, cameraDistance);
    }
    
    private initializeManagers(): void {
        this.pathGenerator = new PathGenerator();
        this.landscapeManager = new LandscapeManager(this.scene);
        this.chunkManager = new ChunkManager(this.scene, this.pathGenerator, this.landscapeManager);
        this.marblePhysics = new MarblePhysics();
        this.inputManager = new InputManager();
        this.audioManager = new AudioManager();
    }
    
    private initializeMarble(): void {
        // Create marble with zen-like material
        const marbleGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        const marbleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9
        });
        
        this.marble = new THREE.Mesh(marbleGeometry, marbleMaterial);
        this.marble.castShadow = true;
        this.marble.receiveShadow = true;
        
        // Start at path beginning - will be set properly after chunks are generated
        this.marble.position.set(0, 10, 0); // Start high to avoid immediate collision
        this.scene.add(this.marble);
        
        // Initialize marble physics
        this.marblePhysics.initialize(this.marble);
        
        // Set initial checkpoint
        this.marblePhysics.setCheckpoint(this.marble.position);
    }
    
    
    private setupEventListeners(): void {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Mobile-specific optimizations
        window.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }
    
    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update cached mobile detection
        this.isMobile = window.innerWidth <= 768;
        
        // Adjust pixel ratio for performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    
    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.lastFPSUpdate = this.lastTime;
        // Game loop started
        
        // Initialize landscape background
        this.landscapeManager.getCurrentTheme().generateBackground(this.scene);
        
        // Initialize first chunks
        this.chunkManager.initialize();
        
        // Position marble properly on the path after chunks are generated
        this.positionMarbleOnPath();
        
        // Start audio
        this.audioManager.startAmbientSounds();
        
        this.gameLoop();
    }
    
    public pause(): void {
        this.isRunning = false;
        // Audio pause (future implementation)
    }
    
    public resume(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        // Audio resume (future implementation)
        this.gameLoop();
    }
    
    private gameLoop(): void {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        let deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent large jumps (e.g., when tab becomes inactive)
        deltaTime = Math.min(deltaTime, 1/30); // Max 30fps equivalent
        
        // Update game systems
        this.update(deltaTime, currentTime);
        this.render();
        
        // Performance monitoring
        this.trackPerformance(currentTime);
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    private update(deltaTime: number, _currentTime: number): void {
        // Update cached path direction periodically instead of every frame
        this.pathDirectionUpdateTimer += deltaTime;
        if (this.pathDirectionUpdateTimer >= this.pathDirectionUpdateInterval) {
            this.cachedPathDirection = this.chunkManager.getPathDirectionAtPosition(this.marble.position);
            this.pathDirectionUpdateTimer = 0;
        }
        
        // Update marble physics with cached path direction
        this.marblePhysics.setPathDirection(this.cachedPathDirection);
        
        // Get input with cached path-relative transformation
        const input = this.inputManager.getInput(this.cachedPathDirection);
        
        // Update path surface height less frequently for performance
        if (this.frameCount % 3 === 0) { // Every 3 frames for responsive collision
            this.updatePathSurfaceHeight();
        }
        
        // Update marble physics
        this.marblePhysics.update(deltaTime, input);
        
        // Update camera to follow marble smoothly
        this.updateCamera();
        
        // Manage path chunks less frequently for performance
        if (this.frameCount % 10 === 0) { // Every 10 frames instead of every frame
            this.chunkManager.update(this.marble.position);
        }
        
        // Update landscape background to extend ahead of marble
        if (this.frameCount % 20 === 0) { // Every 20 frames for smooth background extension
            this.landscapeManager.updateBackground(this.marble.position, this.cachedPathDirection);
        }
        
        // Update audio less frequently
        if (this.frameCount % 30 === 0) { // Every 30 frames (0.5 seconds at 60fps)
            this.audioManager.update(this.marble.position, this.marblePhysics.getVelocity());
        }
    }
    
    private updateCamera(): void {
        const marblePos = this.marble.position;
        
        // Use cached path direction instead of recalculating
        const pathDirection = this.cachedPathDirection;
        
        // Camera follows path direction
        const followDistance = this.isMobile ? 8 : 10;
        const followHeight = this.isMobile ? 6 : 8;
        const followSpeed = 0.08; // Slightly slower for smoother turns
        
        // Position camera behind marble along the path direction (reuse temp vectors)
        this.tempCameraOffset.copy(pathDirection)
            .negate() // Behind the marble
            .multiplyScalar(followDistance);
        
        this.tempTargetPosition.set(
            marblePos.x + this.tempCameraOffset.x,
            marblePos.y + followHeight,
            marblePos.z + this.tempCameraOffset.z
        );
        
        this.camera.position.lerp(this.tempTargetPosition, followSpeed);
        
        // Look ahead along the path direction (reuse temp vector)
        const lookAheadDistance = 3;
        this.tempLookTarget.set(
            marblePos.x + (pathDirection.x * lookAheadDistance),
            marblePos.y,
            marblePos.z + (pathDirection.z * lookAheadDistance)
        );
        
        this.camera.lookAt(this.tempLookTarget);
    }
    
    private render(): void {
        this.renderer.render(this.scene, this.camera);
    }
    
    private trackPerformance(currentTime: number): void {
        this.frameCount++;
        
        if (currentTime - this.lastFPSUpdate >= 1000) {
            const fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
            
            // Log performance issues
            if (fps < 50) {
                // Low FPS detected - could implement quality reduction here
                // Could trigger quality reduction here
            }
        }
    }
    
    public getMarblePosition(): THREE.Vector3 {
        return this.marble.position.clone();
    }
    
    public switchLandscape(themeName: string): boolean {
        return this.landscapeManager.switchTheme(themeName);
    }
    
    public getAvailableLandscapes(): string[] {
        return this.landscapeManager.getAvailableThemes();
    }
    
    private updatePathSurfaceHeight(): void {
        // Get the current path chunk
        const currentChunk = this.chunkManager.getPathAtPosition(this.marble.position);
        if (!currentChunk) {
            // Fallback to very low level if no chunk found (marble should fall)
            this.marblePhysics.setPathSurfaceHeight(-1000);
            return;
        }
        
        // Check if marble is on a valid path segment first
        const marblePos = this.marble.position;
        const isOnValidSegment = this.isMarbleOnValidPathSegment(currentChunk, marblePos);
        
        if (!isOnValidSegment) {
            // Marble is in a gap - set very low surface height to make it fall
            this.marblePhysics.setPathSurfaceHeight(-1000);
            // Marble is in a gap - setting low surface height
            return;
        }
        
        // Marble is on valid path segment
        
        // Marble is on valid path - find the closest path point for surface height
        let closestDistance = Infinity;
        let closestHeight = 0;
        
        for (const point of currentChunk.points) {
            const distance = Math.sqrt(
                Math.pow(marblePos.x - point.position.x, 2) + 
                Math.pow(marblePos.z - point.position.z, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestHeight = point.position.y;
            }
        }
        
        // Set the actual path surface height for marble physics
        this.marblePhysics.setPathSurfaceHeight(closestHeight);
    }
    
    
    private positionMarbleOnPath(): void {
        // Get the actual start position from the generated path
        const startPosition = this.getValidStartPosition();
        
        // Position marble at calculated start position
        this.marble.position.copy(startPosition);
        
        // Set this as the initial checkpoint
        this.marblePhysics.setCheckpoint(this.marble.position);
        
        // Reset physics after positioning
        this.marblePhysics.reset();
    }
    
    private getValidStartPosition(): THREE.Vector3 {
        // Find the first valid path segment in the earliest chunk
        let earliestChunk: any = null;
        let earliestDistance = Infinity;
        
        for (const chunk of this.chunkManager.getActiveChunks()) {
            const distance = chunk.startPosition.length();
            if (distance < earliestDistance) {
                earliestDistance = distance;
                earliestChunk = chunk;
            }
        }
        
        if (earliestChunk && earliestChunk.segments && earliestChunk.segments.length > 0) {
            // Use the first point of the first valid segment
            const firstSegment = earliestChunk.segments[0];
            if (firstSegment && firstSegment.length > 0) {
                const startPoint = firstSegment[0];
                return new THREE.Vector3(
                    startPoint.position.x,
                    startPoint.position.y + 1, // 1 unit above path surface
                    startPoint.position.z
                );
            }
        }
        
        // No valid segments found, using fallback position
        return new THREE.Vector3(0, 2, 0);
    }
    
    public resetMarble(): void {
        // Reset to last checkpoint (where marble fell off)
        this.marblePhysics.resetToCheckpoint();
    }
    
    private isMarbleOnValidPathSegment(chunk: any, marblePos: THREE.Vector3): boolean {
        if (!chunk.segments || chunk.segments.length === 0) {
            // If no segments, fall back to checking original points (no gaps generated)
            // Fallback to original points when no segments available
            return this.isMarbleNearAnyPathPoint(chunk.points, marblePos);
        }
        
        // Check path segments for marble collision
        
        const marbleRadius = 0.5; // Match marble physics radius
        const pathWidthTolerance = 1.0; // More generous tolerance for solid path
        
        // Check if marble is close to any valid path segment
        for (const segment of chunk.segments) {
            if (segment.length < 2) continue;
            
            for (let i = 0; i < segment.length - 1; i++) {
                const point1 = segment[i].position;
                const point2 = segment[i + 1].position;
                const pathWidth = segment[i].width;
                
                // Calculate distance from marble to this path segment
                const segmentDistance = this.distanceToLineSegment(marblePos, point1, point2);
                const maxDistance = (pathWidth / 2) + marbleRadius + pathWidthTolerance;
                
                if (segmentDistance <= maxDistance) {
                    // Marble is on this segment
                    return true;
                }
            }
        }
        
        // Marble is not on any valid segment (it's in a gap)
        return false;
    }
    
    private isMarbleNearAnyPathPoint(points: any[], marblePos: THREE.Vector3): boolean {
        const marbleRadius = 0.5;
        const pathWidthTolerance = 1.0;
        
        for (const point of points) {
            const distance = Math.sqrt(
                Math.pow(marblePos.x - point.position.x, 2) + 
                Math.pow(marblePos.z - point.position.z, 2)
            );
            
            const maxDistance = (point.width / 2) + marbleRadius + pathWidthTolerance;
            if (distance <= maxDistance) {
                return true;
            }
        }
        
        return false;
    }
    
    private distanceToLineSegment(point: THREE.Vector3, lineStart: THREE.Vector3, lineEnd: THREE.Vector3): number {
        // Calculate distance from point to line segment (ignoring Y axis for 2D path check)
        const A = point.x - lineStart.x;
        const B = point.z - lineStart.z;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.z - lineStart.z;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // Line segment is a point
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, zz;
        
        if (param < 0) {
            xx = lineStart.x;
            zz = lineStart.z;
        } else if (param > 1) {
            xx = lineEnd.x;
            zz = lineEnd.z;
        } else {
            xx = lineStart.x + param * C;
            zz = lineStart.z + param * D;
        }
        
        const dx = point.x - xx;
        const dz = point.z - zz;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
