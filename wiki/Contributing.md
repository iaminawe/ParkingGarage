# Contributing Guidelines

## Welcome Contributors!

We're excited that you're interested in contributing to the Parking Garage Management System! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior
- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

### Unacceptable Behavior
- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing private information without permission
- Any conduct which could reasonably be considered inappropriate

## How to Contribute

### 1. Find an Issue

#### For Beginners
Look for issues labeled:
- `good first issue` - Simple tasks perfect for newcomers
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

#### Browse Existing Issues
```bash
# Using CCPM to find issues
/pm:search --label="help wanted"
/pm:issue-show 123
```

### 2. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/yourusername/ParkingGarage.git
cd ParkingGarage

# Add upstream remote
git remote add upstream https://github.com/original/ParkingGarage.git

# Keep your fork updated
git fetch upstream
git checkout main
git merge upstream/main
```

### 3. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Naming conventions:
# feature/ - New features
# fix/     - Bug fixes
# docs/    - Documentation
# test/    - Test improvements
# perf/    - Performance improvements
```

## Development Process

### 1. Setting Up Development Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test
```

### 2. Using AI Agents for Development

#### With CCPM
```bash
# Start working on an issue
/pm:issue-start 123

# Get AI assistance
/pm:epic-oneshot "Implement user authentication"
```

#### With Claude Flow
```bash
# Use swarm for feature development
npx claude-flow sparc tdd "implement new feature"

# Run parallel agents
npx claude-flow sparc batch "spec,architect,coder" "build payment integration"
```

### 3. Code Style Guide

#### JavaScript/TypeScript
```javascript
// ✅ Good: Clear, concise, follows conventions
export const calculateParkingFee = ({ startTime, endTime, hourlyRate }) => {
  const hours = differenceInHours(endTime, startTime);
  const fee = hours * hourlyRate;
  
  return {
    duration: hours,
    amount: fee,
    currency: 'USD',
  };
};

// ❌ Bad: Poor naming, no structure
export const calc = (s, e, r) => {
  const h = (e - s) / 3600000;
  return h * r;
};
```

#### Naming Conventions
- **Variables**: camelCase (`userId`, `parkingSpot`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Functions**: camelCase, verb-noun (`calculateFee`, `validateInput`)
- **Classes**: PascalCase (`UserService`, `ParkingController`)
- **Files**: kebab-case (`user-service.js`, `parking-controller.js`)
- **Database**: snake_case (`user_id`, `parking_spots`)

#### Comments
```javascript
// ✅ Good: Explains why, not what
// Use exponential backoff to avoid overwhelming the server
const retryDelay = Math.pow(2, attempt) * 1000;

// ❌ Bad: Redundant comment
// Increment counter by 1
counter++;
```

### 4. Commit Message Guidelines

Follow the Conventional Commits specification:

```
type(scope): subject

body

footer
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or corrections
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Routine tasks

#### Examples
```bash
# Feature
git commit -m "feat(auth): add OAuth2 login support

- Implement Google OAuth2 provider
- Add Facebook OAuth2 provider
- Update user model for social logins

Closes #123"

# Bug fix
git commit -m "fix(payment): resolve double-charging issue

Prevent multiple payment attempts for the same session
by implementing idempotency keys

Fixes #456"

# Documentation
git commit -m "docs(api): update reservation endpoint documentation"
```

### 5. Testing Requirements

#### Write Tests for Your Changes
```javascript
// tests/unit/your-feature.test.js
describe('YourFeature', () => {
  it('should handle expected behavior', () => {
    // Arrange
    const input = { /* test data */ };
    
    // Act
    const result = yourFunction(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
  
  it('should handle error cases', () => {
    expect(() => yourFunction(invalidInput)).toThrow();
  });
});
```

#### Run All Tests
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests with coverage
npm run test:coverage
```

### 6. Documentation

#### Code Documentation
```javascript
/**
 * Calculate parking fee based on duration and rate
 * @param {Object} params - Calculation parameters
 * @param {Date} params.startTime - Session start time
 * @param {Date} params.endTime - Session end time
 * @param {number} params.hourlyRate - Rate per hour
 * @param {number} [params.dailyRate] - Optional daily rate
 * @returns {Object} Fee calculation result
 * @throws {Error} If endTime is before startTime
 */
export const calculateParkingFee = (params) => {
  // Implementation
};
```

#### Update Documentation
- Update README.md if needed
- Add/update wiki pages for new features
- Update API documentation
- Include examples for complex features

## Pull Request Process

### 1. Before Creating a PR

#### Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main
- [ ] No merge conflicts

#### Update Your Branch
```bash
git fetch upstream
git rebase upstream/main
```

### 2. Creating the Pull Request

#### PR Title Format
```
type(scope): brief description

# Examples:
feat(auth): add password reset functionality
fix(payment): resolve Stripe webhook timeout
docs(api): update spot availability endpoint
```

#### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List specific changes
- Include any architectural decisions
- Mention any dependencies added

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
Related to #456

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No console.log statements
- [ ] No commented-out code
```

### 3. Review Process

#### What Reviewers Look For
- Code quality and consistency
- Test coverage
- Performance implications
- Security considerations
- Documentation completeness

#### Responding to Feedback
```bash
# Make requested changes
git add .
git commit -m "address review feedback"

# Or amend if small change
git commit --amend

# Push changes
git push origin feature/your-feature
```

### 4. After Merge

```bash
# Delete local branch
git branch -d feature/your-feature

# Delete remote branch
git push origin --delete feature/your-feature

# Update your fork
git checkout main
git pull upstream main
git push origin main
```

## Types of Contributions

### Code Contributions
- Bug fixes
- New features
- Performance improvements
- Refactoring
- Test improvements

### Non-Code Contributions
- Documentation improvements
- Bug reports
- Feature requests
- Translation
- Design assets
- Community support

### Bug Reports

#### Template
```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Actual behavior**
What actually happens

**Environment**
- OS: [e.g., Ubuntu 20.04]
- Node version: [e.g., 18.12.0]
- Browser: [if applicable]

**Additional context**
Any other relevant information
```

### Feature Requests

#### Template
```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
How would you solve it?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Any mockups, examples, or references
```

## Recognition

### Contributors
All contributors are recognized in:
- CONTRIBUTORS.md file
- GitHub contributors page
- Release notes

### Contribution Levels
- 🥉 **Bronze**: First accepted PR
- 🥈 **Silver**: 5+ accepted PRs
- 🥇 **Gold**: 10+ accepted PRs
- 💎 **Diamond**: 25+ accepted PRs
- 🏆 **Maintainer**: Consistent high-quality contributions

## Getting Help

### Resources
- [Development Guide](Development-Guide.md) - Setup instructions
- [Architecture](Architecture.md) - System design
- [API Documentation](API-Documentation.md) - API reference

### Communication Channels
- **GitHub Issues**: Bug reports and features
- **GitHub Discussions**: Questions and ideas
- **Slack**: Real-time chat (invite link in README)
- **Email**: contributors@parkinggarage.com

### Office Hours
- **When**: Every Tuesday, 2-3 PM UTC
- **Where**: Google Meet (link in Slack)
- **Purpose**: Help new contributors

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort in improving the Parking Garage Management System!

---

*Questions? Check [GitHub Discussions](https://github.com/yourusername/ParkingGarage/discussions) or reach out on Slack!*