import '@testing-library/jest-dom'

// Polyfill ResizeObserver for jsdom (used by Radix UI primitives)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
}

// Polyfill DOMRect for jsdom (used by Radix Popper / Tooltip positioning)
if (typeof globalThis.DOMRect === 'undefined') {
  globalThis.DOMRect = class DOMRect {
    constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
    get top() { return this.y }
    get right() { return this.x + this.width }
    get bottom() { return this.y + this.height }
    get left() { return this.x }
    toJSON() { return this }
    static fromRect(rect?: { x?: number; y?: number; width?: number; height?: number }) {
      return new DOMRect(rect?.x ?? 0, rect?.y ?? 0, rect?.width ?? 0, rect?.height ?? 0)
    }
  } as unknown as typeof DOMRect
}

// Mock WebGL context for Three.js tests
const originalGetContext = HTMLCanvasElement.prototype.getContext

// Mock WebGL context for Three.js unit tests
// Note: This only affects Vitest unit tests, not Playwright E2E tests
HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  type: string,
  ...args: unknown[]
): RenderingContext | null {
  if (type === 'webgl' || type === 'webgl2') {
    // Return a partial mock of WebGLRenderingContext for testing
    // The mock implements only the methods needed by Three.js tests
    return {
      canvas: this,
      getExtension: () => null,
      getParameter: () => 0,
      getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => true,
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      getProgramParameter: () => true,
      useProgram: () => {},
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      enable: () => {},
      disable: () => {},
      depthFunc: () => {},
      depthMask: () => {},
      blendFunc: () => {},
      viewport: () => {},
      clear: () => {},
      clearColor: () => {},
      clearDepth: () => {},
      drawArrays: () => {},
      drawElements: () => {},
      getUniformLocation: () => ({}),
      getAttribLocation: () => 0,
      enableVertexAttribArray: () => {},
      vertexAttribPointer: () => {},
      uniform1f: () => {},
      uniform1i: () => {},
      uniform2f: () => {},
      uniform3f: () => {},
      uniform4f: () => {},
      uniformMatrix4fv: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      activeTexture: () => {},
      createFramebuffer: () => ({}),
      bindFramebuffer: () => {},
      framebufferTexture2D: () => {},
      checkFramebufferStatus: () => 36053,
      deleteShader: () => {},
      deleteProgram: () => {},
      deleteBuffer: () => {},
      deleteTexture: () => {},
      deleteFramebuffer: () => {},
      pixelStorei: () => {},
      generateMipmap: () => {},
      cullFace: () => {},
      frontFace: () => {},
      scissor: () => {},
      colorMask: () => {},
      stencilFunc: () => {},
      stencilOp: () => {},
      stencilMask: () => {},
      clearStencil: () => {},
      polygonOffset: () => {},
      lineWidth: () => {},
      flush: () => {},
      finish: () => {},
      readPixels: () => {},
      getContextAttributes: () => ({}),
      isContextLost: () => false,
      getSupportedExtensions: () => [],
      drawingBufferWidth: 300,
      drawingBufferHeight: 150,
    } as unknown as RenderingContext
  }
  return originalGetContext.apply(this, [type, ...args] as Parameters<typeof originalGetContext>) as RenderingContext | null
} as unknown as typeof HTMLCanvasElement.prototype.getContext
