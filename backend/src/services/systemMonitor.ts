import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: ActivityType;
  data: any;
  category: string;
}

export enum ActivityType {
  APP_OPENED = 'app_opened',
  APP_CLOSED = 'app_closed',
  TERMINAL_COMMAND = 'terminal_command',
  FILE_CHANGED = 'file_changed',
  BROWSER_SEARCH = 'browser_search',
  VSCODE_ACTION = 'vscode_action',
  SYSTEM_IDLE = 'system_idle',
  SYSTEM_ACTIVE = 'system_active'
}

export class SystemMonitor extends EventEmitter {
  private tracking = false;
  private intervals: NodeJS.Timeout[] = [];
  private watchers: fs.FSWatcher[] = [];
  private lastActiveApps = new Set<string>();
  private platform = os.platform();
  private lastCommandHashes = new Set<string>();
  private terminalProcesses = new Map<number, string>();

  private isSystemProcess(appName: string): boolean {
    const systemProcesses = [
      'WMIC.exe',
      'wmic.exe', 
      'cmd.exe',
      'conhost.exe',
      'dwm.exe',
      'winlogon.exe',
      'csrss.exe',
      'smss.exe',
      'svchost.exe',
      'lsass.exe',
      'services.exe',
      'spoolsv.exe',
      'explorer.exe',
      'taskhostw.exe',
      'RuntimeBroker.exe',
      'SearchUI.exe',
      'ShellExperienceHost.exe',
      'StartMenuExperienceHost.exe',
      'SecurityHealthSystray.exe',
      'audiodg.exe',
      'fontdrvhost.exe',
      'WmiPrvSE.exe',
      'dllhost.exe',
      'backgroundTaskHost.exe',
      'ApplicationFrameHost.exe',
      'SystemSettings.exe',
      'SettingSyncHost.exe',
      'UserOOBEBroker.exe',
      'LockApp.exe',
      'WinStore.App.exe',
      'smartscreen.exe',
      'MsMpEng.exe', // Windows Defender
      'NisSrv.exe'   // Windows Defender Network Inspection
    ];
    return systemProcesses.some(sysProcess => 
      appName.toLowerCase() === sysProcess.toLowerCase()
    );
  }

  constructor() {
    super();
    console.log(`SystemMonitor initialized for ${this.platform}`);
  }

  public onEvent(callback: (event: ActivityEvent) => void): void {
    this.on('event', callback);
  }

  public startTracking(): void {
    if (this.tracking) return;
    this.tracking = true;
    console.log('System monitoring started');
    this.startAppMonitoring();
    this.startFileSystemMonitoring();
    this.startSystemMetricsMonitoring();
    this.startEnhancedTerminalMonitoring();
  }

  public stopTracking(): void {
    this.tracking = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    console.log('System monitoring stopped');
  }

  public isTracking(): boolean {
    return this.tracking;
  }

