export const logger = {
  info: (...args: unknown[]) => {
    console.info(new Date().toISOString(), "INFO", ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(new Date().toISOString(), "WARN", ...args);
  },
  error: (...args: unknown[]) => {
    console.error(new Date().toISOString(), "ERROR", ...args);
  },
  debug: (...args: unknown[]) => {
    // Keep debug separate so it can be toggled later
    if (Deno.env && Deno.env.get && Deno.env.get("LOG_LEVEL") === "debug") {
      console.debug(new Date().toISOString(), "DEBUG", ...args);
    }
  },
};
