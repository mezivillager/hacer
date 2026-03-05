# Phase 4.5: Release Management & Automation Foundation (Weeks 14-16)

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Priority:** 🟠 HIGH
**Timeline:** Weeks 14-16
**Dependencies:** Phase 2.5 complete (developer tooling established), basic project structure in place
**Effort:** ~65 hours

---

## Overview

This phase establishes professional release management with automated versioning, comprehensive changelogs, and streamlined release processes. Semantic versioning ensures predictable releases while AI-enhanced changelogs provide clear communication of changes to users and developers.

**Exit Criteria:**
- Semantic release fully automated with conventional commits
- AI-generated changelogs providing clear release notes
- Multi-branch release strategy (main, beta, alpha) operational
- Release artifacts automatically generated and distributed
- Release process integrated with documentation and deployment

---

## 21.1 Semantic Release Implementation

**Requirements:** Automated versioning and release management following semantic versioning principles with conventional commit messages.

### Semantic Release Configuration

```javascript
// .releaserc.js
const { readFileSync } = require('fs');

module.exports = {
  branches: [
    {
      name: 'main',
      channel: 'latest',
      prerelease: false,
    },
    {
      name: 'beta',
      channel: 'beta',
      prerelease: true,
    },
    {
      name: 'alpha',
      channel: 'alpha',
      prerelease: true,
    },
    {
      name: 'next',
      channel: 'next',
      prerelease: true,
    },
  ],

  plugins: [
    // 1. Analyze commits to determine release type
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          // Core release rules
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'revert', release: 'patch' },

          // Documentation and maintenance
          { type: 'docs', scope: 'README', release: 'patch' },
          { type: 'docs', release: false }, // Other docs don't trigger releases
          { type: 'style', release: false },
          { type: 'refactor', release: false },
          { type: 'test', release: false },
          { type: 'build', release: false },
          { type: 'ci', release: false },
          { type: 'chore', release: false },

          // Special cases
          { type: 'improvement', release: 'minor' },
          { type: 'security', release: 'patch' },

          // Breaking changes
          { breaking: true, release: 'major' },
          { revert: true, release: 'patch' },

          // Scope-specific rules
          { type: 'feat', scope: 'api', release: 'minor' },
          { type: 'fix', scope: 'api', release: 'patch' },
          { type: 'feat', scope: 'ui', release: 'patch' }, // UI changes are patches
          { type: 'feat', scope: 'docs', release: false },

          // Emergency releases
          { type: 'hotfix', release: 'patch' },
          { type: 'emergency', release: 'patch' },
        ],

        // Custom parser options
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
          issuePrefixes: ['#', 'GH-'],
        },
      },
    ],

    // 2. Generate release notes
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: '🚀 Features', hidden: false },
            { type: 'fix', section: '🐛 Bug Fixes', hidden: false },
            { type: 'perf', section: '⚡ Performance Improvements', hidden: false },
            { type: 'revert', section: '⏪ Reverts', hidden: false },
            { type: 'docs', section: '📚 Documentation', hidden: false },
            { type: 'style', section: '💅 Styles', hidden: false },
            { type: 'refactor', section: '♻️ Code Refactoring', hidden: false },
            { type: 'test', section: '✅ Tests', hidden: false },
            { type: 'build', section: '🏗️ Build System', hidden: false },
            { type: 'ci', section: '🔧 Continuous Integration', hidden: false },
            { type: 'chore', section: '🧹 Chores', hidden: false },
            { type: 'improvement', section: '✨ Improvements', hidden: false },
            { type: 'security', section: '🔒 Security', hidden: false },
            { type: 'hotfix', section: '🚑 Hotfixes', hidden: false },
          ],
        },

        // Custom writer options
        writerOpts: {
          commitsSort: ['subject', 'scope'],
          noteGroupsSort: 'title',
          notesSort: 'title',
        },
      },
    ],

    // 3. Update changelog
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle: '# 📋 Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
      },
    ],

    // 4. Update package.json version
    [
      '@semantic-release/npm',
      {
        npmPublish: false, // We handle publishing separately
        tarballDir: 'dist',
      },
    ],

    // 5. Create git tag and commit
    [
      '@semantic-release/git',
      {
        assets: [
          'CHANGELOG.md',
          'package.json',
          'package-lock.json',
        ],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],

    // 6. Create GitHub release
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: 'dist/hacer-web.zip',
            label: 'HACER Web App (ZIP)',
          },
          {
            path: 'dist/hacer-desktop.AppImage',
            label: 'HACER Linux Desktop App',
          },
          {
            path: 'dist/hacer-desktop.dmg',
            label: 'HACER macOS Desktop App',
          },
          {
            path: 'dist/hacer-desktop.exe',
            label: 'HACER Windows Desktop App',
          },
        ],

        // Release notes template
        releasedLabels: [
          'released-on-${name}',
          'released-on-${branch}',
        ],

        addReleases: 'bottom',

        draftRelease: false,

        // Success comments
        successComment: `🎉 This issue has been resolved in version ${nextRelease.version}!

