# Phase 0.5: Nand2Tetris Foundation (Weeks 2-4)

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Priority:** 🔴 CRITICAL - Blocks All Subsequent Phases  
**Timeline:** Weeks 2-4  
**Dependencies:** Phase 0 complete

---

## Overview

This critical phase fills the architectural gaps that prevent nand2tetris curriculum completion. Without these foundations, subsequent phases cannot build functional computer systems.

**Exit Criteria:**
- All nand2tetris .hdl files parse correctly
- .tst scripts execute with 100% accuracy
- Sequential gates simulate correctly with clock signals
- Basic ALU and CPU components functional
- Performance: <50ms for 100-gate circuit simulation

---

## 0.5.1 HDL Parser/Compiler Plugin

**Requirements:** Support nand2tetris Hardware Description Language (.hdl files) for text-based chip definitions.

**Performance Considerations:**
- Parser must handle files up to 10K lines efficiently
- Memory usage < 10MB for complex chip hierarchies
- Parse time < 100ms for typical nand2tetris chips

**Implementation:**

```typescript
// src/core/hdl/types.ts
export interface HDLChip {
  name: string;
  inputs: HDLPin[];
  outputs: HDLPin[];
  parts: HDLPart[];
  internal?: HDLPin[];  // Internal wires
}

export interface HDLPin {
  name: string;
  width?: number;  // For multi-bit pins (default: 1)
}

export interface HDLPart {
  chip: string;  // Chip name (e.g., "Nand", "And", "Or")
  connections: Record<string, string>;  // pinName -> wireName
}

// src/core/hdl/parser.ts - Optimized for performance
export class HDLParser {
  // Use streaming parsing for large files
  async parse(content: string): Promise<HDLChip> {
    const lines = content.split('\n');
    return this.parseLines(lines);
  }

  // Memory-efficient parsing with validation
  private parseLines(lines: string[]): HDLChip {
    // Implementation with proper error handling and performance monitoring
  }

  // Streaming generation for large outputs
  async generate(chip: HDLChip): Promise<string> {
    // Implementation optimized for memory usage
  }
}
```

---

## 0.5.2 Nand2Tetris Testing Infrastructure

**Requirements:** Execute .tst test scripts and compare against .cmp expected outputs.

**Scalability Considerations:**
- Support test suites with 1000+ test cases
- Memory-efficient comparison of large output files
- Parallel test execution where possible

**Implementation:**

```typescript
// src/core/testing/nand2tetris/types.ts
export interface Nand2TetrisTestScript {
  loadCommand: { chipName: string; hdlFile: string };
  outputFile: string;
  compareToFile: string;
  outputList: Array<{ pinName: string; format: string }>;
  testSteps: Array<{
    type: 'set' | 'eval' | 'output' | 'tick' | 'tock';
    pin?: string;
    value?: boolean;
  }>;
}

export interface Nand2TetrisTestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failures: TestFailure[];
  executionTime: number;
  memoryUsage: number;
}

// src/core/testing/nand2tetris/engine.ts
export class Nand2TetrisTestEngine {
  // Optimized for large test suites
  async runTestSuite(
    circuit: CircuitDocument,
    script: Nand2TetrisTestScript,
    options: { timeout?: number; maxMemory?: number } = {}
  ): Promise<Nand2TetrisTestResult> {
    const startTime = performance.now();
    const startMemory = performance.memory?.usedJSHeapSize || 0;

    // Implementation with performance monitoring and memory limits

    const endTime = performance.now();
    const endMemory = performance.memory?.usedJSHeapSize || 0;

    return {
      success: failures.length === 0,
      totalTests: script.testSteps.length,
      passedTests: script.testSteps.length - failures.length,
      failures,
      executionTime: endTime - startTime,
      memoryUsage: endMemory - startMemory
    };
  }
}
```

---

## 0.5.3 Sequential Logic & Memory Components

**Requirements:** Support clocked components (DFF, Register, RAM) for sequential logic.

**Performance Considerations:**
- Clock signal propagation must be deterministic
- Memory components must scale to 16K+ words
- State persistence without memory leaks

**Implementation:**

```typescript
// src/core/gates/types.ts - Enhanced for performance
export interface GateDefinition {
  type: GateType;
  name: string;
  description: string;
  inputs: PinDefinition[];
  outputs: PinDefinition[];

  // Core evaluation - optimized for performance
  evaluate: (
    inputs: Record<string, boolean>,
    currentState?: Record<string, boolean>
  ) => Record<string, boolean>;

  // Sequential logic support
  clocked?: boolean;
  internalStateKeys?: string[];
  onClockEdge?: (
    currentInputs: Record<string, boolean>,
    currentState: Record<string, boolean>,
    edge: 'rising' | 'falling'
  ) => { newOutputs: Record<string, boolean>; newState: Record<string, boolean> };

  // Performance metadata
  estimatedDelay?: number; // nanoseconds
  powerConsumption?: number; // microwatts
}

// src/core/gates/sequential/DFF.ts
export const DFF_GATE_DEFINITION: GateDefinition = {
  type: 'dff',
  name: 'D Flip-Flop',
  description: 'Data Flip-Flop, stores 1 bit on rising clock edge',
  inputs: [
    { id: 'in' as PinId, name: 'in', type: 'input' },
    { id: 'load' as PinId, name: 'load', type: 'input' },
    { id: 'clock' as PinId, name: 'clock', type: 'input' },
  ],
  outputs: [
    { id: 'out' as PinId, name: 'out', type: 'output' },
  ],
  clocked: true,
  internalStateKeys: ['q'],
  estimatedDelay: 5, // 5ns typical DFF delay

  evaluate: ({ in: inputData, load, clock }, currentState) => {
    return { out: currentState?.q ?? false };
  },

  onClockEdge: ({ in: inputData, load }, currentState, edge) => {
    let newQ = currentState?.q ?? false;
    if (edge === 'rising' && load) {
      newQ = inputData;
    }
    return {
      newOutputs: { out: newQ },
      newState: { q: newQ }
    };
  },

  truthTable: [], // DFF truth table is state-dependent
  symbol: 'D',
};
```

