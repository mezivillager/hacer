# Premises

Fixture for `lineage verify` (#468): one mismatch, one match, one crashing command, one manual check.

| Id | Premise | Verify | Expect | Recorded | Status |
|---|---|---|---|---|---|
| P-001 | a fact that fails | `node -e "process.stdout.write('no')"` | yes | 2026-09-21 (#342) | holds |
| P-002 | a fact that holds | `node -e "process.stdout.write('absent')"` | absent | 2026-09-23 | holds |
| P-009 | a fact that crashes | `node -e "process.exit(2)"` | ok | 2026-09-24 | holds |
| P-006 | a manual fact | `manual — browser tab` | 2026-09-25T03:00:00Z | 2026-09-25 | holds |
