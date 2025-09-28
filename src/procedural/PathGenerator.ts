import * as THREE from 'three';

export interface PathPoint {
    position: THREE.Vector3;
    width: number;
    banking: number; // Road banking for turns
    biome: string;
    terrainType: 'ground' | 'elevated' | 'canopy' | 'bridge' | 'floating';
    elevation: number; // Base elevation for terrain type
}

export interface PathChunk {
    id: string;
    points: PathPoint[];
    segments: PathPoint[][]; // Separated segments with gaps between them
    meshes: THREE.Mesh[];
    startPosition: THREE.Vector3;
    endPosition: THREE.Vector3;
    length: number;
}

export class PathGenerator {
    private seed: number;
    private chunkLength: number = 200;
    private pathWidth: number = 4;
    private currentDistance: number = 0;
    private lastDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
    private lastPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private difficulty: number = 0;
    
    // Biome progression
    private biomes = ['meadow', 'forest', 'mountain', 'desert', 'arctic', 'cosmic'];
    
    constructor(seed?: number) {
        this.seed = seed || Math.random() * 1000000;
        this.initializeNoise();
    }
    
    private initializeNoise(): void {
        // Simple seeded random for consistent generation
        Math.random = this.seededRandom(this.seed);
    }
    
    private seededRandom(seed: number): () => number {
        let x = Math.sin(seed) * 10000;
        return () => {
            x = Math.sin(x) * 10000;
            return x - Math.floor(x);
        };
    }
    
    public generateChunk(chunkId: string): PathChunk {
        const points: PathPoint[] = [];
        const segmentCount = 50; // Points per chunk
        const segmentLength = this.chunkLength / segmentCount;
        
        let currentPos = this.lastPosition.clone();
        let currentDir = this.lastDirection.clone();
        
        // Generate path points
        for (let i = 0; i <= segmentCount; i++) {
            const t = i / segmentCount;
            
            // Add some controlled randomness to direction
            const curvature = this.getCurvatureAtDistance(this.currentDistance + t * this.chunkLength);
            const elevation = this.getElevationAtDistance(this.currentDistance + t * this.chunkLength);
            
            // Apply curvature
            const turnAngle = curvature * 0.02; // Gentle turns
            currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle);
            currentDir.normalize();
            
            // Move forward
            const stepVector = currentDir.clone().multiplyScalar(segmentLength);
            currentPos.add(stepVector);
            
            // Apply elevation
            currentPos.y = elevation;
            
            // Calculate path width (varies for difficulty)
            const width = this.getPathWidthAtDistance(this.currentDistance + t * this.chunkLength);
            
            // Calculate banking for turns
            const banking = Math.abs(curvature) * 0.1;
            
            // Determine biome (keep it simple)
            const biome = this.getBiomeAtDistance(this.currentDistance + t * this.chunkLength);
            
            // Keep elevation simple - just use the calculated elevation
            currentPos.y = elevation;
            
            points.push({
                position: currentPos.clone(),
                width: width,
                banking: banking,
                biome: biome,
                terrainType: 'ground', // Simplify - always ground level
                elevation: 0 // No additional elevation
            });
        }
        
        // Update state for next chunk
        this.lastPosition = currentPos.clone();
        this.lastDirection = currentDir.clone();
        this.currentDistance += this.chunkLength;
        this.difficulty = Math.min(this.currentDistance / 10000, 1); // Max difficulty at 10km
        
        // Generate meshes for this chunk
        const meshes = this.generateChunkMeshes(points);
        
        // Generate path segments with gaps for collision detection
        const pathSegments = this.createPathWithGaps(points);
        
