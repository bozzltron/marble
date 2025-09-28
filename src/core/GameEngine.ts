import * as THREE from 'three';
import { PathGenerator } from '../procedural/PathGenerator';
import { MarblePhysics } from '../physics/MarblePhysics';
import { InputManager } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { ChunkManager } from '../procedural/ChunkManager';

export class GameEngine {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private pathGenerator!: PathGenerator;
    private marblePhysics!: MarblePhysics;
    private inputManager!: InputManager;
    private audioManager!: AudioManager;
    private chunkManager!: ChunkManager;
    
    private marble!: THREE.Mesh;
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private gameStartTime: number = 0;
    
    // Performance tracking
    private frameCount: number = 0;
    private lastFPSUpdate: number = 0;
    
    constructor() {
        this.initializeRenderer();
        this.initializeScene();
        this.initializeCamera();
        this.initializeManagers();
        this.initializeMarble();
        this.setupEventListeners();
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
        
        // Zen-like gradient background
        const gradientTexture = this.createGradientBackground();
        this.scene.background = gradientTexture;
        
        // Ambient lighting for relaxing atmosphere
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Soft directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
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
        this.chunkManager = new ChunkManager(this.scene, this.pathGenerator);
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
    
    private createGradientBackground(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        // Create zen gradient (sky to horizon)
        const gradient = context.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(0.7, '#FFE4B5'); // Moccasin
        gradient.addColorStop(1, '#DDA0DD'); // Plum
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
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
        
        // Adjust pixel ratio for performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    
    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.lastFPSUpdate = this.lastTime;
        this.gameStartTime = this.lastTime;
        
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
        this.audioManager.pause();
    }
    
    public resume(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.audioManager.resume();
        this.gameLoop();
    }
    
    private gameLoop(): void {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update game systems
        this.update(deltaTime, currentTime);
        this.render();
        
        // Performance monitoring
        this.trackPerformance(currentTime);
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    private update(deltaTime: number, currentTime: number): void {
        // Get path direction for input transformation and physics
        const pathDirection = this.chunkManager.getPathDirectionAtPosition(this.marble.position);
        
        // Update marble physics with current path direction
        this.marblePhysics.setPathDirection(pathDirection);
        
        // Get input with path-relative transformation
        const input = this.inputManager.getInput(pathDirection);
        
        // Update path surface height for marble physics
        this.updatePathSurfaceHeight();
        
        // Update marble physics
        this.marblePhysics.update(deltaTime, input);
        
        // Check path boundaries (only if not already falling and game has been running for a bit)
        const gameRunTime = currentTime - this.gameStartTime;
        if (!this.marblePhysics.isFallingOff() && gameRunTime > 1000) { // Wait 1 second after start
            this.checkPathBoundaries();
        }
        
        // Update camera to follow marble smoothly
        this.updateCamera();
        
        // Manage path chunks based on marble position
        this.chunkManager.update(this.marble.position);
        
        // Update audio based on marble movement
        this.audioManager.update(this.marble.position, this.marblePhysics.getVelocity());
    }
    
    private updateCamera(): void {
        const marblePos = this.marble.position;
        const isMobile = window.innerWidth <= 768;
        
        // Get the path direction at marble's position
        const pathDirection = this.chunkManager.getPathDirectionAtPosition(marblePos);
        
        // Debug: Log path direction occasionally
        if (Math.random() < 0.01) { // 1% chance per frame
            console.log('Path direction:', pathDirection);
        }
        
        // Camera follows path direction
        const followDistance = isMobile ? 8 : 10;
        const followHeight = isMobile ? 6 : 8;
        const followSpeed = 0.08; // Slightly slower for smoother turns
        
        // Position camera behind marble along the path direction
        const cameraOffset = pathDirection.clone()
            .negate() // Behind the marble
            .multiplyScalar(followDistance);
        
        const targetPosition = new THREE.Vector3(
            marblePos.x + cameraOffset.x,
            marblePos.y + followHeight,
            marblePos.z + cameraOffset.z
        );
        
        this.camera.position.lerp(targetPosition, followSpeed);
        
        // Look ahead along the path direction
        const lookAheadDistance = 3;
        const lookTarget = new THREE.Vector3(
            marblePos.x + (pathDirection.x * lookAheadDistance),
            marblePos.y,
            marblePos.z + (pathDirection.z * lookAheadDistance)
        );
        
        this.camera.lookAt(lookTarget);
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
                console.warn(`Low FPS detected: ${fps}`);
                // Could trigger quality reduction here
            }
        }
    }
    
    public getMarblePosition(): THREE.Vector3 {
        return this.marble.position.clone();
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
            console.log('Marble is in a gap! Setting low surface height.');
            return;
        }
        
        // Debug: Log when marble is on valid path
        // console.log('Marble is on valid path segment');
        
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
    
    private checkPathBoundaries(): void {
        // This is now handled by updatePathSurfaceHeight() which sets surface to -1000 for gaps
        // The marble physics will naturally fall when surface height is very low
        // No need for duplicate boundary checking logic here
    }
    
    private positionMarbleOnPath(): void {
        // Get the actual start position from the generated path
        const startPosition = this.getValidStartPosition();
        
        console.log('Positioning marble at:', startPosition);
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
        
        console.log('No valid segments found, using fallback position');
        return new THREE.Vector3(0, 2, 0);
    }
    
    public resetMarble(): void {
        // Reset to last checkpoint (where marble fell off)
        this.marblePhysics.resetToCheckpoint();
    }
    
    private isMarbleOnValidPathSegment(chunk: any, marblePos: THREE.Vector3): boolean {
        if (!chunk.segments || chunk.segments.length === 0) {
            // If no segments, fall back to checking original points (no gaps generated)
            console.log('No segments found, using original points for collision');
            return this.isMarbleNearAnyPathPoint(chunk.points, marblePos);
        }
        
        // console.log(`Checking ${chunk.segments.length} path segments for marble collision`);
        
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
