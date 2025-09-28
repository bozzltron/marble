# Marble Game - Infinite Zen Journey

## Project Vision & Current State
A relaxing, focus-enhancing marble rolling game inspired by the classic Marble Madness, built entirely with web standards. The game features an infinite, procedurally-generated winding path floating above scenic backgrounds, providing a meditative experience with simple left/right steering controls.

## Current Implementation Status (December 2024)
- ✅ **Auto-Forward Rolling**: Marble rolls forward automatically at constant speed
- ✅ **Path-Following Camera**: Camera rotates with path curves for intuitive controls  
- ✅ **Left/Right Steering**: Simplified controls - only steer left/right and jump
- ✅ **Mobile Touch Controls**: Swipe left/right to steer, two-finger tap to jump
- ✅ **Procedural Path Generation**: Infinite winding paths with gaps and terrain variety
- ✅ **Gap Jumping**: Jump over gaps or fall and reset from checkpoint
- ✅ **PWA Ready**: Service worker, manifest, installable as app
- ✅ **Cloudflare Pages Deployment**: Git-based deployment ready

## Core Principles

### 1. Web Standards Only
- Pure HTML5, CSS3, JavaScript/TypeScript
- Three.js for 3D graphics (WebGL)
- No external frameworks beyond essential 3D rendering
- Progressive Web App (PWA) capabilities for offline play
- Service Worker for caching and offline functionality

### 2. Mobile-First Design
- **Primary Target**: Mobile devices (phones/tablets)
- **Secondary Target**: Desktop with keyboard fallback
- Touch-first controls with drag/swipe mechanics
- Responsive design that adapts to screen size
- Optimized performance for mobile GPUs
- Battery-conscious rendering and physics

### 3. Zen Gaming Philosophy
- **Focus Enhancement**: Gameplay that improves concentration
- **Relaxation**: Stress-reducing, meditative experience
- **Flow State**: Smooth, continuous gameplay without jarring interruptions
- **Minimalist UI**: Clean, distraction-free interface
- **Ambient Experience**: Subtle audio and visual cues

## Game Mechanics

### Marble Controls (CURRENT IMPLEMENTATION)
- **Auto-Forward**: Marble rolls forward automatically along path direction
- **Mobile**: Swipe left/right to steer, two-finger tap to jump
- **Desktop**: A/D or arrow keys to steer, spacebar to jump
- **Physics**: Realistic marble physics with momentum, friction, and gravity
- **Path-Aligned**: All movement relative to current path direction
- **Steering Only**: No forward/backward control needed

### Infinite Path System
- **Single Winding Path**: No flat platforms, only a continuous route forward
- **Procedural Generation**: Algorithmically created levels that never repeat
- **Memory Efficient**: Generate chunks ahead, dispose chunks behind
- **Seamless Transitions**: Smooth path connections without loading breaks
- **Difficulty Scaling**: Gradually increasing complexity over time

### Level Design Requirements
- **Cohesive World**: Path generation based on world position creates seamless experience
- **World-Scale Features**: Large elevation changes and curves span multiple chunks
- **Invisible Boundaries**: Chunk transitions are completely seamless to players
- **Path Width**: Consistently wide for relaxing gameplay
- **Elevation Changes**: Hills, valleys, and gentle slopes using world-coherent noise
- **Curves**: Smooth S-curves, spirals, and gentle turns based on world position
- **Obstacles**: Minimal, integrated into path design
- **Checkpoints**: Invisible progress markers for respawn
- **Visual Variety**: Different themes/biomes as player progresses

## Technical Architecture

### Core Systems
- **GameEngine**: Central coordinator managing all systems
- **PathGenerator**: Procedural infinite path generation with biome variety
- **ChunkManager**: Efficient loading/unloading of path segments with terrain
- **LandscapeManager**: Isolated landscape themes with collision-aware terrain generation
- **MarblePhysics**: Realistic marble movement with gravity, friction, jumping
- **InputManager**: Cross-platform input handling (keyboard, touch, gamepad)
- **AudioManager**: Procedural ambient soundscapes

