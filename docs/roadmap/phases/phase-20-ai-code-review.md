# Phase 20: AI-Powered Code Review & Quality Gates (Weeks 76-78)

**Part of:** [Comprehensive Development Roadmap](../../README.md)
**Priority:** 🟡 MEDIUM
**Timeline:** Weeks 76-78
**Dependencies:** Phase 19 complete (documentation system established), Phase 4.5 complete (release processes in place)
**Effort:** ~40 hours

---

## Overview

This phase implements intelligent AI-powered code review automation that enhances code quality, enforces development standards, and provides real-time feedback to developers. The system integrates seamlessly with existing CI/CD pipelines while offering human oversight and learning capabilities.

**Exit Criteria:**
- AI code review system analyzing all PRs automatically
- Quality gates preventing low-quality code from merging
- Developer feedback loop improving AI accuracy over time
- Comprehensive test coverage and security scanning
- Performance benchmarks maintained across releases

---

## 23.1 AI Code Review Architecture

**Requirements:** Intelligent code analysis that understands context, provides actionable feedback, and learns from developer interactions.

### Code Review Agent Core

```typescript
// packages/review-agent/src/core/CodeReviewAgent.ts
import { OpenAI } from 'openai';
import { GitService } from '../services/GitService';
import { CodeAnalysisService } from '../services/CodeAnalysisService';
import { QualityGateService } from '../services/QualityGateService';
import { LearningService } from '../services/LearningService';

export interface PullRequestReview {
  id: string;
  prNumber: number;
  repository: string;
  status: 'pending' | 'analyzing' | 'reviewing' | 'completed' | 'failed';
  analysis: CodeAnalysis;
  review: AIReview;
  qualityGates: QualityGateResult[];
  recommendations: Recommendation[];
  metadata: ReviewMetadata;
}

export interface CodeAnalysis {
  files: AnalyzedFile[];
  summary: {
    totalFiles: number;
    linesChanged: number;
    complexity: number;
    testCoverage: number;
    securityIssues: number;
    performanceIssues: number;
  };
}

export interface AnalyzedFile {
  filename: string;
  language: string;
  changes: CodeChange[];
  complexity: number;
  testCoverage: number;
  issues: CodeIssue[];
}

export interface CodeChange {
  type: 'addition' | 'deletion' | 'modification';
  lineNumber: number;
  content: string;
  complexity: number;
  securityRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface CodeIssue {
  type: 'bug' | 'security' | 'performance' | 'maintainability' | 'style';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  line: number;
  column?: number;
  rule?: string;
  suggestion?: string;
  confidence: number;
}

export interface AIReview {
  overallScore: number;
  summary: string;
  comments: ReviewComment[];
  suggestions: ReviewSuggestion[];
  approvals: string[]; // Areas where code is approved
  concerns: string[]; // Areas needing attention
  confidence: number;
}

export interface ReviewComment {
  file: string;
  line: number;
  type: 'praise' | 'suggestion' | 'issue' | 'question';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  code?: string;
  suggestion?: string;
}

export interface ReviewSuggestion {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
  code?: string;
}

export interface QualityGateResult {
  gate: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  blocking: boolean;
}

export interface Recommendation {
  type: 'refactor' | 'test' | 'documentation' | 'security' | 'performance';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'quick' | 'moderate' | 'significant';
  impact: 'minor' | 'moderate' | 'major';
}

export interface ReviewMetadata {
  startedAt: number;
  completedAt?: number;
  duration: number;
  model: string;
  tokens: number;
  reviewer: string;
  version: string;
}

export class CodeReviewAgent {
  private openai: OpenAI;
  private git: GitService;
  private codeAnalysis: CodeAnalysisService;
  private qualityGates: QualityGateService;
  private learning: LearningService;

  private activeReviews = new Map<string, PullRequestReview>();

  constructor(config: {
    openaiApiKey: string;
    githubToken: string;
    repository: string;
    model?: string;
  }) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.git = new GitService(config.githubToken, config.repository);
    this.codeAnalysis = new CodeAnalysisService();
    this.qualityGates = new QualityGateService();
    this.learning = new LearningService();
  }

  async reviewPullRequest(prNumber: number): Promise<PullRequestReview> {
    const reviewId = `review-${prNumber}-${Date.now()}`;
    console.log(`🤖 Starting AI code review for PR #${prNumber}`);

    const review: PullRequestReview = {
      id: reviewId,
      prNumber,
      repository: this.git.repository,
      status: 'pending',
      analysis: {} as CodeAnalysis,
      review: {} as AIReview,
      qualityGates: [],
      recommendations: [],
      metadata: {
        startedAt: Date.now(),
        duration: 0,
        model: 'gpt-4-turbo',
        tokens: 0,
        reviewer: 'nand2fun-ai-reviewer',
        version: '1.0.0',
      },
    };

    this.activeReviews.set(reviewId, review);

    try {
      // Step 1: Analyze code changes
      review.status = 'analyzing';
      review.analysis = await this.analyzePullRequest(prNumber);
      console.log(`📊 Analysis complete: ${review.analysis.summary.totalFiles} files, ${review.analysis.summary.linesChanged} lines changed`);

      // Step 2: Run quality gates
      review.qualityGates = await this.runQualityGates(review.analysis);
      console.log(`🔍 Quality gates: ${review.qualityGates.filter(g => g.status === 'passed').length}/${review.qualityGates.length} passed`);

      // Step 3: Generate AI review
      review.status = 'reviewing';
      review.review = await this.generateAIReview(review);
      console.log(`💡 AI review complete: Score ${review.review.overallScore}/100`);

      // Step 4: Generate recommendations
      review.recommendations = await this.generateRecommendations(review);
      console.log(`💡 Generated ${review.recommendations.length} recommendations`);

      // Step 5: Finalize review
      review.status = 'completed';
      review.metadata.completedAt = Date.now();
      review.metadata.duration = review.metadata.completedAt - review.metadata.startedAt;

      // Learn from this review for future improvements
      await this.learning.learnFromReview(review);

      console.log(`✅ Review completed in ${review.metadata.duration}ms`);
      return review;

    } catch (error) {
      console.error(`❌ Review failed:`, error);
      review.status = 'failed';
      review.metadata.completedAt = Date.now();
      review.metadata.duration = review.metadata.completedAt - review.metadata.startedAt;

      throw error;
    } finally {
      // Clean up
      this.activeReviews.delete(reviewId);
    }
  }

  private async analyzePullRequest(prNumber: number): Promise<CodeAnalysis> {
    // Get PR details
    const pr = await this.git.getPullRequest(prNumber);

    // Get changed files
    const files = await this.git.getPullRequestFiles(prNumber);

    // Analyze each file
    const analyzedFiles: AnalyzedFile[] = [];
    let totalLinesChanged = 0;

    for (const file of files) {
      const analyzed = await this.analyzeFile(file, pr);
      analyzedFiles.push(analyzed);
      totalLinesChanged += analyzed.changes.reduce((sum, change) => sum + 1, 0);
    }

    // Calculate summary metrics
    const summary = {
      totalFiles: analyzedFiles.length,
      linesChanged: totalLinesChanged,
      complexity: analyzedFiles.reduce((sum, file) => sum + file.complexity, 0) / analyzedFiles.length,
      testCoverage: await this.calculateTestCoverage(analyzedFiles),
      securityIssues: analyzedFiles.reduce((sum, file) => sum + file.issues.filter(i => i.type === 'security').length, 0),
      performanceIssues: analyzedFiles.reduce((sum, file) => sum + file.issues.filter(i => i.type === 'performance').length, 0),
    };

    return { files: analyzedFiles, summary };
  }

  private async analyzeFile(file: any, pr: any): Promise<AnalyzedFile> {
    const changes: CodeChange[] = [];
    const issues: CodeIssue[] = [];

    // Analyze file content and changes
    const fileContent = await this.git.getFileContent(file.filename);
    const patch = file.patch;

    // Parse patch to extract changes
    if (patch) {
      const parsedChanges = this.parsePatch(patch);
      changes.push(...parsedChanges);
    }

    // Run static analysis
    const staticIssues = await this.codeAnalysis.analyzeFile(file.filename, fileContent, changes);
    issues.push(...staticIssues);

    // Calculate complexity
    const complexity = this.calculateFileComplexity(fileContent, changes);

    // Estimate test coverage for this file
    const testCoverage = await this.estimateTestCoverage(file.filename);

    return {
      filename: file.filename,
      language: this.detectLanguage(file.filename),
      changes,
      complexity,
      testCoverage,
      issues,
    };
  }

  private async runQualityGates(analysis: CodeAnalysis): Promise<QualityGateResult[]> {
    const results: QualityGateResult[] = [];

    // Code quality gate
    const qualityResult = await this.qualityGates.checkCodeQuality(analysis);
    results.push(qualityResult);

    // Security gate
    const securityResult = await this.qualityGates.checkSecurity(analysis);
    results.push(securityResult);

    // Performance gate
    const performanceResult = await this.qualityGates.checkPerformance(analysis);
    results.push(performanceResult);

    // Test coverage gate
    const testResult = await this.qualityGates.checkTestCoverage(analysis);
    results.push(testResult);

    // Documentation gate
    const docsResult = await this.qualityGates.checkDocumentation(analysis);
    results.push(docsResult);

    return results;
  }

  private async generateAIReview(review: PullRequestReview): Promise<AIReview> {
    const prompt = this.buildReviewPrompt(review);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert senior software engineer conducting a thorough code review for Nand2Fun, a circuit design platform built with React, TypeScript, Node.js, and modern web technologies.

Your review should be:
- Constructive and helpful
- Focused on code quality, maintainability, and best practices
- Specific with actionable suggestions
- Balanced between praise and criticism
- Considerate of the codebase context and existing patterns

Provide a comprehensive review with specific comments, suggestions, and an overall assessment.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiResponse = response.choices[0]?.message?.content || '';
    return this.parseAIReview(aiResponse, review);
  }

  private buildReviewPrompt(review: PullRequestReview): string {
    const { analysis, qualityGates } = review;

    return `
## Code Review Request

Please analyze the following code changes and provide a comprehensive review:

### 📊 Summary
- **Files Changed:** ${analysis.summary.totalFiles}
- **Lines Changed:** ${analysis.summary.linesChanged}
- **Complexity Score:** ${analysis.summary.complexity.toFixed(1)}/10
- **Test Coverage:** ${analysis.summary.testCoverage.toFixed(1)}%
- **Security Issues:** ${analysis.summary.securityIssues}
- **Performance Issues:** ${analysis.summary.performanceIssues}

### 🔍 Quality Gates
${qualityGates.map(gate => `- ${gate.gate}: ${gate.status.toUpperCase()} - ${gate.message}`).join('\n')}

### 📁 Files Changed
${analysis.files.map(file => `
#### ${file.filename} (${file.language})
- **Complexity:** ${file.complexity.toFixed(1)}/10
- **Test Coverage:** ${file.testCoverage.toFixed(1)}%
- **Issues:** ${file.issues.length}
${file.issues.slice(0, 3).map(issue => `  - ${issue.severity.toUpperCase()}: ${issue.message}`).join('\n')}

**Changes:**
${file.changes.slice(0, 5).map(change => `  - Line ${change.lineNumber}: ${change.type} (${change.complexity} complexity)`).join('\n')}
`).join('\n')}

### 📝 Review Guidelines

**Focus Areas:**
1. **Code Quality:** Clarity, maintainability, TypeScript usage
2. **Architecture:** Proper separation of concerns, React best practices
3. **Security:** Input validation, authentication, data protection
4. **Performance:** Efficient algorithms, unnecessary re-renders, bundle size
5. **Testing:** Test coverage, test quality, edge cases
6. **Documentation:** Code comments, API documentation

**Review Structure:**
1. Overall assessment (score 1-100)
2. Key strengths
3. Areas for improvement
4. Specific code comments with line references
5. Actionable suggestions for fixes
6. Approval recommendation

**Scoring Criteria:**
- 90-100: Excellent, ready to merge
- 70-89: Good with minor improvements
- 50-69: Needs work before merging
- 0-49: Major issues, recommend rejection

Please provide detailed, constructive feedback that helps the developer improve their code.
`;
  }

  private parseAIReview(response: string, review: PullRequestReview): AIReview {
    // Parse the AI response into structured format
    // This is a simplified implementation - real version would use more sophisticated parsing

    const lines = response.split('\n');
    let overallScore = 85;
    let summary = '';
    const comments: ReviewComment[] = [];
    const suggestions: ReviewSuggestion[] = [];
    let inSummary = false;
    let inComments = false;
    let inSuggestions = false;

    for (const line of lines) {
      if (line.includes('Overall Score') || line.includes('Score:')) {
        const scoreMatch = line.match(/(\d+)(\/\d+)?/);
        if (scoreMatch) {
          overallScore = parseInt(scoreMatch[1]);
        }
      } else if (line.includes('Summary') || line.includes('Assessment')) {
        inSummary = true;
        inComments = false;
        inSuggestions = false;
        summary += line.replace(/^(Summary|Assessment):?/i, '').trim() + ' ';
      } else if (line.includes('Comments') || line.includes('Issues')) {
        inComments = true;
        inSummary = false;
        inSuggestions = false;
      } else if (line.includes('Suggestions') || line.includes('Recommendations')) {
        inSuggestions = true;
        inSummary = false;
        inComments = false;
      } else if (inSummary) {
        summary += line.trim() + ' ';
      } else if (inComments && line.trim().startsWith('-')) {
        // Parse comment
        const commentText = line.substring(1).trim();
        comments.push({
          file: 'unknown', // Would need to parse file references
          line: 0,
          type: this.determineCommentType(commentText),
          message: commentText,
          severity: this.determineSeverity(commentText),
        });
      } else if (inSuggestions && line.trim().startsWith('-')) {
        const suggestionText = line.substring(1).trim();
        suggestions.push({
          title: suggestionText.substring(0, 50),
          description: suggestionText,
          priority: 'medium',
          effort: 'moderate',
          impact: 'medium',
        });
      }
    }

    // Determine approvals and concerns
    const approvals: string[] = [];
    const concerns: string[] = [];

    if (overallScore >= 80) {
      approvals.push('Code quality meets standards');
      if (review.qualityGates.every(g => g.status === 'passed')) {
        approvals.push('All quality gates passed');
      }
    }

    if (overallScore < 70) {
      concerns.push('Code quality needs improvement');
    }

    if (review.analysis.summary.securityIssues > 0) {
      concerns.push('Security issues detected');
    }

    return {
      overallScore,
      summary: summary.trim(),
      comments,
      suggestions,
      approvals,
      concerns,
      confidence: 0.85,
    };
  }

  private async generateRecommendations(review: PullRequestReview): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Analyze patterns and suggest improvements
    const { analysis, review: aiReview } = review;

    // Test coverage recommendation
    if (analysis.summary.testCoverage < 80) {
      recommendations.push({
        type: 'test',
        title: 'Improve Test Coverage',
        description: `Current test coverage is ${analysis.summary.testCoverage.toFixed(1)}%. Aim for at least 80% coverage.`,
        priority: 'high',
        effort: 'moderate',
        impact: 'high',
      });
    }

    // Performance recommendations
    if (analysis.summary.performanceIssues > 0) {
      recommendations.push({
        type: 'performance',
        title: 'Address Performance Issues',
        description: `${analysis.summary.performanceIssues} performance issues detected. Review for optimization opportunities.`,
        priority: 'medium',
        effort: 'moderate',
        impact: 'medium',
      });
    }

    // Security recommendations
    if (analysis.summary.securityIssues > 0) {
      recommendations.push({
        type: 'security',
        title: 'Fix Security Vulnerabilities',
        description: `${analysis.summary.securityIssues} security issues found. Address before deployment.`,
        priority: 'high',
        effort: 'moderate',
        impact: 'high',
      });
    }

    // Code quality recommendations based on AI review
    if (aiReview.suggestions) {
      aiReview.suggestions.slice(0, 3).forEach(suggestion => {
        recommendations.push({
          type: 'refactor',
          title: suggestion.title,
          description: suggestion.description,
          priority: suggestion.priority,
          effort: suggestion.effort,
          impact: suggestion.impact,
        });
      });
    }

    return recommendations;
  }

  // Helper methods
  private parsePatch(patch: string): CodeChange[] {
    // Parse git patch format to extract changes
    const changes: CodeChange[] = [];
    const lines = patch.split('\n');

    let currentLine = 0;
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        changes.push({
          type: 'addition',
          lineNumber: currentLine,
          content: line.substring(1),
          complexity: this.calculateLineComplexity(line),
          securityRisk: this.assessSecurityRisk(line),
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        changes.push({
          type: 'deletion',
          lineNumber: currentLine,
          content: line.substring(1),
          complexity: 0,
          securityRisk: 'low',
        });
      }
      currentLine++;
    }

    return changes;
  }

  private calculateFileComplexity(content: string, changes: CodeChange[]): number {
    // Calculate cyclomatic complexity and other metrics
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+/g) || []).length;
    const conditionals = (content.match(/if\s*\(|else|switch|case/g) || []).length;

    return Math.min(10, (functions * 0.5 + conditionals * 0.3 + changes.length * 0.1));
  }

  private async estimateTestCoverage(filename: string): Promise<number> {
    // Estimate test coverage for the file
    // This would integrate with actual test coverage tools
    return 75; // Placeholder
  }

  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
    };
    return languageMap[ext || ''] || 'unknown';
  }

  private calculateLineComplexity(line: string): number {
    // Simple complexity calculation
    const keywords = ['if', 'for', 'while', 'switch', 'try', 'catch'];
    return keywords.filter(keyword => line.includes(keyword)).length;
  }

  private assessSecurityRisk(line: string): 'low' | 'medium' | 'high' | 'critical' {
    if (line.includes('password') || line.includes('secret') || line.includes('token')) {
      return 'high';
    }
    if (line.includes('eval(') || line.includes('innerHTML')) {
      return 'critical';
    }
    if (line.includes('http://') || line.includes('localhost')) {
      return 'medium';
    }
    return 'low';
  }

  private determineCommentType(text: string): ReviewComment['type'] {
    if (text.toLowerCase().includes('good') || text.toLowerCase().includes('well done')) {
      return 'praise';
    }
    if (text.toLowerCase().includes('consider') || text.toLowerCase().includes('suggest')) {
      return 'suggestion';
    }
    if (text.toLowerCase().includes('fix') || text.toLowerCase().includes('error')) {
      return 'issue';
    }
    return 'question';
  }

  private determineSeverity(text: string): ReviewComment['severity'] {
    if (text.toLowerCase().includes('critical') || text.toLowerCase().includes('security')) {
      return 'critical';
    }
    if (text.toLowerCase().includes('error') || text.toLowerCase().includes('bug')) {
      return 'high';
    }
    if (text.toLowerCase().includes('warning') || text.toLowerCase().includes('issue')) {
      return 'medium';
    }
    return 'low';
  }
}
```

### GitHub Integration for Automated Reviews

```typescript
// packages/review-agent/src/integrations/GitHubIntegration.ts
import { Octokit } from '@octokit/rest';

