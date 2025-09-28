import * as THREE from 'three';
import { PathGenerator, PathChunk } from './PathGenerator';
import { LandscapeManager } from './LandscapeManager';

export class ChunkManager {
    private scene: THREE.Scene;
    private pathGenerator: PathGenerator;
    private landscapeManager: LandscapeManager;
    private activeChunks: Map<string, PathChunk> = new Map();
    private maxActiveChunks: number = 10; // Even more chunks to ensure infinite generation
    private chunkLoadDistance: number = 600; // Load chunks much earlier - user should never see end
    private chunkUnloadDistance: number = 1000; // Keep chunks longer for smoother experience
    private nextChunkId: number = 0;
    
    constructor(scene: THREE.Scene, pathGenerator: PathGenerator, landscapeManager: LandscapeManager) {
        this.scene = scene;
        this.pathGenerator = pathGenerator;
        this.landscapeManager = landscapeManager;
        
        // Connect landscape manager to path generator
        this.pathGenerator.setLandscapeManager(landscapeManager);
    }
    
    public initialize(): void {
        // Generate many initial chunks to ensure user never sees path end
        for (let i = 0; i < 8; i++) {
            this.generateNextChunk();
        }
    }
    
    public update(marblePosition: THREE.Vector3): void {
        // Check if we need to load new chunks ahead
        this.checkForwardChunkLoading(marblePosition);
        
        // Check if we need to unload chunks behind
        this.checkBackwardChunkUnloading(marblePosition);
        
        // Ensure we don't exceed memory limits
        this.enforceMemoryLimits();
    }
    
    private checkForwardChunkLoading(marblePosition: THREE.Vector3): void {
        // Find the furthest chunk ahead
        let furthestDistance = -Infinity;
        let furthestChunk: PathChunk | null = null;
        
        for (const chunk of this.activeChunks.values()) {
            const distance = marblePosition.distanceTo(chunk.endPosition);
            if (distance > furthestDistance) {
                furthestDistance = distance;
                furthestChunk = chunk;
            }
        }
        
        // If marble is getting close to the end of the furthest chunk, generate more
        if (furthestChunk) {
            const distanceToEnd = marblePosition.distanceTo(furthestChunk.endPosition);
            if (distanceToEnd < this.chunkLoadDistance) {
                // Generate multiple chunks to ensure we stay well ahead
                for (let i = 0; i < 3; i++) {
                    this.generateNextChunk();
                }
            }
        }
    }
    
    private checkBackwardChunkUnloading(marblePosition: THREE.Vector3): void {
        const chunksToUnload: string[] = [];
        
        for (const [id, chunk] of this.activeChunks.entries()) {
            const distanceToStart = marblePosition.distanceTo(chunk.startPosition);
            
            // If marble is far past this chunk, mark it for unloading
            if (distanceToStart > this.chunkUnloadDistance) {
                chunksToUnload.push(id);
            }
        }
        
        // Unload distant chunks
        for (const id of chunksToUnload) {
            this.unloadChunk(id);
        }
    }
    
    private enforceMemoryLimits(): void {
        // If we have too many chunks, unload the furthest ones
        while (this.activeChunks.size > this.maxActiveChunks) {
            let furthestDistance = -Infinity;
            let furthestChunkId = '';
            
            // Find furthest chunk from origin (simple heuristic)
            for (const [id, chunk] of this.activeChunks.entries()) {
                const distance = chunk.startPosition.length();
                if (distance > furthestDistance) {
                    furthestDistance = distance;
                    furthestChunkId = id;
                }
            }
            
            if (furthestChunkId) {
                this.unloadChunk(furthestChunkId);
            } else {
                break; // Safety break
            }
        }
    }
    
    private generateNextChunk(): void {
        const chunkId = `chunk_${this.nextChunkId++}`;
        
        try {
            const chunk = this.pathGenerator.generateChunk(chunkId);
            this.loadChunk(chunk);
        } catch (error) {
            // Failed to generate chunk - continuing with existing chunks
        }
    }
    
    private loadChunk(chunk: PathChunk): void {
        // Add path meshes to scene
        for (const mesh of chunk.meshes) {
            this.scene.add(mesh);
        }
        
        // Generate and add terrain meshes that avoid intersecting the path
        const terrainMeshes = this.landscapeManager.generateTerrainForChunk(chunk.points, chunk.id);
        terrainMeshes.forEach(mesh => {
            this.scene.add(mesh);
        });
        
        // Store terrain meshes with the chunk for cleanup
        chunk.terrainMeshes = terrainMeshes;
        
        // Store chunk reference
        this.activeChunks.set(chunk.id, chunk);
        
        // Chunk loaded successfully
    }
    
