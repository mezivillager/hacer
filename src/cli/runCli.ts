/** `hacer test <hdl> <tst> <cmp>` as a pure function: argv and a file reader in, exit code and text out. */

export interface CliOutcome {
  /** 0 pass · 1 the chip failed or could not be tested · 2 usage error */
  exitCode: 0 | 1 | 2
  stdout: string
  stderr: string
}

export function runCli(_argv: readonly string[], _readFile: (path: string) => string): CliOutcome {
  return { exitCode: 2, stdout: '', stderr: 'not implemented\n' }
}