export interface GitHubReview {
  prNumber: number;
  reviewId: string;
  status: 'pending' | 'completed' | 'failed';
  comments: GitHubComment[];
  summary: string;
  approved: boolean;
}

export interface GitHubComment {
  path: string;
  position: number;
  body: string;
  severity: 'info' | 'warning' | 'error';
}

export class GitHubIntegration {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, repository: string) {
    this.octokit = new Octokit({ auth: token });
    [this.owner, this.repo] = repository.split('/');
  }

  async submitReview(review: PullRequestReview): Promise<GitHubReview> {
    const { prNumber, review: aiReview, analysis } = review;

    // Create review body
    const reviewBody = this.formatReviewBody(review);

    // Determine event type
    const event = aiReview.overallScore >= 80 ? 'APPROVE' : 'REQUEST_CHANGES';

    // Submit review
    const ghReview = await this.octokit.pulls.createReview({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      body: reviewBody,
      event,
    });

    // Add individual comments
    const comments = this.extractComments(review);
    for (const comment of comments) {
      await this.octokit.pulls.createReviewComment({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        body: comment.body,
        path: comment.path,
        position: comment.position,
      });
    }

    // Add labels based on review
    await this.addReviewLabels(prNumber, review);

    return {
      prNumber,
      reviewId: ghReview.data.id.toString(),
      status: 'completed',
      comments,
      summary: aiReview.summary,
      approved: aiReview.overallScore >= 80,
    };
  }

  async updateReviewStatus(prNumber: number, status: string): Promise<void> {
    const labels = {
      'analyzing': '🤖 AI Review: Analyzing',
      'reviewing': '🤖 AI Review: Reviewing',
      'completed': '🤖 AI Review: Completed',
      'failed': '🤖 AI Review: Failed',
    };

    if (labels[status as keyof typeof labels]) {
      await this.addLabel(prNumber, labels[status as keyof typeof labels]);
    }
  }

  async getPullRequest(prNumber: number): Promise<any> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });
    return data;
  }

  async getPullRequestFiles(prNumber: number): Promise<any[]> {
    const { data } = await this.octokit.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });
    return data;
  }

  private formatReviewBody(review: PullRequestReview): string {
    const { review: aiReview, qualityGates, recommendations } = review;

    let body = `# 🤖 AI Code Review\n\n`;
    body += `**Overall Score:** ${aiReview.overallScore}/100 `;
    body += aiReview.overallScore >= 90 ? '🎉' :
           aiReview.overallScore >= 80 ? '✅' :
           aiReview.overallScore >= 70 ? '⚠️' : '❌';
    body += '\n\n';

    if (aiReview.summary) {
      body += `## 📋 Summary\n\n${aiReview.summary}\n\n`;
    }

    // Quality Gates
    if (qualityGates.length > 0) {
      body += `## 🔍 Quality Gates\n\n`;
      const passed = qualityGates.filter(g => g.status === 'passed').length;
      const total = qualityGates.length;
      body += `**${passed}/${total}** gates passed\n\n`;

      qualityGates.forEach(gate => {
        const icon = gate.status === 'passed' ? '✅' :
                    gate.status === 'failed' ? '❌' : '⚠️';
        body += `${icon} **${gate.gate}**: ${gate.message}\n`;
      });
      body += '\n';
    }

    // Approvals
    if (aiReview.approvals.length > 0) {
      body += `## ✅ Approvals\n\n`;
      aiReview.approvals.forEach(approval => {
        body += `✅ ${approval}\n`;
      });
      body += '\n';
    }

    // Concerns
    if (aiReview.concerns.length > 0) {
      body += `## ⚠️ Areas of Concern\n\n`;
      aiReview.concerns.forEach(concern => {
        body += `⚠️ ${concern}\n`;
      });
      body += '\n';
    }

    // Recommendations
    if (recommendations.length > 0) {
      body += `## 💡 Recommendations\n\n`;
      recommendations.slice(0, 5).forEach(rec => {
        const priorityIcon = rec.priority === 'high' ? '🔴' :
                           rec.priority === 'medium' ? '🟡' : '🟢';
        const effortIcon = rec.effort === 'quick' ? '⚡' :
                          rec.effort === 'moderate' ? '🕐' : '⏱️';
        body += `${priorityIcon}${effortIcon} **${rec.title}**\n`;
        body += `${rec.description}\n\n`;
      });
    }

    // Review metadata
    body += `## 📊 Review Details\n\n`;
    body += `- **Files Analyzed:** ${review.analysis.summary.totalFiles}\n`;
    body += `- **Lines Changed:** ${review.analysis.summary.linesChanged}\n`;
    body += `- **Test Coverage:** ${review.analysis.summary.testCoverage.toFixed(1)}%\n`;
    body += `- **Review Time:** ${Math.round(review.metadata.duration / 1000)}s\n`;
    body += `- **Confidence:** ${(review.review.confidence * 100).toFixed(1)}%\n\n`;

    body += `---\n`;
    body += `*This review was generated by Nand2Fun's AI Code Review Agent. `;
    body += `Please address any concerns and request a re-review if needed.*`;

    return body;
  }

  private extractComments(review: PullRequestReview): GitHubComment[] {
    const comments: GitHubComment[] = [];

    review.review.comments.forEach(comment => {
      if (comment.file !== 'unknown' && comment.line > 0) {
        const severityEmoji = comment.severity === 'critical' ? '🚨' :
                             comment.severity === 'high' ? '❌' :
                             comment.severity === 'medium' ? '⚠️' :
                             comment.severity === 'low' ? '💡' : 'ℹ️';

        const typeEmoji = comment.type === 'praise' ? '✅' :
                         comment.type === 'suggestion' ? '💡' :
                         comment.type === 'issue' ? '❌' : '❓';

        const body = `${typeEmoji} **${comment.type.toUpperCase()}**: ${comment.message}\n\n`;

        if (comment.suggestion) {
          body += `💡 **Suggestion:** ${comment.suggestion}\n\n`;
        }

        if (comment.code) {
          body += `\`\`\`\n${comment.code}\n\`\`\`\n\n`;
        }

        comments.push({
          path: comment.file,
          position: comment.line,
          body: body.trim(),
          severity: comment.severity === 'critical' || comment.severity === 'high' ? 'error' :
                   comment.severity === 'medium' ? 'warning' : 'info',
        });
      }
    });

    return comments.slice(0, 10); // Limit to 10 comments to avoid spam
  }

  private async addReviewLabels(prNumber: number, review: PullRequestReview): Promise<void> {
    const labels: string[] = ['🤖 ai-reviewed'];

    if (review.review.overallScore >= 90) {
      labels.push('✅ ai-approved');
    } else if (review.review.overallScore >= 70) {
      labels.push('⚠️ ai-conditional');
    } else {
      labels.push('❌ ai-rejected');
    }

    // Add quality gate labels
    const failedGates = review.qualityGates.filter(g => g.status === 'failed');
    if (failedGates.length > 0) {
      labels.push('🚫 quality-gates-failed');
    }

    // Add security label if issues found
    if (review.analysis.summary.securityIssues > 0) {
      labels.push('🔒 security-review-needed');
    }

    for (const label of labels) {
      try {
        await this.addLabel(prNumber, label);
      } catch (error) {
        // Label might already exist or be invalid
        console.warn(`Failed to add label ${label}:`, error);
      }
    }
  }

  private async addLabel(prNumber: number, label: string): Promise<void> {
    await this.octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      labels: [label],
    });
  }
}
```

### GitHub Actions Workflow for AI Reviews

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
    paths-ignore:
      - 'docs/**'
      - '**.md'
      - '.github/**'
      - 'scripts/**'

jobs:
  ai-review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest

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

      - name: Run linter
        run: npm run lint -- --format json | jq -r '.[] | "\(.filePath):\(.line):\(.column): \(.message) [\(.ruleId}]"' > lint-results.txt || true

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm run test -- --coverage --coverageReporters json-summary || true

      - name: Update PR status
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🤖 AI Code Review in progress...'
            })

      - name: AI Code Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npm run ai-review ${{ github.event.pull_request.number }}

      - name: Quality Gate Check
        run: |
          # Check if review results exist
          if [ -f "review-results.json" ]; then
            score=$(jq '.review.overallScore' review-results.json)
            quality_gates_passed=$(jq '[.qualityGates[] | select(.status == "passed")] | length' review-results.json)
            quality_gates_total=$(jq '.qualityGates | length' review-results.json)

            echo "AI Review Score: $score/100"
            echo "Quality Gates: $quality_gates_passed/$quality_gates_total passed"

            # Fail if score is too low or critical quality gates failed
            if [ "$score" -lt 60 ] || [ "$quality_gates_passed" -lt "$quality_gates_total" ]; then
              echo "❌ Quality gates failed or AI review score too low"
              exit 1
            fi
          else
            echo "❌ No review results found"
            exit 1
          fi

      - name: Update PR with results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('review-results.json', 'utf8'));

            const score = results.review.overallScore;
            const status = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'failure';
            const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';

            // Create status check
            github.rest.repos.createCommitStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: context.sha,
              state: status,
              description: `AI Review: ${score}/100`,
              context: 'ai-code-review'
            });

            // Add summary comment if not already added by the review
            const comments = await github.rest.issues.listComments({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
            });

            const hasReviewComment = comments.data.some(comment =>
              comment.body.includes('🤖 AI Code Review')
            );

            if (!hasReviewComment) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `${emoji} **AI Code Review Complete**\n\nScore: **${score}/100**\n\nView detailed review above.`
              });
            }
```

