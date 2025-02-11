# Automated Vite Project Backup Script Wiki

 Hey there! 😊,

  I often create lots of Vite React projects that I don’t push to GitHub, instead storing them on my NAS or PC but.

  Manually cleaning node modules and directories is slow and boring for preparing backup.

  This script automates all that;

  it finds Vite React projects with the right structure, removes unnecessary files (like node_modules), and packages your project into a clean ZIP archive ready for a quick `npm install` when you need it.

   - There is also .exe converted version in repo too, so you can basicly move .exe file to root of your project folder and double click to run.

---

## Overview

The **Automated Vite Project Backup Script** is a comprehensive tool that:

- **Scans Directories:** Recursively searches for Vite project folders by detecting key files and directories (such as `src/`, `vite.config.js`, and `package-lock.json`).
- **Cleans Up Artifacts:** Removes common build artifacts (e.g. `node_modules`, `dist`, `.turbo`, `.cache`, and `coverage`) using a progress bar that provides detailed real-time feedback.
- **Creates Backups:** Generates a ZIP archive of the project, timestamped using the last modified date of the `src` folder (file names use the dd-mm-yy format; display dates use dd/mm/yy).
- **Interactive Options:** Offers prompts for selecting the backup name, deleting the original source folders, copying backups to the Desktop, and managing the log file.
- **Detailed Reporting:** Provides an ASCII table report in the console with color-coded statuses, including information on file sizes, backup dates, and the success or failure of each operation.
- **Logging:** Logs all operations to a `backup_log.txt` file for troubleshooting purposes.

---

## Features

- **Project Detection:** 
  - Automatically identifies Vite projects by checking for the existence of `src/`, `vite.config.js`, and `package-lock.json`.
- **Backup Naming Options:** 
  - Automatically uses the folder name if it matches the package.json name.
  - Prompts you to choose between the folder name, package.json name, or a custom name when they differ.
- **Artifact Cleanup with Progress Bar:**
  - Deletes folders like `node_modules` and `dist` with a detailed progress bar.
  - Displays the current file/directory being deleted, updating the progress line to keep the output clear.
- **ZIP Archive Creation:**
  - Copies the project to a temporary location and archives it as a ZIP file.
  - The ZIP file is named with the chosen backup name and the last modified date of the `src` folder.
- **Optional Post-Backup Operations:**
  - Prompts to delete the original source folders if the backup was successful.
  - Offers to copy the backup ZIPs to the Desktop.
  - Provides a final prompt for log file deletion, with different options based on whether all backups succeeded.
- **Detailed Reporting:**
  - Outputs an ASCII table summarizing project name, source size, ZIP size, backup date, overall status, and deletion status.
  - Uses color coding (green for success and red for failure) to highlight statuses.

---

## Dependencies

- **Node.js:**  
  The script requires Node.js (version 12 or later is recommended; tested on v20+).  
  Verify your installation by running:
  
      node -v

- **Built-in Node Modules:**  
  - `fs` – for file system operations.
  - `path` – for handling file paths.
  - `os` – for OS-specific operations.
  - `child_process` – for executing shell commands.

- **Platform Compatibility:**  
  Works on Windows, macOS, and Linux. The script automatically adjusts commands (e.g., it uses PowerShell on Windows and the `zip` command on Unix-based systems).

---

## Installation

1. **Clone the Repository:**

       git clone https://github.com/yourusername/automated-vite-backup.git

2. **Navigate to the Project Directory:**

       cd automated-vite-backup