---

## 0.5.4 Memory System Architecture

**Scalability Requirements:**
- RAM16K must support 16,384 16-bit words
- Sparse storage for unused memory locations
- Efficient read/write operations

**Implementation:**

```typescript
// src/core/gates/sequential/memory.ts
export interface MemorySystem {
  size: number; // Total words
  wordSize: number; // Bits per word
  read(address: number): number;
  write(address: number, value: number): void;
  clear(): void;
  getMemoryUsage(): number; // Bytes used
}

// Sparse memory implementation for efficiency
export class SparseMemory implements MemorySystem {
  private data = new Map<number, number>();
  private accessCount = 0;

  constructor(public size: number, public wordSize: number = 16) {}

  read(address: number): number {
    this.validateAddress(address);
    this.accessCount++;
    return this.data.get(address) ?? 0;
  }

  write(address: number, value: number): void {
    this.validateAddress(address);
    this.validateValue(value);
    this.accessCount++;

    if (value === 0) {
      this.data.delete(address); // Sparse storage
    } else {
      this.data.set(address, value);
    }
  }

  clear(): void {
    this.data.clear();
    this.accessCount = 0;
  }

  getMemoryUsage(): number {
    // Estimate memory usage: Map overhead + entries
    return 64 + (this.data.size * (4 + 4 + 16)); // Rough estimate
  }

  private validateAddress(address: number): void {
    if (address < 0 || address >= this.size) {
      throw new Error(`Invalid address: ${address}`);
    }
  }

  private validateValue(value: number): void {
    const maxValue = (1 << this.wordSize) - 1;
    if (value < 0 || value > maxValue) {
      throw new Error(`Invalid value: ${value}`);
    }
  }
}
```

---

## 0.5.5 Phase 0.5 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Design HDL parser/generator | 8h | - | <100ms parse time | HDL spec complete |
| Implement HDL parser | 16h | Design | <50MB memory usage | All nand2tetris .hdl files parse |
| Implement HDL generator | 12h | Parser | <50MB memory usage | Round-trip HDL accuracy |
| Design test script format | 4h | - | - | Test script spec complete |
| Implement .tst parser | 12h | Format | <100ms parse time | All official .tst files parse |
| Implement .cmp comparator | 8h | Parser | <10MB memory usage | Accurate comparison results |
| Implement test execution engine | 16h | Parser | <16ms per test | 100% nand2tetris compatibility |
| Integrate test engine as analyzer | 4h | Engine | <5MB overhead | Plugin system integration |
| Define sequential logic types | 4h | - | - | Type system complete |
| Implement DFF gate | 8h | Types | <1ms evaluation | Correct clock behavior |
| Implement Register (16-bit) | 12h | DFF | <5ms evaluation | Full register functionality |
| Implement RAM (RAM16K) | 24h | Register | <50MB memory | Sparse storage working |
| Implement Screen/Keyboard I/O | 16h | RAM | <10ms I/O | Memory-mapped I/O functional |
| Implement clock signal in simulation | 8h | Sequential | <1ms per clock cycle | Deterministic timing |
| Design composite gate mechanism | 6h | - | - | Hierarchy system designed |
| Implement composite gate expansion | 10h | Design | <100ms expansion | ALU composite working |
| Implement ALU (composite chip) | 20h | Expansion | <50ms evaluation | nand2tetris ALU spec compliant |
| Define basic CPU architecture | 12h | ALU | <100ms evaluation | Hack CPU functional |
| Update API for Nand2Tetris formats | 4h | All | <5MB API surface | Public API complete |
| Documentation for Nand2Tetris features | 8h | All | - | Complete user documentation |

**Total Estimated Effort:** ~200 hours (5 weeks with 1 developer)  
**Performance Budget:** <16ms simulation for 1000-gate circuits, <100MB memory usage  
**Quality Gates:** 100% nand2tetris test suite compatibility, all HDL files parse correctly

---

## Risk Mitigation

**Performance Bottlenecks:** HDL parsing and memory systems are optimized from the start with performance monitoring.

**Nand2Tetris Compatibility:** Official test suites used as validation, ensuring 100% compatibility.

**Sequential Logic Complexity:** Incremental implementation with thorough testing at each step.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 0: Critical Fixes](phase-0-critical-fixes.md)  
**Next:** [Phase 1: Core Architecture](phase-1-core-architecture.md)
