/**
 * Centralized logging utility for NIF Technical.
 * In production, this can be wired to Sentry, LogRocket, or a custom Supabase sink.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isProd = import.meta.env.PROD;

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (this.isProd) {
      // Logic for production logging (e.g. Sentry.captureMessage)
      if (level === 'error') {
        console.error(formattedMessage, data || '');
        // Optional: Send to Supabase error_logs table
      } else if (level === 'warn') {
        console.warn(formattedMessage, data || '');
      }
    } else {
      // Local development logging
      switch (level) {
        case 'info': console.log(formattedMessage, data || ''); break;
        case 'warn': console.warn(formattedMessage, data || ''); break;
        case 'error': console.error(formattedMessage, data || ''); break;
        case 'debug': console.debug(formattedMessage, data || ''); break;
      }
    }
  }

  info(msg: string, data?: any) { this.log('info', msg, data); }
  warn(msg: string, data?: any) { this.log('warn', msg, data); }
  error(msg: string, data?: any) { this.log('error', msg, data); }
  debug(msg: string, data?: any) { this.log('debug', msg, data); }
}

export const logger = new Logger();