The release is available on:
- [GitHub release]({{releaseUrl}})
- [NPM package](https://www.npmjs.com/package/hacer/v/${nextRelease.version})

Your **[semantic-release](https://github.com/semantic-release/semantic-release)** bot 📦🚀`,

        // Fail comments
        failComment: `❌ The automated release failed. Please check the logs and fix any issues.

If you need help, check the [semantic-release documentation](https://github.com/semantic-release/semantic-release/blob/master/docs/troubleshooting.md).`,

        // Discussion categories
        discussionCategoryName: 'Announcements',
      },
    ],

    // 7. Notify Slack
    [
      '@semantic-release/slack',
      {
        slackWebhook: process.env.SLACK_WEBHOOK,
        branchesConfig: [
          {
            pattern: 'main',
            notifyOnSuccess: true,
            notifyOnFail: false,
            onSuccessTemplate: {
              text: '🚀 HACER v${nextRelease.version} has been released!',
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: '🚀 New HACER Release'
                  }
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Version:* v${nextRelease.version}`
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Date:* ${new Date().toLocaleDateString()}`
                    }
                  ]
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Release Notes:*\n${nextRelease.notes}`
                  }
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: {
                        type: 'plain_text',
                        text: 'View Release'
                      },
                      url: '${releaseUrl}'
                    },
                    {
                      type: 'button',
                      text: {
                        type: 'plain_text',
                        text: 'Download'
                      },
                      url: 'https://github.com/hacer/hacer/releases/tag/v${nextRelease.version}'
                    }
                  ]
                }
              ],
              attachments: [
                {
                  color: 'good',
                  fields: [
                    {
                      title: 'Release Type',
                      value: '${nextRelease.type}',
                      short: true
                    },
                    {
                      title: 'Channel',
                      value: '${nextRelease.channel}',
                      short: true
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    ],

    // 8. Execute custom scripts
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'echo "Version ${nextRelease.version}" > VERSION.txt',
        publishCmd: './scripts/post-release.sh ${nextRelease.version}',
      },
    ],
  ],

  // Global options
  tagFormat: 'v${version}',
  dryRun: process.env.DRY_RUN === 'true',
  ci: true,

  // Debug options
  debug: process.env.DEBUG === 'true',
};
```

### Conventional Commits Enforcement

```javascript
// scripts/setup-conventional-commits.js
const fs = require('fs');
const path = require('path');

function setupConventionalCommits() {
  console.log('🔧 Setting up conventional commits...');

  // Create commit-msg git hook
  const commitMsgHook = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read the commit message
const commitMsgFile = process.argv[2];
const message = fs.readFileSync(commitMsgFile, 'utf8').trim();

// Conventional commit regex
const conventionalRegex = /^(build|chore|ci|docs|feat|fix|hotfix|improvement|perf|refactor|revert|security|style|test|emergency)(\\(.+\\))?: .{1,100}/;

// Check if message follows conventional format
if (!conventionalRegex.test(message)) {
  console.error('❌ Invalid commit message format!');
  console.error('');
  console.error('Commit messages must follow conventional commit format:');
  console.error('type(scope): description');
  console.error('');
  console.error('Allowed types:');
  console.error('  feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert');
  console.error('  improvement, security, hotfix, emergency');
  console.error('');
  console.error('Examples:');
  console.error('  feat(auth): add user registration');
  console.error('  fix(ui): resolve button alignment issue');
  console.error('  docs(api): update endpoint documentation');
  console.error('');
  console.error('Your message: "' + message + '"');
  console.error('');
  console.error('💡 Tip: Use "git commit" without -m to open your editor for better formatting');
  process.exit(1);
}

// Additional validation for breaking changes
if (message.includes('BREAKING CHANGE') || message.includes('BREAKING CHANGES')) {
  if (!message.includes('!:')) {
    console.warn('⚠️  Breaking changes should use "!" after type/scope:');
    console.warn('   feat!: add breaking feature');
    console.warn('   feat(scope)!: add breaking feature');
  }
}

// Check message length
if (message.length > 100) {
  console.warn('⚠️  Commit message is long (' + message.length + ' chars). Consider keeping under 100 chars.');
  console.warn('   First line should be a brief summary.');
}

console.log('✅ Commit message format is valid');
`;

  // Write commit-msg hook
  const gitHooksDir = path.join('.git', 'hooks');
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  const hookPath = path.join(gitHooksDir, 'commit-msg');
  fs.writeFileSync(hookPath, commitMsgHook, { mode: 0o755 });

  // Create prepare-commit-msg hook for assistance
  const prepareCommitMsgHook = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const commitMsgFile = process.argv[2];
const commitType = process.argv[3];

function getBranchName() {
  try {
    return require('child_process')
      .execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' })
      .trim();
  } catch {
    return '';
  }
}

function suggestCommitMessage() {
  const branch = getBranchName();

  // Extract issue/ticket number from branch name
  const issueMatch = branch.match(/(?:issue|ticket|feature|bug|fix)[-_]?(\\d+)/i);
  const issueNumber = issueMatch ? issueMatch[1] : null;

  // Suggest based on branch name
  if (branch.includes('feature') || branch.includes('feat')) {
    return \`feat: \${issueNumber ? \`#${issueNumber} \` : ''}add new feature\`;
  } else if (branch.includes('fix') || branch.includes('bug')) {
    return \`fix: \${issueNumber ? \`#${issueNumber} \` : ''}resolve issue\`;
  } else if (branch.includes('docs')) {
    return 'docs: update documentation';
  } else if (branch.includes('test')) {
    return 'test: add test coverage';
  } else if (branch.includes('refactor')) {
    return 'refactor: improve code structure';
  }

  return 'feat: add new functionality';
}

// Only assist for non-amend commits
if (commitType !== 'message' && commitType !== 'commit') {
  const existingMessage = fs.readFileSync(commitMsgFile, 'utf8').trim();

  if (!existingMessage || existingMessage.startsWith('feat') || existingMessage.startsWith('fix') || existingMessage.startsWith('docs')) {
    // Message already follows convention or is empty
    return;
  }

  // Suggest a conventional commit message
  const suggestion = suggestCommitMessage();
  console.log('');
  console.log('💡 Suggested commit message format:');
  console.log('   ' + suggestion);
  console.log('');
  console.log('📖 Conventional commit types:');
  console.log('   feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert');
  console.log('   improvement, security, hotfix, emergency');
  console.log('');
}
`;

  const prepareHookPath = path.join(gitHooksDir, 'prepare-commit-msg');
  fs.writeFileSync(prepareHookPath, prepareCommitMsgHook, { mode: 0o755 });

  // Create VS Code settings for conventional commits
  const vscodeSettings = {
    "git.inputValidation": true,
    "git.inputValidationSubjectLength": 100,
    "git.inputValidationLength": 72,
    "conventionalCommits.scopes": [
      "auth", "api", "ui", "docs", "ci", "deps", "config", "test", "perf", "security",
      "core", "components", "hooks", "utils", "types", "styles", "assets", "build",
      "release", "changelog", "readme", "examples", "scripts", "workflows"
    ],
    "conventionalCommits.types": [
      { "name": "feat", "description": "A new feature" },
      { "name": "fix", "description": "A bug fix" },
      { "name": "docs", "description": "Documentation only changes" },
      { "name": "style", "description": "Changes that do not affect the meaning of the code" },
      { "name": "refactor", "description": "A code change that neither fixes a bug nor adds a feature" },
      { "name": "perf", "description": "A code change that improves performance" },
      { "name": "test", "description": "Adding missing tests or correcting existing tests" },
      { "name": "build", "description": "Changes that affect the build system or external dependencies" },
      { "name": "ci", "description": "Changes to our CI configuration files and scripts" },
      { "name": "chore", "description": "Other changes that don't modify src or test files" },
      { "name": "revert", "description": "Reverts a previous commit" },
      { "name": "improvement", "description": "An improvement to existing functionality" },
      { "name": "security", "description": "Security-related changes" },
      { "name": "hotfix", "description": "Critical hotfix for production issues" },
      { "name": "emergency", "description": "Emergency fix requiring immediate release" }
    ]
  };

  const vscodeDir = '.vscode';
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(vscodeSettings, null, 2)
  );

  // Create commitizen configuration
  const czConfig = {
    types: vscodeSettings.conventionalCommits.types,
    scopes: vscodeSettings.conventionalCommits.scopes,
    allowCustomScopes: true,
    allowBreakingChanges: ['feat', 'fix'],
    subjectLimit: 100,
    footerPrefix: 'BREAKING CHANGE:',
    askForBreakingChangeFirst: true
  };

  fs.writeFileSync(
    '.czrc',
    JSON.stringify(czConfig, null, 2)
  );

  console.log('✅ Conventional commits setup complete!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Install commitizen globally: npm install -g commitizen');
  console.log('2. Use "cz" or "git cz" instead of "git commit" for interactive commit creation');
  console.log('3. Commit messages will be automatically validated');
  console.log('');
  console.log('🔗 Resources:');
  console.log('• https://conventionalcommits.org/');
  console.log('• https://github.com/commitizen/cz-cli');
  console.log('• https://github.com/conventional-changelog/commitlint');
}

setupConventionalCommits();
```

### AI-Enhanced Changelog Generation

```typescript
// packages/changelog-agent/src/ChangelogGenerator.ts
import { OpenAI } from 'openai';
import { GitService } from './services/GitService';
import { ReleaseService } from './services/ReleaseService';

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch' | 'prerelease';
  channel: string;
  summary: string;
  sections: {
    features: ChangelogItem[];
    fixes: ChangelogItem[];
    breaking: ChangelogItem[];
    performance: ChangelogItem[];
    security: ChangelogItem[];
    other: ChangelogItem[];
  };
  contributors: Contributor[];
  stats: ReleaseStats;
  links: {
    release: string;
    compare: string;
    npm?: string;
  };
}

export interface ChangelogItem {
  type: 'feat' | 'fix' | 'perf' | 'security' | 'breaking' | 'other';
  scope?: string;
  description: string;
  author: string;
  commit: string;
  issues?: string[];
  pr?: string;
  impact: 'low' | 'medium' | 'high';
  category: string;
}

export interface Contributor {
  name: string;
  email: string;
  commits: number;
  type: 'author' | 'reviewer' | 'maintainer';
}

export interface ReleaseStats {
  commits: number;
  files: number;
  additions: number;
  deletions: number;
  contributors: number;
  duration: number; // days since last release
}

export class ChangelogGenerator {
  private openai: OpenAI;
  private git: GitService;
  private release: ReleaseService;

  constructor(config: {
    openaiApiKey: string;
    repository: string;
  }) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.git = new GitService(config.repository);
    this.release = new ReleaseService();
  }

  async generateChangelog(fromRef: string, toRef: string): Promise<ChangelogEntry> {
    console.log(`📝 Generating changelog from ${fromRef} to ${toRef}`);

    // Get commits between refs
    const commits = await this.git.getCommitsBetween(fromRef, toRef);

    // Analyze commits
    const analyzedCommits = await this.analyzeCommits(commits);

    // Get release info
    const releaseInfo = await this.determineReleaseInfo(analyzedCommits, toRef);

    // Generate AI-enhanced descriptions
    const enhancedItems = await this.enhanceChangelogItems(analyzedCommits);

    // Get contributors
    const contributors = await this.getContributors(fromRef, toRef);

    // Get release stats
    const stats = await this.calculateReleaseStats(fromRef, toRef);

    // Generate summary
    const summary = await this.generateReleaseSummary(enhancedItems, releaseInfo);

    // Organize into sections
    const sections = this.organizeIntoSections(enhancedItems);

    return {
      version: releaseInfo.version,
      date: new Date().toISOString().split('T')[0],
      type: releaseInfo.type,
      channel: releaseInfo.channel,
      summary,
      sections,
      contributors,
      stats,
      links: {
        release: `https://github.com/${this.git.repository}/releases/tag/v${releaseInfo.version}`,
        compare: `https://github.com/${this.git.repository}/compare/${fromRef}...${toRef}`,
        npm: `https://www.npmjs.com/package/hacer/v/${releaseInfo.version}`,
      },
    };
  }

  private async analyzeCommits(commits: any[]): Promise<AnalyzedCommit[]> {
    const analyzed: AnalyzedCommit[] = [];

    for (const commit of commits) {
      const analysis = await this.analyzeCommit(commit);
      analyzed.push(analysis);
    }

    return analyzed;
  }

  private async analyzeCommit(commit: any): Promise<AnalyzedCommit> {
    // Parse conventional commit
    const parsed = this.parseConventionalCommit(commit.message);

    // Determine impact and category
    const impact = this.determineImpact(parsed, commit);
    const category = this.determineCategory(parsed, commit);

    // Extract issues/PRs
    const issues = this.extractIssues(commit.message);
    const pr = this.extractPR(commit.message);

    return {
      sha: commit.sha,
      message: commit.message,
      parsed,
      author: commit.author,
      impact,
      category,
      issues,
      pr,
      stats: commit.stats,
    };
  }

  private parseConventionalCommit(message: string): ParsedCommit {
    const regex = /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)/;
    const match = message.match(regex);

    if (!match) {
      return {
        type: 'other',
        description: message,
        breaking: false,
      };
    }

    const groups = match.groups!;
    return {
      type: groups.type,
      scope: groups.scope,
      description: groups.description,
      breaking: !!groups.breaking || message.includes('BREAKING CHANGE'),
    };
  }

  private determineImpact(parsed: ParsedCommit, commit: any): 'low' | 'medium' | 'high' {
    if (parsed.breaking) return 'high';
    if (parsed.type === 'feat') return 'medium';
    if (parsed.type === 'fix' && this.hasTests(commit)) return 'low';
    if (parsed.type === 'security') return 'high';
    if (parsed.type === 'perf') return 'medium';
    return 'low';
  }

  private determineCategory(parsed: ParsedCommit, commit: any): string {
    const scope = parsed.scope?.toLowerCase();

    if (scope?.includes('auth') || scope?.includes('security')) return 'Security';
    if (scope?.includes('api')) return 'API';
    if (scope?.includes('ui') || scope?.includes('component')) return 'User Interface';
    if (scope?.includes('docs')) return 'Documentation';
    if (scope?.includes('test')) return 'Testing';
    if (scope?.includes('build') || scope?.includes('ci')) return 'Build & CI';
    if (scope?.includes('perf')) return 'Performance';
    if (parsed.type === 'feat') return 'Features';
    if (parsed.type === 'fix') return 'Bug Fixes';

    return 'Other';
  }

  private extractIssues(message: string): string[] {
    const issueRegex = /#(\d+)/g;
    const matches = [];
    let match;
    while ((match = issueRegex.exec(message)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private extractPR(message: string): string | undefined {
    const prRegex = /\(#(\d+)\)$/;
    const match = message.match(prRegex);
    return match ? match[1] : undefined;
  }

  private hasTests(commit: any): boolean {
    // Check if commit includes test files
    return commit.files?.some((file: string) =>
      file.includes('.test.') ||
      file.includes('.spec.') ||
      file.includes('__tests__')
    ) || false;
  }

  private async determineReleaseInfo(commits: AnalyzedCommit[], toRef: string): Promise<ReleaseInfo> {
    const hasBreaking = commits.some(c => c.parsed.breaking);
    const hasFeatures = commits.some(c => c.parsed.type === 'feat');
    const hasFixes = commits.some(c => c.parsed.type === 'fix');

    let type: 'major' | 'minor' | 'patch' | 'prerelease';
    let channel = 'latest';

    if (hasBreaking) {
      type = 'major';
    } else if (hasFeatures) {
      type = 'minor';
    } else if (hasFixes) {
      type = 'patch';
    } else {
      type = 'patch'; // Default to patch
    }

    // Determine channel
    if (toRef.includes('beta')) channel = 'beta';
    else if (toRef.includes('alpha')) channel = 'alpha';
    else if (toRef.includes('next')) channel = 'next';

    // Calculate version (simplified)
    const currentVersion = await this.getCurrentVersion();
    const version = this.incrementVersion(currentVersion, type);

    return { version, type, channel };
  }

  private async enhanceChangelogItems(commits: AnalyzedCommit[]): Promise<ChangelogItem[]> {
    const enhanced: ChangelogItem[] = [];

    for (const commit of commits) {
      const enhancedDescription = await this.enhanceDescription(commit);

      enhanced.push({
        type: commit.parsed.type as any,
        scope: commit.parsed.scope,
        description: enhancedDescription,
        author: commit.author.name,
        commit: commit.sha.substring(0, 7),
        issues: commit.issues,
        pr: commit.pr,
        impact: commit.impact,
        category: commit.category,
      });
    }

    return enhanced;
  }

  private async enhanceDescription(commit: AnalyzedCommit): Promise<string> {
    // Use AI to enhance commit descriptions for better readability
    const prompt = `Enhance this commit message to be more user-friendly and descriptive:

Original: "${commit.message}"

Make it clearer and more informative while keeping technical accuracy. Focus on what the change accomplishes rather than how it was implemented.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You enhance commit messages to be clearer and more user-friendly.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      return response.choices[0]?.message?.content?.trim() || commit.parsed.description;
    } catch (error) {
      console.warn('Failed to enhance description, using original:', error);
      return commit.parsed.description;
    }
  }

  private async generateReleaseSummary(items: ChangelogItem[], releaseInfo: ReleaseInfo): Promise<string> {
    const featureCount = items.filter(i => i.type === 'feat').length;
    const fixCount = items.filter(i => i.type === 'fix').length;
    const breakingCount = items.filter(i => i.type === 'breaking').length;

    const prompt = `Generate a concise release summary for version ${releaseInfo.version}:

- Release type: ${releaseInfo.type}
- New features: ${featureCount}
- Bug fixes: ${fixCount}
- Breaking changes: ${breakingCount}

Create a brief, engaging summary highlighting the most important improvements.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You create engaging release summaries that highlight key improvements.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 150,
      });

      return response.choices[0]?.message?.content?.trim() || `Version ${releaseInfo.version} release`;
    } catch (error) {
      return `Version ${releaseInfo.version} with ${featureCount} new features and ${fixCount} bug fixes`;
    }
  }

  private organizeIntoSections(items: ChangelogItem[]): ChangelogEntry['sections'] {
    const sections = {
      features: [] as ChangelogItem[],
      fixes: [] as ChangelogItem[],
      breaking: [] as ChangelogItem[],
      performance: [] as ChangelogItem[],
      security: [] as ChangelogItem[],
      other: [] as ChangelogItem[],
    };

    for (const item of items) {
      switch (item.type) {
        case 'feat':
          sections.features.push(item);
          break;
        case 'fix':
          sections.fixes.push(item);
          break;
        case 'breaking':
          sections.breaking.push(item);
          break;
        case 'perf':
          sections.performance.push(item);
          break;
        case 'security':
          sections.security.push(item);
          break;
        default:
          sections.other.push(item);
      }
    }

    return sections;
  }

  private async getContributors(fromRef: string, toRef: string): Promise<Contributor[]> {
    const contributors = await this.git.getContributors(fromRef, toRef);

    return contributors.map(c => ({
      name: c.name,
      email: c.email,
      commits: c.commits,
      type: this.determineContributorType(c),
    }));
  }

  private determineContributorType(contributor: any): Contributor['type'] {
    if (contributor.commits > 50) return 'maintainer';
    if (contributor.commits > 10) return 'reviewer';
    return 'author';
  }

  private async calculateReleaseStats(fromRef: string, toRef: string): Promise<ReleaseStats> {
    const diff = await this.git.getDiffStats(fromRef, toRef);
    const lastReleaseDate = await this.git.getLastReleaseDate();
    const duration = lastReleaseDate ? (Date.now() - lastReleaseDate) / (1000 * 60 * 60 * 24) : 0;

    return {
      commits: diff.commits,
      files: diff.files,
      additions: diff.additions,
      deletions: diff.deletions,
      contributors: diff.contributors,
      duration,
    };
  }

  private async getCurrentVersion(): Promise<string> {
    // Get current version from package.json or git tags
    return '1.0.0'; // Placeholder
  }

  private incrementVersion(version: string, type: 'major' | 'minor' | 'patch' | 'prerelease'): string {
    const [major, minor, patch] = version.split('.').map(Number);

    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return version;
    }
  }
}

