# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.0](https://github.com/mezivillager/hacer/compare/v2.3.2...v2.4.0) (2026-05-22)

### Features

* **3d:** float gate label above body; show :W suffix for multi-bit ([8730b7d](https://github.com/mezivillager/hacer/commit/8730b7d06971915dd6c21c6a1d53973fe85db930))
* **3d:** float input/output node labels above the mesh ([c4828e6](https://github.com/mezivillager/hacer/commit/c4828e65718e23398f27766d5e39e83d0e8dc629))
* **3d:** float junction signal label above branch point ([cd61fe7](https://github.com/mezivillager/hacer/commit/cd61fe7150956af90bdd98e82ac9398936dde2e4))
* **3d:** float midpoint signal label on wires ([542fec5](https://github.com/mezivillager/hacer/commit/542fec5b8eec9afadb146aa24626b85535b3df4b))
* **3d:** FloatingLabel — camera-facing label, hidden in low-power ([b354a89](https://github.com/mezivillager/hacer/commit/b354a896375e4c9190968b4c5d172147432380ca))
* **3d:** FloatingLabel exposes LABEL_GEOMETRY + crude DOM fallback in low-power ([016ddb0](https://github.com/mezivillager/hacer/commit/016ddb0dfc6a2a83475374209860fa1d57634cb1))
* **3d:** gate label uses LABEL_GEOMETRY.GATE + crude fallback in low-power ([2e3b1f2](https://github.com/mezivillager/hacer/commit/2e3b1f23c96bc982ca3fca0f1110dd785f03bd06))
* **3d:** I/O node labels use LABEL_GEOMETRY.NODE (smaller, closer) ([cffc122](https://github.com/mezivillager/hacer/commit/cffc12293f7badac64b0be898c5b0054388db5e7))
* **3d:** junction label uses LABEL_GEOMETRY.JUNCTION ([0c58310](https://github.com/mezivillager/hacer/commit/0c583107a45d50bb3f730cead079362f0f732482))
* **3d:** remove wire midpoint labels ([5f0b920](https://github.com/mezivillager/hacer/commit/5f0b920ffbe88b21d713700b64fde4c70edf71cf))
* **3d:** uniform DOM-overlay labels rendered outside rotated groups ([50008f9](https://github.com/mezivillager/hacer/commit/50008f9986add9e7ee311f300fbe7e8b924467e0))
* **3d:** wire labels use LABEL_GEOMETRY.WIRE; show signalId even when sim paused ([9bf21da](https://github.com/mezivillager/hacer/commit/9bf21da6ad569da0b1d79fc0053b2b8486bcb5b5))
* **eval:** gateLogic receives gate.width during evaluation ([b0106a9](https://github.com/mezivillager/hacer/commit/b0106a983d278b2741e23ff9e3f769968b4cdefc))
* **gates:** GateInstance carries bus width (default 1) ([fbcaf40](https://github.com/mezivillager/hacer/commit/fbcaf402b7cecbcf8493169d7f437684f366c1de))
* **p05-13:** formatSignalLabel accepts width and renders hex for multi-bit ([1daec04](https://github.com/mezivillager/hacer/commit/1daec04626d88210067fb536204a4f83077ff9e4))
* **p05-13:** InputNode3D/OutputNode3D show hex-formatted multi-bit values ([ef33aa4](https://github.com/mezivillager/hacer/commit/ef33aa44d4d48b200c4ac203917a712ed35ac430))
* **p05-13:** MultiBitInput bit-toggle + format selector for width<=8 ([166905a](https://github.com/mezivillager/hacer/commit/166905a6998981713b1cf53a0f1ec240cb6519e8))
* **p05-13:** wire MultiBitInput into PinoutPanel for multi-bit I/O ([f60b77b](https://github.com/mezivillager/hacer/commit/f60b77bc8e05d74f7b8b752abc0220d58d92eeec))
* **props-panel:** add updateInputNodeWidth/updateOutputNodeWidth actions ([7986820](https://github.com/mezivillager/hacer/commit/79868201749760c80730b28692d71871708e4ee9))
* **props-panel:** width selector for input/output nodes ([22d2b76](https://github.com/mezivillager/hacer/commit/22d2b76197be5e3c92544ab6422f628bd498abf1))
* **sim:** gateLogic operates bitwise across configurable bus width ([70e8790](https://github.com/mezivillager/hacer/commit/70e8790db479be800fa3322c19d29073ad05645b))
* **wires:** infer gate width from connected wires; throw on mismatch (P05-13) ([d6c191c](https://github.com/mezivillager/hacer/commit/d6c191ce19ff4b00721213ec0a3aaa4493a6efd3))

### Bug Fixes

* **3d:** NOT label gap matches I/O node gap ([097d1cc](https://github.com/mezivillager/hacer/commit/097d1cc03b5757ff40ad28bf0562c6f9628c08f7))
* **p05-13:** use toHaveValue matcher to avoid type-cast eslint conflict ([a29c7a0](https://github.com/mezivillager/hacer/commit/a29c7a07d731829c9391151f139cdd71263b396f))
* **store:** cascade node width change through connected wires/gates ([c9bbb68](https://github.com/mezivillager/hacer/commit/c9bbb68ed6b0d072d3243ff6d58b59bd3524fc0c))
* **wires:** reject bit wire into widened gate ([115c8c5](https://github.com/mezivillager/hacer/commit/115c8c5f11d3652bac589aa705df3d1f63526c21))

### Documentation

* **p05-13:** add implementation plan ([83a2b6c](https://github.com/mezivillager/hacer/commit/83a2b6c3142952c43df9e0df0d2670bea3ab8d50))
* **p05-13:** mark ticket complete and record completion notes ([d55bdd7](https://github.com/mezivillager/hacer/commit/d55bdd7d4b148bb3d6fcbd5b2ddfe29bf3b4ad54))
* **p05-13:** note floating-label polish follow-up ([bc64c97](https://github.com/mezivillager/hacer/commit/bc64c9739761551068b9f252cb3154d10f76a3ff))
* **props-panel:** record width-editor completion + known limitation ([497c2d5](https://github.com/mezivillager/hacer/commit/497c2d5a3e14f9f5137d1b78a5b0956a762b8093))

### Tests

* **p05-13:** add multi-bit format/parse helpers with width masking ([b78850b](https://github.com/mezivillager/hacer/commit/b78850b1767c13dc57f213da1f3aed6014ef0540))
* **p05-13:** cover MultiBitInput numeric-input path and readOnly ([b0c5436](https://github.com/mezivillager/hacer/commit/b0c5436bb82a2c6568d50ec2e7e800d7fb62f06d))
* **testUtils:** stub width update actions in mock store ([db6896b](https://github.com/mezivillager/hacer/commit/db6896be449a2df7627e49eb89589093eef37ec0))

## [2.3.2](https://github.com/mezivillager/hacer/compare/v2.3.1...v2.3.2) (2026-05-22)

### Bug Fixes

* remove redundant canvas context assertion ([cb60f93](https://github.com/mezivillager/hacer/commit/cb60f932ab9107d7292fc87f78814f1d606c10f8))

## [2.3.1](https://github.com/mezivillager/hacer/compare/v2.3.0...v2.3.1) (2026-05-22)

### Bug Fixes

* **lint:** remove unnecessary type assertions flagged by typescript-eslint 8.59.4 ([d935f75](https://github.com/mezivillager/hacer/commit/d935f756ece3f7eb84daa33c65b03aae94ac44dc))

## [2.3.0](https://github.com/mezivillager/hacer/compare/v2.2.2...v2.3.0) (2026-05-19)

### Features

* **busOps:** implement bitmask helpers for bus simulation (P05-11) ([7e8ef6e](https://github.com/mezivillager/hacer/commit/7e8ef6ea721e136c7d485d7be23b1ac456bc96ac))
* **eval:** clamp propagated values to wire and destination widths (P05-11) ([b55191d](https://github.com/mezivillager/hacer/commit/b55191d847aded8984e9cdace39c4a7597b01060))
* **gates:** set width=1 on primitive gate pins (P05-11) ([b882793](https://github.com/mezivillager/hacer/commit/b8827939c1a438b6fc66312ef9951b2990bd295e))
* **types:** add optional width to Pin and Wire (P05-11) ([3bc0d79](https://github.com/mezivillager/hacer/commit/3bc0d79d22c0c0f1becafd9148331c8f68ffb729))
* **wires:** infer wire width and allow matching-width pass-through (P05-11) ([7afa2f9](https://github.com/mezivillager/hacer/commit/7afa2f9ff03071c1260f51a4fe7b1ae9a9e88478))
* **wiring:** support input-to-output pass-through in completeWiringToNode (P05-11) ([1d999e1](https://github.com/mezivillager/hacer/commit/1d999e19e71649596101d2d74270743598f0d2a1))

### Bug Fixes

* **wiring:** recover from pass-through width mismatch ([5c7e85e](https://github.com/mezivillager/hacer/commit/5c7e85e0cb962f66f53c9546fa7548332890460f))

### Documentation

* keep non-superpowers plans in docs/plans ([1c1d139](https://github.com/mezivillager/hacer/commit/1c1d139a5ec60bf13108f9ff15bcbdb02a17aad7))
* **p05-11:** mark ticket complete and record review notes ([ae48bea](https://github.com/mezivillager/hacer/commit/ae48beabfde217f5e84b5bdda84475b5bb7f707e))
* update p05-11 bus simulation ticket ([4868fbe](https://github.com/mezivillager/hacer/commit/4868fbeb4ceceb9d564f3d70ecb6fb4f45ae646e))

### Tests

* **busOps:** add failing bitmask helper suite (P05-11) ([149061b](https://github.com/mezivillager/hacer/commit/149061bf4cdec2a3201f519769017a498fad9acd))
* **eval:** add failing multi-bit propagation cases (P05-11) ([3206f06](https://github.com/mezivillager/hacer/commit/3206f06099f4e04215b446132c3162cca6e26b87))

## [2.2.2](https://github.com/mezivillager/hacer/compare/v2.2.1...v2.2.2) (2026-05-17)

### Bug Fixes

* **deps:** bump react-dom from 19.2.4 to 19.2.6 to match react version ([36ba9f0](https://github.com/mezivillager/hacer/commit/36ba9f0ce7cd4664e105be403cc583d77dcdcd80))

## [2.2.1](https://github.com/mezivillager/hacer/compare/v2.2.0...v2.2.1) (2026-05-16)

### Bug Fixes

* **copy:** restore HACER expansion title casing ([da1a458](https://github.com/mezivillager/hacer/commit/da1a458c4c7c789895f87a5882d8cb449dab125a))

### Documentation

* **ui:** update HACER acronym expansion wording ([2bf8cf7](https://github.com/mezivillager/hacer/commit/2bf8cf7d6b0804520213c113c7b0905c891d7ab2))

## [2.2.0](https://github.com/mezivillager/hacer/compare/v2.1.0...v2.2.0) (2026-05-16)

### Features

* **pinout-panel:** disable Eval until inputs change; cursor-pointer on enabled ([16214a2](https://github.com/mezivillager/hacer/commit/16214a2c273c5b5ad05131d73704edad3864109c))
* **pinout-panel:** implement PinoutPanel component (P05-10) ([bff17c2](https://github.com/mezivillager/hacer/commit/bff17c2364b5c56f37b627b558151bb08995a9da))
* **right-action-bar:** mount PinoutPanel below CircuitInfoPanel (P05-10) ([8176e78](https://github.com/mezivillager/hacer/commit/8176e782301370a61d5b871f7ef5fd9856439368))

### Bug Fixes

* **e2e:** handle possibly-undefined inputNodes in pinout-panel spec ([392612d](https://github.com/mezivillager/hacer/commit/392612d0ff404e93e3ee1dce17b2046a844ec4bf))
* **pinout-panel:** address pinout review feedback ([3863ade](https://github.com/mezivillager/hacer/commit/3863ade8fe62ffd9ae51aa1786703e6051d35107))

### Documentation

* **p05-10:** add PinoutPanel implementation plan ([86cc131](https://github.com/mezivillager/hacer/commit/86cc131f18adbdce8a7276a6384d4e755414b166))
* **p05-10:** align ticket with implementation (sm size, store spec path, eval test) ([26ac0ee](https://github.com/mezivillager/hacer/commit/26ac0ee4121e9d960fc938281505017a55923c7f))

### Tests

* **e2e:** add [@store](https://github.com/store) spec for PinoutPanel toggle (P05-10) ([d1254a4](https://github.com/mezivillager/hacer/commit/d1254a4bdec155988fa9cd04a9372e59a0d47dec))
* **pinout-panel:** add failing PinoutPanel unit tests (P05-10) ([d5572bd](https://github.com/mezivillager/hacer/commit/d5572bd2a872535770ba1ee15567772f40d64910))
* **right-action-bar:** add failing PinoutPanel integration test (P05-10) ([f86d1b7](https://github.com/mezivillager/hacer/commit/f86d1b7175e997fff7d768630b91a9fcacdbe300))

## [2.1.0](https://github.com/mezivillager/hacer/compare/v2.0.0...v2.1.0) (2026-05-15)

### Features

* add low power performance mode ([af50b8f](https://github.com/mezivillager/hacer/commit/af50b8fad572e08a58c5a8c26da73071988af2db))

### Documentation

* add B-002 toast overlap with right action bar to observed bugs ([cbd0bff](https://github.com/mezivillager/hacer/commit/cbd0bffeebfa9ed17aaccd9837278c151e6d3082))
* add P05-10 follow-ups and process hygiene implementation plan ([def9348](https://github.com/mezivillager/hacer/commit/def934861d948d64d05d7b7bf22f05ee2236e34f))
* add performance mode implementation plan ([fd03586](https://github.com/mezivillager/hacer/commit/fd035865c5156190b160fa0c11c12c6caac19529))
* address PR review comments on p05-10 followups plan ([13115d2](https://github.com/mezivillager/hacer/commit/13115d210fbe3d83cc40b6ff48a07711520c7ede))
* address review comments on documentation refresh ([0f344fd](https://github.com/mezivillager/hacer/commit/0f344fdc678646b57d41d24f3844f2e52bfacf58))
* align root guides with current stack ([b0397e0](https://github.com/mezivillager/hacer/commit/b0397e073123556186d57042ef5ff50d508d44e7))
* mark documentation refresh verification complete ([4ab5e42](https://github.com/mezivillager/hacer/commit/4ab5e423d9ffae43177228202aabf51220df3f94))
* P05-29 follow-up ticket, P05-10 alignment, observed bugs log, git rule ([8c51741](https://github.com/mezivillager/hacer/commit/8c517415e95df136f456fb65c0db380a03e5101c))
* refresh phase 0.5 ticket status and UI guidance ([4543f89](https://github.com/mezivillager/hacer/commit/4543f89f8b2874de8f85839738619c0226dee22a))
* refresh roadmap against current implementation ([4122d1b](https://github.com/mezivillager/hacer/commit/4122d1b4751de09ade76f891251d90514c5017ea))
* remove docs truth CI and add LLM docs-sync playbook ([9e0e990](https://github.com/mezivillager/hacer/commit/9e0e99020dbe8b7e980811c41e4a47fae323cba6))
* update release testing and current task docs ([68ca296](https://github.com/mezivillager/hacer/commit/68ca296bdddbe84e670d8b3f36a9984336c914e3))

### Code Refactoring

* address performance mode review comments ([45dd5bb](https://github.com/mezivillager/hacer/commit/45dd5bb96e198acfd82448a4a5f6f23183b7aa56))

### Tests

* **docs:** add documentation truth guard and align Node 22 runtime ([81936a9](https://github.com/mezivillager/hacer/commit/81936a94fdcf935d676d66019a3ef292b28bcff7))

### Continuous Integration

* enforce documentation truth check ([ec76950](https://github.com/mezivillager/hacer/commit/ec7695007a8dd33293d07210dea4170a00d4841e))

## [2.0.0](https://github.com/mezivillager/hacer/compare/v1.10.0...v2.0.0) (2026-05-12)

### ⚠ BREAKING CHANGES

* **ui:** Removes the Ant Design UI shell. The app renders only the
3D canvas and StatusBar in this commit; interactive UI affordances return
in subsequent commits as the new shadcn-based shell is built.

Ant Design and @ant-design/icons removed from package.json. Bundle drops
from 520 KB \u2192 403 KB gzipped (22% reduction).

Deleted Ant-dependent components: Sidebar, GateSelector, NodeSelector,
NodeRenameControl, DemoOverlay, ThemeProvider (Ant ConfigProvider variant),
ThemeContext, useTheme, uiHandlers, and 329-line App.css. CanvasArea
rewritten to drop Layout/Content/Typography in favour of plain HTML
wrappers (help-overlay class preserved for existing test compatibility;
restyled in chunk 7).

src/theme/ retains tokens.ts only (consumed by 23+ R3F/gate/node files;
retokens to OKLch CSS vars in Phase D / chunk 8). theme/index.ts trimmed
to color/material/semanticColor exports only.

E2E adaptations (5 unplanned but necessary):
- e2e/fixtures/{base,store,ui,shared-context}.fixture.ts: drop the
  appTitle waitForSelector (selector targeted deleted Sidebar title);
  canvas presence + store-global availability are sufficient mount signals
- e2e/helpers/common/setup.ts: same fix
- e2e/helpers/assertions/ui.assertions.ts: rewrite expectGateCount /
  expectWireCount / expectSimulation* to read from window.__CIRCUIT_STORE__
  directly (the original DOM-text reads targeted the deleted Sidebar
  Circuit Info section). UI-driven button assertions left for Phase E
  rewrite (chunk 9).
- e2e/helpers/actions/simulation.actions.ts: route startSimulationViaUI
  and pauseSimulationViaUI through the store global until the new
  CompactToolbar sim toggle lands in chunk 3a.

@ui Playwright specs (8 files) marked .skip with TODO references for
Phase E restoration. @store specs all green (86 passed).

CI gates green: lint, test:run (1080 tests), test:e2e:store (86 tests),
build (403 KB gzipped).

Refs: docs/specs/2026-04-17-design-system-migration-design.md
Refs: docs/plans/2026-04-17-design-system-migration/01-phase-a-ant-strip.md
Made-with: Cursor

### Features

* **canvas:** retokenize R3F scene background, grid, and idle wires ([9208c22](https://github.com/mezivillager/hacer/commit/9208c221379ed23c6f3f6fca2767f9f956772afc)), closes [#7](https://github.com/mezivillager/hacer/issues/7)
* **notify:** add Phase A console.warn stub ([d6108f9](https://github.com/mezivillager/hacer/commit/d6108f984d4c918829c6793775924e20743c7354))
* **ui:** add CompactToolbar shell ([e329cec](https://github.com/mezivillager/hacer/commit/e329cecd4d8478b54753176a7fb033e3200b15b0))
* **ui:** add HelpBar with contextual shortcuts and keyboard modal ([155b6c0](https://github.com/mezivillager/hacer/commit/155b6c0f268a18ce31d26b9c87c91546ccc8c964))
* **ui:** add PropertiesPanel with NodeRenameControl absorbed ([a03d4f6](https://github.com/mezivillager/hacer/commit/a03d4f6941372cc0b2993c450dad3b60030888b3))
* **ui:** add RightActionBar with Info drawer wired to store ([099dae8](https://github.com/mezivillager/hacer/commit/099dae85c1355e36b1abf4e284e7f499e1e07c3a))
* **ui:** add Tailwind v4 + shadcn foundation ([f2e9d62](https://github.com/mezivillager/hacer/commit/f2e9d62f5b90fdae26c61b672ce1ca56eededbf9))
* **ui:** make PropertiesPanel explicit-open instead of auto-on-selection ([19b4039](https://github.com/mezivillager/hacer/commit/19b4039de3f8a3b5f11c29e8597a1face021fd60))
* **ui:** restyle StatusBar and rebuild DemoOverlay (Phase C complete) ([e9733c1](https://github.com/mezivillager/hacer/commit/e9733c19c7d6d92fb3a4c8fee9aaa94893fcf2f7))
* **ui:** single bottom bar (HelpBar) with old help text + pixel-perfect shortcuts modal ([ea3cd19](https://github.com/mezivillager/hacer/commit/ea3cd19b84626737c870cefa83e1f9d0b75b33fd)), closes [#88](https://github.com/mezivillager/hacer/issues/88)
* **ui:** strip Ant Design and lay groundwork for shadcn migration ([7dc2c07](https://github.com/mezivillager/hacer/commit/7dc2c072e7ae89fce0d8c1a48841ef613b1298ee))

### Bug Fixes

* **canvas,ui:** three Phase D / shadcn theme follow-ups ([1a6fccc](https://github.com/mezivillager/hacer/commit/1a6fccc6bf006ac7bf9d8cc3caddf38f5f88da63)), closes [#cd7f32](https://github.com/mezivillager/hacer/issues/cd7f32)
* **canvas:** swap --canvas-bg and --canvas-grid from OKLch to hex ([4b0f145](https://github.com/mezivillager/hacer/commit/4b0f145fe6b9ca43a496891e91e58dd4e3135418)), closes [#f0f1f5](https://github.com/mezivillager/hacer/issues/f0f1f5) [#14171d](https://github.com/mezivillager/hacer/issues/14171d) [#b8bdc4](https://github.com/mezivillager/hacer/issues/b8bdc4) [#353a42](https://github.com/mezivillager/hacer/issues/353a42) [#b8bdc4](https://github.com/mezivillager/hacer/issues/b8bdc4) [#353a42](https://github.com/mezivillager/hacer/issues/353a42)

### Documentation

* add design system migration brainstorming spec ([429615b](https://github.com/mezivillager/hacer/commit/429615bab8a990130838873b500d1dfc77f5e41f))
* add design system migration implementation plan ([ac6cc4a](https://github.com/mezivillager/hacer/commit/ac6cc4ad82fe39359b957dcf2103bda64026d44b))
* address plan-document-reviewer feedback on migration plan ([27eab7c](https://github.com/mezivillager/hacer/commit/27eab7ce0717073af60702ee195adc8231b814ae))
* remove design system migration doc ([4d691ab](https://github.com/mezivillager/hacer/commit/4d691abf685d66af0fd8335ad9120389b04c4730))
* update REPO_MAP, .cursorrules, lessons.md for shadcn migration ([2ac9c6c](https://github.com/mezivillager/hacer/commit/2ac9c6c88967b23d4c60780138e28446fe24af5d))

### Styles

* **scene:** improve grid line visibility and contrast ([be9e7c4](https://github.com/mezivillager/hacer/commit/be9e7c426c32b7e33317ac79041337bfbaa0bf95)), closes [#adbacb](https://github.com/mezivillager/hacer/issues/adbacb) [#8da0b2](https://github.com/mezivillager/hacer/issues/8da0b2) [#223248](https://github.com/mezivillager/hacer/issues/223248) [#27405e](https://github.com/mezivillager/hacer/issues/27405e)

### Code Refactoring

* **notify:** replace antd message.* with notify.* shim ([45254f2](https://github.com/mezivillager/hacer/commit/45254f286ca3b6b37990be785ea36d29e2835bf6))

### Tests

* **e2e:** restore [@ui](https://github.com/ui) specs against new shell selectors (Phase E) ([89ccef9](https://github.com/mezivillager/hacer/commit/89ccef9b2c9a7b20b8c695ec8dbc1020501344e3))

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
