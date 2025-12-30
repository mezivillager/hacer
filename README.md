# HACER

A 3D logic gate simulator built with React, inspired by [nand2tetris](https://www.nand2tetris.org/). Build complex circuits from basic logic gates, starting with the humble NAND gate.

## Features

- **3D Visualization**: Interactive 3D circuit canvas powered by React Three Fiber
- **Logic Simulation**: Real-time gate logic with visual feedback
- **Intuitive UI**: Clean interface with Ant Design components
- **Reactive State**: Efficient state management with Zustand

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the simulator.

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **React Three Fiber** - 3D rendering (Three.js for React)
- **@react-three/drei** - R3F helpers and controls
- **Ant Design** - UI component library
- **Zustand** - State management
- **React Compiler** - Automatic memoization
- **TypeScript** - Type safety

## Project Structure

```
src/
├── components/
│   ├── ui/           # Ant Design based UI components
│   └── canvas/       # React Three Fiber 3D components
├── gates/            # Gate logic and 3D models
├── simulation/       # Circuit simulation engine
├── store/            # Zustand state stores
├── App.tsx           # Main application
└── main.tsx          # Entry point
```

## Controls

- **Left-click on gate**: Select the gate
- **Click on input pins**: Toggle input values (red = 0, green = 1)
- **Scroll**: Zoom in/out
- **Click + drag**: Rotate the view

## Roadmap

- [ ] More gate types (AND, OR, NOT, XOR, NOR, XNOR)
- [ ] Wire connections between gates
- [ ] Drag-and-drop gate placement
- [ ] Save/load circuits
- [ ] Complex chip building (flip-flops, ALU, etc.)
- [ ] Full computer simulation (CPU, RAM, etc.)

## License

MIT