---

## 23.2 Quality Gates Implementation

**Requirements:** Automated quality checks that prevent low-quality code from being merged while providing actionable feedback.

### Quality Gate Service

```typescript
// packages/review-agent/src/services/QualityGateService.ts
export interface QualityGate {
  id: string;
  name: string;
  description: string;
  category: 'code' | 'test' | 'performance' | 'security' | 'documentation' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: QualityCheck;
  threshold?: number;
  blocking: boolean;
}

export interface QualityCheck {
  (analysis: CodeAnalysis): Promise<QualityResult>;
}

export interface QualityResult {
  passed: boolean;
  score: number;
  message: string;
  details?: any;
  suggestions?: string[];
}

export class QualityGateService {
  private gates: Map<string, QualityGate> = new Map();

  constructor() {
    this.registerDefaultGates();
  }

  registerGate(gate: QualityGate): void {
    this.gates.set(gate.id, gate);
  }

  async runQualityGates(analysis: CodeAnalysis): Promise<QualityGateResult[]> {
    const results: QualityGateResult[] = [];

    for (const gate of this.gates.values()) {
      try {
        const result = await gate.check(analysis);
        results.push({
          gateId: gate.id,
          gateName: gate.name,
          passed: result.passed,
          score: result.score,
          message: result.message,
          details: result.details,
          suggestions: result.suggestions,
          category: gate.category,
          severity: gate.severity,
          blocking: gate.blocking,
        });
      } catch (error) {
        console.error(`Quality gate ${gate.id} failed:`, error);
        results.push({
          gateId: gate.id,
          gateName: gate.name,
          passed: false,
          score: 0,
          message: `Gate execution failed: ${error.message}`,
          blocking: gate.blocking,
          category: gate.category,
          severity: gate.severity,
        });
      }
    }

    return results;
  }

  getGates(): QualityGate[] {
    return Array.from(this.gates.values());
  }

  private registerDefaultGates(): void {
    // Code Quality Gates
    this.registerGate({
      id: 'code-complexity',
      name: 'Code Complexity',
      description: 'Ensures code complexity stays within acceptable limits',
      category: 'code',
      severity: 'medium',
      blocking: false,
      check: async (analysis) => {
        const avgComplexity = analysis.summary.complexity;
        const passed = avgComplexity <= 7;

        return {
          passed,
          score: Math.max(0, 100 - (avgComplexity - 5) * 10),
          message: `Average complexity: ${avgComplexity.toFixed(1)}/10 ${passed ? '(acceptable)' : '(too high)'}`,
          suggestions: passed ? [] : [
            'Break down complex functions into smaller ones',
            'Extract complex logic into separate modules',
            'Add more comments to explain complex algorithms',
          ],
        };
      },
    });

    this.registerGate({
      id: 'code-coverage',
      name: 'Test Coverage',
      description: 'Ensures adequate test coverage for changed code',
      category: 'test',
      severity: 'high',
      blocking: false,
      threshold: 80,
      check: async (analysis) => {
        const coverage = analysis.summary.testCoverage;
        const threshold = 80;
        const passed = coverage >= threshold;

        return {
          passed,
          score: coverage,
          message: `Test coverage: ${coverage.toFixed(1)}% (required: ${threshold}%)`,
          suggestions: passed ? [] : [
            'Add unit tests for new functions',
            'Write integration tests for new features',
            'Consider adding e2e tests for UI changes',
          ],
        };
      },
    });

    this.registerGate({
      id: 'security-scan',
      name: 'Security Vulnerabilities',
      description: 'Scans for security vulnerabilities in code changes',
      category: 'security',
      severity: 'critical',
      blocking: true,
      check: async (analysis) => {
        const vulnerabilities = analysis.summary.securityIssues;
        const passed = vulnerabilities === 0;

        return {
          passed,
          score: passed ? 100 : Math.max(0, 100 - vulnerabilities * 20),
          message: `Security issues found: ${vulnerabilities}`,
          details: {
            vulnerabilityCount: vulnerabilities,
            severity: vulnerabilities > 0 ? 'high' : 'none',
          },
          suggestions: passed ? [] : [
            'Review and fix identified security vulnerabilities',
            'Run security audit on dependencies',
            'Implement proper input validation',
            'Use security headers and CSP',
          ],
        };
      },
    });

    this.registerGate({
      id: 'performance-impact',
      name: 'Performance Impact',
      description: 'Assesses performance impact of code changes',
      category: 'performance',
      severity: 'medium',
      blocking: false,
      check: async (analysis) => {
        const performanceIssues = analysis.summary.performanceIssues;
        const passed = performanceIssues <= 2;

        return {
          passed,
          score: Math.max(0, 100 - performanceIssues * 15),
          message: `Performance issues: ${performanceIssues}`,
          suggestions: passed ? [] : [
            'Optimize algorithms with better time/space complexity',
            'Reduce unnecessary re-renders in React components',
            'Implement lazy loading for large components',
            'Use memoization for expensive calculations',
          ],
        };
      },
    });

    this.registerGate({
      id: 'documentation-completeness',
      name: 'Documentation Completeness',
      description: 'Ensures new code is properly documented',
      category: 'documentation',
      severity: 'low',
      blocking: false,
      check: async (analysis) => {
        // Check if new public APIs are documented
        const undocumentedAPIs = analysis.files.filter(file =>
          file.issues.some(issue => issue.type === 'missing-documentation')
        ).length;

        const passed = undocumentedAPIs === 0;

        return {
          passed,
          score: Math.max(0, 100 - undocumentedAPIs * 25),
          message: `Undocumented APIs: ${undocumentedAPIs}`,
          suggestions: passed ? [] : [
            'Add JSDoc comments to public functions',
            'Document new API endpoints',
            'Update README for new features',
            'Add usage examples in documentation',
          ],
        };
      },
    });

    this.registerGate({
      id: 'dependency-check',
      name: 'Dependency Security',
      description: 'Checks for vulnerable or outdated dependencies',
      category: 'compliance',
      severity: 'high',
      blocking: true,
      check: async (analysis) => {
        // This would integrate with npm audit or similar
        const vulnerabilities = 0; // Placeholder
        const outdatedDeps = 0; // Placeholder

        const passed = vulnerabilities === 0;

        return {
          passed,
          score: passed ? 100 : Math.max(0, 100 - vulnerabilities * 25),
          message: `Dependency issues: ${vulnerabilities} vulnerabilities, ${outdatedDeps} outdated`,
          suggestions: passed ? [] : [
            'Update vulnerable dependencies to secure versions',
            'Replace deprecated packages with maintained alternatives',
            'Run npm audit fix to automatically fix issues',
          ],
        };
      },
    });

    this.registerGate({
      id: 'bundle-size',
      name: 'Bundle Size Impact',
      description: 'Monitors impact on application bundle size',
      category: 'performance',
      severity: 'medium',
      blocking: false,
      check: async (analysis) => {
        // Estimate bundle size impact
        const sizeIncrease = analysis.summary.linesChanged * 0.5; // Rough estimate in KB
        const passed = sizeIncrease <= 50; // Max 50KB increase

        return {
          passed,
          score: Math.max(0, 100 - (sizeIncrease / 50) * 100),
          message: `Estimated bundle increase: ${sizeIncrease.toFixed(1)}KB`,
          suggestions: passed ? [] : [
            'Consider code splitting for new features',
            'Optimize imports to reduce bundle size',
            'Use dynamic imports for large dependencies',
            'Compress images and assets',
          ],
        };
      },
    });

    this.registerGate({
      id: 'accessibility-check',
      name: 'Accessibility Compliance',
      description: 'Ensures UI changes maintain accessibility standards',
      category: 'compliance',
      severity: 'medium',
      blocking: false,
      check: async (analysis) => {
        // Check for accessibility issues in UI files
        const uiFiles = analysis.files.filter(file =>
          file.filename.includes('.tsx') || file.filename.includes('.jsx')
        );

        const accessibilityIssues = uiFiles.reduce((sum, file) =>
          sum + file.issues.filter(issue => issue.category === 'accessibility').length, 0
        );

        const passed = accessibilityIssues <= 1;

        return {
          passed,
          score: Math.max(0, 100 - accessibilityIssues * 20),
          message: `Accessibility issues: ${accessibilityIssues}`,
          suggestions: passed ? [] : [
            'Add proper ARIA labels to interactive elements',
            'Ensure sufficient color contrast ratios',
            'Add keyboard navigation support',
            'Test with screen readers',
          ],
        };
      },
    });
  }

  async checkCodeQuality(analysis: CodeAnalysis): Promise<QualityResult> {
    return this.runGateCheck('code-complexity', analysis);
  }

  async checkSecurity(analysis: CodeAnalysis): Promise<QualityResult> {
    return this.runGateCheck('security-scan', analysis);
  }

  async checkPerformance(analysis: CodeAnalysis): Promise<QualityResult> {
    return this.runGateCheck('performance-impact', analysis);
  }

  async checkTestCoverage(analysis: CodeAnalysis): Promise<QualityResult> {
    return this.runGateCheck('code-coverage', analysis);
  }

  async checkDocumentation(analysis: CodeAnalysis): Promise<QualityResult> {
    return this.runGateCheck('documentation-completeness', analysis);
  }

  private async runGateCheck(gateId: string, analysis: CodeAnalysis): Promise<QualityResult> {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(`Quality gate ${gateId} not found`);
    }

    return gate.check(analysis);
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
  category: string;
  severity: string;
  blocking: boolean;
}
```

