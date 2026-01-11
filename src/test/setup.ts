import '@testing-library/jest-dom'

// Mock WebGL context for Three.js tests
const originalGetContext = HTMLCanvasElement.prototype.getContext

// Mock WebGL context for Three.js unit tests
// Note: This only affects Vitest unit tests, not Playwright E2E tests
HTMLCanvasElement.prototype.getContext = function (
  type: string,
  ...args: unknown[]
) {
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
    } as RenderingContext
  }
  return originalGetContext.apply(this, [type, ...args] as Parameters<typeof originalGetContext>)
}
