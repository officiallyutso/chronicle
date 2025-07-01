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
    this.startTerminalMonitoring();
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

        currentApps.forEach(app => {
          if (!this.lastActiveApps.has(app)) {
            this.emitEvent({
              type: ActivityType.APP_OPENED,
              data: { appName: app, platform: this.platform },
              category: 'application'
            });
          }
        });

        this.lastActiveApps.forEach(app => {
          if (!currentApps.has(app)) {
            this.emitEvent({
              type: ActivityType.APP_CLOSED,
              data: { appName: app, platform: this.platform },
              category: 'application'
            });
          }
        });

        this.lastActiveApps = currentApps;
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

    watchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
            if (!this.tracking || !filename) return;

            const fullPath = path.join(dir, filename);
            const ext = path.extname(filename);
            const devExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.scss', '.json', '.md', '.txt', '.yml', '.yaml'];

            if (devExtensions.includes(ext)) {
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

  private startTerminalMonitoring(): void {
    const historyFiles = [
      path.join(os.homedir(), '.bash_history'),
      path.join(os.homedir(), '.zsh_history'),
      path.join(os.homedir(), '.fish_history')
    ];

    historyFiles.forEach(historyFile => {
      if (fs.existsSync(historyFile)) {
        try {
          let lastSize = fs.statSync(historyFile).size;

          fs.watchFile(historyFile, (curr, prev) => {
            if (!this.tracking) return;

            if (curr.size > lastSize) {
              const stream = fs.createReadStream(historyFile, {
                start: lastSize,
                end: curr.size
              });

              let data = '';
              stream.on('data', chunk => data += chunk);
              stream.on('end', () => {
                const newCommands = data.split('\n').filter(line => line.trim());
                newCommands.forEach(command => {
                  if (command.trim()) {
                    this.emitEvent({
                      type: ActivityType.TERMINAL_COMMAND,
                      data: {
                        command: command.trim(),
                        shell: path.basename(historyFile).replace('_history', '').replace('.', ''),
                        timestamp: Date.now()
                      },
                      category: 'terminal'
                    });
                  }
                });
              });

              lastSize = curr.size;
            }
          });
        } catch (error) {
          console.error(`Error monitoring history file ${historyFile}:`, error);
        }
      }
    });
  }
}
