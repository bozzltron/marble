import * as THREE from 'three';
import { PathPoint } from './PathGenerator';

export interface LandscapeTheme {
    name: string;
    generateBackground(scene: THREE.Scene): void;
    generateTerrain(pathPoints: PathPoint[], chunkId: string): THREE.Mesh[];
    getPathMaterial(): THREE.Material;
    getSkyboxColors(): { horizon: string; zenith: string };
    getAmbientLightColor(): number;
    getAmbientLightIntensity(): number;
    // New method for dynamic background extension
    extendBackground(scene: THREE.Scene, marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void;
}

export class LandscapeManager {
    private currentTheme: LandscapeTheme;
    private availableThemes: Map<string, LandscapeTheme> = new Map();
    private scene: THREE.Scene;
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.initializeThemes();
        
        // Start with mountain theme
        this.currentTheme = this.availableThemes.get('mountain')!;
    }
    
    private initializeThemes(): void {
        this.availableThemes.set('mountain', new MountainLandscape());
        this.availableThemes.set('space', new SpaceLandscape());
    }
    
    public switchTheme(themeName: string): boolean {
        const newTheme = this.availableThemes.get(themeName);
        if (newTheme && newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            this.regenerateBackground();
            return true;
        }
        return false;
    }
    
    public getCurrentTheme(): LandscapeTheme {
        return this.currentTheme;
    }
    
    public getAvailableThemes(): string[] {
        return Array.from(this.availableThemes.keys());
    }
    
    private regenerateBackground(): void {
        // Clear existing background elements
        this.clearBackground();
        
        // Generate new background
        this.currentTheme.generateBackground(this.scene);
    }
    