### Learning Service for Continuous Improvement

```typescript
// packages/review-agent/src/services/LearningService.ts
export interface ReviewFeedback {
  reviewId: string;
  userId: string;
  rating: number; // 1-5
  accuracy: number; // How accurate was the review
  usefulness: number; // How useful were the suggestions
  comments: string;
  acceptedSuggestions: string[];
  rejectedSuggestions: string[];
  additionalSuggestions: string[];
}

export interface LearningPattern {
  pattern: string;
  confidence: number;
  occurrences: number;
  successRate: number;
  lastSeen: number;
}

export class LearningService {
  private patterns: Map<string, LearningPattern> = new Map();
  private feedback: ReviewFeedback[] = [];

  async learnFromReview(review: PullRequestReview): Promise<void> {
    // Store review for pattern analysis
    await this.storeReview(review);

    // Analyze successful patterns
    await this.analyzeSuccessfulPatterns(review);

    // Update confidence scores
    await this.updateConfidenceScores();

    // Clean old data
    await this.cleanupOldData();
  }

  async incorporateFeedback(feedback: ReviewFeedback): Promise<void> {
    this.feedback.push(feedback);
    await this.storeFeedback(feedback);

    // Adjust patterns based on feedback
    await this.adjustPatternsFromFeedback(feedback);

    // Update learning model
    await this.updateLearningModel();
  }

  getPatterns(): LearningPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  getFeedbackStats(): any {
    if (this.feedback.length === 0) return {};

    const avgRating = this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length;
    const avgAccuracy = this.feedback.reduce((sum, f) => sum + f.accuracy, 0) / this.feedback.length;
    const avgUsefulness = this.feedback.reduce((sum, f) => sum + f.usefulness, 0) / this.feedback.length;

    return {
      totalFeedback: this.feedback.length,
      averageRating: avgRating,
      averageAccuracy: avgAccuracy,
      averageUsefulness: avgUsefulness,
      recentTrends: this.calculateRecentTrends(),
    };
  }

  private async analyzeSuccessfulPatterns(review: PullRequestReview): Promise<void> {
    const { review: aiReview, analysis } = review;

    // Identify patterns that led to high scores
    if (aiReview.overallScore >= 80) {
      // Successful code patterns
      for (const file of analysis.files) {
        for (const change of file.changes) {
          if (change.complexity <= 5) {
            await this.recordSuccessfulPattern('low-complexity-change', change);
          }
        }
      }

      // Successful review comments
      for (const comment of aiReview.comments) {
        if (comment.type === 'praise') {
          await this.recordSuccessfulPattern(`praise-${comment.message.substring(0, 50)}`, comment);
        }
      }
    }
  }

  private async recordSuccessfulPattern(patternKey: string, data: any): Promise<void> {
    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.occurrences++;
      existing.successRate = (existing.successRate * (existing.occurrences - 1) + 1) / existing.occurrences;
      existing.lastSeen = Date.now();
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
    } else {
      this.patterns.set(patternKey, {
        pattern: patternKey,
        confidence: 0.5,
        occurrences: 1,
        successRate: 1.0,
        lastSeen: Date.now(),
      });
    }
  }

  private async adjustPatternsFromFeedback(feedback: ReviewFeedback): Promise<void> {
    // Adjust confidence based on user feedback
    if (feedback.accuracy < 0.7) {
      // Reduce confidence for inaccurate reviews
      // This would affect future review generation
    }

    if (feedback.usefulness < 0.7) {
      // Reduce confidence for unhelpful suggestions
    }

    // Learn from accepted/rejected suggestions
    for (const accepted of feedback.acceptedSuggestions) {
      await this.recordSuccessfulPattern(`accepted-${accepted}`, {});
    }

    for (const rejected of feedback.rejectedSuggestions) {
      // Reduce confidence for rejected suggestions
      const pattern = this.patterns.get(`suggestion-${rejected}`);
      if (pattern) {
        pattern.successRate = (pattern.successRate * pattern.occurrences + 0) / (pattern.occurrences + 1);
        pattern.occurrences++;
        pattern.confidence = Math.max(0.1, pattern.confidence - 0.1);
      }
    }
  }

  private async updateConfidenceScores(): Promise<void> {
    // Decay old patterns
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    for (const pattern of this.patterns.values()) {
      const age = now - pattern.lastSeen;
      if (age > oneWeek) {
        pattern.confidence *= 0.9; // Decay by 10%
      }
    }

    // Remove very old or low confidence patterns
    for (const [key, pattern] of this.patterns.entries()) {
      if (pattern.confidence < 0.2 || pattern.occurrences < 3) {
        this.patterns.delete(key);
      }
    }
  }

  private async updateLearningModel(): Promise<void> {
    // Update the AI model with new learning data
    // This would integrate with the AI training pipeline
    console.log(`📚 Updated learning model with ${this.feedback.length} feedback items and ${this.patterns.size} patterns`);
  }

  private calculateRecentTrends(): any {
    const recent = this.feedback.slice(-10); // Last 10 feedback items

    if (recent.length === 0) return {};

    const avgRating = recent.reduce((sum, f) => sum + f.rating, 0) / recent.length;
    const avgAccuracy = recent.reduce((sum, f) => sum + f.accuracy, 0) / recent.length;
    const avgUsefulness = recent.reduce((sum, f) => sum + f.usefulness, 0) / recent.length;

    return {
      recentAverageRating: avgRating,
      recentAverageAccuracy: avgAccuracy,
      recentAverageUsefulness: avgUsefulness,
      trend: avgRating > 4.0 ? 'improving' : avgRating > 3.5 ? 'stable' : 'needs-improvement',
    };
  }

  private async storeReview(review: PullRequestReview): Promise<void> {
    // Store review data for analysis
    // This would go to a database or analytics service
  }

  private async storeFeedback(feedback: ReviewFeedback): Promise<void> {
    // Store user feedback
    // This would go to a database
  }

  private async cleanupOldData(): Promise<void> {
    // Remove old feedback and patterns
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - oneMonth;

    this.feedback = this.feedback.filter(f => f.timestamp > cutoff);

    for (const [key, pattern] of this.patterns.entries()) {
      if (pattern.lastSeen < cutoff) {
        this.patterns.delete(key);
      }
    }
  }
}
```

