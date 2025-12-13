# Phase 15: Mobile & Touch Optimization (Weeks 44-45)

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Priority:** 🟡 MEDIUM  
**Timeline:** Weeks 44-45  
**Dependencies:** Phase 9 complete (design system with responsive components)

---

## Overview

This phase optimizes Nand2Fun for mobile devices and touch interactions, ensuring the circuit design experience works seamlessly on phones and tablets. It implements touch gestures, responsive layouts, and mobile-specific optimizations while maintaining full functionality.

**Exit Criteria:**
- Circuit design fully functional on mobile devices
- Touch gestures intuitive and responsive
- Responsive design works across all screen sizes
- Performance optimized for mobile hardware constraints
- Touch accessibility meets WCAG touch target requirements

---

## 15.1 Touch Gesture Implementation

**Requirements:** Intuitive touch interactions for circuit manipulation on mobile devices.

### Touch Gesture System

```typescript
// src/interactions/touch/gesture-manager.ts
export interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'pan' | 'pinch' | 'rotate' | 'swipe';
  target: HTMLElement;
  position: { x: number; y: number };
  delta?: { x: number; y: number };
  scale?: number;
  rotation?: number;
  velocity?: { x: number; y: number };
  duration?: number;
}

export interface GestureOptions {
  enablePinch?: boolean;
  enableRotate?: boolean;
  enablePan?: boolean;
  minPointers?: number;
  maxPointers?: number;
  threshold?: number;
}

export class TouchGestureManager {
  private element: HTMLElement;
  private options: Required<GestureOptions>;
  private touchStartTime = 0;
  private touchStartPos = { x: 0, y: 0 };
  private lastTouchPos = { x: 0, y: 0 };
  private touchCount = 0;
  private gestureStartDistance = 0;
  private gestureStartAngle = 0;

  constructor(element: HTMLElement, options: GestureOptions = {}) {
    this.element = element;
    this.options = {
      enablePinch: true,
      enableRotate: true,
      enablePan: true,
      minPointers: 1,
      maxPointers: 2,
      threshold: 10,
      ...options,
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });

    // Prevent default behaviors that interfere with gestures
    this.element.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    this.element.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    this.element.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
  }

  private handleTouchStart = (event: TouchEvent): void => {
    const touches = event.touches;

    if (touches.length < this.options.minPointers ||
        touches.length > this.options.maxPointers) {
      return;
    }

    this.touchCount = touches.length;
    this.touchStartTime = Date.now();

    if (touches.length === 1) {
      // Single touch
      const touch = touches[0];
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      this.lastTouchPos = { ...this.touchStartPos };
    } else if (touches.length === 2) {
      // Multi-touch
      const touch1 = touches[0];
      const touch2 = touches[1];

      this.gestureStartDistance = this.getDistance(touch1, touch2);
      this.gestureStartAngle = this.getAngle(touch1, touch2);
    }

    // Prevent default to avoid scrolling/zooming
    event.preventDefault();
  };

  private handleTouchMove = (event: TouchEvent): void => {
    const touches = event.touches;

    if (touches.length !== this.touchCount) return;

    if (touches.length === 1 && this.options.enablePan) {
      // Single touch pan
      const touch = touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const delta = {
        x: currentPos.x - this.lastTouchPos.x,
        y: currentPos.y - this.lastTouchPos.y,
      };

      this.emitGesture({
        type: 'pan',
        target: this.element,
        position: currentPos,
        delta,
      });

      this.lastTouchPos = currentPos;
    } else if (touches.length === 2) {
      // Multi-touch gestures
      const touch1 = touches[0];
      const touch2 = touches[1];

      if (this.options.enablePinch) {
        const currentDistance = this.getDistance(touch1, touch2);
        const scale = currentDistance / this.gestureStartDistance;

        this.emitGesture({
          type: 'pinch',
          target: this.element,
          position: this.getCenter(touch1, touch2),
          scale,
        });
      }

      if (this.options.enableRotate) {
        const currentAngle = this.getAngle(touch1, touch2);
        const rotation = currentAngle - this.gestureStartAngle;

        this.emitGesture({
          type: 'rotate',
          target: this.element,
          position: this.getCenter(touch1, touch2),
          rotation,
        });
      }
    }

    event.preventDefault();
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    const touches = event.changedTouches;
    const duration = Date.now() - this.touchStartTime;

    if (touches.length === 1) {
      const touch = touches[0];
      const endPos = { x: touch.clientX, y: touch.clientY };
      const distance = this.getDistance(
        { clientX: this.touchStartPos.x, clientY: this.touchStartPos.y },
        { clientX: endPos.x, clientY: endPos.y }
      );

      // Determine gesture type based on duration and distance
      if (duration < 300 && distance < this.options.threshold) {
        // Quick tap
        if (duration < 200) {
          this.emitGesture({
            type: 'tap',
            target: this.element,
            position: endPos,
          });
        } else {
          // Long press
          this.emitGesture({
            type: 'long-press',
            target: this.element,
            position: endPos,
            duration,
          });
        }
      } else if (distance > this.options.threshold) {
        // Swipe
        const velocity = {
          x: (endPos.x - this.touchStartPos.x) / duration,
          y: (endPos.y - this.touchStartPos.y) / duration,
        };

        this.emitGesture({
          type: 'swipe',
          target: this.element,
          position: endPos,
          delta: {
            x: endPos.x - this.touchStartPos.x,
            y: endPos.y - this.touchStartPos.y,
          },
          velocity,
          duration,
        });
      }
    }

    this.touchCount = event.touches.length;
    event.preventDefault();
  };

  private handleTouchCancel = (event: TouchEvent): void => {
    // Reset gesture state
    this.touchCount = 0;
    this.gestureStartDistance = 0;
    this.gestureStartAngle = 0;
  };

  private emitGesture(gesture: TouchGesture): void {
    // Emit custom event
    const customEvent = new CustomEvent('gesture', {
      detail: gesture,
      bubbles: true,
    });

    this.element.dispatchEvent(customEvent);
  }

  // Utility methods
  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAngle(touch1: Touch, touch2: Touch): number {
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    );
  }

  private getCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }
}
```

