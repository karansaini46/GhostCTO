type LogLevel = 'error' | 'info' | 'warn';

type LogContext = Record<string, unknown>;

const writeLog = (level: LogLevel, message: string, context?: LogContext) => {
  const payload = JSON.stringify({
    context,
    level,
    message,
    timestamp: new Date().toISOString(),
  });
  const stream = level === 'error' ? process.stderr : process.stdout;

  stream.write(`${payload}\n`);
};

export const logger = {
  error: (message: string, context?: LogContext) => writeLog('error', message, context),
  info: (message: string, context?: LogContext) => writeLog('info', message, context),
  warn: (message: string, context?: LogContext) => writeLog('warn', message, context),
};
