/**
 * UI Element Selectors
 *
 * Centralized data-testid selectors for the new shadcn-based UI shell.
 * Each shell component must expose the matching data-testid attribute
 * (audit script: rg "data-testid=\"<id>\"" src/components/).
 *
 * Phase E (chunk 9) replaced the prior text-based + class-based selectors
 * that targeted the deleted Ant Sidebar/GateSelector/etc.
 */

import type { GateType } from '@/store/types'

export const UI_SELECTORS = {
  canvas: 'canvas',

  toolbar: {
    root: '[data-testid="compact-toolbar"]',
    gatesTrigger: '[data-testid="toolbar-gates-trigger"]',
    ioTrigger: '[data-testid="toolbar-io-trigger"]',
    simToggle: '[data-testid="toolbar-sim-toggle"]',
    axesToggle: '[data-testid="toolbar-axes-toggle"]',
    deleteSelected: '[data-testid="toolbar-delete-selected"]',
    clearAll: '[data-testid="toolbar-clear-all"]',
    themeTrigger: '[data-testid="toolbar-theme-trigger"]',
    themeOption: (id: 'light' | 'dark' | 'system') => `[data-testid="toolbar-theme-${id}"]`,
    githubLink: '[data-testid="toolbar-github-link"]',
    version: '[data-testid="toolbar-version"]',
    settings: '[data-testid="toolbar-settings"]',
  },

  // Inside the open Gates popover
  gatesPopover: {
    root: '[data-testid="gates-popover"]',
    getGate: (type: GateType) => `[data-testid="gate-button-${type}"]`,
  },

  // Inside the open I/O popover
  ioPopover: {
    root: '[data-testid="io-popover"]',
    input: '[data-testid="io-button-input"]',
    output: '[data-testid="io-button-output"]',
    junction: '[data-testid="io-button-junction"]',
  },

  rightBar: {
    root: '[data-testid="right-action-bar"]',
    infoTrigger: '[data-testid="right-bar-info-trigger"]',
    layersTrigger: '[data-testid="right-bar-layers-trigger"]',
    historyTrigger: '[data-testid="right-bar-history-trigger"]',
    drawer: '[data-testid="right-bar-drawer"]',
    closeDrawer: '[data-testid="right-bar-drawer-close"]',
    undo: '[data-testid="right-bar-undo"]',
    redo: '[data-testid="right-bar-redo"]',
    find: '[data-testid="right-bar-find"]',
    maximize: '[data-testid="right-bar-maximize"]',
  },

  infoPanel: {
    root: '[data-testid="info-panel"]',
    statusPill: '[data-testid="info-status-pill"]',
    gatesCount: '[data-testid="info-stat-gates"]',
    wiresCount: '[data-testid="info-stat-wires"]',
    inputsCount: '[data-testid="info-stat-inputs"]',
    outputsCount: '[data-testid="info-stat-outputs"]',
  },

  layersPanel: '[data-testid="layers-panel"]',
  historyPanel: '[data-testid="history-panel"]',

  propertiesPanel: {
    root: '[data-testid="properties-panel"]',
    typeLabel: '[data-testid="properties-type-label"]',
    nameField: '[data-testid="properties-name-field"]',
    deleteButton: '[data-testid="properties-delete"]',
    closeButton: '[data-testid="properties-close"]',
    duplicate: '[data-testid="properties-duplicate"]',
    wireConnections: '[data-testid="properties-wire-connections"]',
  },

  helpBar: {
    root: '[data-testid="help-bar"]',
    expandButton: '[data-testid="help-bar-expand-button"]',
    allShortcutsButton: '[data-testid="help-bar-all-shortcuts"]',
  },

  shortcutsModal: '[data-testid="shortcuts-modal"]',
  shortcutsTab: (name: string) => `[data-testid="shortcuts-tab-${name}"]`,

  statusBar: '[data-testid="status-bar"]',
  statusText: '[data-testid="status-text"]',

  demoOverlay: '[data-testid="demo-overlay"]',
} as const