        return {
            id: chunkId,
            points: points,
            segments: pathSegments, // Store segments for proper collision detection
            meshes: meshes,
            startPosition: points[0].position.clone(),
            endPosition: points[points.length - 1].position.clone(),
            length: this.chunkLength
        };
    }
    
    private getCurvatureAtDistance(distance: number): number {
        // Use multiple octaves of noise for natural curves
        const scale1 = distance * 0.001;
        const scale2 = distance * 0.003;
        const scale3 = distance * 0.007;
        
        return (
            Math.sin(scale1) * 0.5 +
            Math.sin(scale2) * 0.3 +
            Math.sin(scale3) * 0.2
        );
    }
    
    private getElevationAtDistance(distance: number): number {
        // Gentle hills and valleys
        const scale1 = distance * 0.0005;
        const scale2 = distance * 0.002;
        
        const baseElevation = Math.sin(scale1) * 10 + Math.sin(scale2) * 3;
        
        // Add biome-specific elevation
        const biome = this.getBiomeAtDistance(distance);
        switch (biome) {
            case 'mountain':
                return baseElevation + Math.sin(distance * 0.0003) * 20;
            case 'desert':
                return baseElevation + Math.sin(distance * 0.001) * 5;
            default:
                return baseElevation;
        }
    }
    
    private getPathWidthAtDistance(distance: number): number {
        // Start wide, get narrower with difficulty
        const baseDifficulty = 1 - this.difficulty * 0.5; // Never go below 50% width
        const variation = Math.sin(distance * 0.01) * 0.2; // Some variation
        
        return this.pathWidth * (baseDifficulty + variation);
    }
    
    private getBiomeAtDistance(distance: number): string {
        // Change biome every 5km
        const biomeIndex = Math.floor(distance / 5000) % this.biomes.length;
        return this.biomes[biomeIndex];
    }
    
    // Removed complex terrain types - keeping it simple for now
    
    private createPathWithGaps(points: PathPoint[]): PathPoint[][] {
        const segments: PathPoint[][] = [];
        let currentSegment: PathPoint[] = [];
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            
            // Determine if we should create a gap here
            const shouldCreateGap = this.shouldCreateGap(point, i, points.length);
            
            if (shouldCreateGap && currentSegment.length > 3) { // Need more points for stable segment
                // End current segment and start a new one after the gap
                segments.push([...currentSegment]);
                currentSegment = [];
                
                // Create a meaningful gap that requires jumping
                const gapSize = this.getGapSize(point.terrainType, point.biome);
                const gapDistance = gapSize * 4; // Actual distance in world units
                
                console.log(`Creating gap of ${gapDistance} units at distance ${this.currentDistance + i * (this.chunkLength / points.length)}`);
                
                // Skip points to create the actual gap in path data
                i += gapSize - 1; // -1 because the loop will increment
                continue;
            }
            
            currentSegment.push(point);
        }
        
        // Add the final segment if it has points
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }
        
        // If no segments were created (no gaps), return the original points as one segment
        if (segments.length === 0) {
            segments.push(points);
        }
        
        console.log(`Created ${segments.length} path segments with gaps`);
        return segments;
    }
    
    private shouldCreateGap(point: PathPoint, index: number, totalPoints: number): boolean {
        // Don't create gaps at the beginning or end of chunks
        if (index < 5 || index > totalPoints - 10) return false;
        
        // Higher chance of gaps on elevated terrain
        const terrainGapChance: { [key: string]: number } = {
            'ground': 0.05,
            'elevated': 0.15,
            'canopy': 0.25,
            'bridge': 0.3,
            'floating': 0.4
        };
        
        const baseChance = terrainGapChance[point.terrainType] || 0.1;
        
        // Increase chance with difficulty
        const difficultyMultiplier = 1 + this.difficulty * 0.5;
        const finalChance = baseChance * difficultyMultiplier;
        
        return Math.random() < finalChance;
    }
    
    private getGapSize(terrainType: string, biome: string): number {
        // Gap size in number of path points to skip
        const baseGapSizes: { [key: string]: number } = {
            'ground': 2,
            'elevated': 3,
            'canopy': 4,
            'bridge': 5,
            'floating': 6
        };
        
        let gapSize = baseGapSizes[terrainType] || 3;
        
        // Cosmic biome has larger gaps
        if (biome === 'cosmic') {
            gapSize += 2;
        }
        
        return gapSize;
    }
    
    private generateChunkMeshes(points: PathPoint[]): THREE.Mesh[] {
        const meshes: THREE.Mesh[] = [];
        
        // Generate path geometry with potential gaps
        const pathSegments = this.createPathWithGaps(points);
        for (const segment of pathSegments) {
            const pathGeometry = this.createPathGeometry(segment);
            const pathMaterial = this.createPathMaterial(points[0].biome);
            const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
            pathMesh.receiveShadow = true;
            meshes.push(pathMesh);
        }
        
        // Generate guardrails for narrow sections
        const guardrails = this.createGuardrails(points);
        meshes.push(...guardrails);
        
        // Generate scenic elements
        const scenicElements = this.createScenicElements(points);
        meshes.push(...scenicElements);
        
        return meshes;
    }
    
    private createPathGeometry(points: PathPoint[]): THREE.BufferGeometry {
        const vertices: number[] = [];
        const indices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        
        // Create path mesh from points
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate perpendicular vector for path width
            const forward = new THREE.Vector3().subVectors(p2.position, p1.position).normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            
            // Create quad for this segment
            const halfWidth1 = p1.width / 2;
            const halfWidth2 = p2.width / 2;
            
            // Apply banking
            const bankingAngle1 = p1.banking;
            const bankingAngle2 = p2.banking;
            
            // Left and right edges
            const left1 = p1.position.clone().add(right.clone().multiplyScalar(-halfWidth1));
            const right1 = p1.position.clone().add(right.clone().multiplyScalar(halfWidth1));
            const left2 = p2.position.clone().add(right.clone().multiplyScalar(-halfWidth2));
            const right2 = p2.position.clone().add(right.clone().multiplyScalar(halfWidth2));
            
            // Apply banking (rotate around forward axis)
            if (bankingAngle1 !== 0) {
                left1.sub(p1.position).applyAxisAngle(forward, bankingAngle1).add(p1.position);
                right1.sub(p1.position).applyAxisAngle(forward, bankingAngle1).add(p1.position);
            }
            
            if (bankingAngle2 !== 0) {
                left2.sub(p2.position).applyAxisAngle(forward, bankingAngle2).add(p2.position);
                right2.sub(p2.position).applyAxisAngle(forward, bankingAngle2).add(p2.position);
            }
            
            // Add vertices
            const baseIndex = vertices.length / 3;
            
            vertices.push(left1.x, left1.y, left1.z);
            vertices.push(right1.x, right1.y, right1.z);
            vertices.push(left2.x, left2.y, left2.z);
            vertices.push(right2.x, right2.y, right2.z);
            
            // Add indices for two triangles
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex + 1, baseIndex + 3, baseIndex + 2
            );
            
            // Add normals (pointing up)
            for (let j = 0; j < 4; j++) {
                normals.push(0, 1, 0);
            }
            
            // Add UVs
            const u1 = i / (points.length - 1);
            const u2 = (i + 1) / (points.length - 1);
            uvs.push(0, u1, 1, u1, 0, u2, 1, u2);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        return geometry;
    }
    
    private createPathMaterial(biome: string): THREE.Material {
        // Different materials for different biomes
        const materials: { [key: string]: THREE.MeshStandardMaterial } = {
            meadow: new THREE.MeshStandardMaterial({ 
                color: 0x90EE90, 
                roughness: 0.8 
            }),
            forest: new THREE.MeshStandardMaterial({ 
                color: 0x8FBC8F, 
                roughness: 0.7 
            }),
            mountain: new THREE.MeshStandardMaterial({ 
                color: 0x696969, 
                roughness: 0.9 
            }),
            desert: new THREE.MeshStandardMaterial({ 
                color: 0xF4A460, 
                roughness: 0.6 
            }),
            arctic: new THREE.MeshStandardMaterial({ 
                color: 0xF0F8FF, 
                roughness: 0.3 
            }),
            cosmic: new THREE.MeshStandardMaterial({ 
                color: 0x4B0082, 
                roughness: 0.2,
                emissive: 0x1a0033
            })
        };
        
        return materials[biome] || materials.meadow;
    }
    
    private createGuardrails(points: PathPoint[]): THREE.Mesh[] {
        const guardrails: THREE.Mesh[] = [];
        
        // Only add guardrails for narrow or elevated sections
        for (let i = 0; i < points.length - 1; i++) {
            const point = points[i];
            
            if (point.width < 3 || point.position.y > 5) {
                // Create simple guardrail geometry
                const railGeometry = new THREE.BoxGeometry(0.1, 0.5, 1);
                const railMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xcccccc,
                    metalness: 0.8,
                    roughness: 0.2
                });
                
                // Left rail
                const leftRail = new THREE.Mesh(railGeometry, railMaterial);
                leftRail.position.copy(point.position);
                leftRail.position.x -= point.width / 2 + 0.2;
                leftRail.position.y += 0.25;
                leftRail.castShadow = true;
                guardrails.push(leftRail);
                
                // Right rail
                const rightRail = new THREE.Mesh(railGeometry, railMaterial);
                rightRail.position.copy(point.position);
                rightRail.position.x += point.width / 2 + 0.2;
                rightRail.position.y += 0.25;
                rightRail.castShadow = true;
                guardrails.push(rightRail);
            }
        }
        
        return guardrails;
    }
    
    private createScenicElements(points: PathPoint[]): THREE.Mesh[] {
        const elements: THREE.Mesh[] = [];
        
        // Add terrain-specific elements
        const biome = points[0].biome;
        const terrainType = points[0].terrainType;
        
        // Create terrain-specific environments
        if (terrainType === 'canopy') {
            elements.push(...this.createCanopyEnvironment(points));
        }
        
        // Add regular biome elements
        for (let i = 0; i < points.length; i += 10) { // Every 10th point
            if (Math.random() < 0.3) { // 30% chance
                const element = this.createBiomeElement(biome, points[i].position, terrainType);
                if (element) {
                    elements.push(element);
                }
            }
        }
        
        return elements;
    }
    
    private createCanopyEnvironment(points: PathPoint[]): THREE.Mesh[] {
        const elements: THREE.Mesh[] = [];
        
        // Create forest floor far below
        const floorY = -20; // 45 units below canopy
        const pathCenter = points[Math.floor(points.length / 2)].position;
        
        // Create forest floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d5016, // Dark forest green
            roughness: 0.9 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(pathCenter.x, floorY, pathCenter.z);
        floor.receiveShadow = true;
        elements.push(floor);
        
        // Create tree trunks below the canopy
        for (let i = 0; i < 20; i++) {
            const trunk = this.createTreeTrunk(pathCenter, floorY);
            if (trunk) {
                elements.push(trunk);
            }
        }
        
        // Create canopy foliage around the path
        for (let i = 0; i < points.length; i += 5) {
            const point = points[i];
            
            // Add foliage on both sides of the path
            for (let side = -1; side <= 1; side += 2) {
                if (Math.random() < 0.4) {
                    const foliage = this.createCanopyFoliage(point.position, side);
                    if (foliage) {
                        elements.push(foliage);
                    }
                }
            }
        }
        
        return elements;
    }
    
    private createTreeTrunk(centerPos: THREE.Vector3, floorY: number): THREE.Mesh | null {
        const trunkGeometry = new THREE.CylinderGeometry(
            1 + Math.random() * 2, // Top radius
            1.5 + Math.random() * 2, // Bottom radius  
            25, // Height to reach canopy
            8
        );
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a2a, // Brown bark
            roughness: 0.9 
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Position randomly around the path center
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 30;
        trunk.position.set(
            centerPos.x + Math.cos(angle) * distance,
            floorY + 12.5, // Half height above floor
            centerPos.z + Math.sin(angle) * distance
        );
        
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        return trunk;
    }
    
    private createCanopyFoliage(pathPos: THREE.Vector3, side: number): THREE.Mesh | null {
        const foliageGeometry = new THREE.SphereGeometry(
            2 + Math.random() * 3, // Radius
            8, 8
        );
        const foliageMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22, // Forest green
            roughness: 0.8 
        });
        
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        
        // Position to the side of the path
        const distance = 8 + Math.random() * 10;
        foliage.position.set(
            pathPos.x + side * distance,
            pathPos.y + Math.random() * 5 - 2, // Slightly above/below path level
            pathPos.z + (Math.random() - 0.5) * 10
        );
        
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        
        return foliage;
    }
    
    private createBiomeElement(biome: string, position: THREE.Vector3, _terrainType?: string): THREE.Mesh | null {
        const offset = 8 + Math.random() * 10; // Place away from path
        const side = Math.random() < 0.5 ? -1 : 1;
        
        let geometry: THREE.BufferGeometry;
        let material: THREE.Material;
        
        switch (biome) {
            case 'meadow':
            case 'forest':
                // Simple tree
                geometry = new THREE.ConeGeometry(1, 4, 8);
                material = new THREE.MeshStandardMaterial({ color: 0x228B22 });
                break;
                
            case 'mountain':
                // Rock formation
                geometry = new THREE.BoxGeometry(2, 3, 2);
                material = new THREE.MeshStandardMaterial({ color: 0x696969 });
                break;
                
            case 'desert':
                // Cactus
                geometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
                material = new THREE.MeshStandardMaterial({ color: 0x9ACD32 });
                break;
                
            case 'arctic':
                // Ice crystal
                geometry = new THREE.OctahedronGeometry(1.5);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xE0FFFF, 
                    transparent: true, 
                    opacity: 0.8 
                });
                break;
                
            case 'cosmic':
                // Floating crystal
                geometry = new THREE.OctahedronGeometry(1);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xFF69B4, 
                    emissive: 0x4B0082,
                    transparent: true, 
                    opacity: 0.9 
                });
                break;
                
            default:
                return null;
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.x += side * offset;
        mesh.position.y += 1;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    public getCurrentDistance(): number {
        return this.currentDistance;
    }
    
    public getDifficulty(): number {
        return this.difficulty;
    }
}