### Landscape System
- **Mountain Theme**: Clean mountain environment with scenic backdrop only
- **Space Theme**: Cosmic environment with planets, asteroids, space stations
- **Minimal Design**: Mountain theme focuses on marble, path, and distant mountains
- **Theme Switching**: Runtime switching between landscape themes
- **Consistent Generation**: Each theme maintains visual coherence across chunks

### Performance Optimization
- **Memory Management**: 
  - Maximum 3-5 path chunks in memory at once
  - Efficient geometry disposal and creation
  - Texture atlasing for reduced draw calls
- **Rendering Optimization**:
  - Level-of-detail (LOD) for distant objects
  - Frustum culling for off-screen elements
  - Efficient shadow mapping
- **Runtime Performance**:
  - Zero console.log statements in production
  - Debug utility for development-only logging
  - Optimized update loops with reduced frequency calls
- **Mobile Considerations**:
  - Adaptive quality settings based on device performance
  - Battery usage optimization
  - Thermal throttling awareness

### Procedural Generation Algorithm
- **Seed-Based**: Reproducible paths for debugging/sharing
- **Chunk System**: Generate 200-300 unit path segments
- **Smoothing**: Bezier curves for natural path flow
- **Constraint System**: Ensure paths are always navigable
- **Biome Transitions**: Gradual environmental changes
- **Difficulty Curve**: Mathematical progression of challenge

### Audio System
- **Ambient Soundscapes**: Nature sounds, gentle music
- **Spatial Audio**: 3D positioned sounds for immersion
- **Adaptive Music**: Tempo and intensity based on player progress
- **Minimal File Sizes**: Compressed, looping audio tracks
- **Offline Capable**: All audio cached for PWA functionality

### Visual Design
- **Scenic Backgrounds**: 
  - Procedurally generated skyboxes
  - Parallax scrolling distant elements
  - Time-of-day progression
  - Weather effects (subtle rain, fog, etc.)
- **Material Design**:
  - Realistic marble textures and physics
  - Path materials that indicate difficulty/biome
  - Particle effects for ambiance
- **Lighting**:
  - Dynamic lighting that follows marble
  - Soft shadows for depth perception
  - Ambient lighting for mood

## PWA Implementation

### Offline Functionality
- **Vite PWA Plugin**: Automated service worker generation with auto-updates
- **Service Worker**: Cache all game assets automatically
- **Update Strategy**: Seamless auto-updates with user notification system
- **Cache Management**: Automatic cache versioning and cleanup
- **Update Notifications**: User-friendly prompts with 30-second auto-apply

### Installation Features
- **App Manifest**: Proper PWA manifest for installation
- **Splash Screen**: Branded loading experience
- **Fullscreen Mode**: Immersive gameplay without browser UI
- **Orientation Lock**: Landscape mode for optimal experience

## Development Guidelines

### Code Organization
```
src/
├── core/           # Core game engine
├── procedural/     # Path generation algorithms
├── physics/        # Marble physics and collision
├── audio/          # Sound management
├── graphics/       # Rendering and visual effects
├── input/          # Touch and keyboard handling
├── pwa/            # Service worker and PWA features
└── utils/          # Helper functions and utilities
```

### Performance Targets
- **Initial Load**: < 2 seconds on 3G
- **Memory Usage**: < 100MB on mobile devices
- **Frame Rate**: Stable 60fps on mid-range phones
- **Battery Impact**: < 5% per 30 minutes of gameplay

### Quality Standards
- **TypeScript**: Strong typing for maintainability
- **ESLint/Prettier**: Consistent code formatting
- **Testing**: Unit tests for procedural generation
- **Documentation**: Inline comments for complex algorithms
- **Accessibility**: Basic keyboard navigation support

## Future Enhancements

### Phase 1 (Core Game)
- Infinite procedural path generation
- Mobile touch controls
- Basic marble physics
- Simple ambient audio
- PWA offline capability

