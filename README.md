# 🎳 Marble Madness

A modern WebGL implementation of the classic Marble Madness game, built with TypeScript and Three.js.

## 🎮 Features

- **Mobile-First Design**: Optimized for touch controls and mobile devices
- **Path-Following Camera**: Intuitive controls that adapt to path curves
- **Procedural Generation**: Infinite, algorithmically generated paths
- **Gap Jumping**: Jump over gaps or fall and reset from checkpoints
- **Zen Gaming**: Relaxing, focus-enhancing gameplay experience
- **Progressive Web App**: Offline-capable gaming experience

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build:production
```

## 🌐 Deployment to Cloudflare Pages

### Prerequisites
1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`

### Deploy to Production
```bash
npm run deploy
```

### Deploy Preview
```bash
npm run deploy:preview
```

### Manual Cloudflare Pages Setup
1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect your Git repository
3. Set build settings:
   - **Build command**: `npm run build:production`
   - **Build output directory**: `dist`
   - **Node.js version**: `18` or higher

## 🎯 Game Controls

### Desktop
- **WASD / Arrow Keys**: Move marble
- **Spacebar**: Jump
- **Enter**: Reset marble

### Mobile
- **Drag**: Move marble
- **Two-finger tap**: Jump
- **Reset button**: Reset marble

## 🏗️ Architecture

### Core Systems
- **GameEngine**: Main game loop and coordination
- **MarblePhysics**: Physics simulation and collision detection
- **PathGenerator**: Procedural path generation with gaps
- **ChunkManager**: Memory-efficient path streaming
- **InputManager**: Cross-platform input handling
- **AudioManager**: Spatial audio system (planned)

### Key Features
- **Modular Design**: Separated concerns for maintainability
- **TypeScript**: Strong typing for reliability
- **Performance Optimized**: 60fps target on mobile devices
- **Memory Efficient**: Chunk-based loading system

## 🎨 Technical Highlights

- **Path-Following Camera**: Camera rotates with path curves for intuitive controls
- **Segment-Based Collision**: Proper gap detection using path segments
- **Checkpoint System**: Smart reset positioning on valid path geometry
- **Mobile Optimization**: Touch controls and responsive camera system
- **Bundle Optimization**: Three.js separated for better caching

## 📱 PWA Features (Planned)

- Offline gameplay
- App-like installation
- Background sync
- Push notifications for challenges

## 🛠️ Development

### Project Structure
```
src/
├── core/           # Game engine and main loop
├── physics/        # Marble physics and collision
├── procedural/     # Path generation and management
├── input/          # Input handling system
└── audio/          # Audio management (planned)
```

### Build Process
1. TypeScript compilation
2. Vite bundling with optimizations
3. Asset optimization and chunking
4. Production minification

## 🚀 Performance

- **Bundle Size**: ~126KB gzipped
- **Target FPS**: 60fps on mobile
- **Memory Usage**: Efficient chunk streaming
- **Load Time**: Optimized for 3G networks

## 🎯 Roadmap

- [ ] Audio system implementation
- [ ] PWA capabilities
- [ ] Multiplayer racing mode
- [ ] Level editor
- [ ] Achievement system
- [ ] Leaderboards

---

Built with ❤️ using TypeScript, Three.js, and modern web technologies.
# marble
