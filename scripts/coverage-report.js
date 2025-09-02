#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Comprehensive Coverage Report Generator
 * Generates detailed coverage reports with analysis and recommendations
 */

class CoverageReporter {
  constructor() {
    this.coverageDir = path.join(__dirname, '../coverage');
    this.reportsDir = path.join(__dirname, '../reports');
    this.currentDate = new Date().toISOString().split('T')[0];
  }

  /**
   * Generate comprehensive coverage reports
   */
  async generateReports() {
    console.log('🔍 Generating comprehensive coverage reports...\n');

    try {
      // Ensure directories exist
      this.ensureDirectories();

      // Run tests with coverage
      console.log('📊 Running tests with coverage collection...');
      await this.runCoverageTests();

      // Analyze coverage data
      console.log('🔍 Analyzing coverage data...');
      const coverageAnalysis = await this.analyzeCoverage();

      // Generate detailed reports
      console.log('📈 Generating detailed reports...');
      await this.generateDetailedReport(coverageAnalysis);

      // Generate coverage badges
      console.log('🏷️ Generating coverage badges...');
      await this.generateCoverageBadges(coverageAnalysis);

      // Generate trend analysis
      console.log('📊 Generating trend analysis...');
      await this.generateTrendAnalysis(coverageAnalysis);

      console.log('\n✅ Coverage reporting complete!');
      console.log(`📁 Reports saved to: ${this.reportsDir}`);

    } catch (error) {
      console.error('❌ Coverage reporting failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [this.coverageDir, this.reportsDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Run tests with coverage collection
   */
  async runCoverageTests() {
    try {
      execSync('npm run test:coverage', {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      });
    } catch (error) {
      // Continue even if some tests fail - we still want coverage data
      console.warn('⚠️ Some tests failed, but continuing with coverage analysis...');
    }
  }

  /**
   * Analyze coverage data
   */
  async analyzeCoverage() {
    const coverageFile = path.join(this.coverageDir, 'coverage-summary.json');
    
    if (!fs.existsSync(coverageFile)) {
      throw new Error('Coverage summary file not found. Run tests first.');
    }

    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    
    const analysis = {
      timestamp: new Date().toISOString(),
      summary: coverageData.total,
      files: {},
      uncoveredFiles: [],
      criticalIssues: [],
      recommendations: []
    };

    // Analyze individual files
    Object.entries(coverageData).forEach(([filepath, data]) => {
      if (filepath === 'total') return;

      const fileAnalysis = {
        path: filepath,
        statements: data.statements.pct,
        branches: data.branches.pct,
        functions: data.functions.pct,
        lines: data.lines.pct,
        uncoveredLines: data.lines.skipped || [],
        uncoveredBranches: data.branches.skipped || []
      };

      analysis.files[filepath] = fileAnalysis;

      // Identify files below 95% coverage
      const minCoverage = Math.min(
        data.statements.pct,
        data.branches.pct,
        data.functions.pct,
        data.lines.pct
      );

      if (minCoverage < 95) {
        analysis.uncoveredFiles.push({
          path: filepath,
          coverage: minCoverage,
          issues: this.identifyIssues(data)
        });
      }

      // Identify critical issues
      if (minCoverage < 80) {
        analysis.criticalIssues.push({
          path: filepath,
          coverage: minCoverage,
          severity: 'critical'
        });
      }
    });

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Identify specific coverage issues
   */
  identifyIssues(coverageData) {
    const issues = [];

    if (coverageData.statements.pct < 95) {
      issues.push({
        type: 'statements',
        current: coverageData.statements.pct,
        target: 95,
        uncovered: coverageData.statements.total - coverageData.statements.covered
      });
    }

    if (coverageData.branches.pct < 95) {
      issues.push({
        type: 'branches',
        current: coverageData.branches.pct,
        target: 95,
        uncovered: coverageData.branches.total - coverageData.branches.covered
      });
    }

    if (coverageData.functions.pct < 95) {
      issues.push({
        type: 'functions',
        current: coverageData.functions.pct,
        target: 95,
        uncovered: coverageData.functions.total - coverageData.functions.covered
      });
    }

    if (coverageData.lines.pct < 95) {
      issues.push({
        type: 'lines',
        current: coverageData.lines.pct,
        target: 95,
        uncovered: coverageData.lines.total - coverageData.lines.covered
      });
    }

    return issues;
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Global coverage recommendations
    if (analysis.summary.statements.pct < 95) {
      recommendations.push({
        category: 'Global Coverage',
        priority: 'High',
        description: 'Overall statement coverage is below 95%',
        action: 'Add comprehensive unit tests for uncovered statements',
        impact: 'Improves overall code reliability'
      });
    }

    // File-specific recommendations
    analysis.uncoveredFiles.forEach(file => {
      if (file.coverage < 80) {
        recommendations.push({
          category: 'Critical Coverage',
          priority: 'Critical',
          description: `${file.path} has critically low coverage (${file.coverage}%)`,
          action: 'Create comprehensive test suite for this file',
          impact: 'Addresses high-risk areas'
        });
      } else if (file.coverage < 90) {
        recommendations.push({
          category: 'Low Coverage',
          priority: 'High',
          description: `${file.path} has low coverage (${file.coverage}%)`,
          action: 'Add tests for uncovered branches and edge cases',
          impact: 'Improves test reliability'
        });
      }
    });

    // Branch coverage recommendations
    if (analysis.summary.branches.pct < 95) {
      recommendations.push({
        category: 'Branch Coverage',
        priority: 'High',
        description: 'Branch coverage is below 95%',
        action: 'Add tests for conditional logic and error paths',
        impact: 'Improves edge case testing'
      });
    }

    return recommendations;
  }

  /**
   * Generate detailed HTML report
   */
  async generateDetailedReport(analysis) {
    const htmlReport = this.generateHtmlReport(analysis);
    const reportPath = path.join(this.reportsDir, `coverage-analysis-${this.currentDate}.html`);
    
    fs.writeFileSync(reportPath, htmlReport);
    
    // Also generate JSON report for automation
    const jsonReportPath = path.join(this.reportsDir, `coverage-analysis-${this.currentDate}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(analysis, null, 2));
  }

  /**
   * Generate HTML report content
   */
  generateHtmlReport(analysis) {
    const { summary, uncoveredFiles, criticalIssues, recommendations } = analysis;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Analysis Report - ${this.currentDate}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #007bff; }
        .metric.critical { border-left-color: #dc3545; }
        .metric.warning { border-left-color: #ffc107; }
        .metric.success { border-left-color: #28a745; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .metric .label { color: #666; font-size: 0.9em; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; font-weight: 600; }
        .table tr:hover { background: #f8f9fa; }
        .progress { background: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden; }
        .progress-bar { height: 100%; transition: width 0.3s ease; }
        .progress-bar.success { background: #28a745; }
        .progress-bar.warning { background: #ffc107; }
        .progress-bar.danger { background: #dc3545; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; }
        .recommendation { margin: 15px 0; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #007bff; }
        .recommendation.critical { border-left-color: #dc3545; }
        .recommendation.high { border-left-color: #ffc107; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
        .badge.critical { background: #dc3545; color: white; }
        .badge.high { background: #ffc107; color: #212529; }
        .badge.medium { background: #17a2b8; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Coverage Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📈 Coverage Overview</h2>
                <div class="metrics">
                    <div class="metric ${this.getMetricClass(summary.statements.pct)}">
                        <h3>Statements</h3>
                        <div class="value">${summary.statements.pct}%</div>
                        <div class="label">${summary.statements.covered}/${summary.statements.total}</div>
                        <div class="progress">
                            <div class="progress-bar ${this.getProgressClass(summary.statements.pct)}" 
                                 style="width: ${summary.statements.pct}%"></div>
                        </div>
                    </div>
                    
                    <div class="metric ${this.getMetricClass(summary.branches.pct)}">
                        <h3>Branches</h3>
                        <div class="value">${summary.branches.pct}%</div>
                        <div class="label">${summary.branches.covered}/${summary.branches.total}</div>
                        <div class="progress">
                            <div class="progress-bar ${this.getProgressClass(summary.branches.pct)}" 
                                 style="width: ${summary.branches.pct}%"></div>
                        </div>
                    </div>
                    
                    <div class="metric ${this.getMetricClass(summary.functions.pct)}">
                        <h3>Functions</h3>
                        <div class="value">${summary.functions.pct}%</div>
                        <div class="label">${summary.functions.covered}/${summary.functions.total}</div>
                        <div class="progress">
                            <div class="progress-bar ${this.getProgressClass(summary.functions.pct)}" 
                                 style="width: ${summary.functions.pct}%"></div>
                        </div>
                    </div>
                    
                    <div class="metric ${this.getMetricClass(summary.lines.pct)}">
                        <h3>Lines</h3>
                        <div class="value">${summary.lines.pct}%</div>
                        <div class="label">${summary.lines.covered}/${summary.lines.total}</div>
                        <div class="progress">
                            <div class="progress-bar ${this.getProgressClass(summary.lines.pct)}" 
                                 style="width: ${summary.lines.pct}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            ${uncoveredFiles.length > 0 ? `
            <div class="section">
                <h2>⚠️ Files Below 95% Coverage (${uncoveredFiles.length})</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Coverage</th>
                            <th>Issues</th>
                            <th>Action Required</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${uncoveredFiles.map(file => `
                        <tr>
                            <td><code>${file.path}</code></td>
                            <td>
                                <div class="progress">
                                    <div class="progress-bar ${this.getProgressClass(file.coverage)}" 
                                         style="width: ${file.coverage}%"></div>
                                </div>
                                ${file.coverage}%
                            </td>
                            <td>${file.issues.length} issues</td>
                            <td>
                                <span class="badge ${file.coverage < 80 ? 'critical' : file.coverage < 90 ? 'high' : 'medium'}">
                                    ${file.coverage < 80 ? 'Critical' : file.coverage < 90 ? 'High' : 'Medium'} Priority
                                </span>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${criticalIssues.length > 0 ? `
            <div class="section">
                <h2>🚨 Critical Coverage Issues (${criticalIssues.length})</h2>
                <div class="recommendations">
                    ${criticalIssues.map(issue => `
                    <div class="recommendation critical">
                        <strong>${issue.path}</strong> - ${issue.coverage}% coverage
                        <p>This file requires immediate attention with comprehensive test coverage.</p>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>💡 Recommendations (${recommendations.length})</h2>
                <div class="recommendations">
                    ${recommendations.map(rec => `
                    <div class="recommendation ${rec.priority.toLowerCase()}">
                        <h4>${rec.category} <span class="badge ${rec.priority.toLowerCase()}">${rec.priority}</span></h4>
                        <p><strong>Issue:</strong> ${rec.description}</p>
                        <p><strong>Action:</strong> ${rec.action}</p>
                        <p><strong>Impact:</strong> ${rec.impact}</p>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Get CSS class for metric based on coverage percentage
   */
  getMetricClass(percentage) {
    if (percentage >= 95) return 'success';
    if (percentage >= 80) return 'warning';
    return 'critical';
  }

  /**
   * Get CSS class for progress bar based on coverage percentage
   */
  getProgressClass(percentage) {
    if (percentage >= 95) return 'success';
    if (percentage >= 80) return 'warning';
    return 'danger';
  }

  /**
   * Generate coverage badges for README
   */
  async generateCoverageBadges(analysis) {
    const { summary } = analysis;
    const badgesDir = path.join(this.reportsDir, 'badges');
    
    if (!fs.existsSync(badgesDir)) {
      fs.mkdirSync(badgesDir, { recursive: true });
    }

    const badges = {
      statements: this.createBadge('Coverage-Statements', `${summary.statements.pct}%`, this.getBadgeColor(summary.statements.pct)),
      branches: this.createBadge('Coverage-Branches', `${summary.branches.pct}%`, this.getBadgeColor(summary.branches.pct)),
      functions: this.createBadge('Coverage-Functions', `${summary.functions.pct}%`, this.getBadgeColor(summary.functions.pct)),
      lines: this.createBadge('Coverage-Lines', `${summary.lines.pct}%`, this.getBadgeColor(summary.lines.pct))
    };

    // Generate badge SVGs
    Object.entries(badges).forEach(([type, badge]) => {
      fs.writeFileSync(path.join(badgesDir, `${type}.svg`), badge);
    });

    // Generate README snippet
    const readmeSnippet = `
## 📊 Test Coverage

![Statements](./reports/badges/statements.svg)
![Branches](./reports/badges/branches.svg)
![Functions](./reports/badges/functions.svg)
![Lines](./reports/badges/lines.svg)

- **Statements:** ${summary.statements.pct}% (${summary.statements.covered}/${summary.statements.total})
- **Branches:** ${summary.branches.pct}% (${summary.branches.covered}/${summary.branches.total})
- **Functions:** ${summary.functions.pct}% (${summary.functions.covered}/${summary.functions.total})
- **Lines:** ${summary.lines.pct}% (${summary.lines.covered}/${summary.lines.total})

*Last Updated: ${new Date().toLocaleString()}*
`;

    fs.writeFileSync(path.join(badgesDir, 'README-snippet.md'), readmeSnippet);
  }

  /**
   * Create SVG badge
   */
  createBadge(label, value, color) {
    const labelWidth = label.length * 6 + 10;
    const valueWidth = value.length * 6 + 10;
    const totalWidth = labelWidth + valueWidth;

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth/2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth/2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth/2}" y="14">${value}</text>
  </g>
</svg>`.trim();
  }

  /**
   * Get badge color based on coverage percentage
   */
  getBadgeColor(percentage) {
    if (percentage >= 95) return '#4c1';
    if (percentage >= 90) return '#97ca00';
    if (percentage >= 80) return '#dfb317';
    if (percentage >= 70) return '#fe7d37';
    return '#e05d44';
  }

  /**
   * Generate trend analysis
   */
  async generateTrendAnalysis(analysis) {
    const trendsFile = path.join(this.reportsDir, 'coverage-trends.json');
    let trends = [];

    // Load existing trends if available
    if (fs.existsSync(trendsFile)) {
      try {
        trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
      } catch (error) {
        console.warn('Could not load existing trends data');
      }
    }

    // Add current data point
    const currentTrend = {
      date: this.currentDate,
      timestamp: new Date().toISOString(),
      statements: analysis.summary.statements.pct,
      branches: analysis.summary.branches.pct,
      functions: analysis.summary.functions.pct,
      lines: analysis.summary.lines.pct,
      filesBelow95: analysis.uncoveredFiles.length,
      criticalIssues: analysis.criticalIssues.length
    };

    trends.push(currentTrend);

    // Keep only last 30 data points
    if (trends.length > 30) {
      trends = trends.slice(-30);
    }

    // Save updated trends
    fs.writeFileSync(trendsFile, JSON.stringify(trends, null, 2));

    console.log(`📈 Trend analysis updated with ${trends.length} data points`);
  }
}

// Run coverage reporting if called directly
if (require.main === module) {
  const reporter = new CoverageReporter();
  reporter.generateReports().catch(error => {
    console.error('Coverage reporting failed:', error);
    process.exit(1);
  });
}

module.exports = CoverageReporter;