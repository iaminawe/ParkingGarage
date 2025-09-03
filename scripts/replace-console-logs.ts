#!/usr/bin/env ts-node

/**
 * Console Statement Replacement Script
 * 
 * This script systematically replaces all console statements across the codebase
 * with proper structured logging using our logger service.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// Logger mappings by file type/context
const LOGGER_MAPPINGS = {
  'services/auth': 'authLogger',
  'services/payment': 'paymentLogger',
  'services/email': 'emailLogger',
  'services/socket': 'socketLogger',
  'services/cache': 'cacheLogger',
  'services/database': 'dbLogger',
  'controllers': 'apiLogger',
  'middleware': 'logger',
  'routes': 'apiLogger',
  'config': 'logger',
  'utils': 'logger',
  'default': 'logger'
};

// Console replacement patterns
const CONSOLE_PATTERNS = [
  // console.log patterns
  {
    pattern: /console\.log\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
    replacement: (loggerName: string, message: string) => 
      `${loggerName}.info('${message}', { component: '${getComponentName()}' })`
  },
  {
    pattern: /console\.log\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: (loggerName: string, message: string, args: string) => 
      `${loggerName}.info('${message}', { component: '${getComponentName()}', data: ${args} })`
  },
  
  // console.error patterns
  {
    pattern: /console\.error\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: (loggerName: string, message: string, error: string) => 
      `${loggerName}.error('${message}', ${error} as Error, { component: '${getComponentName()}' })`
  },
  {
    pattern: /console\.error\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
    replacement: (loggerName: string, message: string) => 
      `${loggerName}.error('${message}', undefined, { component: '${getComponentName()}' })`
  },
  
  // console.warn patterns
  {
    pattern: /console\.warn\s*\(\s*(['"`])([^'"`]+)\1\s*,?\s*([^)]*)\)/g,
    replacement: (loggerName: string, message: string, args?: string) => {
      const meta = args ? `{ component: '${getComponentName()}', data: ${args} }` : `{ component: '${getComponentName()}' }`;
      return `${loggerName}.warn('${message}', ${meta})`;
    }
  },
  
  // console.info patterns
  {
    pattern: /console\.info\s*\(\s*(['"`])([^'"`]+)\1\s*,?\s*([^)]*)\)/g,
    replacement: (loggerName: string, message: string, args?: string) => {
      const meta = args ? `{ component: '${getComponentName()}', data: ${args} }` : `{ component: '${getComponentName()}' }`;
      return `${loggerName}.info('${message}', ${meta})`;
    }
  }
];

let currentFile = '';

function getComponentName(): string {
  const fileName = path.basename(currentFile, '.ts');
  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

function getLoggerForFile(filePath: string): string {
  for (const [pathPattern, loggerName] of Object.entries(LOGGER_MAPPINGS)) {
    if (pathPattern !== 'default' && filePath.includes(pathPattern)) {
      return loggerName;
    }
  }
  return LOGGER_MAPPINGS.default;
}

function addLoggerImport(content: string, loggerName: string): string {
  // Check if logger import already exists
  if (content.includes('from \'../utils/logger\'') || content.includes('from \'./utils/logger\'')) {
    return content;
  }
  
  // Find the last import statement
  const importPattern = /^import.*from.*;$/gm;
  const imports = content.match(importPattern);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const importPath = content.includes('src/utils/') ? './logger' : '../utils/logger';
    const loggerImport = `import { ${loggerName} } from '${importPath}';`;
    
    return content.replace(lastImport, `${lastImport}\n${loggerImport}`);
  }
  
  return content;
}

function replaceConsoleStatements(content: string, filePath: string): string {
  currentFile = filePath;
  const loggerName = getLoggerForFile(filePath);
  
  let modifiedContent = content;
  let hasChanges = false;
  
  // Apply console replacement patterns
  for (const patternConfig of CONSOLE_PATTERNS) {
    const matches = modifiedContent.match(patternConfig.pattern);
    if (matches) {
      hasChanges = true;
      modifiedContent = modifiedContent.replace(patternConfig.pattern, (match, quote, message, args) => {
        return patternConfig.replacement(loggerName, message, args);
      });
    }
  }
  
  // Add logger import if changes were made
  if (hasChanges) {
    modifiedContent = addLoggerImport(modifiedContent, loggerName);
  }
  
  return modifiedContent;
}

function processFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if no console statements
    if (!content.includes('console.')) {
      return false;
    }
    
    const modifiedContent = replaceConsoleStatements(content, filePath);
    
    if (modifiedContent !== content) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ Processed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  const srcDir = path.join(process.cwd(), 'src');
  const tsFiles = glob.sync('**/*.ts', { cwd: srcDir, absolute: true });
  
  let processedCount = 0;
  let totalFiles = 0;
  
  console.log(`🔄 Processing ${tsFiles.length} TypeScript files...`);
  
  for (const filePath of tsFiles) {
    // Skip test files and the logger itself
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.endsWith('logger.ts')) {
      continue;
    }
    
    totalFiles++;
    if (processFile(filePath)) {
      processedCount++;
    }
  }
  
  console.log(`\n✅ Batch console replacement complete!`);
  console.log(`📊 Files processed: ${processedCount}/${totalFiles}`);
  console.log(`🔍 Run verification to check remaining console statements`);
}

if (require.main === module) {
  main().catch(console.error);
}