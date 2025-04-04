import { IpcMain } from "electron";
import { Readable, Writable } from "stream";

export class TerminalManager {
	private terminals: Map<
		string,
		{
			id: string;
			stream?: Readable & Writable;
			createdAt: number;
		}
	> = new Map();
	private ipcMain: IpcMain;

	constructor(ipcMain: IpcMain) {
		this.ipcMain = ipcMain;
		this.setupIPC();
	}

	private setupIPC(): void {
		// Handle terminal data from renderer
		this.ipcMain.on("terminal:data", (event, { terminalId, data }) => {
			console.log(`Received data from renderer for terminal: ${terminalId}`);
			const terminal = this.terminals.get(terminalId);
			if (terminal && terminal.stream) {
				terminal.stream.write(data);
			} else {
				console.error(`No terminal or stream found for ID: ${terminalId}`);
			}
		});

		// Handle terminal resize from renderer
		this.ipcMain.on("terminal:resize", (event, { terminalId, cols, rows }) => {
			console.log(
				`Resize request for terminal: ${terminalId}, cols: ${cols}, rows: ${rows}`
			);
			const terminal = this.terminals.get(terminalId);
			if (terminal && terminal.stream) {
				(terminal.stream as any).setWindow(rows, cols);
			} else {
				console.error(`No terminal or stream found for resize: ${terminalId}`);
			}
		});

		// Handle terminal close from renderer
		this.ipcMain.on("terminal:close", (event, { terminalId, sessionId }) => {
			console.log(
				`Terminal Manager: Received close request for terminal: ${terminalId} (session: ${sessionId})`
			);
			this.destroyTerminal(terminalId);
		});
	}

	createTerminal(sessionId: string): string {
		const terminalId = `terminal-${Date.now()}-${Math.random()
			.toString(36)
			.substring(2, 9)}`;
		console.log(
			`Creating new terminal: ${terminalId} for session: ${sessionId}`
		);
		this.terminals.set(terminalId, {
			id: terminalId,
			createdAt: Date.now(),
		});
		return terminalId;
	}

	attachStream(terminalId: string, stream: Readable & Writable): void {
		console.log(`Attaching stream to terminal: ${terminalId}`);
		const terminal = this.terminals.get(terminalId);
		if (terminal) {
			console.log(`Found terminal ${terminalId}, attaching stream`);
			terminal.stream = stream;

			// Forward data from SSH stream to renderer
			stream.on("data", (data) => {
				console.log(
					`Received data from SSH stream for terminal: ${terminalId}, data length: ${data.length}`
				);
				this.sendDataToRenderer(terminalId, data);
			});

			// Add error and end handlers for better debugging
			stream.on("error", (err) => {
				console.error(
					`Stream error for terminal ${terminalId}: ${err.message}`
				);
			});

			stream.on("end", () => {
				console.log(`Stream ended for terminal ${terminalId}`);
			});

			this.terminals.set(terminalId, terminal);
		} else {
			console.error(`Cannot attach stream - terminal not found: ${terminalId}`);
		}
	}

	sendDataToRenderer(terminalId: string, data: Buffer | string): void {
		// Send data to all renderer processes
		console.log(
			`Sending data to renderer for terminal: ${terminalId}, data type: ${typeof data}, length: ${
				typeof data === "string" ? data.length : data.byteLength
			}`
		);
		const windows = require("electron").BrowserWindow.getAllWindows();
		console.log(`Found ${windows.length} windows to send data to`);
		for (const window of windows) {
			if (!window.isDestroyed()) {
				window.webContents.send("terminal:data", {
					terminalId,
					data: typeof data === "string" ? data : data.toString("utf8"),
				});
			}
		}
	}

	destroyTerminal(terminalId: string): void {
		console.log(`Terminal Manager: Destroying terminal: ${terminalId}`);

		const terminal = this.terminals.get(terminalId);
		if (terminal) {
			const timeSinceCreation = Date.now() - terminal.createdAt;
			if (timeSinceCreation < 1000) {
				console.log(
					`Terminal Manager: Terminal ${terminalId} was just created ${timeSinceCreation}ms ago, delaying destruction`
				);
				setTimeout(() => {
					this.destroyTerminal(terminalId);
				}, 1000 - timeSinceCreation);
				return;
			}

			if (terminal.stream) {
				console.log(
					`Terminal Manager: Cleaning up stream for terminal: ${terminalId}`
				);
				try {
					// Clean up stream
					terminal.stream.removeAllListeners();

					// Attempt to end the stream if possible
					if (typeof terminal.stream.end === "function") {
						terminal.stream.end();
					}
				} catch (error) {
					console.error(`Terminal Manager: Error cleaning up stream: ${error}`);
				}
			} else {
				console.log(
					`Terminal Manager: No stream to clean up for terminal: ${terminalId}`
				);
			}

			// Remove from map
			this.terminals.delete(terminalId);
			console.log(
				`Terminal Manager: Terminal ${terminalId} removed from storage`
			);
		} else {
			console.log(
				`Terminal Manager: Terminal ${terminalId} not found, nothing to destroy`
			);
		}
	}
}
