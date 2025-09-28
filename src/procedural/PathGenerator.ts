import * as THREE from 'three';
import { LandscapeManager } from './LandscapeManager';

export interface PathPoint {
    position: THREE.Vector3;
    width: number;
    banking: number; // Road banking for turns
    biome: string;
}

export interface PathChunk {
    id: string;
    points: PathPoint[];
    segments: PathPoint[][]; // Separated segments with gaps between them
    meshes: THREE.Mesh[];
    terrainMeshes?: THREE.Mesh[]; // Terrain objects that avoid intersecting the path
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
    private landscapeManager: LandscapeManager | null = null;
    
    // World continuity properties
    private noiseOffsetX: number = 0; // X offset for noise consistency
    private noiseOffsetZ: number = 0; // Z offset for noise consistency
    
    // World-scale features that persist across chunks
    private worldElevationScale: number = 0.0008; // Large elevation changes
    private worldCurvatureScale: number = 0.0005; // Large directional changes
    private localVariationScale: number = 0.003; // Small local variations
    
    // Realistic elevation limits (in game units)
    private minElevation: number = -50; // Equivalent to ~500m below sea level
    private maxElevation: number = 100; // Equivalent to ~1000m above sea level
    
    
    constructor(seed?: number) {
        this.seed = seed || Math.random() * 1000000;
        this.initializeNoise();
        
        // Initialize world noise offsets based on seed for consistency
        this.noiseOffsetX = this.seed * 0.001;
        this.noiseOffsetZ = this.seed * 0.0013; // Different offset for Z to avoid correlation
    }
    
    public setLandscapeManager(landscapeManager: LandscapeManager): void {
        this.landscapeManager = landscapeManager;
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
        
        // Add slight randomization to prevent predictable patterns while maintaining continuity
        const chunkVariation = Math.sin(this.currentDistance * 0.001) * 0.1;
        
        // Generate path points using world-consistent noise
        for (let i = 0; i <= segmentCount; i++) {
            const t = i / segmentCount;
            
            // Calculate world position for this point
            const worldPos = currentPos.clone();
            
            // Get world-consistent curvature and elevation with chunk variation
            const curvature = this.getCurvatureAtWorldPosition(worldPos) + chunkVariation * Math.sin(t * Math.PI * 4);
            const elevation = this.getElevationAtWorldPosition(worldPos);
            
            // Apply curvature based on world position - more aggressive for better coiling
            const turnAngle = curvature * 0.035; // Increased for more pronounced coiling
            currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle);
            currentDir.normalize();
            
            // Move forward
            const stepVector = currentDir.clone().multiplyScalar(segmentLength);
            currentPos.add(stepVector);
            
            // Apply world-consistent elevation with realistic limits
            currentPos.y = Math.max(this.minElevation, Math.min(this.maxElevation, elevation));
            
            // Calculate path width (varies for difficulty)
            const width = this.getPathWidthAtDistance(this.currentDistance + t * this.chunkLength);
            
            // Calculate banking for turns
            const banking = Math.abs(curvature) * 0.1;
            
            // Determine biome (keep it simple)
            const biome = 'default'; // Simplified - no biome progression needed
            
            points.push({
                position: currentPos.clone(),
                width: width,
                banking: banking,
                biome: biome
            });
        }
        
        // Update state for next chunk - ensure perfectly smooth transitions
        this.lastPosition = points[points.length - 1].position.clone();
        this.lastDirection = currentDir.clone();
        this.currentDistance += this.chunkLength;
        this.difficulty = Math.min(this.currentDistance / 10000, 1); // Max difficulty at 10km
        
        // Advanced smoothing: blend the last few points to ensure seamless transitions
        if (points.length > 3) {
            // Calculate average direction from last 3 points for smoother transitions
            const p1 = points[points.length - 3].position;
            const p2 = points[points.length - 2].position;
            const p3 = points[points.length - 1].position;
            
            const dir1 = new THREE.Vector3().subVectors(p2, p1).normalize();
            const dir2 = new THREE.Vector3().subVectors(p3, p2).normalize();
            
            // Blend directions for smoother continuity
            this.lastDirection = new THREE.Vector3()
                .addVectors(dir1.multiplyScalar(0.3), dir2.multiplyScalar(0.7))
                .normalize();
        }
        
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
    
