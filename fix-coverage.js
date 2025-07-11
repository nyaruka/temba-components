#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Post-processes LCOV coverage data to remove CSS template literal lines
 * from coverage consideration. This fixes the issue where istanbul treats
 * CSS-in-JS template literal lines as executable statements.
 */

const LCOV_FILE = path.join(__dirname, 'coverage', 'lcov.info');
const SRC_DIR = path.join(__dirname, 'src');

// CSS template literal patterns to identify CSS blocks
const CSS_PATTERNS = [
  /static styles = css`/, // Lit CSS styles
  /css`/, // General CSS template literals
];

// Function to identify CSS template literal line ranges in a TypeScript file
function getCSSLineRanges(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cssRanges = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line starts a CSS template literal
      if (CSS_PATTERNS.some(pattern => pattern.test(line))) {
        const startLine = i + 1; // LCOV uses 1-based line numbers
        let endLine = startLine;
        let backtickCount = (line.match(/`/g) || []).length;
        
        // If the CSS template starts and ends on the same line, skip
        if (backtickCount >= 2) {
          cssRanges.push({ start: startLine, end: startLine });
          continue;
        }
        
        // Find the end of the CSS template literal
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          const nextBackticks = (nextLine.match(/`/g) || []).length;
          backtickCount += nextBackticks;
          
          // If we have an odd number of backticks, we're still inside the template
          if (backtickCount % 2 === 0) {
            endLine = j + 1; // LCOV uses 1-based line numbers
            break;
          }
        }
        
        if (endLine > startLine) {
          cssRanges.push({ start: startLine, end: endLine });
        }
      }
    }
    
    return cssRanges;
  } catch (error) {
    console.warn(`Could not read file ${filePath}: ${error.message}`);
    return [];
  }
}

// Function to check if a line number is within any CSS range
function isInCSSRange(lineNumber, cssRanges) {
  return cssRanges.some(range => lineNumber >= range.start && lineNumber <= range.end);
}

// Function to process a single file's coverage data
function processFileCoverage(filePath, lcovLines, cssRanges) {
  const filteredLines = [];
  let totalLines = 0;
  let hitLines = 0;
  let removedLines = 0;
  
  for (const line of lcovLines) {
    if (line.startsWith('DA:')) {
      // Parse line coverage data (format: DA:line_number,hit_count)
      const match = line.match(/^DA:(\d+),(\d+)$/);
      if (match) {
        const lineNumber = parseInt(match[1]);
        const hitCount = parseInt(match[2]);
        
        // Skip this line if it's within a CSS template literal
        if (isInCSSRange(lineNumber, cssRanges)) {
          removedLines++;
          continue;
        }
        
        totalLines++;
        if (hitCount > 0) {
          hitLines++;
        }
      }
    }
    
    // Keep all non-DA lines (function coverage, branch coverage, etc.)
    if (!line.startsWith('DA:') || !isInCSSRange(parseInt(line.split(':')[1].split(',')[0]), cssRanges)) {
      filteredLines.push(line);
    }
  }
  
  // Update the LF (lines found) and LH (lines hit) counts
  for (let i = 0; i < filteredLines.length; i++) {
    if (filteredLines[i].startsWith('LF:')) {
      filteredLines[i] = `LF:${totalLines}`;
    } else if (filteredLines[i].startsWith('LH:')) {
      filteredLines[i] = `LH:${hitLines}`;
    }
  }
  
  console.log(`${filePath}: Removed ${removedLines} CSS lines from coverage`);
  return filteredLines;
}

// Main function to process the LCOV file
function processLCOV() {
  if (!fs.existsSync(LCOV_FILE)) {
    console.error('LCOV file not found:', LCOV_FILE);
    process.exit(1);
  }
  
  const lcovContent = fs.readFileSync(LCOV_FILE, 'utf8');
  const lines = lcovContent.split('\n');
  
  let processedLines = [];
  let currentFile = null;
  let currentFileLines = [];
  
  for (const line of lines) {
    if (line.startsWith('SF:')) {
      // If we have a previous file, process it
      if (currentFile && currentFileLines.length > 0) {
        const relativePath = currentFile.replace('src/', '');
        const fullPath = path.join(SRC_DIR, relativePath);
        
        if (fullPath.endsWith('.ts') && fs.existsSync(fullPath)) {
          const cssRanges = getCSSLineRanges(fullPath);
          if (cssRanges.length > 0) {
            const processedFileLines = processFileCoverage(currentFile, currentFileLines, cssRanges);
            processedLines.push(...processedFileLines);
          } else {
            processedLines.push(...currentFileLines);
          }
        } else {
          processedLines.push(...currentFileLines);
        }
      }
      
      // Start tracking new file
      currentFile = line.substring(3); // Remove 'SF:' prefix
      currentFileLines = [line];
    } else if (line === 'end_of_record') {
      currentFileLines.push(line);
      
      // Process the current file
      if (currentFile && currentFileLines.length > 0) {
        const relativePath = currentFile.replace('src/', '');
        const fullPath = path.join(SRC_DIR, relativePath);
        
        if (fullPath.endsWith('.ts') && fs.existsSync(fullPath)) {
          const cssRanges = getCSSLineRanges(fullPath);
          if (cssRanges.length > 0) {
            const processedFileLines = processFileCoverage(currentFile, currentFileLines, cssRanges);
            processedLines.push(...processedFileLines);
          } else {
            processedLines.push(...currentFileLines);
          }
        } else {
          processedLines.push(...currentFileLines);
        }
      }
      
      currentFile = null;
      currentFileLines = [];
    } else {
      currentFileLines.push(line);
    }
  }
  
  // Write the processed LCOV file
  const processedContent = processedLines.join('\n');
  fs.writeFileSync(LCOV_FILE, processedContent);
  
  console.log('✅ LCOV file processed successfully');
  console.log('CSS template literal lines have been removed from coverage calculation');
}

if (require.main === module) {
  processLCOV();
}

module.exports = { processLCOV };