### Circuit Touch Interactions

```typescript
// src/components/CircuitCanvas/TouchCircuitCanvas.tsx
import { useEffect, useRef } from 'react';
import { TouchGestureManager, TouchGesture } from '../../interactions/touch/gesture-manager';

interface TouchCircuitCanvasProps {
  circuit: CircuitDocument;
  onGateSelect: (gateId: string) => void;
  onGateMove: (gateId: string, position: Position3D) => void;
  onCanvasPan: (delta: { x: number; y: number }) => void;
  onCanvasZoom: (scale: number, center: { x: number; y: number }) => void;
  selectedGateId?: string;
}

export function TouchCircuitCanvas({
  circuit,
  onGateSelect,
  onGateMove,
  onCanvasPan,
  onCanvasZoom,
  selectedGateId,
}: TouchCircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureManagerRef = useRef<TouchGestureManager | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize gesture manager
    gestureManagerRef.current = new TouchGestureManager(canvasRef.current, {
      enablePinch: true,
      enableRotate: false, // Circuit rotation not typically needed
      enablePan: true,
      minPointers: 1,
      maxPointers: 2,
    });

    const handleGesture = (event: CustomEvent<TouchGesture>) => {
      const gesture = event.detail;
      handleTouchGesture(gesture);
    };

    canvasRef.current.addEventListener('gesture', handleGesture as EventListener);

    return () => {
      if (gestureManagerRef.current) {
        gestureManagerRef.current.destroy();
      }
      canvasRef.current?.removeEventListener('gesture', handleGesture as EventListener);
    };
  }, []);

  const handleTouchGesture = (gesture: TouchGesture) => {
    switch (gesture.type) {
      case 'tap':
        handleTap(gesture);
        break;

      case 'long-press':
        handleLongPress(gesture);
        break;

      case 'pan':
        handlePan(gesture);
        break;

      case 'pinch':
        handlePinch(gesture);
        break;

      case 'swipe':
        handleSwipe(gesture);
        break;
    }
  };

  const handleTap = (gesture: TouchGesture) => {
    // Find gate at tap position
    const gate = findGateAtPosition(gesture.position);
    if (gate) {
      onGateSelect(gate.id);
    } else {
      // Deselect if tapping empty space
      onGateSelect('');
    }
  };

  const handleLongPress = (gesture: TouchGesture) => {
    // Show context menu or gate options
    const gate = findGateAtPosition(gesture.position);
    if (gate) {
      showGateContextMenu(gate, gesture.position);
    }
  };

  const handlePan = (gesture: TouchGesture) => {
    if (selectedGateId && gesture.delta) {
      // Move selected gate
      const gate = circuit.gates.find(g => g.id === selectedGateId);
      if (gate) {
        const newPosition: Position3D = [
          gate.position[0] + gesture.delta.x,
          gate.position[1] + gesture.delta.y,
          gate.position[2],
        ];
        onGateMove(selectedGateId, newPosition);
      }
    } else if (gesture.delta) {
      // Pan canvas
      onCanvasPan(gesture.delta);
    }
  };

  const handlePinch = (gesture: TouchGesture) => {
    if (gesture.scale) {
      onCanvasZoom(gesture.scale, gesture.position);
    }
  };

  const handleSwipe = (gesture: TouchGesture) => {
    // Quick swipe gestures for navigation
    if (gesture.velocity && Math.abs(gesture.velocity.x) > 500) {
      // Fast horizontal swipe - could navigate between circuit sections
      navigateCircuitSection(gesture.velocity.x > 0 ? 'left' : 'right');
    }
  };

  const findGateAtPosition = (position: { x: number; y: number }) => {
    // Convert screen coordinates to circuit coordinates
    // Implementation depends on canvas scaling and positioning
    return circuit.gates.find(gate => {
      // Check if position is within gate bounds
      // This is a simplified check - real implementation would be more complex
      return false; // Placeholder
    });
  };

  const showGateContextMenu = (gate: GateInstance, position: { x: number; y: number }) => {
    // Show mobile-friendly context menu
    // Could use a bottom sheet or floating action menu
  };

  const navigateCircuitSection = (direction: 'left' | 'right') => {
    // Navigate between different parts of large circuits
  };

  return (
    <canvas
      ref={canvasRef}
      className="touch-circuit-canvas"
      style={{
        touchAction: 'none', // Prevent default touch behaviors
        userSelect: 'none',
      }}
      width={window.innerWidth}
      height={window.innerHeight}
    />
  );
}
```

