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
        
        // Scenic photo-realistic background
        this.createScenicBackground();
        
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
    
    private createScenicBackground(): void {
        // Create a photo-realistic scenic environment
        this.createSkyGradient();
        this.createDistantMountains();
        this.createFloatingClouds();
    }
    
    private createSkyGradient(): void {
        // Create a realistic sky gradient
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        
        const context = canvas.getContext('2d')!;
        
        // Create sky gradient from horizon to zenith
        const gradient = context.createLinearGradient(0, 512, 0, 0);
        gradient.addColorStop(0, '#FFE4B5');  // Warm horizon
        gradient.addColorStop(0.3, '#87CEEB'); // Light blue
        gradient.addColorStop(0.7, '#4169E1'); // Royal blue
        gradient.addColorStop(1, '#191970');   // Midnight blue at zenith
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 1024, 512);
        
        // Add atmospheric haze near horizon
        const hazeGradient = context.createRadialGradient(512, 400, 0, 512, 400, 600);
        hazeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        hazeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = hazeGradient;
        context.fillRect(0, 0, 1024, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.SphereGeometry(800, 32, 16);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            side: THREE.BackSide 
        });
        
        const skybox = new THREE.Mesh(geometry, material);
        this.scene.add(skybox);
    }
    
    private createDistantMountains(): void {
        // Create layered mountain silhouettes for depth
        const layers = [
            { color: '#2F4F4F', opacity: 0.8, z: -600, y: -50 }, // Back mountains
            { color: '#708090', opacity: 0.6, z: -500, y: -30 }, // Middle mountains  
            { color: '#9ACD32', opacity: 0.4, z: -400, y: -10 }  // Front mountains
        ];
        
        layers.forEach(layer => {
            const mountain = this.createMountainLayer(layer.color, layer.opacity);
            mountain.position.set(0, layer.y, layer.z);
            this.scene.add(mountain);
        });
    }
    
    private createMountainLayer(color: string, opacity: number): THREE.Mesh {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 200;
        
        const context = canvas.getContext('2d')!;
        context.fillStyle = color;
        context.globalAlpha = opacity;
        
        // Draw mountain silhouette with random peaks
        context.beginPath();
        context.moveTo(0, 200);
        
        for (let x = 0; x <= 1600; x += 50) {
            const height = Math.random() * 100 + 50;
            context.lineTo(x, 200 - height);
        }
        
        context.lineTo(1600, 200);
        context.closePath();
        context.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(1600, 200);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    private createFloatingClouds(): void {
        // Add subtle floating clouds for atmosphere
        for (let i = 0; i < 6; i++) {
            const cloud = this.createCloud();
            cloud.position.set(
                (Math.random() - 0.5) * 1000,
                100 + Math.random() * 200,
                -300 - Math.random() * 400
            );
            this.scene.add(cloud);
        }
    }
    
    private createCloud(): THREE.Mesh {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        
        const context = canvas.getContext('2d')!;
        
        // Create fluffy cloud texture
        const gradient = context.createRadialGradient(128, 64, 0, 128, 64, 100);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(200, 100);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
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
        // Game loop started
        
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
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update game systems
        this.update(deltaTime, currentTime);
        this.render();
        
        // Performance monitoring
        this.trackPerformance(currentTime);
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    private update(deltaTime: number, _currentTime: number): void {
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
        
        // Boundary checking now integrated into updatePathSurfaceHeight()
        
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
        
        // Path direction updated for camera alignment
        
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
            // Fallback to original points when no segments available
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
