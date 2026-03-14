# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/mezivillager/hacer/compare/v1.0.2...v1.1.0) (2026-03-14)

### Features

* LLM best practices — Superpowers skills, Constitution, workflow ([16d98bc](https://github.com/mezivillager/hacer/commit/16d98bc2b373b92ad410c9dc5011d8bb63024e64))

## [1.0.2](https://github.com/mezivillager/hacer/compare/v1.0.1...v1.0.2) (2026-03-14)

### Bug Fixes

* use url.insteadOf to embed RELEASE_TOKEN in push URL ([e88debf](https://github.com/mezivillager/hacer/commit/e88debfe9416828d5e7f72f6f4af583ce555d2d1))

### Continuous Integration

* **release:** use PAT for checkout to bypass branch protection rules ([b530eea](https://github.com/mezivillager/hacer/commit/b530eea616617232820460a1a9ee21dcbda60210))

## [1.0.1](https://github.com/mezivillager/hacer/compare/v1.0.0...v1.0.1) (2026-03-14)

### Bug Fixes

* avoid exposing RELEASE_TOKEN during pnpm install ([ebf6d28](https://github.com/mezivillager/hacer/commit/ebf6d28e07aca385ff3dc84e2fb321b55fbdfdcf))
* use credential store so semantic-release push uses RELEASE_TOKEN ([8d1d27d](https://github.com/mezivillager/hacer/commit/8d1d27d051a80ce04bf2058e60161c191e4602fb))
* use RELEASE_TOKEN for semantic-release with branch protection ([c7ad06e](https://github.com/mezivillager/hacer/commit/c7ad06e59cc05f89e71bb65dd54e1540f57b67bd))

## 1.0.0 (2026-03-14)

### Features

* add arrow key camera panning when no gate is selected ([4ce1429](https://github.com/mezivillager/hacer/commit/4ce1429023afb0b6202dd6d888095d4a59cbeff1))
* add Delete/Backspace key support for deleting selected gates ([46f3221](https://github.com/mezivillager/hacer/commit/46f3221aa25b0d5f5985ee3c9822bf9157bd9210))
* add HDL circuit I/O nodes and unified wire system ([a6c6b3b](https://github.com/mezivillager/hacer/commit/a6c6b3bd90183fc8ac81bbfb731f4b69585ee9b0))
* add LLM workflow orchestration guide for Cursor and Claude Code ([7579458](https://github.com/mezivillager/hacer/commit/75794583ae5808bc11da156c7db5a6a2b6549472))
* add semantic-release configuration and commit linting ([544b142](https://github.com/mezivillager/hacer/commit/544b142359ffdceb423bdb2144d804036b419d48))
* add unified error handling with UI feedback ([6c902a2](https://github.com/mezivillager/hacer/commit/6c902a29269748d34f49cc07bbbea7baacc38d98))
* Complete Phase 0 Critical Fixes ([e0a6526](https://github.com/mezivillager/hacer/commit/e0a652676788b0430b8ecf2a45d2c1bb9d602f60))
* Enhance gate placement validation in grid utilities ([7872b8f](https://github.com/mezivillager/hacer/commit/7872b8fbb66ddb7157ec2de0bd59af2e25cb37dd))
* Implement grid snapping and placement validation for gates ([64d6bce](https://github.com/mezivillager/hacer/commit/64d6bcef09b3f08a094ed300270225af21566c01))
* implement incremental wire path extension with overlap detection ([3132827](https://github.com/mezivillager/hacer/commit/313282748e9b40cef7731d16bccf1cb535697e22))
* implement robust pathfinding error handling and fix routing bugs ([2f00dde](https://github.com/mezivillager/hacer/commit/2f00dde97330ddffa916b149d65581af6f582c4c))
* implement segment combination for wire extension ([de0d4d2](https://github.com/mezivillager/hacer/commit/de0d4d20b06de4985632abf3348c8e0bdc0b07e8))
* implement wire selection and deletion ([d828a4d](https://github.com/mezivillager/hacer/commit/d828a4d93938d79b1bee2304368b39d6646c517e))
* junction placement and wiring from junctions ([7f973a1](https://github.com/mezivillager/hacer/commit/7f973a18320c51db5a3c83de93735d55f7cfa3c2))
* migrate from npm to pnpm ([0c8ff5d](https://github.com/mezivillager/hacer/commit/0c8ff5dbc291af9de8c62c88122396bd8f8dda94))
* recalculate wire paths when gates are dragged ([4562560](https://github.com/mezivillager/hacer/commit/45625604348c8444a532638872a620444000f82f))
* replace manual memoization with React Compiler ([5bded9a](https://github.com/mezivillager/hacer/commit/5bded9a57e681447617e9ab908d4eb0de2a12b0a))
* restore orbital controls with interaction-aware disabling ([3ad8e54](https://github.com/mezivillager/hacer/commit/3ad8e54a76feb76be00a743696a4618ac650b24b))
* split e2e tests into ui and store variants with scenarios ([8fdb78d](https://github.com/mezivillager/hacer/commit/8fdb78d673701a9f637f887d7700a6a730991127))
* Stryker mutation testing for PRs ([d6051ea](https://github.com/mezivillager/hacer/commit/d6051ea4fa74eb755e05849ba8421d926d5a23ee))
* unify entity selection and improve i/o node dragging ([b93a476](https://github.com/mezivillager/hacer/commit/b93a47641c972ff7e2ee864c43f73142d940bc5b))

### Bug Fixes

* address PR reviews on I/O nodes ([29a0b6b](https://github.com/mezivillager/hacer/commit/29a0b6b2d7e32f2bc3272ec0ebc99e8d719af8a1))
* correct test file path generation in check-test-files.sh ([97c32bb](https://github.com/mezivillager/hacer/commit/97c32bb1e1007b74a8879e4b726af945f60ce679))
* mock antd in wireHandlers.test to resolve window is not defined in CI ([6e8fe0c](https://github.com/mezivillager/hacer/commit/6e8fe0c543cd08bd7bad885c04be686d72bfc842))
* prevent wire preview disruption on navigating away from a destination pin ([b9bc65d](https://github.com/mezivillager/hacer/commit/b9bc65d9419888174ff0dbc30c0dda48c63c2ce7))
* recalculate wires when gates rotate ([ac7b5b9](https://github.com/mezivillager/hacer/commit/ac7b5b9953c7657b9866f3e0de1ffcf6329f71bb))
* resolve 105 TypeScript build errors ([a299117](https://github.com/mezivillager/hacer/commit/a299117886dd8d7141c69c7d7daae71510a0829b))
* resolve linting errors by separating theme files ([2476485](https://github.com/mezivillager/hacer/commit/24764858b8671532aa5282075602845bd55338fb))
* resolve pnpm version conflict and harden release workflow ([abef004](https://github.com/mezivillager/hacer/commit/abef0049553c55ac20127fa323e081e4b300ae97))
* store tests - fix failures, optimize speed, parallelize for CI ([d77e590](https://github.com/mezivillager/hacer/commit/d77e5903843a8bc211cc451e5a02bc85bbe15856))
* **test:** gate movement ui test fixed, using shared scene ([ba2358d](https://github.com/mezivillager/hacer/commit/ba2358d6b099d67f10b9f7ccecf08d5926cd4359))
* use createMockThreeEvent helper in useGateDrag tests ([eb7c9c1](https://github.com/mezivillager/hacer/commit/eb7c9c15069039c8fd86d1a56c61f536f9609cc5))
* wire crossing arc generation for vertical segments ([50a9c52](https://github.com/mezivillager/hacer/commit/50a9c5269ef269c01eb31e39252be7a7263dd3d9))

### Performance Improvements

* optimize store tests by skipping scene ready wait ([46394c1](https://github.com/mezivillager/hacer/commit/46394c16a1c55c175535966eb9a4649d68ec5181))

### Documentation

* fix broken internal links in roadmap and phase docs ([f5deba7](https://github.com/mezivillager/hacer/commit/f5deba76bac2eb71bfffce8b1a63e7b4f9a11532))
* implement comprehensive development roadmap ([31f1a77](https://github.com/mezivillager/hacer/commit/31f1a77ec0f4fe5844aea4e1b7cb087da143c97c))
* mark Phase 0.25 as completed ([08add9c](https://github.com/mezivillager/hacer/commit/08add9cda52d8c5f1f9a4a59d815b6fea6f81016))
* open-source readiness - LICENSE, README, CONTRIBUTING, CI, CoC, security, issue templates ([e0f81e6](https://github.com/mezivillager/hacer/commit/e0f81e66d86da6efff8c08b8cc2fcf722a080bf1))
* Update NAND2FUN_LLM_GUIDE.md and REPO_MAP.md for clarity and organization ([90ba303](https://github.com/mezivillager/hacer/commit/90ba303c6a4d365e54b620fe9bb0d58a03a8318e))
* Update Phase 0.25 roadmap with flat gate orientation improvements ([9d7b9f4](https://github.com/mezivillager/hacer/commit/9d7b9f460b115e92d12de51f56638fc22efd930c))
* Update Phase 0.25 roadmap with UI improvements and task adjustments ([af3a113](https://github.com/mezivillager/hacer/commit/af3a113a89c0fec1262f218fa0ae1dbbc6c43800))
* Update phase tracking and roadmap for Phase 0.25 ([d6e5dea](https://github.com/mezivillager/hacer/commit/d6e5dea17d68d57355a55a25961fb946ab5c214b))
* update readme ([22783b7](https://github.com/mezivillager/hacer/commit/22783b71ccada92079b0a30c1c4f2230e40a2e74))
* update readme ([b9e6550](https://github.com/mezivillager/hacer/commit/b9e6550ed281bfd7165ed712471f71202b027fa9))
* update README and LLM guide, enhance circuit store ([add965c](https://github.com/mezivillager/hacer/commit/add965c78a50b35fc16feaa6cb9300eb2087ef7d))

### Code Refactoring

* centralize E2E window typing and organize test structure ([3338138](https://github.com/mezivillager/hacer/commit/33381382dc28d57f2e1636e0f933b34ea7b6c20d))
* centralize gate configs with BaseGate component and JSDoc ([7ecac2a](https://github.com/mezivillager/hacer/commit/7ecac2ab6bfc943138b73d7e3419619027cd84a3))
* decompose replaceSegmentWithHop into testable helper functions ([5f120f9](https://github.com/mezivillager/hacer/commit/5f120f9eb48b021bc9678a639d180452fabcadac))
* **e2e:** standardize UI test file naming to .ui.spec.ts format ([e806983](https://github.com/mezivillager/hacer/commit/e80698381ae115795b94db82c46c76abc7281ff7))
* Enforce one component per file rule ([614ef5a](https://github.com/mezivillager/hacer/commit/614ef5af6f764332bb6de9d4d1bf534b24a9aa2c))
* extract WirePreview logic into focused custom hooks ([38e0002](https://github.com/mezivillager/hacer/commit/38e00027380d4eaa1df05c63581f78692b3e38f5))
* improve test structure and type safety ([20260f1](https://github.com/mezivillager/hacer/commit/20260f178b52abbcd9d1b8d18a3ef93a47a9e038))
* make E2E tests robust with store-driven approach ([2e987f2](https://github.com/mezivillager/hacer/commit/2e987f29c5bf138c2662607b7edbaad5bbdb4fc5))
* remove BaseGateLabel from BaseGate component and common exports ([ec0994a](https://github.com/mezivillager/hacer/commit/ec0994a3b9070fb37d9658d254db733eb5b3c9bf))
* remove unnecessary clampCutPointsToSegment function ([84df707](https://github.com/mezivillager/hacer/commit/84df707e7635fddd1d54b5c4b1e7aaa5dddeee71))
* remove unused util file ([40bbbfe](https://github.com/mezivillager/hacer/commit/40bbbfe94d75d847489400122f0010e166388c97))
* reorganize action modules into folders with co-located tests ([5458bd2](https://github.com/mezivillager/hacer/commit/5458bd2418aafe63e3443b24851a9669751ef9b3))
* reorganize E2E tests with consistent structure and parameterization ([57db88b](https://github.com/mezivillager/hacer/commit/57db88b1aa976252fd05ee3da93fee8adb20e781))
* reorganize e2e tests with shared helpers ([7dd995c](https://github.com/mezivillager/hacer/commit/7dd995cada8f09b4f0d2202c725ce098ead059b0))
* replace vlatio with zustand ([394bf1e](https://github.com/mezivillager/hacer/commit/394bf1ed148ab9624063b072079b656cfae12510))
* replaced deprecated direction prop with orientation ([435cbce](https://github.com/mezivillager/hacer/commit/435cbceff2e10b8eb62155735b3938e4d72c9d07))
* Separate GroundPlane from preview components to reduce re-renders ([f4c0f02](https://github.com/mezivillager/hacer/commit/f4c0f02e17d0819ed489069f5bd3e3e3fe0c7533))
* split large files, add tests, implement theme system ([490b101](https://github.com/mezivillager/hacer/commit/490b1013058510d3220b574bc225140b28e1ea1b))
* update gate orientation and placement logic ([7858b01](https://github.com/mezivillager/hacer/commit/7858b018db6fcd678eac14b4f6961b5e6c9537a1))
* **wiringScheme:** split core.ts into smaller focused modules ([972b903](https://github.com/mezivillager/hacer/commit/972b9032dcbd64f4fad1b3a15440a2a34d55aada))

### Tests

* add missing component unit tests ([91fe009](https://github.com/mezivillager/hacer/commit/91fe009532067bb381ba0a0c1b9ccee808bbaf88))

## [Unreleased]

Phase 0.5 (Nand2Tetris Foundation) is in progress: HDL parser, test script engine, sequential logic, chip hierarchy.

## Phase 0.25 -- UI/UX Improvements & Grid-Based Circuit Design

### Added

- 3D logic gate simulator with React Three Fiber
- Gate types: NAND, AND, OR, NOT, XOR
- Grid-based gate placement, movement, and rotation
- Wire connections between gates with grid-aligned routing
- Junction nodes and I/O nodes for circuit building
- Wire selection and deletion
- Real-time logic simulation with visual feedback (red = 0, green = 1)
- Zustand state management with React Compiler (automatic memoization)
- TDD workflow with Vitest unit tests and Playwright E2E tests
- Mutation testing with Stryker
- Pre-commit hooks via Husky (lint-staged, typecheck, test file checks)
- Comprehensive roadmap documentation (25 phases)

## Phase 0 -- Critical Fixes

### Added

- Project foundation and architecture
- TypeScript strict mode configuration with project references
- ESLint with React Compiler plugin
- `.cursorrules` for AI agent development workflow
- `REPO_MAP.md` for codebase navigation
- Documentation: testing standards, roadmap, TypeScript guidelines