---

## 15.2 Responsive Design System

**Requirements:** Circuit design interface that works seamlessly across all device sizes.

### Mobile-First Responsive Components

```typescript
// src/components/layout/ResponsiveContainer.tsx
import { useEffect, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large-desktop';
export type Orientation = 'portrait' | 'landscape';

interface ResponsiveState {
  deviceType: DeviceType;
  orientation: Orientation;
  screenSize: { width: number; height: number };
  isTouchDevice: boolean;
  pixelRatio: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    deviceType: 'desktop',
    orientation: 'landscape',
    screenSize: { width: window.innerWidth, height: window.innerHeight },
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    pixelRatio: window.devicePixelRatio || 1,
  });

  useEffect(() => {
    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let deviceType: DeviceType;
      if (width < 640) deviceType = 'mobile';
      else if (width < 1024) deviceType = 'tablet';
      else if (width < 1440) deviceType = 'desktop';
      else deviceType = 'large-desktop';

      const orientation: Orientation = height > width ? 'portrait' : 'landscape';

      setState({
        deviceType,
        orientation,
        screenSize: { width, height },
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        pixelRatio: window.devicePixelRatio || 1,
      });
    };

    window.addEventListener('resize', updateResponsiveState);
    window.addEventListener('orientationchange', updateResponsiveState);

    return () => {
      window.removeEventListener('resize', updateResponsiveState);
      window.removeEventListener('orientationchange', updateResponsiveState);
    };
  }, []);

  return state;
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  breakpoints?: {
    mobile?: React.ReactNode;
    tablet?: React.ReactNode;
    desktop?: React.ReactNode;
    largeDesktop?: React.ReactNode;
  };
}

export function ResponsiveContainer({ children, breakpoints }: ResponsiveContainerProps) {
  const { deviceType } = useResponsive();

  // Use device-specific content if provided
  if (breakpoints) {
    switch (deviceType) {
      case 'mobile':
        return breakpoints.mobile || children;
      case 'tablet':
        return breakpoints.tablet || breakpoints.mobile || children;
      case 'desktop':
        return breakpoints.desktop || children;
      case 'large-desktop':
        return breakpoints.largeDesktop || breakpoints.desktop || children;
    }
  }

  return <>{children}</>;
}
```