// Type definitions
interface ParsedCommit {
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
}

interface AnalyzedCommit extends ParsedCommit {
  sha: string;
  message: string;
  author: any;
  impact: 'low' | 'medium' | 'high';
  category: string;
  issues: string[];
  pr?: string;
  stats: any;
}

interface ReleaseInfo {
  version: string;
  type: 'major' | 'minor' | 'patch' | 'prerelease';
  channel: string;
}
```

### GitHub Actions Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main, beta, alpha]
  workflow_dispatch:
    inputs:
      version:
        description: 'Force release version (leave empty for auto)'
        required: false
      prerelease:
        description: 'Mark as prerelease'
        type: boolean
        default: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run tests
        run: npm run test

      - name: Run e2e tests
        run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build:web

      - name: Build desktop apps
        run: npm run build:desktop

      - name: Package artifacts
        run: |
          # Create distribution directory
          mkdir -p dist

          # Package web app
          cd apps/website/.next
          zip -r ../../../dist/hacer-web.zip .

          # Package desktop apps (assuming built)
          # cp path/to/linux/app.AppImage dist/hacer-desktop.AppImage
          # cp path/to/macos/app.dmg dist/hacer-desktop.dmg
          # cp path/to/windows/app.exe dist/hacer-desktop.exe

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: dist/
          retention-days: 30

  release:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || github.event.inputs.version != ''
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-artifacts
          path: dist/

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
        run: npx semantic-release ${{ github.event.inputs.version && format('--no-ci --tag v{0}', github.event.inputs.version) || '' }}

  post-release:
    needs: release
    runs-on: ubuntu-latest
    if: success()
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Update documentation
        run: |
          # Trigger documentation update
          npm run docs:update-changelog

      - name: Deploy website
        run: |
          # Deploy updated website with new changelog
          npm run deploy:website

      - name: Send notifications
        run: |
          # Send notifications to various channels
          npm run notify:release

      - name: Update issue trackers
        run: |
          # Update any linked issues with release info
          npm run update:issues
```

