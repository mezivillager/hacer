# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.16.0](https://github.com/mezivillager/hacer/compare/v1.15.0...v1.16.0) (2026-04-03)

### Features

* implement phase 6 - PropertiesPanel, RightActionBar, HelpBar + KeyboardShortcutsModal ([1150cad](https://github.com/mezivillager/hacer/commit/1150cadad8054b55b34c97bfde27865262547c7d))

## [1.15.0](https://github.com/mezivillager/hacer/compare/v1.14.0...v1.15.0) (2026-04-03)

### Features

* implement phase 5 - replace Sidebar with CompactToolbar ([5fd7a37](https://github.com/mezivillager/hacer/commit/5fd7a372bff14f7bc282dd64d2f7ac34b4799300))

### Bug Fixes

* address PR review - layout, accessibility, placement mode conflicts ([3dcb09a](https://github.com/mezivillager/hacer/commit/3dcb09a9a5bac008b8ff85efad069d2a4388abb8))

### Code Refactoring

* extract cancelAllPlacement helper, simplify Switch accessibility ([b751996](https://github.com/mezivillager/hacer/commit/b751996618bde54641c306d5f5ad557a9dc39ed1))

## [1.14.0](https://github.com/mezivillager/hacer/compare/v1.13.0...v1.14.0) (2026-04-02)

### Features

* Phase 4 notification system swap - replace antd message with Sonner toasts ([1d4cb7f](https://github.com/mezivillager/hacer/commit/1d4cb7f7301d27ad132eb42a805723e6e3f1f72f))

### Bug Fixes

* import CSSProperties directly from react in Toaster component ([daae0a8](https://github.com/mezivillager/hacer/commit/daae0a8b6ef0290da6fb2304cf4c214961d6db79))

## [1.13.0](https://github.com/mezivillager/hacer/compare/v1.12.0...v1.13.0) (2026-04-02)

### Features

* migrate leaf components from Ant Design to shadcn/ui (Phase 3) ([02bbf1b](https://github.com/mezivillager/hacer/commit/02bbf1bf26fb17ffb5e309613bf812ce14d7f3ff))

### Bug Fixes

* remove redundant TooltipProvider wrapping in GateSelector and NodeSelector ([ce33de7](https://github.com/mezivillager/hacer/commit/ce33de71c438553d0cd0c15ff26ca4b842d8ab65))

## [1.12.0](https://github.com/mezivillager/hacer/compare/v1.11.0...v1.12.0) (2026-04-02)

### Features

* implement phase 2 design system migration - port shadcn/ui primitives ([8438692](https://github.com/mezivillager/hacer/commit/84386925d313cf4c4f6b5b1588d08f8139651711))

### Bug Fixes

* **kbd:** correct KbdGroup props type to match rendered element ([397f4a0](https://github.com/mezivillager/hacer/commit/397f4a044f5cd3b824f5e370b0b2c0cc586ed426))

## [1.11.0](https://github.com/mezivillager/hacer/compare/v1.10.0...v1.11.0) (2026-04-02)

### Features

* add Tailwind CSS v4 foundation, OKLch tokens, and cn() utility (Phase 1) ([5832753](https://github.com/mezivillager/hacer/commit/583275376f9aadd070a7ca6cc018fc96e874e848))

### Bug Fixes

* address PR feedback on Tailwind dependency scope and Phase 1 global styles ([a7e26ba](https://github.com/mezivillager/hacer/commit/a7e26ba66e6341a06b37477baab09b1fd861fd67))

### Documentation

* add clarifying comment to [@theme](https://github.com/theme) inline block in globals.css ([77daa16](https://github.com/mezivillager/hacer/commit/77daa1689c4653ffaf43676c96278cea968c0c10))

## [1.10.0](https://github.com/mezivillager/hacer/compare/v1.9.0...v1.10.0) (2026-04-02)

### Features

* implement PR deploy preview with GitHub Pages ([f1f3cec](https://github.com/mezivillager/hacer/commit/f1f3cec9e0c73dbd384e6ec85bc2e439f381697f))

### Bug Fixes

* address PR review feedback - permissions, concurrency, fork guard, cleanup resilience ([c6c314d](https://github.com/mezivillager/hacer/commit/c6c314db261b0c58a7ca830d89c9bea5aa785630))

### Documentation

* add phased migration plan for design system adoption (Ant Design → shadcn/ui + Tailwind v4) ([eda2d87](https://github.com/mezivillager/hacer/commit/eda2d87b91b0a04219c5c6355d78615927445e8a))
* design system added ([ead6d83](https://github.com/mezivillager/hacer/commit/ead6d830a7f273cce2153282b8cdcb13593bee69))

## [1.9.0](https://github.com/mezivillager/hacer/compare/v1.8.1...v1.9.0) (2026-03-30)

### Features

* **statusbar:** implement StatusBar component and related store state (P05-09) ([b0cbda9](https://github.com/mezivillager/hacer/commit/b0cbda98581447abc45cdbba412a6f0f9285da6b))

### Bug Fixes

* clear statusMessages in clearCircuit and improve focus styles for forced-colors mode ([aa04e64](https://github.com/mezivillager/hacer/commit/aa04e643c1b2a95baba5df881dc9f55cd6e49d5e))
* **lint:** resolve unsafe return types and enforce strict typecheck script ([6d8d9dc](https://github.com/mezivillager/hacer/commit/6d8d9dc3d3324b2e20a5d04e7a6a652728f60caf))

### Documentation

* rebrand student/curriculum references to generic user language ([1a041d7](https://github.com/mezivillager/hacer/commit/1a041d7e2d150581778423e801d1b95c21ffc8cd))

### Code Refactoring

* **ui:** improve StatusBar a11y and extract inline styles to CSS module ([396db28](https://github.com/mezivillager/hacer/commit/396db28b2040a0fbc629cfef24982f7de46cdd7e))

## [1.8.1](https://github.com/mezivillager/hacer/compare/v1.8.0...v1.8.1) (2026-03-29)

### Bug Fixes

* update companion deps for vite 8 compatibility ([4e82d9a](https://github.com/mezivillager/hacer/commit/4e82d9a9881f27b1f490a606aef84a850c66bf63))

## [1.8.0](https://github.com/mezivillager/hacer/compare/v1.7.1...v1.8.0) (2026-03-29)

### Features

* **nodes:** add node rename workflow and label rendering ([b767ccf](https://github.com/mezivillager/hacer/commit/b767ccfb57bcdc67acd6d65930d4b8266cf9ed60))

### Bug Fixes

* **nodes:** add Enter key support to NodeRenameControl and refactor E2E helpers ([901c147](https://github.com/mezivillager/hacer/commit/901c1474894fcc9d194718904be42d4ba163a603))

### Documentation

* address PR review feedback on tsbuildinfo, types, capitalization, and fixture paths ([a9f1ad6](https://github.com/mezivillager/hacer/commit/a9f1ad6d7b8e282e5c23da5c20296ffe3708f5a7))
* reframe platform as capability-first over curriculum ([07de6d5](https://github.com/mezivillager/hacer/commit/07de6d5110df2bb932975b2223b4730639300a11))

## [1.7.1](https://github.com/mezivillager/hacer/compare/v1.7.0...v1.7.1) (2026-03-26)

### Bug Fixes

* **hdl-parser:** finalize CLOCKED and sub-bus diagnostics ([8d0d358](https://github.com/mezivillager/hacer/commit/8d0d358123c6a6cb3e3eb263a9c8a7e318be68ac))

### Documentation

* add HDL parser parity hardening design spec ([9088385](https://github.com/mezivillager/hacer/commit/9088385ca9435711ce6738e36c456932e21c8872))
* **lessons:** require staged impl+tests before completion ([d3a3ca3](https://github.com/mezivillager/hacer/commit/d3a3ca3c3329b40f66e09024826ec274d3dbc1d5))
* refine HDL parser parity hardening spec ([6626f50](https://github.com/mezivillager/hacer/commit/6626f50733e08aedd9d45f09022d40132b9e6179))

### Tests

* add canonical HDL parser fixture parity coverage ([aa9deac](https://github.com/mezivillager/hacer/commit/aa9deace4acf3488524f30b648af6cdf69ff9c28))

## [1.7.0](https://github.com/mezivillager/hacer/compare/v1.6.0...v1.7.0) (2026-03-26)

### Features

* add strict Project 1 CMP parser and comparator ([3b30737](https://github.com/mezivillager/hacer/commit/3b307379bc1616e5bc73e8cf38b6f3556e9fac44))

### Bug Fixes

* align parseCmp with codebase conventions - empty input errors, accurate line numbers, camelCase fixtures ([d0ef313](https://github.com/mezivillager/hacer/commit/d0ef313a8458f9753cfa72067c29b55fe994170b))

### Code Refactoring

* move testing utilities from nand2tetris/ to testing/, address all PR review comments ([dce56fa](https://github.com/mezivillager/hacer/commit/dce56fa303590e22406d8eb1d78f49037d75d8e4))

## [1.6.0](https://github.com/mezivillager/hacer/compare/v1.5.0...v1.6.0) (2026-03-26)

### Features

* add project1 tst parser with block comment support ([908a450](https://github.com/mezivillager/hacer/commit/908a4500ce4f53d6e1edf80266fd58f910a07217))

### Bug Fixes

* handle comment-only input and block constructs in TST parser ([24b2bf1](https://github.com/mezivillager/hacer/commit/24b2bf144a7509f70da2e845547e29fdb0e57218))
* harden TST parser with error detection for unterminated comments, missing terminators, and empty statements ([72af958](https://github.com/mezivillager/hacer/commit/72af958ee70eae61c6b364e4953ebdfe7aeaf80b))

### Documentation

* add Phase 0.5 P05 ticket checklist and cross-links ([33922b1](https://github.com/mezivillager/hacer/commit/33922b17300eb3032aa45bcc9d080c89cbd3c6e0))

## [1.5.0](https://github.com/mezivillager/hacer/compare/v1.4.0...v1.5.0) (2026-03-23)

### Features

* **core:** add HACK HDL parser (P05-04) ([#52](https://github.com/mezivillager/hacer/issues/52)) ([482c6a7](https://github.com/mezivillager/hacer/commit/482c6a71e3da330203fae395aae659aa0aae48f0))

## [1.4.0](https://github.com/mezivillager/hacer/compare/v1.3.1...v1.4.0) (2026-03-23)

### Features

* **simulation:** topological sort eval (P05-03) ([#51](https://github.com/mezivillager/hacer/issues/51)) ([c0db302](https://github.com/mezivillager/hacer/commit/c0db302be666b368db5b559ce144064647674d5f))

## [1.3.1](https://github.com/mezivillager/hacer/compare/v1.3.0...v1.3.1) (2026-03-23)

### Bug Fixes

* treat non-zero signals as high in 3D visuals (PR [#50](https://github.com/mezivillager/hacer/issues/50)) ([2ec9246](https://github.com/mezivillager/hacer/commit/2ec92464bfdac32a6a14b8de1a5ad0703c6cad9b))

### Code Refactoring

* migrate circuit signals boolean to number (P05-02) ([a5fb9b3](https://github.com/mezivillager/hacer/commit/a5fb9b34012cbd8be9ce3552259f7eb0ddb15c06))

## [1.3.0](https://github.com/mezivillager/hacer/compare/v1.2.1...v1.3.0) (2026-03-23)

### Features

* **core:** ChipRegistry + Nand builtin (P05-01) ([#47](https://github.com/mezivillager/hacer/issues/47)) ([6fa2fda](https://github.com/mezivillager/hacer/commit/6fa2fda40f5fc0e9183b7eedef6376a3b0b74c3c))

### Documentation

* **plans:** Phase 0.5 tickets (P05-01–28), gap analysis, roadmap phases ([#45](https://github.com/mezivillager/hacer/issues/45)) ([eb080a0](https://github.com/mezivillager/hacer/commit/eb080a0f78b9e5f9e6236c937f02ba3814574f48)), closes [#46](https://github.com/mezivillager/hacer/issues/46)

## [1.2.1](https://github.com/mezivillager/hacer/compare/v1.2.0...v1.2.1) (2026-03-22)

### Bug Fixes

* address PR [#43](https://github.com/mezivillager/hacer/issues/43) review comments — security, correctness, version sync ([#44](https://github.com/mezivillager/hacer/issues/44)) ([2648eee](https://github.com/mezivillager/hacer/commit/2648eee70d6e9fd259bca60b517c0ba539a3dcd9)), closes [10-#12](https://github.com/mezivillager/10-/issues/12)

### Documentation

* add missing phase 0.25 wiring system features to roadmap ([#42](https://github.com/mezivillager/hacer/issues/42)) ([5df73bc](https://github.com/mezivillager/hacer/commit/5df73bc20770cdf23ceeb2c07562a7f99853680d))

## [1.2.0](https://github.com/mezivillager/hacer/compare/v1.1.3...v1.2.0) (2026-03-19)

### Features

* **ui:** add demo overlay, GitHub link, and dynamic version ([d0bded5](https://github.com/mezivillager/hacer/commit/d0bded50ca6a89583df44e072ca9e0a4b7fe411e))

## [1.1.3](https://github.com/mezivillager/hacer/compare/v1.1.2...v1.1.3) (2026-03-17)

### Bug Fixes

* preserve junctions during wire recalculation on gate move/rotate ([792bcf0](https://github.com/mezivillager/hacer/commit/792bcf046d95aec5faa868d37aa97585e42478d8))

## [1.1.2](https://github.com/mezivillager/hacer/compare/v1.1.1...v1.1.2) (2026-03-15)

### Bug Fixes

* **tsconfig:** migrate away from deprecated baseUrl ([41da04a](https://github.com/mezivillager/hacer/commit/41da04ab6584f46eee97601ef2564ff5e4535ec7))

## [1.1.1](https://github.com/mezivillager/hacer/compare/v1.1.0...v1.1.1) (2026-03-15)

### Bug Fixes

* make junction placement use snapped preview position and wire id ([d5a2d9c](https://github.com/mezivillager/hacer/commit/d5a2d9c91b603b7e44a85efab899ae82c080c46c))

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
