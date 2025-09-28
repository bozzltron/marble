# Marble Madness - Infinite Zen Journey

## Project Vision
A relaxing, focus-enhancing marble game built entirely with web standards. The game features an infinite, procedurally-generated winding path that provides a meditative experience while challenging the player's focus and precision.

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

### Marble Controls
- **Mobile**: Drag/swipe to apply force to marble
- **Desktop**: Arrow keys as fallback
- **Physics**: Realistic marble physics with momentum and friction
- **Precision**: Fine control for navigating narrow paths
- **Responsiveness**: Immediate feedback to player input

### Infinite Path System
- **Single Winding Path**: No flat platforms, only a continuous route forward
- **Procedural Generation**: Algorithmically created levels that never repeat
- **Memory Efficient**: Generate chunks ahead, dispose chunks behind
- **Seamless Transitions**: Smooth path connections without loading breaks
- **Difficulty Scaling**: Gradually increasing complexity over time

### Level Design Requirements
- **Path Width**: Varies from comfortable to challenging
- **Elevation Changes**: Hills, valleys, and gentle slopes
- **Curves**: Smooth S-curves, spirals, and gentle turns
- **Obstacles**: Minimal, integrated into path design
- **Checkpoints**: Invisible progress markers for respawn
- **Visual Variety**: Different themes/biomes as player progresses

## Technical Architecture

### Performance Optimization
- **Memory Management**: 
  - Maximum 3-5 path chunks in memory at once
  - Efficient geometry disposal and creation
  - Texture atlasing for reduced draw calls
- **Rendering Optimization**:
  - Level-of-detail (LOD) for distant objects
  - Frustum culling for off-screen elements
  - Efficient shadow mapping
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
- **Service Worker**: Cache all game assets
- **Offline Storage**: Save game progress locally
- **Background Sync**: Sync progress when online
- **Update Strategy**: Seamless updates without interrupting gameplay

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

This project embodies the philosophy of "digital minimalism meets engaging gameplay" - providing a focused, calming experience that enhances rather than detracts from the user's mental state.