---

## 23.3 Phase 23 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| AI review agent core | 10h | - | <30s review generation | Code review agent processing PRs |
| Code analysis service | 6h | Core agent | <2s file analysis | Intelligent code change detection |
| Quality gates framework | 8h | Code analysis | <1s gate execution | Automated quality checks running |
| GitHub integration | 6h | Quality gates | - | Reviews posted to PRs automatically |
| Learning service | 6h | GitHub integration | - | Continuous improvement from feedback |
| GitHub Actions workflow | 4h | Learning service | <5min workflow run | CI/CD integration complete |

**Total Estimated Effort:** ~40 hours (2 weeks)  
**Performance Budget:** <30s review generation, <2s analysis, <1s quality gates  
**Quality Gates:** AI reviews working, quality gates enforced, human oversight available

---

## Risk Mitigation

**AI Review Accuracy:** Start with high-confidence reviews only, gradually expand scope with human validation.

**False Positives/Negatives:** Implement feedback loops and confidence thresholds to improve accuracy.

**Performance Impact:** Optimize analysis and run reviews asynchronously to avoid blocking development.

**Developer Resistance:** Educate team on AI review benefits and allow easy overrides for incorrect feedback.

**Model Drift:** Regularly retrain models with recent code patterns and maintain human oversight.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 22: Authentication System](phase-22-authentication.md)
