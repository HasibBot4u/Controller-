import { TerminalSession, TerminalOutput } from '../../domain/models/index.ts';

export interface RemoteTerminalAdapter {
  createSession(options?: { cols?: number; rows?: number; cwd?: string }): Promise<TerminalSession>;
  sendInput(sessionId: string, data: string): Promise<void>;
  resize(sessionId: string, cols: number, rows: number): Promise<void>;
  getOutput(sessionId: string, sinceSequence?: number): Promise<TerminalOutput[]>;
  reconnect(sessionId: string): Promise<TerminalSession>;
  close(sessionId: string): Promise<void>;
}

export class MockRemoteTerminalAdapter implements RemoteTerminalAdapter {
  private sessions: Map<string, TerminalSession> = new Map();
  private outputs: Map<string, TerminalOutput[]> = new Map();
  private commandHistory: Map<string, string[]> = new Map();

  constructor() {
    // Seed default remote session for demonstration
    const defaultSession: TerminalSession = {
      sessionId: 'term-oracle-01',
      status: 'CONNECTED',
      pty: '/dev/pts/3',
      cols: 80,
      rows: 24,
      cwd: '/home/oracle/workspace/claude-workstation-core',
      connectedAt: new Date(Date.now() - 3600000).toISOString(),
    };
    this.sessions.set(defaultSession.sessionId, defaultSession);

    const initialOutputs: TerminalOutput[] = [
      {
        sessionId: 'term-oracle-01',
        sequence: 1,
        data: '\x1b[32m[oracle@cloud-vm-ampere-01 claude-workstation-core]$\x1b[0m uname -a\r\n',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        sessionId: 'term-oracle-01',
        sequence: 2,
        data: 'Linux cloud-vm-ampere-01 5.15.0-205.149.5.1.el9uek.aarch64 #2 SMP aarch64 GNU/Linux\r\n',
        timestamp: new Date(Date.now() - 3499000).toISOString(),
      },
      {
        sessionId: 'term-oracle-01',
        sequence: 3,
        data: '\x1b[32m[oracle@cloud-vm-ampere-01 claude-workstation-core]$\x1b[0m systemctl status claude-daemon --no-pager\r\n',
        timestamp: new Date(Date.now() - 2400000).toISOString(),
      },
      {
        sessionId: 'term-oracle-01',
        sequence: 4,
        data: '● claude-daemon.service - Claude Code Workstation Daemon\r\n     Loaded: loaded (/etc/systemd/system/claude-daemon.service; enabled)\r\n     Active: active (running) since Wed 2026-10-07 00:00:01 UTC\r\n     Memory: 412.4M (limit: 8.0G)\r\n     Tasks: 14 (limit: 4915)\r\n     CGroup: /system.slice/claude-daemon.service\r\n             └─4812 /opt/claude/bin/claude-agent-daemon --port 4040\r\n',
        timestamp: new Date(Date.now() - 2399000).toISOString(),
      },
      {
        sessionId: 'term-oracle-01',
        sequence: 5,
        data: '\x1b[32m[oracle@cloud-vm-ampere-01 claude-workstation-core]$\x1b[0m \x1b[33m# Remote execution socket active on Oracle Linux VM\x1b[0m\r\n',
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
    ];
    this.outputs.set(defaultSession.sessionId, initialOutputs);
  }

  async createSession(options?: { cols?: number; rows?: number; cwd?: string }): Promise<TerminalSession> {
    const id = `term-oracle-${Math.floor(Math.random() * 9000) + 1000}`;
    const session: TerminalSession = {
      sessionId: id,
      status: 'CONNECTED',
      pty: `/dev/pts/${Math.floor(Math.random() * 8) + 4}`,
      cols: options?.cols || 80,
      rows: options?.rows || 24,
      cwd: options?.cwd || '/home/oracle/workspace',
      connectedAt: new Date().toISOString(),
    };
    this.sessions.set(id, session);
    this.outputs.set(id, [
      {
        sessionId: id,
        sequence: 1,
        data: `\x1b[32m[oracle@cloud-vm-ampere-01 ${session.cwd}]$\x1b[0m \x1b[90m# Remote PTY connected via thin-client control plane\x1b[0m\r\n`,
        timestamp: new Date().toISOString(),
      },
    ]);
    return session;
  }

  async sendInput(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    const outputList = this.outputs.get(sessionId) || [];
    const seq = outputList.length + 1;
    const cleanCmd = data.trim();

    // Echo input prompt
    outputList.push({
      sessionId,
      sequence: seq,
      data: `\x1b[32m[oracle@cloud-vm-ampere-01]$\x1b[0m ${cleanCmd}\r\n`,
      timestamp: new Date().toISOString(),
    });

    // Mock command execution output on remote Oracle Linux
    let mockResponse = '';
    if (cleanCmd === 'ls' || cleanCmd.startsWith('ls ')) {
      mockResponse = 'bin  dist  node_modules  package.json  pnpm-lock.yaml  README.md  src  tests  tsconfig.json\r\n';
    } else if (cleanCmd === 'pwd') {
      mockResponse = `${session.cwd}\r\n`;
    } else if (cleanCmd === 'git status' || cleanCmd === 'git st') {
      mockResponse = 'On branch feat/sse-heartbeat-v2\r\nChanges not staged for commit:\r\n  modified:   src/transport/sse-daemon.ts\r\n  modified:   tests/heartbeat.spec.ts\r\nno changes added to commit (use "git add" to track)\r\n';
    } else if (cleanCmd.startsWith('pnpm test') || cleanCmd.startsWith('npm test')) {
      mockResponse = '✓ tests/heartbeat.spec.ts (6 tests) 42ms\r\n  Test Files  1 passed (1)\r\n       Tests  6 passed (6)\r\n    Duration  280ms\r\n';
    } else if (cleanCmd === 'uptime') {
      mockResponse = ' 04:45:00 up 14 days, 11:09,  1 user,  load average: 1.12, 0.94, 0.81\r\n';
    } else if (cleanCmd === 'free -m' || cleanCmd === 'free -h') {
      mockResponse = '               total        used        free      shared  buff/cache   available\r\nMem:           24000        6800       14200         120        3000       16800\r\nSwap:           4096           0        4096\r\n';
    } else if (cleanCmd === 'whoami') {
      mockResponse = 'oracle\r\n';
    } else if (cleanCmd === 'clear') {
      mockResponse = '\x1b[2J\x1b[H';
    } else if (cleanCmd) {
      mockResponse = `[remote stdout] command executed in sandbox: "${cleanCmd}" (exit code: 0)\r\n`;
    }

    if (mockResponse) {
      outputList.push({
        sessionId,
        sequence: seq + 1,
        data: mockResponse,
        timestamp: new Date().toISOString(),
      });
    }

    this.outputs.set(sessionId, outputList);
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cols = cols;
      session.rows = rows;
    }
  }

  async getOutput(sessionId: string, sinceSequence = 0): Promise<TerminalOutput[]> {
    const list = this.outputs.get(sessionId) || [];
    return list.filter((item) => item.sequence > sinceSequence);
  }

  async reconnect(sessionId: string): Promise<TerminalSession> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = await this.createSession();
    } else {
      session.status = 'CONNECTED';
    }
    return session;
  }

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'DISCONNECTED';
    }
  }
}
