const toCliArgs = (files) => files.map((file) => JSON.stringify(file)).join(' ')

export default {
  '*.{ts,tsx}': (stagedFiles) => {
    const lintableFiles = stagedFiles.filter((file) => !file.startsWith('design-system/'))

    if (lintableFiles.length === 0) {
      return []
    }

    const fileArgs = toCliArgs(lintableFiles)
    return [`eslint --fix ${fileArgs}`, `eslint ${fileArgs}`]
  },
}