    private getCurvatureAtWorldPosition(worldPos: THREE.Vector3): number {
        // Use world position for consistent curvature across chunks
        const x = worldPos.x + this.noiseOffsetX;
        const z = worldPos.z + this.noiseOffsetZ;
        
        // Multiple octaves of noise for more interesting coiling patterns
        // Large sweeping curves that create major coils
        const largeCurves = Math.sin(x * this.worldCurvatureScale * Math.PI * 2) * 
                           Math.cos(z * this.worldCurvatureScale * Math.PI * 2) * 0.25; // Increased from 0.12
        
        // Medium curves that create secondary coiling
        const mediumCurves = Math.sin(x * this.worldCurvatureScale * 3.1 * Math.PI * 2) * 
                            Math.cos(z * this.worldCurvatureScale * 2.7 * Math.PI * 2) * 0.15; // Increased from 0.06
        
        // Small tight curves for detailed coiling
        const smallCurves = Math.sin(x * this.localVariationScale * 2.1 * Math.PI * 2) * 
                           Math.cos(z * this.localVariationScale * 1.8 * Math.PI * 2) * 0.08; // Increased from 0.03
        
        // Add spiral-like coiling patterns
        const spiralCurves = Math.sin(x * this.worldCurvatureScale * 4.7 * Math.PI * 2 + z * 0.1) * 0.12;
        
        return largeCurves + mediumCurves + smallCurves + spiralCurves;
    }
    
    private getElevationAtWorldPosition(worldPos: THREE.Vector3): number {
        // Use world position for consistent elevation across chunks
        const x = worldPos.x + this.noiseOffsetX;
        const z = worldPos.z + this.noiseOffsetZ;
        
        // Large-scale elevation changes that span multiple chunks
        const largeElevation = Math.sin(x * this.worldElevationScale * Math.PI * 2) * 
                              Math.cos(z * this.worldElevationScale * Math.PI * 2) * 8;
        
        // Medium-scale hills and valleys
        const mediumElevation = Math.sin(x * this.worldElevationScale * 2.7 * Math.PI * 2) * 
                               Math.cos(z * this.worldElevationScale * 1.9 * Math.PI * 2) * 3;
        
        // Small local variations
        const localElevation = Math.sin(x * this.localVariationScale * 1.5 * Math.PI * 2) * 
                              Math.cos(z * this.localVariationScale * 1.2 * Math.PI * 2) * 1;
        
        return largeElevation + mediumElevation + localElevation;
    }
    
    private getPathWidthAtDistance(_distance: number): number {
        // Keep path consistently wide for chill gameplay
        return this.pathWidth; // No variation, always full width
    }
    
    
    // Removed complex terrain types - keeping it simple for now
    
    private createPathWithGaps(points: PathPoint[]): PathPoint[][] {
        const segments: PathPoint[][] = [];
        let currentSegment: PathPoint[] = [];
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            
        // For chill gameplay, no gaps - just add all points to single segment
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
    
    
    private generateChunkMeshes(points: PathPoint[]): THREE.Mesh[] {
        const meshes: THREE.Mesh[] = [];
        
        // Generate path geometry with potential gaps
        const pathSegments = this.createPathWithGaps(points);
        for (const segment of pathSegments) {
            const pathGeometry = this.createPathGeometry(segment);
            const pathMaterial = this.landscapeManager ? 
                this.landscapeManager.getPathMaterial() : 
                this.createPathMaterial(points[0].biome);
            const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
            pathMesh.receiveShadow = true;
            meshes.push(pathMesh);
        }
        
        return meshes;
    }
    
    private createPathGeometry(points: PathPoint[]): THREE.BufferGeometry {
        const vertices: number[] = [];
        const indices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        
        // Create smooth continuous path by generating shared vertices
        // This eliminates gaps and notches between segments
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            
            // Calculate smooth forward direction
            let forward: THREE.Vector3;
            if (i === 0) {
                forward = new THREE.Vector3().subVectors(points[i + 1].position, point.position).normalize();
            } else if (i === points.length - 1) {
                forward = new THREE.Vector3().subVectors(point.position, points[i - 1].position).normalize();
            } else {
                // Smooth direction by averaging adjacent segments
                const prev = new THREE.Vector3().subVectors(point.position, points[i - 1].position).normalize();
                const next = new THREE.Vector3().subVectors(points[i + 1].position, point.position).normalize();
                forward = prev.add(next).normalize();
            }
            
            // Calculate right vector perpendicular to forward
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            const halfWidth = point.width / 2;
            
            // Create left and right vertices for this point
            const leftVertex = point.position.clone().add(right.clone().multiplyScalar(-halfWidth));
            const rightVertex = point.position.clone().add(right.clone().multiplyScalar(halfWidth));
            
            // Add vertices (left first, then right)
            vertices.push(leftVertex.x, leftVertex.y, leftVertex.z);
            vertices.push(rightVertex.x, rightVertex.y, rightVertex.z);
            
            // Add normals (pointing up)
            normals.push(0, 1, 0);
            normals.push(0, 1, 0);
            
            // Add UVs
            const u = i / (points.length - 1);
            uvs.push(0, u); // Left edge
            uvs.push(1, u); // Right edge
        }
        
        // Create triangles connecting adjacent vertex pairs
        for (let i = 0; i < points.length - 1; i++) {
            const baseIndex = i * 2;
            
            // Create two triangles for each path segment
            // Triangle 1: left[i], right[i], left[i+1]
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            // Triangle 2: right[i], right[i+1], left[i+1]  
            indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        // Compute smooth vertex normals for better shading
        geometry.computeVertexNormals();
        
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