---

## 21.2 Release Quality Gates

**Requirements:** Automated quality checks and manual approvals to ensure release stability and user experience quality.

### Quality Gate Implementation

```typescript
// packages/quality-gates/src/QualityGateEngine.ts
export interface QualityGate {
  id: string;
  name: string;
  description: string;
  category: 'code' | 'test' | 'performance' | 'security' | 'documentation' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  check: QualityCheck;
  remediation?: string;
}

export interface QualityCheck {
  (context: QualityCheckContext): Promise<QualityCheckResult>;
}

export interface QualityCheckContext {
  branch: string;
  commit: string;
  prNumber?: number;
  changedFiles: string[];
  targetVersion: string;
  releaseType: 'major' | 'minor' | 'patch' | 'prerelease';
}

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  message: string;
  details?: any;
  suggestions?: string[];
  blocking: boolean;
}

export class QualityGateEngine {
  private gates: Map<string, QualityGate> = new Map();

  constructor() {
    this.registerDefaultGates();
  }

  registerGate(gate: QualityGate): void {
    this.gates.set(gate.id, gate);
  }

  async runQualityGates(context: QualityCheckContext): Promise<QualityGateResults> {
    console.log(`🔍 Running quality gates for ${context.branch} → ${context.targetVersion}`);

    const results: QualityGateResult[] = [];
    let totalScore = 0;
    let criticalFailures = 0;
    let blockingFailures = 0;

    for (const gate of this.gates.values()) {
      try {
        console.log(`  Checking: ${gate.name}`);
        const result = await gate.check(context);

        results.push({
          gateId: gate.id,
          gateName: gate.name,
          passed: result.passed,
          score: result.score,
          message: result.message,
          details: result.details,
          suggestions: result.suggestions,
          blocking: result.blocking,
          category: gate.category,
          severity: gate.severity,
          automated: gate.automated,
        });

        totalScore += result.score;

        if (!result.passed && gate.severity === 'critical') {
          criticalFailures++;
        }

        if (!result.passed && result.blocking) {
          blockingFailures++;
        }

      } catch (error) {
        console.error(`❌ Quality gate ${gate.id} failed:`, error);
        results.push({
          gateId: gate.id,
          gateName: gate.name,
          passed: false,
          score: 0,
          message: `Gate execution failed: ${error.message}`,
          blocking: true,
          category: gate.category,
          severity: gate.severity,
          automated: gate.automated,
        });
        blockingFailures++;
      }
    }

    const overallScore = Math.round(totalScore / this.gates.size);
    const passed = criticalFailures === 0 && blockingFailures === 0 && overallScore >= 70;

    return {
      passed,
      overallScore,
      results,
      summary: {
        totalGates: this.gates.size,
        passedGates: results.filter(r => r.passed).length,
        failedGates: results.filter(r => !r.passed).length,
        criticalFailures,
        blockingFailures,
      },
    };
  }

  getGates(): QualityGate[] {
    return Array.from(this.gates.values());
  }

  private registerDefaultGates(): void {
    // Code Quality Gates
    this.registerGate({
      id: 'code-lint',
      name: 'Code Linting',
      description: 'Ensures code follows style guidelines',
      category: 'code',
      severity: 'high',
      automated: true,
      check: async (context) => {
        // Run ESLint, Prettier, etc.
        const lintResult = await this.runLintCheck(context.changedFiles);
        return {
          passed: lintResult.errors === 0,
          score: Math.max(0, 100 - lintResult.errors * 10),
          message: `Found ${lintResult.errors} linting errors, ${lintResult.warnings} warnings`,
          details: lintResult,
          blocking: lintResult.errors > 0,
        };
      },
      remediation: 'Run `npm run lint:fix` to automatically fix issues',
    });

    this.registerGate({
      id: 'type-check',
      name: 'Type Checking',
      description: 'Ensures TypeScript types are correct',
      category: 'code',
      severity: 'critical',
      automated: true,
      check: async (context) => {
        const typeResult = await this.runTypeCheck();
        return {
          passed: typeResult.errors === 0,
          score: typeResult.errors === 0 ? 100 : 0,
          message: `TypeScript: ${typeResult.errors} errors`,
          details: typeResult,
          blocking: true,
        };
      },
      remediation: 'Fix TypeScript errors before releasing',
    });

    // Test Quality Gates
    this.registerGate({
      id: 'test-coverage',
      name: 'Test Coverage',
      description: 'Ensures adequate test coverage',
      category: 'test',
      severity: 'medium',
      automated: true,
      check: async (context) => {
        const coverage = await this.runCoverageCheck();
        const minCoverage = 80;
        const passed = coverage.overall >= minCoverage;

        return {
          passed,
          score: Math.min(100, coverage.overall),
          message: `Test coverage: ${coverage.overall.toFixed(1)}% (required: ${minCoverage}%)`,
          details: coverage,
          blocking: false,
          suggestions: passed ? [] : ['Add more tests to increase coverage'],
        };
      },
      remediation: 'Add unit tests for uncovered code',
    });

    this.registerGate({
      id: 'test-results',
      name: 'Test Results',
      description: 'Ensures all tests pass',
      category: 'test',
      severity: 'critical',
      automated: true,
      check: async (context) => {
        const testResult = await this.runTestSuite();
        return {
          passed: testResult.failed === 0,
          score: testResult.passed / (testResult.passed + testResult.failed) * 100,
          message: `Tests: ${testResult.passed} passed, ${testResult.failed} failed`,
          details: testResult,
          blocking: true,
        };
      },
      remediation: 'Fix failing tests before releasing',
    });

    // Performance Gates
    this.registerGate({
      id: 'performance-budget',
      name: 'Performance Budget',
      description: 'Ensures app stays within performance limits',
      category: 'performance',
      severity: 'medium',
      automated: true,
      check: async (context) => {
        const perfResult = await this.runPerformanceCheck();
        const budgetExceeded = perfResult.bundleSize > 2.5 || perfResult.loadTime > 3000;

        return {
          passed: !budgetExceeded,
          score: budgetExceeded ? 50 : 100,
          message: `Bundle: ${(perfResult.bundleSize).toFixed(1)}MB, Load time: ${perfResult.loadTime}ms`,
          details: perfResult,
          blocking: budgetExceeded,
          suggestions: budgetExceeded ? ['Optimize bundle size or load performance'] : [],
        };
      },
      remediation: 'Optimize bundle size and loading performance',
    });

    // Security Gates
    this.registerGate({
      id: 'security-scan',
      name: 'Security Scan',
      description: 'Scans for security vulnerabilities',
      category: 'security',
      severity: 'high',
      automated: true,
      check: async (context) => {
        const securityResult = await this.runSecurityScan();
        const hasCritical = securityResult.vulnerabilities.some(v => v.severity === 'critical');
        const hasHigh = securityResult.vulnerabilities.some(v => v.severity === 'high');

        return {
          passed: !hasCritical,
          score: hasCritical ? 0 : hasHigh ? 50 : 100,
          message: `Security scan: ${securityResult.vulnerabilities.length} issues found`,
          details: securityResult,
          blocking: hasCritical,
          suggestions: securityResult.vulnerabilities.map(v => `Fix ${v.severity} vulnerability in ${v.package}`),
        };
      },
      remediation: 'Update vulnerable dependencies or implement security fixes',
    });

    // Documentation Gates
    this.registerGate({
      id: 'docs-completeness',
      name: 'Documentation Completeness',
      description: 'Ensures documentation is up to date',
      category: 'documentation',
      severity: 'medium',
      automated: true,
      check: async (context) => {
        const docsResult = await this.checkDocumentationCompleteness(context.changedFiles);
        return {
          passed: docsResult.missingDocs.length === 0,
          score: Math.max(0, 100 - docsResult.missingDocs.length * 10),
          message: `Documentation: ${docsResult.coverage.toFixed(1)}% complete`,
          details: docsResult,
          blocking: false,
          suggestions: docsResult.missingDocs.map(d => `Add documentation for ${d}`),
        };
      },
      remediation: 'Add missing documentation for changed components/APIs',
    });

    // Compliance Gates
    this.registerGate({
      id: 'license-compliance',
      name: 'License Compliance',
      description: 'Ensures all dependencies have acceptable licenses',
      category: 'compliance',
      severity: 'high',
      automated: true,
      check: async (context) => {
        const licenseResult = await this.checkLicenseCompliance();
        const hasIssues = licenseResult.issues.length > 0;

        return {
          passed: !hasIssues,
          score: hasIssues ? 50 : 100,
          message: `License check: ${licenseResult.issues.length} issues found`,
          details: licenseResult,
          blocking: hasIssues,
          suggestions: licenseResult.issues.map(i => `Address license issue with ${i.package}`),
        };
      },
      remediation: 'Replace dependencies with incompatible licenses',
    });

    // Manual Gates (require human approval)
    this.registerGate({
      id: 'breaking-changes-review',
      name: 'Breaking Changes Review',
      description: 'Manual review of breaking changes',
      category: 'compliance',
      severity: 'critical',
      automated: false,
      check: async (context) => {
        const hasBreaking = await this.checkForBreakingChanges(context);
        if (!hasBreaking) {
          return {
            passed: true,
            score: 100,
            message: 'No breaking changes detected',
            blocking: false,
          };
        }

        // For breaking changes, require manual approval
        return {
          passed: false, // Will be updated by manual review
          score: 0,
          message: 'Breaking changes require manual review and approval',
          blocking: true,
          suggestions: ['Review breaking changes with product team', 'Update migration guide'],
        };
      },
    });
  }

  // Helper methods for running checks
  private async runLintCheck(files: string[]): Promise<any> {
    // Run ESLint on changed files
    return { errors: 0, warnings: 2 }; // Placeholder
  }

  private async runTypeCheck(): Promise<any> {
    // Run TypeScript type checking
    return { errors: 0 }; // Placeholder
  }

  private async runCoverageCheck(): Promise<any> {
    // Run test coverage analysis
    return { overall: 85.5 }; // Placeholder
  }

  private async runTestSuite(): Promise<any> {
    // Run test suite
    return { passed: 145, failed: 0 }; // Placeholder
  }

  private async runPerformanceCheck(): Promise<any> {
    // Run performance checks
    return { bundleSize: 2.1, loadTime: 2100 }; // Placeholder
  }

  private async runSecurityScan(): Promise<any> {
    // Run security vulnerability scan
    return { vulnerabilities: [] }; // Placeholder
  }

  private async checkDocumentationCompleteness(changedFiles: string[]): Promise<any> {
    // Check if documentation exists for changed components
    return { coverage: 92.3, missingDocs: [] }; // Placeholder
  }

  private async checkLicenseCompliance(): Promise<any> {
    // Check dependency licenses
    return { issues: [] }; // Placeholder
  }

  private async checkForBreakingChanges(context: QualityCheckContext): Promise<boolean> {
    // Check for breaking changes in commits
    return false; // Placeholder
  }
}

// Result types
export interface QualityGateResult {
  gateId: string;
  gateName: string;
  passed: boolean;
  score: number;
  message: string;
  details?: any;
  suggestions?: string[];
  blocking: boolean;
  category: string;
  severity: string;
  automated: boolean;
}

export interface QualityGateResults {
  passed: boolean;
  overallScore: number;
  results: QualityGateResult[];
  summary: {
    totalGates: number;
    passedGates: number;
    failedGates: number;
    criticalFailures: number;
    blockingFailures: number;
  };
}
```

