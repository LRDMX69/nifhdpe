import { logger } from "./logger";

/**
 * Checks if a password has been pwned using the Have I Been Pwned API (K-Anonymity).
 * Returns true if pwned, false otherwise.
 */
export const isPasswordPwned = async (password: string): Promise<boolean> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) {
      logger.warn("HIBP API check failed, skipping.");
      return false;
    }
    
    const text = await response.text();
    const hashes = text.split("\n").map(line => line.split(":"));
    
    return hashes.some(([hashSuffix]) => hashSuffix === suffix);
  } catch (error) {
    logger.error("Error checking HIBP API:", error);
    return false;
  }
};
