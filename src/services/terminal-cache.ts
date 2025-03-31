import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { SearchAddon } from "xterm-addon-search";
import { TerminalDataBuffer } from "../components/terminal";

// Define the terminal instance structure
export interface CachedTerminal {
	xterm: XTerm;
	fitAddon: FitAddon;
	searchAddon: SearchAddon;
	dataBuffer: any; // Using any for TerminalDataBuffer since it's a class
	lastActivityTime: number;
	eventListeners: {
		data?: (_: any, data: { terminalId: string; data: string }) => void;
		error?: (_: any, data: { terminalId: string; error: string }) => void;
	};
	// Track if this terminal is currently being displayed
	isActive: boolean;
}

// Terminal cache to store terminal instances
class TerminalCacheService {
	private terminals: Map<string, CachedTerminal> = new Map();
	private debug: boolean = true; // Set to true to enable debug logging

	constructor() {
		this.log("Terminal cache service initialized");
	}

	private log(...args: any[]) {
		if (this.debug) {
			console.log("[TerminalCache]", ...args);
		}
	}

	// Store a terminal instance
	storeTerminal(terminalId: string, terminal: CachedTerminal): void {
		this.log(`Storing terminal ${terminalId}`);

		// If terminal already exists in cache, clean it up first
		if (this.terminals.has(terminalId)) {
			this.log(
				`Terminal ${terminalId} already exists in cache, cleaning up first`
			);
			this.removeTerminal(terminalId);
		}

		// Set the terminal as active by default when storing
		terminal.isActive = true;
		this.terminals.set(terminalId, terminal);
		this.log(
			`Terminal ${terminalId} stored in cache, total terminals: ${this.terminals.size}`
		);
	}

	// Get a terminal instance
	getTerminal(terminalId: string): CachedTerminal | undefined {
		const terminal = this.terminals.get(terminalId);
		this.log(`Retrieved terminal ${terminalId}`, !!terminal);
		return terminal;
	}

	// Check if a terminal exists
	hasTerminal(terminalId: string): boolean {
		const exists = this.terminals.has(terminalId);
		this.log(`Checking if terminal ${terminalId} exists in cache: ${exists}`);
		return exists;
	}

	// Set a terminal as active or inactive
	setTerminalActive(terminalId: string, isActive: boolean): void {
		const terminal = this.terminals.get(terminalId);
		if (terminal) {
			this.log(`Setting terminal ${terminalId} active state to: ${isActive}`);
			terminal.isActive = isActive;
			terminal.lastActivityTime = Date.now();
		}
	}

	// Remove a terminal instance
	removeTerminal(terminalId: string): void {
		this.log(`Removing terminal ${terminalId}`);

		// Get the terminal to clean it up properly
		const terminal = this.terminals.get(terminalId);
		if (terminal) {
			try {
				// Remove event listeners
				if (terminal.eventListeners.data) {
					this.log(`Removing data event listener for terminal ${terminalId}`);
					// ipcRenderer.removeListener(
					//   'terminal:data',
					//   terminal.eventListeners.data
					// );
				}

				if (terminal.eventListeners.error) {
					this.log(`Removing error event listener for terminal ${terminalId}`);
					// ipcRenderer.removeListener(
					//   'terminal:error',
					//   terminal.eventListeners.error
					// );
				}

				// Don't remove all event listeners as it could affect other terminals
				// Only remove listeners for this specific terminal

				// Clean up data buffer
				if (terminal.dataBuffer) {
					this.log(`Disposing data buffer for terminal ${terminalId}`);
					terminal.dataBuffer.dispose();
				}

				// Dispose the terminal
				this.log(`Disposing terminal ${terminalId}`);
				terminal.xterm.dispose();
			} catch (error) {
				console.error(
					`TerminalCache: Error disposing terminal ${terminalId}`,
					error
				);
			}
		}

		this.terminals.delete(terminalId);
		this.log(
			`Terminal ${terminalId} removed from cache, remaining terminals: ${this.terminals.size}`
		);
	}

	// Update terminal activity timestamp
	updateActivityTimestamp(terminalId: string): void {
		const terminal = this.terminals.get(terminalId);
		if (terminal) {
			terminal.lastActivityTime = Date.now();
		}
	}

	// Get all terminal IDs
	getAllTerminalIds(): string[] {
		return Array.from(this.terminals.keys());
	}

	// Get active terminals
	getActiveTerminals(): string[] {
		const activeTerminals = Array.from(this.terminals.entries())
			.filter(([_, terminal]) => terminal.isActive)
			.map(([id, _]) => id);

		this.log(`Active terminals: ${activeTerminals.join(", ")}`);
		return activeTerminals;
	}

	// Clean up all terminals
	cleanupAll(): void {
		this.log(`Cleaning up all terminals (${this.terminals.size} total)`);
		this.terminals.forEach((_, terminalId) => {
			this.removeTerminal(terminalId);
		});
	}
}

// Create a singleton instance
export const terminalCache = new TerminalCacheService();