### Release Approval Workflow

```typescript
// packages/release-manager/src/ReleaseApprovalWorkflow.ts
export interface ReleaseApproval {
  id: string;
  version: string;
  releaseType: 'major' | 'minor' | 'patch' | 'prerelease';
  qualityGateResults: QualityGateResults;
  approvals: Approval[];
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  createdAt: number;
  approvedAt?: number;
  releasedAt?: number;
}

export interface Approval {
  reviewerId: string;
  reviewerName: string;
  role: 'maintainer' | 'qa' | 'product' | 'security';
  decision: 'approved' | 'rejected' | 'changes-requested';
  comments: string;
  timestamp: number;
  blocking: boolean;
}

export class ReleaseApprovalWorkflow {
  private approvals: Map<string, ReleaseApproval> = new Map();

  async requestApproval(
    version: string,
    releaseType: string,
    qualityResults: QualityGateResults
  ): Promise<ReleaseApproval> {
    const approval: ReleaseApproval = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      version,
      releaseType: releaseType as any,
      qualityGateResults: qualityResults,
      approvals: [],
      status: 'pending',
      createdAt: Date.now(),
    };

    this.approvals.set(approval.id, approval);

    // Auto-approve if quality gates pass and no critical issues
    if (qualityResults.passed && qualityResults.summary.criticalFailures === 0) {
      approval.status = 'auto-approved';
      approval.approvedAt = Date.now();
      console.log(`✅ Release ${version} auto-approved (quality gates passed)`);
    } else {
      // Request manual approval
      await this.requestManualApproval(approval);
    }

    return approval;
  }

  async submitApproval(
    approvalId: string,
    reviewerId: string,
    reviewerName: string,
    decision: Approval['decision'],
    comments: string,
    role: Approval['role']
  ): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error('Approval request not found');
    }

    const reviewerApproval: Approval = {
      reviewerId,
      reviewerName,
      role,
      decision,
      comments,
      timestamp: Date.now(),
      blocking: decision === 'rejected' || decision === 'changes-requested',
    };

    approval.approvals.push(reviewerApproval);

    // Update approval status
    await this.updateApprovalStatus(approval);
  }

  async getApprovalStatus(approvalId: string): Promise<ReleaseApproval | null> {
    return this.approvals.get(approvalId) || null;
  }

  async getPendingApprovals(): Promise<ReleaseApproval[]> {
    return Array.from(this.approvals.values())
      .filter(a => a.status === 'pending');
  }

  private async requestManualApproval(approval: ReleaseApproval): Promise<void> {
    console.log(`⏳ Release ${approval.version} requires manual approval`);

    // Send notifications to required reviewers
    const reviewers = await this.getRequiredReviewers(approval);

    for (const reviewer of reviewers) {
      await this.notifyReviewer(reviewer, approval);
    }
  }

  private async updateApprovalStatus(approval: ReleaseApproval): Promise<void> {
    const approvals = approval.approvals;
    const rejections = approvals.filter(a => a.decision === 'rejected');
    const changeRequests = approvals.filter(a => a.decision === 'changes-requested');
    const acceptances = approvals.filter(a => a.decision === 'approved');

    // Check for blocking decisions
    if (rejections.length > 0) {
      approval.status = 'rejected';
      console.log(`❌ Release ${approval.version} rejected`);
      return;
    }

    if (changeRequests.length > 0) {
      approval.status = 'pending';
      console.log(`📝 Release ${approval.version} has change requests`);
      return;
    }

    // Check if we have required approvals
    const requiredRoles = ['maintainer', 'qa'];
    const hasRequiredApprovals = requiredRoles.every(role =>
      approvals.some(a => a.role === role && a.decision === 'approved')
    );

    if (hasRequiredApprovals && acceptances.length >= 2) {
      approval.status = 'approved';
      approval.approvedAt = Date.now();
      console.log(`✅ Release ${approval.version} approved`);
    }
  }

  private async getRequiredReviewers(approval: ReleaseApproval): Promise<Reviewer[]> {
    // Get reviewers based on release type and quality gate results
    const reviewers: Reviewer[] = [];

    // Always include maintainers
    reviewers.push(...await this.getMaintainers());

    // Include QA for any release
    reviewers.push(...await this.getQAReviewers());

    // Include product owner for major releases
    if (approval.releaseType === 'major') {
      reviewers.push(...await this.getProductReviewers());
    }

    // Include security reviewer if there were security issues
    if (approval.qualityGateResults.results.some(r =>
      r.category === 'security' && !r.passed
    )) {
      reviewers.push(...await this.getSecurityReviewers());
    }

    return reviewers;
  }

  private async notifyReviewer(reviewer: Reviewer, approval: ReleaseApproval): Promise<void> {
    const notification = {
      title: `Release Approval Required: ${approval.version}`,
      body: `Please review the ${approval.releaseType} release of HACER v${approval.version}`,
      actionUrl: `/admin/releases/${approval.id}`,
      priority: approval.releaseType === 'major' ? 'high' : 'normal',
    };

    // Send notification via email, Slack, etc.
    await this.sendNotification(reviewer, notification);
  }

  // Placeholder methods (would be implemented with actual user/team data)
  private async getMaintainers(): Promise<Reviewer[]> {
    return [{ id: 'maintainer1', name: 'John Doe', email: 'john@hacer.com', role: 'maintainer' }];
  }

  private async getQAReviewers(): Promise<Reviewer[]> {
    return [{ id: 'qa1', name: 'Jane Smith', email: 'jane@hacer.com', role: 'qa' }];
  }

  private async getProductReviewers(): Promise<Reviewer[]> {
    return [{ id: 'product1', name: 'Bob Johnson', email: 'bob@hacer.com', role: 'product' }];
  }

  private async getSecurityReviewers(): Promise<Reviewer[]> {
    return [{ id: 'security1', name: 'Alice Brown', email: 'alice@hacer.com', role: 'security' }];
  }

  private async sendNotification(reviewer: Reviewer, notification: any): Promise<void> {
    // Send email, Slack message, etc.
    console.log(`📧 Notifying ${reviewer.name} about release approval`);
  }
}

// Types
interface Reviewer {
  id: string;
  name: string;
  email: string;
  role: string;
}
```

