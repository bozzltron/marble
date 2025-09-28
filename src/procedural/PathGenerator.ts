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
    private pathWidth: number = 8; // Wider path for chill gameplay
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
    
    private getPathWidthAtDistance(_distance: number): number {
        // Keep path consistently wide for chill gameplay
        return this.pathWidth; // No variation, always full width
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
                
                // Gap created in path geometry
                
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
        
        // Path segments created with gaps for jumping gameplay
        return segments;
    }
    
    private shouldCreateGap(_point: PathPoint, _index: number, _totalPoints: number): boolean {
        // For chill gameplay, no gaps - just continuous flowing path
        return false;
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
        
        // No guardrails or obstacles for chill gameplay
        // const guardrails = this.createGuardrails(points);
        // const scenicElements = this.createScenicElements(points);
        
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
    
    
    // Scenic elements removed for performance - chill gameplay focus
    
    public getCurrentDistance(): number {
        return this.currentDistance;
    }
    
    public getDifficulty(): number {
        return this.difficulty;
    }
}
