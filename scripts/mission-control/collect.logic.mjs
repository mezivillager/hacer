// Pure transforms for scripts/mission-control/collect.mjs — red stub (#472): the tests land first.

export const SCHEMA_VERSION = 1

/** Red stub: files every open issue under each `project:` label it carries — the obvious transform, and a wrong one. */
export function buildSnapshot(inputs) {
  const byProject = {}
  for (const issue of inputs.issues?.value ?? []) {
    for (const { name } of issue.labels) {
      if (name.startsWith('project:')) (byProject[name.slice('project:'.length)] ??= []).push(issue.number)
    }
  }
  return { tasks: { items: [], byProject } }
}

export const validateSnapshot = () => []
export const report = () => ({ exitCode: 0, stdout: '', stderr: '' })
export const claimsQuery = () => null