### Mobile Circuit Interface

```typescript
// src/components/CircuitEditor/MobileCircuitEditor.tsx
import { useResponsive } from '../layout/ResponsiveContainer';
import { TouchCircuitCanvas } from '../CircuitCanvas/TouchCircuitCanvas';
import { MobileToolbar } from './MobileToolbar';
import { MobileGatePalette } from './MobileGatePalette';

export function MobileCircuitEditor({ circuit }: { circuit: CircuitDocument }) {
  const { deviceType, orientation } = useResponsive();

  const isMobile = deviceType === 'mobile';
  const isPortrait = orientation === 'portrait';

  return (
    <div className={`mobile-circuit-editor ${isPortrait ? 'portrait' : 'landscape'}`}>
      {/* Mobile-optimized toolbar */}
      <MobileToolbar
        circuit={circuit}
        position={isPortrait ? 'top' : 'left'}
      />

      {/* Main circuit canvas */}
      <div className="mobile-canvas-container">
        <TouchCircuitCanvas
          circuit={circuit}
          onGateSelect={(gateId) => {/* handle selection */}}
          onGateMove={(gateId, position) => {/* handle movement */}}
          onCanvasPan={(delta) => {/* handle panning */}}
          onCanvasZoom={(scale, center) => {/* handle zooming */}}
        />

        {/* Touch hints for new users */}
        {isMobile && (
          <div className="touch-hints">
            <div className="hint">👆 Tap to select gates</div>
            <div className="hint">👆👆 Double tap to zoom</div>
            <div className="hint">🖐️ Pinch to zoom in/out</div>
            <div className="hint">👆 Long press for options</div>
          </div>
        )}
      </div>

      {/* Mobile gate palette */}
      <MobileGatePalette
        position={isPortrait ? 'bottom' : 'right'}
        onGateAdd={(gateType) => {/* handle gate addition */}}
      />

      {/* Mobile-specific circuit controls */}
      <div className="mobile-circuit-controls">
        <button className="mobile-control-btn">🔄 Reset View</button>
        <button className="mobile-control-btn">🎯 Center Circuit</button>
        <button className="mobile-control-btn">📏 Fit to Screen</button>
      </div>
    </div>
  );
}
```

### Mobile Toolbar and Controls

