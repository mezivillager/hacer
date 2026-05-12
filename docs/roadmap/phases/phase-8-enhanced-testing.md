# Phase 8: Enhanced Testing and Compatibility Validation

**Part of:** [Development Roadmap](../README.md)  
**Status:** Future  
**Last Updated:** 2026-05-12  
**Depends on:** Phase 7 agent/API work and the Phase 0.5-0.7 compatibility foundation

---

## Overview

Phase 8 expands the current Vitest/Playwright/Stryker baseline into a broader compatibility and regression strategy. It is future work; do not treat property testing, visual regression, or broad compatibility corpus coverage as complete today.

## Current Baseline

- Vitest unit tests
- Playwright store E2E tests
- Scheduled Playwright UI tests
- Stryker mutation workflow
- Phase 0.5 parser/test-fixture foundations in progress

## Future Deliverables

- [ ] Select a property-testing library and add invariant suites
- [ ] Expand nand2tetris compatibility fixtures by chapter
- [ ] Add integration tests across HDL, compiler, test execution, and simulation
- [ ] Add visual regression only for stable UI surfaces where screenshots are worth maintaining
- [ ] Add performance regression tests for larger circuits
- [ ] Add accessibility and cross-browser coverage for mature workflows
- [ ] Define coverage thresholds after Phase 0.5-0.7 product shape stabilizes

## Exit Criteria

- Compatibility corpus covers the active hardware/software chapters
- Invariant tests catch circuit-model regressions
- Regression gates are useful enough to run in CI without drowning normal development
- Testing docs accurately describe installed tooling and actual commands

**Previous:** [Phase 7: AI Integration](phase-7-ai-integration.md)  
**Next:** [Phase 9: Performance](phase-9-performance.md)