3. **Ensure Node.js is Installed:**  
   Confirm Node.js is installed by running:

       node -v

   If not, download it from [nodejs.org](https://nodejs.org/).

4. **(Optional) Make the Script Executable on Unix:**  

       chmod +x backup_script.js

---

## Configuration

The script is designed to work out-of-the-box without external configuration files. However, you can adjust its behavior by modifying sections within the source code:

- **Cleanup Directories:**  
  Modify the array of directories (e.g., `node_modules`, `dist`, etc.) that the script deletes during the cleanup phase.
  
- **Log File Settings:**  
  The default log file is named `backup_log.txt` and is created in the working directory.
  
- **Prompt Customization:**  
  The interactive prompts for selecting backup names, deleting source folders, and managing the log file can be edited directly in the script.

---

## Usage

1. **Run the Script:**

       node backup_script.js

2. **Interactive Workflow:**

   - **Project Selection:**  
     If multiple Vite projects are found, you will be prompted to enter the project numbers (comma-separated) or type `a` for all projects.
     
   - **Backup Naming:**  
     Choose between the folder name, package.json name, or enter a custom name if the names differ.
     
   - **Cleanup Process:**  
     The script will display a progress bar as it deletes build artifacts. The progress bar updates in place, ensuring clear output.
     
   - **ZIP Creation:**  
     A ZIP archive is created in the current directory with a name formatted as `<backupName>-backup-<date>.zip`.
     
   - **Post-Backup Prompts:**  
     After creating the backups, you can:
     
     - Delete the original source folders (for successful backups).
     - Copy the ZIP archives to your Desktop.
     - Decide whether to delete the log file, with different instructions based on whether any backups failed.

3. **View the Report:**  
   At the end of the process, an ASCII table is printed in the console summarizing the status of each backup (including file sizes, backup dates, and deletion statuses).

---

## How It Works

1. **Scanning for Projects:**  
   The script recursively scans the current directory for Vite projects by checking for a `src` folder, a `vite.config.js` file, and a `package-lock.json` file.

2. **Determining Backup Name:**  
   - If the folder name and package.json name match (or if the package.json name is not available), that name is used automatically.
   - Otherwise, you are prompted to choose between the two names or to enter a custom backup name.

3. **Cleaning Up Build Artifacts:**  
   The script deletes specified directories (like `node_modules` and `dist`) and displays a progress bar that updates on a single line, ensuring that remnants of previous file names do not clutter the output.

4. **Creating the ZIP Archive:**  
   - A temporary directory is created.
   - The project is copied into this directory.
   - A ZIP file is generated using either PowerShell (on Windows) or the `zip` command (on Unix-based systems).
   - The ZIP file is then moved to the working directory.

5. **Post-Backup Operations:**  
   - You are given the option to delete the original project folders if the backup was successful.
   - Optionally, the ZIP archives can be copied to the Desktop.
   - Finally, you are prompted to delete the log file.  
     - If all backups succeeded, press any key to delete the log file or type `x` to keep it.
     - If any backup failed, you will see a warning and be prompted to type `d` to delete the log file or press any key to retain it.

6. **Reporting:**  
   A detailed report is generated in the console as an ASCII table that includes:
   - Project name
   - Source folder size
   - ZIP file size
   - Backup date (formatted as dd/mm/yy)
   - Overall backup status (with color coding)
   - Deletion status (with color coding)

---

## Troubleshooting

- **Backup Failures:**  
  If a backup fails, review the `backup_log.txt` file for detailed error messages. Ensure that the project folder meets the required criteria.

- **Permission Issues:**  
  Some deletion operations might require elevated permissions. Try running the script with administrative privileges if necessary.

- **Environment-Specific Problems:**  
  - On Windows, ensure that PowerShell is available for the ZIP operation.
  - On Unix-based systems, ensure that the `zip` utility is installed.

---

## Contributing

Contributions to the project are welcome! Follow these steps to contribute:

1. **Fork the Repository:**  
   Click on the "Fork" button in the GitHub interface.

2. **Create a New Branch:**  
   Use a descriptive branch name for your feature or bug fix.

3. **Commit Your Changes:**  
   Make sure to provide clear and concise commit messages.

4. **Submit a Pull Request:**  
   Explain your changes in detail and reference any related issues.

---

## License

This project is released under the MIT License. See the LICENSE file for more details.

---

## Contact & Support

For any questions or issues, please open an issue on the GitHub repository or contact the project maintainer at your-email@example.com.

Thank you for using the **Automated Vite Project Backup Script** and for contributing to its ongoing development!
