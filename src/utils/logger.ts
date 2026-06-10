const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },
  success: (message: string, ...args: unknown[]) => {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`${colors.blue}[DEBUG]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
    }
  },
};

export default logger;