    private unloadChunk(chunkId: string): void {
        const chunk = this.activeChunks.get(chunkId);
        if (!chunk) return;
        
        // Remove path meshes from scene
        for (const mesh of chunk.meshes) {
            this.scene.remove(mesh);
            this.disposeMesh(mesh);
        }
        
        // Remove terrain meshes from scene
        if (chunk.terrainMeshes) {
            for (const mesh of chunk.terrainMeshes) {
                this.scene.remove(mesh);
                this.disposeMesh(mesh);
            }
        }
        
        // Remove chunk reference
        this.activeChunks.delete(chunkId);
        
        // Chunk unloaded successfully
    }
    
    private disposeMesh(mesh: THREE.Mesh): void {
        // Dispose of geometry and materials to free memory
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(material => material.dispose());
            } else {
                mesh.material.dispose();
            }
        }
    }
    
    public getCurrentStartPosition(): THREE.Vector3 {
        // Find the chunk with the earliest start position (closest to path beginning)
        let earliestChunk: PathChunk | null = null;
        let earliestDistance = Infinity;
        
        for (const chunk of this.activeChunks.values()) {
            // Use the chunk's actual start position distance from origin
            const distance = chunk.startPosition.length();
            if (distance < earliestDistance) {
                earliestDistance = distance;
                earliestChunk = chunk;
            }
        }
        
        if (earliestChunk && earliestChunk.points.length > 0) {
            // Use the very first point of the earliest chunk
            const firstPoint = earliestChunk.points[0];
            const startPos = new THREE.Vector3(
                firstPoint.position.x,
                firstPoint.position.y + 1, // 1 unit above path surface
                firstPoint.position.z
            );
            
            // Found valid start position
            return startPos;
        }
        
        // No chunks available, using fallback position
        return new THREE.Vector3(0, 2, 0);
    }
    
    public getPathAtPosition(position: THREE.Vector3): PathChunk | null {
        // Find which chunk contains this position
        let closestChunk: PathChunk | null = null;
        let closestDistance = Infinity;
        
        for (const chunk of this.activeChunks.values()) {
            // Simple distance check to chunk center
            const chunkCenter = new THREE.Vector3()
                .addVectors(chunk.startPosition, chunk.endPosition)
                .multiplyScalar(0.5);
            
            const distance = position.distanceTo(chunkCenter);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestChunk = chunk;
            }
        }
        
        return closestChunk;
    }
    
    // Removed complex path direction - not needed with simplified camera
    
    public getActiveChunkCount(): number {
        return this.activeChunks.size;
    }
    
    public getActiveChunks(): PathChunk[] {
        return Array.from(this.activeChunks.values());
    }
    
    public getPathDirectionAtPosition(position: THREE.Vector3): THREE.Vector3 {
        const chunk = this.getPathAtPosition(position);
        if (!chunk || chunk.points.length < 2) {
            return new THREE.Vector3(0, 0, -1); // Default forward direction
        }
        
        // Find the closest path point
        let closestIndex = 0;
        let closestDistance = Infinity;
        
        for (let i = 0; i < chunk.points.length; i++) {
            const distance = position.distanceTo(chunk.points[i].position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }
        
        // Calculate direction from current point to next point
        let directionIndex = closestIndex;
        if (closestIndex < chunk.points.length - 1) {
            directionIndex = closestIndex + 1;
        } else if (closestIndex > 0) {
            directionIndex = closestIndex - 1;
        }
        
        if (directionIndex !== closestIndex) {
            const currentPoint = chunk.points[closestIndex].position;
            const nextPoint = chunk.points[directionIndex].position;
            const direction = new THREE.Vector3()
                .subVectors(nextPoint, currentPoint)
                .normalize();
            
            // Ensure we're going forward (negative Z direction generally)
            if (directionIndex < closestIndex) {
                direction.negate();
            }
            
            return direction;
        }
        
        return new THREE.Vector3(0, 0, -1); // Default forward direction
    }
    
    public getMemoryUsageEstimate(): number {
        // Rough estimate of memory usage in MB
        let totalVertices = 0;
        
        for (const chunk of this.activeChunks.values()) {
            for (const mesh of chunk.meshes) {
                if (mesh.geometry && mesh.geometry.attributes.position) {
                    totalVertices += mesh.geometry.attributes.position.count;
                }
            }
        }
        
        // Rough calculation: vertices * 3 floats * 4 bytes + overhead
        const estimatedBytes = totalVertices * 3 * 4 * 2; // *2 for normals, uvs, etc.
        return estimatedBytes / (1024 * 1024); // Convert to MB
    }
    
    public cleanup(): void {
        // Unload all chunks
        const chunkIds = Array.from(this.activeChunks.keys());
        for (const id of chunkIds) {
            this.unloadChunk(id);
        }
    }
}
