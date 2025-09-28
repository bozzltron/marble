/**
 * Debug utility for development logging
 * Automatically disabled in production builds
 */

const IS_DEV = typeof window !== 'undefined' && 
               (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.port !== '');

export class Debug {
    private static enabled = IS_DEV;
    
    public static log(...args: any[]): void {
        if (this.enabled) {
            console.log('[DEBUG]', ...args);
        }
    }
    
    public static warn(...args: any[]): void {
        if (this.enabled) {
            console.warn('[WARN]', ...args);
        }
    }
    
    public static error(...args: any[]): void {
        if (this.enabled) {
            console.error('[ERROR]', ...args);
        }
    }
    
    public static time(label: string): void {
        if (this.enabled) {
            console.time(`[TIME] ${label}`);
        }
    }
    
    public static timeEnd(label: string): void {
        if (this.enabled) {
            console.timeEnd(`[TIME] ${label}`);
        }
    }
    
    public static group(label: string): void {
        if (this.enabled) {
            console.group(`[GROUP] ${label}`);
        }
    }
    
    public static groupEnd(): void {
        if (this.enabled) {
            console.groupEnd();
        }
    }
    
    public static enable(): void {
        this.enabled = true;
    }
    
    public static disable(): void {
        this.enabled = false;
    }
    
    public static isEnabled(): boolean {
        return this.enabled;
    }
}

// Export a default instance for convenience
export const debug = Debug;