    private clearBackground(): void {
        // Remove background elements (keep path and marble)
        const objectsToRemove: THREE.Object3D[] = [];
        
        this.scene.traverse((child) => {
            if (child.userData.isBackground) {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }
    
    public generateTerrainForChunk(pathPoints: PathPoint[], chunkId: string): THREE.Mesh[] {
        return this.currentTheme.generateTerrain(pathPoints, chunkId);
    }
    
    public getPathMaterial(): THREE.Material {
        return this.currentTheme.getPathMaterial();
    }
    
    // New method to extend background dynamically
    public updateBackground(marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void {
        this.currentTheme.extendBackground(this.scene, marblePosition, pathDirection);
    }
}

class MountainLandscape implements LandscapeTheme {
    name = 'mountain';
    
    generateBackground(scene: THREE.Scene): void {
        this.createMountainSkybox(scene);
        this.createDistantMountainRanges(scene);
        this.createFloatingClouds(scene);
        this.setupMountainLighting(scene);
    }
    
    generateTerrain(_pathPoints: PathPoint[], _chunkId: string): THREE.Mesh[] {
        // Mountain theme is clean and minimal - no terrain objects
        // Just the marble, path, and scenic mountain backdrop
        return [];
    }
    
    extendBackground(scene: THREE.Scene, marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void {
        // For mountain theme, we need to extend clouds and distant mountains ahead of the marble
        this.extendClouds(scene, marblePosition, pathDirection);
        this.extendDistantMountains(scene, marblePosition, pathDirection);
        // Most importantly, keep the skybox centered on the marble
        this.updateSkyboxPosition(scene, marblePosition);
    }
    
    getPathMaterial(): THREE.Material {
        return new THREE.MeshStandardMaterial({
            color: 0x8B7355, // Mountain stone color
            roughness: 0.3,
            metalness: 0.1
        });
    }
    
    getSkyboxColors() {
        return { horizon: '#FFE4B5', zenith: '#87CEEB' };
    }
    
    getAmbientLightColor(): number {
        return 0xffffff;
    }
    
    getAmbientLightIntensity(): number {
        return 0.6;
    }
    
    private createMountainSkybox(scene: THREE.Scene): void {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // Mountain sky gradient
        const gradient = context.createLinearGradient(0, 512, 0, 0);
        gradient.addColorStop(0, '#FFE4B5');  // Warm mountain horizon
        gradient.addColorStop(0.3, '#87CEEB'); // Mountain sky blue
        gradient.addColorStop(0.7, '#4169E1'); // Deep mountain blue
        gradient.addColorStop(1, '#2F4F4F');   // Mountain peaks
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 1024, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.SphereGeometry(800, 32, 16);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            side: THREE.BackSide 
        });
        
        const skybox = new THREE.Mesh(geometry, material);
        skybox.userData.isBackground = true;
        skybox.userData.type = 'skybox';
        scene.add(skybox);
    }
    
    private createDistantMountainRanges(scene: THREE.Scene): void {
        const layers = [
            { color: '#2F4F4F', opacity: 0.9, z: -700, y: -30, scale: 1.2 },
            { color: '#708090', opacity: 0.7, z: -600, y: -20, scale: 1.0 },
            { color: '#9ACD32', opacity: 0.5, z: -500, y: -10, scale: 0.8 }
        ];
        
        layers.forEach(layer => {
            const mountain = this.createMountainSilhouette(layer.color, layer.opacity, layer.scale);
            mountain.position.set(0, layer.y, layer.z);
            mountain.userData.isBackground = true;
            scene.add(mountain);
        });
    }
    
    private createMountainSilhouette(color: string, opacity: number, scale: number): THREE.Mesh {
        const canvas = document.createElement('canvas');
        canvas.width = 1600 * scale;
        canvas.height = 300 * scale;
        
        const context = canvas.getContext('2d')!;
        context.fillStyle = color;
        context.globalAlpha = opacity;
        
        // Draw mountain silhouette with realistic peaks
        context.beginPath();
        context.moveTo(0, canvas.height);
        
        for (let x = 0; x <= canvas.width; x += 30) {
            const height = Math.random() * 150 * scale + 100 * scale;
            const peakVariation = Math.sin(x * 0.01) * 50 * scale;
            context.lineTo(x, canvas.height - height - peakVariation);
        }
        
        context.lineTo(canvas.width, canvas.height);
        context.closePath();
        context.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(1600 * scale, 300 * scale);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    private createFloatingClouds(scene: THREE.Scene): void {
        for (let i = 0; i < 8; i++) {
            const cloud = this.createMountainCloud();
            cloud.position.set(
                (Math.random() - 0.5) * 1200,
                150 + Math.random() * 200,
                -400 - Math.random() * 300
            );
            cloud.userData.isBackground = true;
            scene.add(cloud);
        }
    }
    
    private createMountainCloud(): THREE.Mesh {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d')!;
        
        // Mountain cloud with slight gray tint
        const gradient = context.createRadialGradient(128, 64, 0, 128, 64, 100);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.6)');
        gradient.addColorStop(1, 'rgba(220, 220, 220, 0)');
        
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
    
    private setupMountainLighting(scene: THREE.Scene): void {
        // Clear existing lights
        const lightsToRemove: THREE.Light[] = [];
        scene.traverse((child) => {
            if (child instanceof THREE.Light && child.userData.isBackground) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach(light => scene.remove(light));
        
        // Mountain ambient lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        ambientLight.userData.isBackground = true;
        scene.add(ambientLight);
        
        // Mountain sun (directional light)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        directionalLight.userData.isBackground = true;
        scene.add(directionalLight);
    }
    
    private extendClouds(scene: THREE.Scene, marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void {
        // Generate clouds ahead of the marble's current position
        const aheadDistance = 800; // Generate clouds 800 units ahead
        const cloudPosition = marblePosition.clone().add(pathDirection.clone().multiplyScalar(aheadDistance));
        
        // Check if we need more clouds in this area
        const existingClouds = scene.children.filter(child => 
            child.userData.type === 'cloud' && 
            child.position.distanceTo(cloudPosition) < 400
        );
        
        if (existingClouds.length < 3) {
            // Generate 2-3 new clouds ahead
            for (let i = 0; i < 3; i++) {
                const cloud = this.createMountainCloud();
                const offsetX = (Math.random() - 0.5) * 600;
                const offsetZ = (Math.random() - 0.5) * 600;
                cloud.position.set(
                    cloudPosition.x + offsetX,
                    40 + Math.random() * 30,
                    cloudPosition.z + offsetZ
                );
                cloud.userData.type = 'cloud';
                scene.add(cloud);
            }
        }
    }
    
    private extendDistantMountains(scene: THREE.Scene, marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void {
        // Generate distant mountain ranges ahead of the marble
        const aheadDistance = 1200; // Generate mountains 1200 units ahead
        const mountainPosition = marblePosition.clone().add(pathDirection.clone().multiplyScalar(aheadDistance));
        
        // Check if we need more mountains in this area
        const existingMountains = scene.children.filter(child => 
            child.userData.type === 'mountain' && 
            child.position.distanceTo(mountainPosition) < 600
        );
        
        if (existingMountains.length < 2) {
            // Generate new mountain range ahead
            const mountainRange = this.createMountainSilhouette('#4A4A4A', 0.8, 800);
            mountainRange.userData.type = 'mountain';
            scene.add(mountainRange);
        }
    }
    
    private updateSkyboxPosition(scene: THREE.Scene, marblePosition: THREE.Vector3): void {
        // Find the mountain skybox and update its position to follow the marble
        scene.traverse((child) => {
            if (child.userData.isBackground && child.userData.type === 'skybox') {
                child.position.copy(marblePosition);
            }
        });
    }
    
}

class SpaceLandscape implements LandscapeTheme {
    name = 'space';
    
    generateBackground(scene: THREE.Scene): void {
        this.createSpaceSkybox(scene);
        this.createDistantPlanets(scene);
        this.createStarField(scene);
        this.createNebula(scene);
        this.setupSpaceLighting(scene);
    }
    
    generateTerrain(pathPoints: PathPoint[], chunkId: string): THREE.Mesh[] {
        const terrain: THREE.Mesh[] = [];
        
        // Generate space terrain that avoids intersecting the path
        terrain.push(...this.createFloatingAsteroids(pathPoints, chunkId));
        terrain.push(...this.createSpaceStations(pathPoints, chunkId));
        terrain.push(...this.createEnergyFields(pathPoints, chunkId));
        
        return terrain;
    }
    
    extendBackground(scene: THREE.Scene, marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void {
        // For space theme, extend nebula clouds and distant planets ahead of the marble
        this.extendNebulaClouds(scene, marblePosition, pathDirection);
        this.extendDistantPlanets(scene, marblePosition, pathDirection);
        // Most importantly, keep the skybox centered on the marble
        this.updateSkyboxPosition(scene, marblePosition);
    }
    
    getPathMaterial(): THREE.Material {
        return new THREE.MeshStandardMaterial({
            color: 0x4169E1, // Space blue
            roughness: 0.1,
            metalness: 0.8,
            emissive: 0x001122,
            emissiveIntensity: 0.2
        });
    }
    
    getSkyboxColors() {
        return { horizon: '#000011', zenith: '#000000' };
    }
    
    getAmbientLightColor(): number {
        return 0x4444ff;
    }
    
    getAmbientLightIntensity(): number {
        return 0.3;
    }
    
    private createSpaceSkybox(scene: THREE.Scene): void {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // Space gradient
        const gradient = context.createLinearGradient(0, 512, 0, 0);
        gradient.addColorStop(0, '#000011');  // Deep space
        gradient.addColorStop(0.5, '#000033'); // Space blue
        gradient.addColorStop(1, '#000000');   // Pure black
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 1024, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.SphereGeometry(800, 32, 16);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            side: THREE.BackSide 
        });
        
        const skybox = new THREE.Mesh(geometry, material);
        skybox.userData.isBackground = true;
        skybox.userData.type = 'skybox';
        scene.add(skybox);
    }
    
    private createDistantPlanets(scene: THREE.Scene): void {
        // Create several distant planets
        const planets = [
            { color: 0xff6b6b, size: 50, x: -400, y: 100, z: -600 },
            { color: 0x4ecdc4, size: 30, x: 300, y: -50, z: -500 },
            { color: 0xffe66d, size: 40, x: -200, y: 200, z: -700 }
        ];
        
        planets.forEach(planetData => {
            const planet = this.createPlanet(planetData.color, planetData.size);
            planet.position.set(planetData.x, planetData.y, planetData.z);
            planet.userData.isBackground = true;
            scene.add(planet);
        });
    }
    
    private createPlanet(color: number, size: number): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.8,
            emissive: color,
            emissiveIntensity: 0.1
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    private createStarField(scene: THREE.Scene): void {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;     // x
            positions[i + 1] = (Math.random() - 0.5) * 2000; // y
            positions[i + 2] = (Math.random() - 0.5) * 2000; // z
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            sizeAttenuation: false
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        stars.userData.isBackground = true;
        scene.add(stars);
    }
    
    private createNebula(scene: THREE.Scene): void {
        // Create a subtle nebula effect
        for (let i = 0; i < 3; i++) {
            const nebula = this.createNebulaCloud();
            nebula.position.set(
                (Math.random() - 0.5) * 1000,
                (Math.random() - 0.5) * 500,
                -800 - Math.random() * 200
            );
            nebula.userData.isBackground = true;
            scene.add(nebula);
        }
    }
    
    private createNebulaCloud(): THREE.Mesh {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // Nebula gradient with space colors
        const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
        gradient.addColorStop(0, 'rgba(138, 43, 226, 0.3)'); // Purple center
        gradient.addColorStop(0.5, 'rgba(75, 0, 130, 0.2)'); // Indigo
        gradient.addColorStop(1, 'rgba(25, 25, 112, 0)');    // Midnight blue fade
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        const geometry = new THREE.PlaneGeometry(400, 400);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    private setupSpaceLighting(scene: THREE.Scene): void {
        // Clear existing lights
        const lightsToRemove: THREE.Light[] = [];
        scene.traverse((child) => {
            if (child instanceof THREE.Light && child.userData.isBackground) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach(light => scene.remove(light));
        
        // Space ambient lighting (dim blue)
        const ambientLight = new THREE.AmbientLight(0x4444ff, 0.3);
        ambientLight.userData.isBackground = true;
        scene.add(ambientLight);
        
        // Distant star light
        const starLight = new THREE.DirectionalLight(0xffffff, 0.5);
        starLight.position.set(-100, 100, -100);
        starLight.userData.isBackground = true;
        scene.add(starLight);
    }
    
    private createFloatingAsteroids(pathPoints: PathPoint[], chunkId: string): THREE.Mesh[] {
        const asteroids: THREE.Mesh[] = [];
        
        for (let i = 0; i < pathPoints.length; i += 10) {
            const pathPoint = pathPoints[i];
            
            const angle = Math.random() * Math.PI * 2;
            const distance = 25 + Math.random() * 35;
            
            const asteroidPos = new THREE.Vector3(
                pathPoint.position.x + Math.cos(angle) * distance,
                pathPoint.position.y + (Math.random() - 0.5) * 20,
                pathPoint.position.z + Math.sin(angle) * distance
            );
            
            if (!this.intersectsWithPath(asteroidPos, pathPoints, 12)) {
                const asteroid = this.createAsteroid(asteroidPos);
                asteroid.userData.chunkId = chunkId;
                asteroids.push(asteroid);
            }
        }
        
        return asteroids;
    }
    
    private createSpaceStations(pathPoints: PathPoint[], chunkId: string): THREE.Mesh[] {
        const stations: THREE.Mesh[] = [];
        
        // Rarely place space stations
        if (Math.random() < 0.05) { // 5% chance per chunk
            const pathPoint = pathPoints[Math.floor(pathPoints.length / 2)];
            
            const stationPos = new THREE.Vector3(
                pathPoint.position.x + (Math.random() - 0.5) * 100,
                pathPoint.position.y + 50 + Math.random() * 50,
                pathPoint.position.z + (Math.random() - 0.5) * 100
            );
            
            const station = this.createSpaceStation(stationPos);
            station.userData.chunkId = chunkId;
            stations.push(station);
        }
        
        return stations;
    }
    
    private createEnergyFields(pathPoints: PathPoint[], chunkId: string): THREE.Mesh[] {
        const fields: THREE.Mesh[] = [];
        
        for (let i = 0; i < pathPoints.length; i += 15) {
            if (Math.random() < 0.3) {
                const pathPoint = pathPoints[i];
                
                const fieldPos = new THREE.Vector3(
                    pathPoint.position.x + (Math.random() - 0.5) * 60,
                    pathPoint.position.y + Math.random() * 30,
                    pathPoint.position.z + (Math.random() - 0.5) * 60
                );
                
                const field = this.createEnergyField(fieldPos);
                field.userData.chunkId = chunkId;
                fields.push(field);
            }
        }
        
        return fields;
    }
    
    private intersectsWithPath(position: THREE.Vector3, pathPoints: PathPoint[], safeDistance: number): boolean {
        for (const pathPoint of pathPoints) {
            const distance = position.distanceTo(pathPoint.position);
            if (distance < safeDistance) {
                return true;
            }
        }
        return false;
    }
    
    private createAsteroid(position: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.DodecahedronGeometry(3 + Math.random() * 4);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        asteroid.position.copy(position);
        
        asteroid.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        return asteroid;
    }
    
    private createSpaceStation(position: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(20, 5, 20);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x002244,
            emissiveIntensity: 0.3
        });
        
        const station = new THREE.Mesh(geometry, material);
        station.position.copy(position);
        
        return station;
    }
    
    private createEnergyField(position: THREE.Vector3): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(5, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            emissive: 0x0088ff,
            emissiveIntensity: 0.5
        });
        
        const field = new THREE.Mesh(geometry, material);
        field.position.copy(position);
        
        return field;
    }
    
    private extendNebulaClouds(scene: THREE.Scene, marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void {
        // Generate nebula clouds ahead of the marble's current position
        const aheadDistance = 1000; // Generate clouds 1000 units ahead
        const cloudPosition = marblePosition.clone().add(pathDirection.clone().multiplyScalar(aheadDistance));
        
        // Check if we need more nebula clouds in this area
        const existingClouds = scene.children.filter(child => 
            child.userData.type === 'nebula' && 
            child.position.distanceTo(cloudPosition) < 500
        );
        
        if (existingClouds.length < 2) {
            // Generate new nebula clouds ahead
            for (let i = 0; i < 2; i++) {
                const nebula = this.createNebulaCloud();
                const offsetX = (Math.random() - 0.5) * 800;
                const offsetY = (Math.random() - 0.5) * 200;
                const offsetZ = (Math.random() - 0.5) * 800;
                nebula.position.set(
                    cloudPosition.x + offsetX,
                    cloudPosition.y + offsetY,
                    cloudPosition.z + offsetZ
                );
                nebula.userData.type = 'nebula';
                scene.add(nebula);
            }
        }
    }
    
    private extendDistantPlanets(scene: THREE.Scene, marblePosition: THREE.Vector3, pathDirection: THREE.Vector3): void {
        // Generate distant planets ahead of the marble
        const aheadDistance = 1500; // Generate planets 1500 units ahead
        const planetPosition = marblePosition.clone().add(pathDirection.clone().multiplyScalar(aheadDistance));
        
        // Check if we need more planets in this area
        const existingPlanets = scene.children.filter(child => 
            child.userData.type === 'planet' && 
            child.position.distanceTo(planetPosition) < 800
        );
        
        if (existingPlanets.length < 1) {
            // Generate new distant planet
            const planet = this.createPlanet(0x8B4513 + Math.random() * 0x444444, 50 + Math.random() * 100);
            const offsetX = (Math.random() - 0.5) * 1000;
            const offsetY = (Math.random() - 0.5) * 400;
            const offsetZ = (Math.random() - 0.5) * 1000;
            planet.position.set(
                planetPosition.x + offsetX,
                planetPosition.y + offsetY + 200, // Keep planets elevated
                planetPosition.z + offsetZ
            );
            planet.userData.type = 'planet';
            scene.add(planet);
        }
    }
    
    private updateSkyboxPosition(scene: THREE.Scene, marblePosition: THREE.Vector3): void {
        // Find the space skybox and update its position to follow the marble
        scene.traverse((child) => {
            if (child.userData.isBackground && child.userData.type === 'skybox') {
                child.position.copy(marblePosition);
            }
        });
    }
}
