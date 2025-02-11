#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ANSI color codes for report
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

// ------------------------------
// Synchronous prompt using fs.readSync
// ------------------------------
function prompt(query) {
  process.stdout.write(query);
  const buffer = Buffer.alloc(1024);
  const bytesRead = fs.readSync(process.stdin.fd, buffer, 0, 1024);
  return buffer.toString('utf8', 0, bytesRead).trim();
}

// ------------------------------
// Date Helpers
// ------------------------------
function getDateForFileName(date) {
  // Use dashes for file names
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function getDateForDisplay(date) {
  // Use slashes for display
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function getLastModifiedDateOfSrc(projectFolder) {
  const srcPath = path.join(projectFolder, 'src');
  try {
    const stats = fs.statSync(srcPath);
    return { fileName: getDateForFileName(stats.mtime), display: getDateForDisplay(stats.mtime) };
  } catch (err) {
    console.warn("Unable to get last modified date from src folder. Falling back to current date.");
    const now = new Date();
    return { fileName: getDateForFileName(now), display: getDateForDisplay(now) };
  }
}

// ------------------------------
// Project Discovery Functions
// ------------------------------
function isProjectFolder(folderPath) {
  try {
    const srcPath = path.join(folderPath, 'src');
    if (!fs.existsSync(srcPath) || !fs.lstatSync(srcPath).isDirectory()) return false;
    const viteConfig = path.join(folderPath, 'vite.config.js');
    if (!fs.existsSync(viteConfig) || !fs.lstatSync(viteConfig).isFile()) return false;
    const pkgLock = path.join(folderPath, 'package-lock.json');
    if (!fs.existsSync(pkgLock) || !fs.lstatSync(pkgLock).isFile()) return false;
    return true;
  } catch (err) {
    return false;
  }
}

function findProjectCandidates(baseDir) {
  let candidates = [];
  function search(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (let entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        let subEntries = [];
        try {
          subEntries = fs.readdirSync(fullPath);
        } catch (err) {
          continue;
        }
        if (subEntries.length === 0) continue; // ignore empty dirs
        if (isProjectFolder(fullPath)) {
          candidates.push(fullPath);
        } else {
          search(fullPath);
        }
      }
    }
  }
  search(baseDir);
  return candidates;
}

// ------------------------------
// Progress Bar Helper (with line-clear)
// ------------------------------
function printProgressBar(current, total, prefix, suffix) {
  // Clear the line and move cursor to start.
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  const barLength = 20;
  const percent = current / total;
  const filledLength = Math.round(barLength * percent);
  const bar = "#".repeat(filledLength) + "-".repeat(barLength - filledLength);
  const percentage = Math.round(percent * 100);
  const line = `    ${prefix}: [${bar}] ${percentage}% ${suffix}`;
  process.stdout.write(line);
  if (current === total) process.stdout.write("\n");
}

// ------------------------------
// Helper to get all files and directories (for deletion)
// ------------------------------
function getAllPaths(dir) {
  let results = [];
  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (let entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
        results.push(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }
  traverse(dir);
  return results;
}

// ------------------------------
// Delete a directory with progress updates
// ------------------------------
function deleteDirectoryWithProgress(dirPath, displayName) {
  if (!fs.existsSync(dirPath)) return;
  const items = getAllPaths(dirPath);
  // Total count: all items plus the root directory itself
  const total = items.length + 1;
  let current = 0;
  console.log(`    🗑  Deleting ${displayName}...`);
  for (const item of items) {
    try {
      const stats = fs.lstatSync(item);
      if (stats.isDirectory()) {
        fs.rmdirSync(item);
      } else {
        fs.unlinkSync(item);
      }
    } catch (error) {
      console.error(`\nError deleting ${item}: ${error.message}`);
    }
    current++;
    printProgressBar(current, total, `Deleting ${displayName}`, `(${path.basename(item)})`);
  }
  try {
    fs.rmdirSync(dirPath);
    current++;
    printProgressBar(current, total, `Deleting ${displayName}`, `(Done)`);
  } catch (error) {
    console.error(`\nError deleting ${dirPath}: ${error.message}`);
  }
  console.log(""); // Newline after progress bar
}

// ------------------------------
// Run a command and log output
// ------------------------------
function runCommand(command, options, logFile) {
  let result = { success: true, stdout: '', stderr: '' };
  try {
    const output = execSync(command, { ...options, stdio: 'pipe' });
    result.stdout = output.toString();
  } catch (error) {
    result.success = false;
    if (error.stdout) result.stdout = error.stdout.toString();
    if (error.stderr) result.stderr = error.stderr.toString();
  }
  fs.appendFileSync(logFile, `\n--- Command: ${command}\n`);
  fs.appendFileSync(logFile, `--- Success: ${result.success}\n`);
  if (result.stdout) fs.appendFileSync(logFile, `--- Stdout:\n${result.stdout}\n`);
  if (result.stderr) fs.appendFileSync(logFile, `--- Stderr:\n${result.stderr}\n`);
  fs.appendFileSync(logFile, '----------------------------------------\n');
  if (!result.success) {
    console.warn(`    ⚠️  Command "${command}" failed. Check backup_log.txt for details.`);
  }
  return result;
}

// ------------------------------
// Copy ZIP archive to Desktop (when prompted)
// ------------------------------
function copyZipToDesktop(zipPath, zipName) {
  let desktopPath = null;
  if (process.platform === 'win32' && process.env.USERPROFILE) {
    desktopPath = path.join(process.env.USERPROFILE, 'Desktop');
  } else if (process.env.HOME) {
    desktopPath = path.join(process.env.HOME, 'Desktop');
  }
  if (desktopPath && fs.existsSync(desktopPath)) {
    const zipDesktopPath = path.join(desktopPath, zipName);
    console.log(`\n📄 Copying zip archive to Desktop: ${zipDesktopPath}`);
    try {
      fs.copyFileSync(zipPath, zipDesktopPath);
      console.log("    ✅ Zip archive copied to Desktop.");
    } catch (error) {
      console.error("❌ Failed to copy zip archive to Desktop:", error.message);
    }
  } else {
    console.warn("\n⚠️  Desktop folder not found. Skipping copy to Desktop.");
  }
}

// ------------------------------
// Recursively calculate folder size (in bytes)
// ------------------------------
function getFolderSize(dir) {
  let totalSize = 0;
  function accumulate(currentPath) {
    const stats = fs.lstatSync(currentPath);
    if (stats.isDirectory()) {
      const entries = fs.readdirSync(currentPath);
      for (let entry of entries) {
        accumulate(path.join(currentPath, entry));
      }
    } else {
      totalSize += stats.size;
    }
  }
  accumulate(dir);
  return totalSize;
}

// ------------------------------
// Format bytes as a human-readable string
// ------------------------------
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

// ------------------------------
// Process a single project backup
// ------------------------------
function processProject(candidateFolder, baseDir, logFile) {
  console.log(`\n=== Processing project: ${candidateFolder} ===`);
  const folderName = path.basename(candidateFolder);
  let packageName = "";
  let pkgJson = {};
  try {
    const pkgContent = fs.readFileSync(path.join(candidateFolder, 'package.json'), 'utf8');
    pkgJson = JSON.parse(pkgContent);
    packageName = pkgJson.name || "";
  } catch (err) { /* ignore */ }

  let backupName = folderName;
  if (packageName && packageName !== folderName) {
    console.log(`\nDetermine backup name:`);
    console.log(`   1) Use folder name ("${folderName}")`);
    console.log(`   2) Use package.json name ("${packageName}")`);
    console.log("   3) Enter a custom name");
    const nameChoice = prompt("Enter 1, 2, or 3: ");
    if (nameChoice === "2") {
      backupName = packageName;
    } else if (nameChoice === "3") {
      backupName = prompt("Enter custom project name: ");
    }
  } else {
    backupName = folderName;
    console.log(`\nBackup name automatically set to "${backupName}" (folder and package name are identical or package name missing).`);
  }
  console.log(`Project will be backed up as: "${backupName}"`);

  // Cleanup phase: remove common folders with progress updates
  console.log(`\n🚀 Cleaning up project folder (removing node_modules, dist, etc.)...`);
  const cleanupFolders = ['node_modules', 'dist', '.turbo', '.cache', 'coverage'];
  cleanupFolders.forEach(folder => {
    const target = path.join(candidateFolder, folder);
    if (fs.existsSync(target)) {
      deleteDirectoryWithProgress(target, folder);
    }
  });

  // Create a temporary directory for backup
  console.log(`\n🗂  Creating temporary directory for backup...`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));
  const tempProjectPath = path.join(tmpDir, backupName);
  console.log(`    Temporary backup path: ${tempProjectPath}`);

  // Copy the project folder into the temporary location
  fs.cpSync(candidateFolder, tempProjectPath, { recursive: true });

  // Build ZIP file name using last modified date of the src folder
  const { fileName: backupDateFileName, display: backupDateDisplay } = getLastModifiedDateOfSrc(candidateFolder);
  const zipName = `${backupName}-backup-${backupDateFileName}.zip`;
  const zipPath = path.join(baseDir, zipName);

  // Remove existing ZIP if present
  if (fs.existsSync(zipPath)) {
    console.log(`    ⚠️  Removing existing ZIP: ${zipPath}`);
    fs.rmSync(zipPath, { force: true });
  }

  // Create the ZIP archive
  console.log(`\n📦 Creating zip archive: ${zipName}`);
  let backupStatus = "Success";
  try {
    if (process.platform === 'win32') {
      const psCommand = `powershell Compress-Archive -Path "${backupName}" -DestinationPath "${zipName}" -Force`;
      runCommand(psCommand, { cwd: tmpDir }, logFile);
    } else {
      const zipCommand = `zip -r "${zipName}" "${backupName}"`;
      runCommand(zipCommand, { cwd: tmpDir }, logFile);
    }
    // Copy the zip file from tmpDir to baseDir
    fs.copyFileSync(path.join(tmpDir, zipName), zipPath);
    console.log(`    ✅ Zip archive created at: ${zipPath}`);
  } catch (error) {
    console.error("❌ Error creating zip archive:", error.message);
    backupStatus = "Failed";
  }

  // Remove the temporary directory
  console.log(`    🗑  Removing temporary folder: ${tmpDir}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // Get sizes (if backup succeeded)
  let sourceSizeStr = "";
  let zipSizeStr = "";
  try {
    const sourceSize = getFolderSize(candidateFolder);
    sourceSizeStr = formatBytes(sourceSize);
    const zipStats = fs.statSync(zipPath);
    zipSizeStr = formatBytes(zipStats.size);
  } catch (err) { /* ignore errors */ }

  console.log(`\n🎉 Backup completed for project:\n   ${candidateFolder}`);
  console.log("To restore the project, unzip the archive and run:\n   npm install && npm run dev\n");

  // Return a report object for the summary.
  return {
    project: backupName,
    sourceFolder: candidateFolder,
    zipPath: zipPath,
    zipName: zipName,
    backupDate: backupDateDisplay,
    sourceSize: sourceSizeStr,
    zipSize: zipSizeStr,
    backupStatus: backupStatus,
    deletionStatus: "Not Deleted"
  };
}

// ------------------------------
// Helper to pad strings (handles longer strings gracefully)
// ------------------------------
function pad(str, len) {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

// ------------------------------
// Print a detailed ASCII report table
// ------------------------------
function printReportTable(reports) {
  const headers = ["Project", "Source Size", "Zip Size", "Backup Date", "Status", "Deletion"];
  // Compute maximum width for each column based on header and data lengths
  const colWidths = headers.map((header, idx) => {
    const data = reports.map(r => {
      switch (idx) {
        case 0: return r.project;
        case 1: return r.sourceSize;
        case 2: return r.zipSize;
        case 3: return r.backupDate;
        case 4: return r.backupStatus;
        case 5: return r.deletionStatus;
        default: return "";
      }
    });
    return Math.max(header.length, ...data.map(s => s.length));
  });

  // Build horizontal border
  let border = "+";
  colWidths.forEach(w => { border += "-".repeat(w + 2) + "+"; });

  // Print header
  console.log("\n" + border);
  let headerRow = "|";
  headers.forEach((header, idx) => {
    headerRow += " " + pad(header, colWidths[idx]) + " |";
  });
  console.log(headerRow);
  console.log(border);

  // Print each row
  reports.forEach(r => {
    let statusText = r.backupStatus;
    if (statusText.toLowerCase() === "success") {
      statusText = GREEN + statusText + RESET;
    } else {
      statusText = RED + statusText + RESET;
    }
    let deletionText = r.deletionStatus;
    if (deletionText.toLowerCase() === "deleted") {
      deletionText = GREEN + deletionText + RESET;
    } else if (deletionText.toLowerCase() === "failed") {
      deletionText = RED + deletionText + RESET;
    }
    let row = "| " +
      pad(r.project, colWidths[0]) + " | " +
      pad(r.sourceSize, colWidths[1]) + " | " +
      pad(r.zipSize, colWidths[2]) + " | " +
      pad(r.backupDate, colWidths[3]) + " | " +
      pad(statusText, colWidths[4]) + " | " +
      pad(deletionText, colWidths[5]) + " |";
    console.log(row);
  });
  console.log(border + "\n");
}

// ------------------------------
// Exit Helper
// ------------------------------
function pressAnyKeyToExit(exitCode = 0) {
  prompt("Press any key to exit...");
  process.exit(exitCode);
}

// ------------------------------
// MAIN SCRIPT LOGIC
// ------------------------------
console.log(`\n[1/7] 🔎  Searching for Vite project folders (recursively)...`);
const baseDir = process.cwd();
const candidates = findProjectCandidates(baseDir);

if (candidates.length === 0) {
  console.error("❌ No candidate Vite project folder found (needs 'src/', 'vite.config.js', 'package-lock.json').");
  pressAnyKeyToExit(1);
}

let selectedCandidates = [];

if (candidates.length === 1) {
  selectedCandidates.push(candidates[0]);
  console.log(`[2/7] ✅ One project folder detected:\n    ${candidates[0]}`);
} else {
  console.log(`[2/7] ✅ Multiple project folders detected:`);
  candidates.forEach((cand, index) => {
    const folderName = path.basename(cand);
    let pkgName = "";
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(cand, 'package.json'), 'utf8'));
      pkgName = pkg.name || "";
    } catch (err) { /* ignore */ }
    console.log(`    ${index + 1}: ${cand} (folder: "${folderName}"${pkgName ? `, package: "${pkgName}"` : ""})`);
  });
  const selection = prompt("Enter project numbers separated by commas, or 'a' for all: ");
  if (selection.toLowerCase() === 'a') {
    selectedCandidates = candidates;
  } else {
    const indices = selection.split(',').map(s => parseInt(s.trim(), 10));
    indices.forEach(i => {
      if (!isNaN(i) && i >= 1 && i <= candidates.length) {
        selectedCandidates.push(candidates[i - 1]);
      }
    });
    if (selectedCandidates.length === 0) {
      console.error("❌ Invalid selection. Exiting.");
      pressAnyKeyToExit(1);
    }
  }
}

console.log(`[3/7] Starting backup process for ${selectedCandidates.length} project(s)...`);

// Create (or overwrite) backup_log.txt in baseDir
const logFile = path.join(baseDir, 'backup_log.txt');
fs.writeFileSync(logFile, `[BACKUP LOG - ${new Date().toLocaleString()}]\n`);

let reports = [];
selectedCandidates.forEach((projectFolder, idx) => {
  console.log(`\n--- Processing project ${idx + 1} of ${selectedCandidates.length} ---`);
  const report = processProject(projectFolder, baseDir, logFile);
  reports.push(report);
});

// Prompt to delete source folders for successfully backed-up projects
const successfulBackups = reports.filter(r => r.backupStatus.toLowerCase() === "success");
if (successfulBackups.length > 0) {
  const deleteChoice = prompt("Enter 'd' to delete source folders for successfully backed-up projects, or any other key to keep them: ");
  if (deleteChoice.toLowerCase() === "d") {
    successfulBackups.forEach(r => {
      try {
        deleteDirectoryWithProgress(r.sourceFolder, path.basename(r.sourceFolder));
        r.deletionStatus = "Deleted";
      } catch (error) {
        console.error(`Error deleting source folder ${r.sourceFolder}: ${error.message}`);
        r.deletionStatus = "Failed";
      }
    });
  }
}

// Prompt to copy succeeded backups to Desktop
if (successfulBackups.length > 0) {
  const copyDesktopChoice = prompt("Enter 'y' to copy succeeded backups to the Desktop, or any other key to skip: ");
  if (copyDesktopChoice.toLowerCase() === 'y') {
    successfulBackups.forEach(r => {
      copyZipToDesktop(r.zipPath, r.zipName);
    });
  }
}

console.log("\n🎉 All backups completed!");

// Print detailed report table
printReportTable(reports);

// Final Log Deletion Prompt:
if (reports.every(r => r.backupStatus.toLowerCase() === "success")) {
  // All backups succeeded.
  const logDeletionChoice = prompt("All backups succeeded. Press any key to delete the log file, or type 'x' to keep it: ");
  if (logDeletionChoice.toLowerCase() !== 'x') {
    try {
      fs.rmSync(logFile);
      console.log("Log file deleted.");
    } catch (err) {
      console.error("Failed to delete log file:", err.message);
    }
  }
} else {
  // Some backups failed.
  const logDeletionChoice = prompt("WARNING: Some backups failed. It is recommended to keep the log file for troubleshooting. To delete it anyway, type 'd'; otherwise, press any key to keep it: ");
  if (logDeletionChoice.toLowerCase() === 'd') {
    try {
      fs.rmSync(logFile);
      console.log("Log file deleted.");
    } catch (err) {
      console.error("Failed to delete log file:", err.message);
    }
  }
}

pressAnyKeyToExit(0);