  private emitEvent(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    const fullEvent: ActivityEvent = {
      id: `${event.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };
    this.emit('event', fullEvent);
  }

  private startAppMonitoring(): void {
    const interval = setInterval(async () => {
      if (!this.tracking) return;
      try {
        const currentApps = await this.getCurrentApplications();
        
        // Filter out system processes
        const filteredCurrentApps = new Set(
          Array.from(currentApps).filter(app => !this.isSystemProcess(app))
        );
      
        
        const filteredLastApps = new Set(
          Array.from(this.lastActiveApps).filter(app => !this.isSystemProcess(app))
        );
        
        filteredCurrentApps.forEach(app => {
          if (!filteredLastApps.has(app)) {
            this.emitEvent({
              type: ActivityType.APP_OPENED,
              data: { appName: app, platform: this.platform },
              category: 'application'
            });
          }
        });

        filteredLastApps.forEach(app => {
          if (!filteredCurrentApps.has(app)) {
            this.emitEvent({
              type: ActivityType.APP_CLOSED,
              data: { appName: app, platform: this.platform },
              category: 'application'
            });
          }
        });

        this.lastActiveApps = currentApps; // Keep original for comparison
      } catch (error) {
        console.error('Error monitoring applications:', error);
      }
    }, 5000);

    this.intervals.push(interval);
  }

  private async getCurrentApplications(): Promise<Set<string>> {
    const apps = new Set<string>();
    try {
      switch (this.platform) {
        case 'darwin':
          const { stdout: macOutput } = await execAsync('ps -eo comm | grep -v "^COMMAND" | sort | uniq');
          macOutput.split('\n').forEach(line => {
            const app = line.trim();
            if (app && !app.startsWith('/') && app.length > 0) {
              apps.add(app);
            }
          });
          break;
        case 'win32':
          const { stdout: winOutput } = await execAsync('tasklist /fo csv | findstr /v "^INFO"');
          winOutput.split('\n').forEach(line => {
            const match = line.match(/"([^"]+)"/);
            if (match && match[1]) {
              apps.add(match[1]);
            }
          });
          break;
        case 'linux':
          const { stdout: linuxOutput } = await execAsync('ps -eo comm --no-headers | sort | uniq');
          linuxOutput.split('\n').forEach(line => {
            const app = line.trim();
            if (app && app.length > 0) {
              apps.add(app);
            }
          });
          break;
      }
    } catch (error) {
      console.error('Error getting current applications:', error);
    }
    return apps;
  }

  private startFileSystemMonitoring(): void {
    const watchDirs = [
      process.cwd(),
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'Desktop'),
      path.join(os.homedir(), 'Downloads')
    ];

    // Directories to exclude from monitoring
    const excludeDirs = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      '.vscode',
      '.idea',
      'coverage',
      '.nyc_output',
      'tmp',
      'temp',
      '.cache',
      'logs',
      '.DS_Store',
      'Thumbs.db'
    ];

    watchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
            if (!this.tracking || !filename) return;

            // Skip if file is in excluded directories
            const shouldExclude = excludeDirs.some(excludeDir => 
              filename.includes(excludeDir + path.sep) || 
              filename.startsWith(excludeDir + path.sep) ||
              filename === excludeDir
            );

            if (shouldExclude) {
              return; // Skip this file change
            }

            const fullPath = path.join(dir, filename);
            const ext = path.extname(filename);
            
            // Only track development-related file extensions
            const devExtensions = [
              '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', 
              '.html', '.css', '.scss', '.sass', '.less', '.json', '.md', 
              '.txt', '.yml', '.yaml', '.xml', '.php', '.rb', '.go', '.rs',
              '.vue', '.svelte', '.sql', '.sh', '.bat', '.ps1', '.dockerfile'
            ];

            if (devExtensions.includes(ext.toLowerCase())) {
              this.emitEvent({
                type: ActivityType.FILE_CHANGED,
                data: {
                  action: eventType,
                  fileName: filename,
                  directory: dir,
                  extension: ext,
                  fullPath
                },
                category: 'file_system'
              });
            }
          });

          this.watchers.push(watcher);
        } catch (error) {
          console.error(`Error watching directory ${dir}:`, error);
        }
      }
    });
  }

  private startSystemMetricsMonitoring(): void {
    const interval = setInterval(async () => {
      if (!this.tracking) return;

      try {
        const metrics = await this.getSystemMetrics();
        this.emitEvent({
          type: ActivityType.SYSTEM_ACTIVE,
          data: metrics,
          category: 'system'
        });
      } catch (error) {
        console.error('Error getting system metrics:', error);
      }
    }, 60000);

    this.intervals.push(interval);
  }

  private async getSystemMetrics(): Promise<{
    platform: string;
    uptime: number;
    loadAverage: number[];
    totalMemory: number;
    freeMemory: number;
    cpuCount: number;
    idleTime: number;
  }> {
    const metrics = {
      platform: this.platform,
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      idleTime: 0
    };

    try {
      switch (this.platform) {
        case 'darwin':
          const { stdout: macIdle } = await execAsync(
            'ioreg -c IOHIDSystem | awk \'/HIDIdleTime/ {print $NF/1000000000; exit}\''
          );
          metrics.idleTime = parseFloat(macIdle.trim()) || 0;
          break;
        case 'linux':
          const { stdout: linuxIdle } = await execAsync(
            'cat /proc/stat | grep "cpu " | awk \'{idle=$5} END {print idle}\''
          );
          metrics.idleTime = parseFloat(linuxIdle.trim()) || 0;
          break;
        case 'win32':
          metrics.idleTime = 0;
          break;
      }
    } catch (error) {
      metrics.idleTime = 0;
    }

    return metrics;
  }

  private startEnhancedTerminalMonitoring(): void {
    console.log('Starting enhanced terminal monitoring...');
    
    // Method 1: Process monitoring for terminal commands
    this.startProcessMonitoring();
    
    // Method 2: Enhanced history file monitoring
    this.startHistoryFileMonitoring();
    
    // Method 3: PowerShell history for Windows
    if (this.platform === 'win32') {
      this.startPowerShellHistoryMonitoring();
    }
  }

  private startProcessMonitoring(): void {
    const interval = setInterval(async () => {
      if (!this.tracking) return;
      try {
        await this.monitorActiveTerminalProcesses();
      } catch (error) {
        console.error('Error monitoring terminal processes:', error);
      }
    }, 2000); // Check every 2 seconds

    this.intervals.push(interval);
  }

  private async monitorActiveTerminalProcesses(): Promise<void> {
    try {
      let processCommand = '';
      
      switch (this.platform) {
        case 'win32':
          // Monitor Windows processes with command lines
          processCommand = 'wmic process get ProcessId,CommandLine,Name /format:csv | findstr /v "^$"';
          break;
        case 'darwin':
          // Monitor macOS processes
          processCommand = 'ps -eo pid,ppid,comm,args | grep -E "(python|pip|npm|node|git|docker)" | grep -v grep';
          break;
        case 'linux':
          // Monitor Linux processes
          processCommand = 'ps -eo pid,ppid,comm,args | grep -E "(python|pip|npm|node|git|docker)" | grep -v grep';
          break;
      }

      if (processCommand) {
        const { stdout } = await execAsync(processCommand);
        this.parseProcessOutput(stdout);
      }
    } catch (error) {
      // Silent fail for process monitoring
    }
  }

  private parseProcessOutput(output: string): void {
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      try {
        if (this.platform === 'win32') {
          // Parse Windows CSV output
          const parts = line.split(',');
          if (parts.length >= 3) {
            const commandLine = parts[1]?.trim();
            const processName = parts[2]?.trim();
            const pid = parts[3]?.trim();
            
            if (commandLine && processName && pid) {
              // First check if it's a relevant command before storing
              if (this.isRelevantCommand(commandLine)) {
                const pidNum = parseInt(pid);
                if (!this.terminalProcesses.has(pidNum)) {
                  this.terminalProcesses.set(pidNum, commandLine);
                  this.emitTerminalCommand(commandLine, 'cmd/powershell');
                }
              }
            }
          }
        } else {
          // Parse Unix-style output
          const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
          if (match) {
            const [, pid, ppid, comm, args] = match;
            const fullCommand = args.trim();
            
            if (this.isRelevantCommand(fullCommand)) {
              const pidNum = parseInt(pid);
              if (!this.terminalProcesses.has(pidNum)) {
                this.terminalProcesses.set(pidNum, fullCommand);
                this.emitTerminalCommand(fullCommand, comm);
              }
            }
          }
        }
      } catch (error) {
        // Skip malformed lines
      }
    });
    
    // Clean up old processes periodically
    if (this.terminalProcesses.size > 100) {
      const oldEntries = Array.from(this.terminalProcesses.entries()).slice(0, 50);
      oldEntries.forEach(([pid]) => this.terminalProcesses.delete(pid));
    }
  }

  private isRelevantCommand(command: string): boolean {
    if (!command || command.trim().length === 0) return false;
    const commandLower = command.toLowerCase().trim();
    
    // System processes and spam commands to exclude
    const excludedCommands = [
      'smartscreen.exe',
      'openconsole.exe',
      'windowsterminal.exe',
      'conhost.exe',
      'dwm.exe',
      'explorer.exe',
      'taskhostw.exe',
      'svchost.exe',
      'system32',
      'program files',
      'windows\\',
      'appdata\\local\\programs',
      'windowsapps',
      '-embedding',
      'c:\\windows',
      'microsoft.windowsterminal',
      os.hostname().toLowerCase(),
      // Add more system spam commands
      'wmic.exe',
      'tasklist',
      'findstr',
      'ioreg',
      'awk',
      'cat /proc/',
      'ps -eo',
      'grep -v grep'
    ];

    // Skip if it contains any excluded command indicators
    if (excludedCommands.some(excluded => commandLower.includes(excluded))) {
      return false;
    }

    // Skip if it's a full file path without actual command
    if (commandLower.match(/^"?[a-z]:\\.*\.exe"?\s*(-\w+\s*)*$/)) {
      return false;
    }

    // Skip very short commands that are likely noise
    if (commandLower.length < 2) {
      return false;
    }

    // Skip commands that are just numbers or symbols
    if (commandLower.match(/^[\d\s\-_\.]+$/)) {
      return false;
    }

    // Instead of checking for specific commands, exclude only obvious system noise
    // This allows ollama, ruby, and other user commands to be recorded
    return true;
  }

  private startHistoryFileMonitoring(): void {
    const historyFiles = [
      path.join(os.homedir(), '.bash_history'),
      path.join(os.homedir(), '.zsh_history'),
      path.join(os.homedir(), '.fish_history')
    ];

    historyFiles.forEach(historyFile => {
      if (fs.existsSync(historyFile)) {
        try {
          let lastSize = fs.statSync(historyFile).size;
          let lastReadTime = Date.now();

          const checkForUpdates = () => {
            if (!this.tracking) return;

            try {
              const stats = fs.statSync(historyFile);
              if (stats.size > lastSize && Date.now() - lastReadTime > 1000) {
                const stream = fs.createReadStream(historyFile, {
                  start: lastSize,
                  end: stats.size
                });

                let data = '';
                stream.on('data', chunk => data += chunk);
                stream.on('end', () => {
                  const newCommands = data.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'))
                    .filter(line => this.isRelevantCommand(line));

                  newCommands.forEach(command => {
                    const commandHash = this.hashCommand(command);
                    if (!this.lastCommandHashes.has(commandHash)) {
                      this.lastCommandHashes.add(commandHash);
                      this.emitTerminalCommand(command, path.basename(historyFile).replace('_history', '').replace('.', ''));
                    }
                  });
                });

                lastSize = stats.size;
                lastReadTime = Date.now();
              }
            } catch (error) {
              console.error(`Error checking history file ${historyFile}:`, error);
            }
          };

          // Check every 2 seconds
          const interval = setInterval(checkForUpdates, 2000);
          this.intervals.push(interval);

        } catch (error) {
          console.error(`Error setting up monitoring for ${historyFile}:`, error);
        }
      }
    });
  }

  private startPowerShellHistoryMonitoring(): void {
    const psHistoryPath = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'Microsoft',
      'Windows',
      'PowerShell',
      'PSReadLine',
      'ConsoleHost_history.txt'
    );

    if (fs.existsSync(psHistoryPath)) {
      try {
        let lastSize = fs.statSync(psHistoryPath).size;

        const checkPsHistory = () => {
          if (!this.tracking) return;

          try {
            const stats = fs.statSync(psHistoryPath);
            if (stats.size > lastSize) {
              const stream = fs.createReadStream(psHistoryPath, {
                start: lastSize,
                end: stats.size
              });

              let data = '';
              stream.on('data', chunk => data += chunk);
              stream.on('end', () => {
                const newCommands = data.split('\n')
                  .map(line => line.trim())
                  .filter(line => line.length > 0)
                  .filter(line => this.isRelevantCommand(line));

                newCommands.forEach(command => {
                  const commandHash = this.hashCommand(command);
                  if (!this.lastCommandHashes.has(commandHash)) {
                    this.lastCommandHashes.add(commandHash);
                    this.emitTerminalCommand(command, 'powershell');
                  }
                });
              });

              lastSize = stats.size;
            }
          } catch (error) {
            // Silent fail
          }
        };

        const interval = setInterval(checkPsHistory, 2000);
        this.intervals.push(interval);

      } catch (error) {
        console.error('Error setting up PowerShell history monitoring:', error);
      }
    }
  }

  private hashCommand(command: string): string {
    return Buffer.from(command + Date.now().toString()).toString('base64').substring(0, 16);
  }

  private emitTerminalCommand(command: string, shell: string): void {
    // Clean the command to extract just the user-typed part
    let cleanCommand = command.trim();
    
    // Remove hostname references
    cleanCommand = cleanCommand.replace(new RegExp(os.hostname(), 'gi'), '').trim();
    
    // Extract simple command from complex paths
    if (cleanCommand.includes('.exe')) {
      const match = cleanCommand.match(/([^\\\/]+\.exe)(.*)$/i);
      if (match) {
        const execName = match[1].replace('.exe', '').replace(/"/g, '');
        const args = match[2].trim();
        cleanCommand = args ? `${execName} ${args}` : execName;
      }
    }

    // Remove quotes and extra spaces
    cleanCommand = cleanCommand.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();

    // Get current working directory and project context
    const projectContext = this.extractProjectContext(cleanCommand);

    if (cleanCommand.length > 0 && !cleanCommand.includes('\\') && !cleanCommand.includes('-Embedding')) {
      this.emitEvent({
        type: ActivityType.TERMINAL_COMMAND,
        data: {
          command: cleanCommand,
          originalCommand: command,
          shell: shell,
          timestamp: Date.now(),
          platform: this.platform,
          workingDirectory: projectContext.workingDirectory,
          projectName: projectContext.projectName,
          projectType: projectContext.projectType
        },
        category: 'terminal'
      });
    }
  }

  private extractProjectContext(command: string): {
    workingDirectory: string;
    projectName: string;
    projectType: string;
    detectedFeatures: string[];
  } {
    const cwd = process.cwd();
    const projectName = path.basename(cwd);
    
    // Detect project type based on files in directory
    let projectType = 'general';
    const detectedFeatures: string[] = [];
    
    try {
      const files = fs.readdirSync(cwd);
      const fileExtensions = new Set<string>();
      
      // Collect all file extensions
      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (ext) fileExtensions.add(ext);
      });

      // Primary project type detection (more comprehensive)
      if (files.includes('package.json')) {
        projectType = 'node';
        detectedFeatures.push('npm/yarn');
      } else if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
        projectType = 'python';
        detectedFeatures.push('pip/poetry');
      } else if (files.includes('Cargo.toml')) {
        projectType = 'rust';
        detectedFeatures.push('cargo');
      } else if (files.includes('go.mod') || files.includes('go.sum')) {
        projectType = 'go';
        detectedFeatures.push('go-modules');
      } else if (files.includes('Gemfile') || files.includes('Gemfile.lock')) {
        projectType = 'ruby';
        detectedFeatures.push('bundler');
      } else if (files.includes('composer.json')) {
        projectType = 'php';
        detectedFeatures.push('composer');
      } else if (files.includes('pom.xml')) {
        projectType = 'java-maven';
        detectedFeatures.push('maven');
      } else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
        projectType = 'java-gradle';
        detectedFeatures.push('gradle');
      } else if (files.includes('Makefile') || files.includes('makefile')) {
        projectType = 'c-cpp';
        detectedFeatures.push('make');
      } else if (files.includes('CMakeLists.txt')) {
        projectType = 'cmake';
        detectedFeatures.push('cmake');
      } else if (files.includes('Dockerfile')) {
        projectType = 'docker';
        detectedFeatures.push('containerized');
      } else if (files.includes('.terraform') || files.some(f => f.endsWith('.tf'))) {
        projectType = 'terraform';
        detectedFeatures.push('infrastructure');
      } else if (files.includes('angular.json')) {
        projectType = 'angular';
        detectedFeatures.push('angular-cli');
      } else if (files.includes('next.config.js') || files.includes('next.config.ts')) {
        projectType = 'nextjs';
        detectedFeatures.push('react-framework');
      } else if (files.includes('nuxt.config.js') || files.includes('nuxt.config.ts')) {
        projectType = 'nuxtjs';
        detectedFeatures.push('vue-framework');
      } else if (files.includes('svelte.config.js')) {
        projectType = 'svelte';
        detectedFeatures.push('svelte-kit');
      } else if (files.includes('deno.json') || files.includes('deno.jsonc')) {
        projectType = 'deno';
        detectedFeatures.push('deno-runtime');
      } else if (files.includes('bun.lockb')) {
        projectType = 'bun';
        detectedFeatures.push('bun-runtime');
      }
      
      // Secondary feature detection (can coexist with primary type)
      if (files.includes('.git')) {
        detectedFeatures.push('git-repo');
      }
      if (files.includes('docker-compose.yml') || files.includes('docker-compose.yaml')) {
        detectedFeatures.push('docker-compose');
      }
      if (files.includes('kubernetes') || files.some(f => f.endsWith('.yaml') && f.includes('k8s'))) {
        detectedFeatures.push('kubernetes');
      }
      if (files.includes('.github')) {
        detectedFeatures.push('github-actions');
      }
      if (files.includes('tsconfig.json')) {
        detectedFeatures.push('typescript');
      }
      if (files.includes('tailwind.config.js') || files.includes('tailwind.config.ts')) {
        detectedFeatures.push('tailwind');
      }
      if (files.includes('vite.config.js') || files.includes('vite.config.ts')) {
        detectedFeatures.push('vite');
      }
      if (files.includes('webpack.config.js')) {
        detectedFeatures.push('webpack');
      }
      
      // Fallback: detect by file extensions if no primary type found
      if (projectType === 'general') {
        if (fileExtensions.has('.py')) {
          projectType = 'python-scripts';
        } else if (fileExtensions.has('.js') || fileExtensions.has('.ts')) {
          projectType = 'javascript';
        } else if (fileExtensions.has('.java')) {
          projectType = 'java';
        } else if (fileExtensions.has('.cpp') || fileExtensions.has('.c') || fileExtensions.has('.h')) {
          projectType = 'c-cpp';
        } else if (fileExtensions.has('.rs')) {
          projectType = 'rust-project';
        } else if (fileExtensions.has('.go')) {
          projectType = 'go-project';
        } else if (fileExtensions.has('.rb')) {
          projectType = 'ruby-scripts';
        } else if (fileExtensions.has('.php')) {
          projectType = 'php-project';
        } else if (fileExtensions.has('.html') || fileExtensions.has('.css')) {
          projectType = 'web-frontend';
        } else if (fileExtensions.has('.md')) {
          projectType = 'documentation';
        } else if (fileExtensions.has('.sh') || fileExtensions.has('.bat')) {
          projectType = 'scripts';
        }
      }
      
      // Command-based context enhancement
      if (command.includes('ollama')) {
        detectedFeatures.push('ai-development');
      }
      if (command.includes('jupyter') || command.includes('notebook')) {
        detectedFeatures.push('data-science');
      }
      if (command.includes('pytest') || command.includes('jest') || command.includes('mocha')) {
        detectedFeatures.push('testing');
      }
      
    } catch (error) {
      // Silent fail
    }

    return {
      workingDirectory: cwd,
      projectName,
      projectType,
      detectedFeatures
    };
  }


}