### Phase 2 (Polish)
- Multiple biomes/themes
- Advanced particle effects
- Adaptive music system
- Performance analytics
- Social sharing features

### Phase 3 (Advanced)
- Multiplayer ghost races
- Custom path sharing
- Achievement system
- Advanced graphics options
- VR/AR exploration

## Success Metrics
- **Engagement**: Average session length > 10 minutes
- **Retention**: 70% of users return within 24 hours
- **Performance**: 95% of sessions maintain 60fps
- **Accessibility**: Works on devices 3+ years old
- **Offline Usage**: 80% of gameplay sessions work offline

## Technical Constraints
- **Bundle Size**: Total game < 5MB compressed
- **Startup Time**: Playable within 3 seconds
- **Memory Limit**: Never exceed 150MB RAM usage
- **Battery Efficiency**: Optimized rendering loops
- **Network Independence**: Full offline functionality

## Context for Future LLMs

### Architecture Overview
```
src/
├── core/GameEngine.ts        # Main game loop, camera, scene management
├── physics/MarblePhysics.ts  # Auto-forward rolling, steering, jumping, collision
├── procedural/
│   ├── PathGenerator.ts      # Procedural path generation with gaps
│   └── ChunkManager.ts       # Memory-efficient chunk loading/unloading
├── input/InputManager.ts     # Touch/keyboard input, mobile-first design
└── audio/AudioManager.ts     # Placeholder for future audio system
```

### Key Technical Decisions Made
1. **Auto-Forward Rolling**: Marble moves forward automatically, player only steers left/right
2. **Path-Following Camera**: Camera rotates with path curves for intuitive controls
3. **Mobile-First**: Touch controls are primary, keyboard is fallback
4. **Segment-Based Collision**: Gaps are real holes in path geometry, not visual tricks
5. **Checkpoint System**: Saves last safe position for intelligent resets
6. **No Game Framework**: Pure Three.js for maximum control and minimal bundle size

### Current Pain Points & Technical Debt
- **Debug Logging**: Excessive console.log statements need cleanup
- **Unused Code**: Some methods and properties no longer used after simplification
- **Magic Numbers**: Physics constants could be better organized
- **Audio System**: Currently just a stub, needs full implementation
- **Path Generation**: Could be more efficient, some redundant calculations

### Performance Characteristics
- **Bundle Size**: ~493KB total (126KB gzipped)
- **Three.js Chunk**: 465KB (cached separately)
- **Game Code**: 28KB (fast updates)
- **Target**: 60fps on mobile, <100MB RAM usage

### Mobile Optimization Strategies
- **Touch Sensitivity**: Amplified 2x for responsive steering
- **Camera Distance**: Closer on mobile (8 units vs 10 on desktop)  
- **Simplified Physics**: Reduced complexity for mobile GPUs
- **Chunk Management**: Maximum 5 active chunks to limit memory

### Deployment & Build
- **Cloudflare Pages**: Git-based deployment with auto-build
- **Build Command**: `npm run build:production`
- **PWA Features**: Service worker, manifest, offline caching
- **No CLI Tools**: Simplified deployment without Wrangler

### Code Patterns to Follow
- **TypeScript Strict**: Strong typing, no `any` types
- **Modular Design**: Single responsibility classes
- **Performance First**: 60fps target drives all decisions
- **Mobile First**: Touch controls designed first, keyboard second
- **Zen Philosophy**: Every feature should enhance calm, focused gameplay

### Future Enhancement Priorities
1. **Scenic Backgrounds**: Photo-realistic environments for floating paths
2. **Infinite Generation**: Ensure path never ends, remove obstacles for chill experience  
3. **Audio System**: Ambient soundscapes and spatial audio
4. **Visual Polish**: Better materials, lighting, particle effects
5. **Performance Analytics**: Monitor real-world performance metrics

This project embodies the philosophy of "digital minimalism meets engaging gameplay" - providing a focused, calming experience that enhances rather than detracts from the user's mental state.