```typescript
// src/components/CircuitEditor/MobileToolbar.tsx
import { useState } from 'react';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';

interface MobileToolbarProps {
  circuit: CircuitDocument;
  position: 'top' | 'left' | 'right';
}

export function MobileToolbar({ circuit, position }: MobileToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toolbarItems = [
    { icon: '💾', label: 'Save', action: () => {/* save circuit */} },
    { icon: '📤', label: 'Export', action: () => {/* export circuit */} },
    { icon: '🔄', label: 'Simulate', action: () => {/* run simulation */} },
    { icon: '⚙️', label: 'Settings', action: () => {/* open settings */} },
  ];

  return (
    <ResponsiveContainer>
      <div className={`mobile-toolbar ${position} ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {!isExpanded ? (
          // Collapsed state - show main actions
          <div className="toolbar-actions">
            {toolbarItems.slice(0, 3).map((item, index) => (
              <button
                key={index}
                className="toolbar-btn"
                onClick={item.action}
                aria-label={item.label}
              >
                {item.icon}
              </button>
            ))}
            <button
              className="toolbar-btn expand-btn"
              onClick={() => setIsExpanded(true)}
              aria-label="More options"
            >
              ⋯
            </button>
          </div>
        ) : (
          // Expanded state - show all actions
          <div className="toolbar-expanded">
            <div className="toolbar-header">
              <h3>Circuit Tools</h3>
              <button
                className="close-btn"
                onClick={() => setIsExpanded(false)}
                aria-label="Close toolbar"
              >
                ✕
              </button>
            </div>

            <div className="toolbar-grid">
              {toolbarItems.map((item, index) => (
                <button
                  key={index}
                  className="toolbar-grid-btn"
                  onClick={() => {
                    item.action();
                    setIsExpanded(false);
                  }}
                >
                  <span className="btn-icon">{item.icon}</span>
                  <span className="btn-label">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Circuit stats for mobile */}
            <div className="circuit-stats">
              <div className="stat">
                <span className="stat-value">{circuit.gates.length}</span>
                <span className="stat-label">Gates</span>
              </div>
              <div className="stat">
                <span className="stat-value">{circuit.wires.length}</span>
                <span className="stat-label">Wires</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveContainer>
  );
}
```

---

## 15.3 Touch Accessibility & WCAG Compliance

**Requirements:** Touch targets meet WCAG accessibility guidelines and provide appropriate feedback.

### Touch Target Sizing

```typescript
// src/styles/touch-targets.css
/* WCAG AA compliant touch targets */

/* Minimum touch target size: 44x44px (44px = 2.75rem at 16px base) */
.touch-target {
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* For smaller screens, maintain minimum size */
@media (max-width: 640px) {
  .touch-target {
    min-width: 3rem;  /* 48px on mobile */
    min-height: 3rem;
  }
}

/* Circuit elements need larger touch targets */
.circuit-gate {
  min-width: 3.5rem;
  min-height: 3.5rem;
  touch-action: none; /* Prevent scrolling when interacting */
}

/* Wire connection points */
.wire-connection {
  min-width: 2rem;
  min-height: 2rem;
  border-radius: 50%;
}

/* Touch feedback */
.touch-feedback {
  transition: all 0.1s ease-in-out;
}

.touch-feedback:active {
  transform: scale(0.95);
  opacity: 0.8;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .touch-target {
    border: 2px solid currentColor;
  }

  .circuit-gate {
    border: 3px solid currentColor;
    border-radius: 4px;
  }
}
```

### Touch Feedback and Haptics

```typescript
// src/interactions/touch/haptic-feedback.ts
export class HapticFeedback {
  static readonly SUPPORTED = 'vibrate' in navigator;

  static tap(): void {
    if (this.SUPPORTED) {
      navigator.vibrate(10); // Short vibration for taps
    }
  }

  static longPress(): void {
    if (this.SUPPORTED) {
      navigator.vibrate([50, 30, 50]); // Pattern for long press
    }
  }

  static success(): void {
    if (this.SUPPORTED) {
      navigator.vibrate([20, 20, 20, 20, 100]); // Success pattern
    }
  }

  static error(): void {
    if (this.SUPPORTED) {
      navigator.vibrate([100, 50, 100, 50, 100]); // Error pattern
    }
  }

  static gatePlaced(): void {
    if (this.SUPPORTED) {
      navigator.vibrate(30); // Medium feedback for gate placement
    }
  }

  static connectionMade(): void {
    if (this.SUPPORTED) {
      navigator.vibrate([15, 15, 15]); // Light pattern for connections
    }
  }
}

// src/hooks/useTouchFeedback.ts
import { HapticFeedback } from '../interactions/touch/haptic-feedback';

export function useTouchFeedback() {
  const provideFeedback = (type: keyof typeof HapticFeedback) => {
    if (typeof HapticFeedback[type] === 'function') {
      (HapticFeedback[type] as () => void)();
    }
  };

  const tapFeedback = () => HapticFeedback.tap();
  const successFeedback = () => HapticFeedback.success();
  const errorFeedback = () => HapticFeedback.error();
  const gatePlacedFeedback = () => HapticFeedback.gatePlaced();
  const connectionFeedback = () => HapticFeedback.connectionMade();

  return {
    provideFeedback,
    tapFeedback,
    successFeedback,
    errorFeedback,
    gatePlacedFeedback,
    connectionFeedback,
  };
}
```

### Mobile Keyboard Handling

```typescript
// src/hooks/useMobileKeyboard.ts
import { useEffect, useState } from 'react';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  animationDuration: number;
}

export function useMobileKeyboard(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    animationDuration: 300,
  });

  useEffect(() => {
    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    let keyboardShowTimeout: number;

    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const currentHeight = viewport.height;
      const heightDifference = initialViewportHeight - currentHeight;

      // Consider keyboard visible if height difference is significant
      const isKeyboardVisible = heightDifference > 150; // Adjust threshold as needed

      if (isKeyboardVisible && !keyboardState.isVisible) {
        // Keyboard is showing
        clearTimeout(keyboardShowTimeout);
        keyboardShowTimeout = window.setTimeout(() => {
          setKeyboardState({
            isVisible: true,
            height: heightDifference,
            animationDuration: 300,
          });
        }, 100); // Debounce to avoid false positives
      } else if (!isKeyboardVisible && keyboardState.isVisible) {
        // Keyboard is hiding
        setKeyboardState(prev => ({
          ...prev,
          isVisible: false,
        }));

        // Reset initial height after keyboard hides
        setTimeout(() => {
          initialViewportHeight = viewport.height;
        }, 300);
      }
    };

    const handleResize = () => {
      // Fallback for browsers without visualViewport
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;

      if (heightDifference > 150) {
        setKeyboardState(prev => ({
          ...prev,
          isVisible: true,
          height: heightDifference,
        }));
      } else {
        setKeyboardState(prev => ({
          ...prev,
          isVisible: false,
        }));
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => window.visualViewport?.removeEventListener('resize', handleViewportChange);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [keyboardState.isVisible]);

  return keyboardState;
}

// Usage in components
export function MobileForm() {
  const { isVisible, height } = useMobileKeyboard();

  return (
    <div
      className={`mobile-form ${isVisible ? 'keyboard-visible' : ''}`}
      style={{
        paddingBottom: isVisible ? `${height}px` : '0',
        transition: `padding-bottom 300ms ease-in-out`,
      }}
    >
      {/* Form content */}
    </div>
  );
}
```

---

## 15.4 Phase 15 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Touch gesture system design | 6h | Phase 9 complete | <16ms gesture response | Gesture architecture complete |
| Touch gesture implementation | 10h | Gesture design | <8ms touch processing | All gesture types working |
| Circuit touch interactions | 12h | Touch gestures | <16ms circuit updates | Touch circuit editing functional |
| Mobile circuit interface | 8h | Circuit touch | - | Mobile-optimized UI complete |
| Responsive design system | 6h | Mobile interface | - | All breakpoints working |
| Touch target sizing | 4h | Responsive design | - | WCAG AA compliant touch targets |
| Touch feedback & haptics | 6h | Touch targets | <50ms feedback delay | Haptic feedback implemented |
| Mobile keyboard handling | 6h | Touch feedback | - | Virtual keyboard support working |
| Mobile performance optimization | 8h | Keyboard handling | <2s mobile load time | Mobile performance optimized |
| Touch accessibility testing | 6h | Performance opt | - | Touch a11y WCAG compliant |
| Mobile E2E testing | 8h | Touch a11y | - | Mobile test suite passing |
| Cross-device compatibility | 6h | Mobile E2E | - | iOS/Android/Tablet support |
| Mobile documentation | 4h | Cross-device | - | Mobile UX guidelines documented |

**Total Estimated Effort:** ~90 hours (4.5 weeks with 1 developer)  
**Performance Budget:** <16ms touch response, <2s mobile load time, <50ms haptic feedback  
**Quality Gates:** Circuit design fully functional on mobile, touch targets meet WCAG AA, cross-device compatibility verified

---

## Risk Mitigation

**Touch Gesture Complexity:** Start with basic gestures and progressively add advanced multi-touch interactions with thorough testing.

**Mobile Performance Issues:** Implement performance monitoring specifically for mobile devices and optimize based on real metrics.

**Cross-Device Fragmentation:** Test extensively on actual devices rather than just emulators, focusing on iOS Safari and Android Chrome.

**Touch Target Accessibility:** Design with accessibility in mind from the start, ensuring minimum target sizes are maintained across all screen densities.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 14: Security & Privacy](phase-14-security-privacy.md)  
**Next:** [Phase 16: Advanced Collaboration Features](phase-16-advanced-collaboration.md)