---

## 21.3 Phase 21 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Semantic release configuration | 8h | - | - | Release config complete with all plugins |
| Conventional commits setup | 6h | Release config | - | Git hooks and validation working |
| Commit message enforcement | 4h | Commits setup | - | All commits follow conventional format |
| Changelog generation system | 8h | Commit enforcement | <5s generation | AI-enhanced changelogs created |
| Release workflow automation | 6h | Changelog system | - | GitHub Actions release pipeline working |
| Multi-branch release strategy | 4h | Workflow automation | - | Beta/alpha/main releases configured |
| Quality gates implementation | 8h | Multi-branch | <2s gate execution | Automated quality checks working |
| Release approval workflow | 6h | Quality gates | - | Manual approval process for major releases |
| Artifact packaging | 4h | Approval workflow | - | Web and desktop apps packaged for release |
| Release notifications | 4h | Artifact packaging | - | Slack, email notifications working |
| Post-release automation | 4h | Notifications | - | Documentation and deployment updates |
| Release analytics | 3h | Post-release | - | Download and usage tracking |

**Total Estimated Effort:** ~65 hours (3 weeks)  
**Performance Budget:** <5s changelog generation, <2s quality gates  
**Quality Gates:** Automated releases working, conventional commits enforced, comprehensive quality gates

---

## Risk Mitigation

**Release Automation Complexity:** Start with simple releases and gradually add automation to ensure reliability.

**Conventional Commit Adoption:** Provide training and tools to help team adopt conventional commit format.

**Quality Gate False Positives:** Implement override mechanisms and tune quality gate thresholds based on feedback.

**Breaking Change Management:** Require explicit approval and migration guides for breaking changes.

---

**Part of:** [Comprehensive Development Roadmap](../README.md)  
**Previous:** [Phase 3.5: Testing & Quality Infrastructure](phase-3.5-testing-infrastructure.md)  
**Next:** [Phase 5: Core Architecture](phase-5-core-architecture.md)