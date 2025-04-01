import { Client } from "ssh2";
import * as fs from "fs";
import { Host } from "../models/host";
import { SSHKey } from "../models/ssh-key";
import { Session } from "../models/session";
import { EventEmitter } from "events";
import { TerminalManager } from "./terminal-manager";
import { SnippetManager } from "./snippet-manager";

export class SSHManager extends EventEmitter {
	private connections: Map<string, Client> = new Map();
	private sessions: Map<string, Session> = new Map();
	private terminalManager: TerminalManager;
	private snippetManager: SnippetManager;

	constructor(
		terminalManager: TerminalManager,
		snippetManager: SnippetManager
	) {
		super();
		this.terminalManager = terminalManager;
		this.snippetManager = snippetManager;
	}

	async connect(host: Host, sshKey?: SSHKey): Promise<Session> {
		console.log(
			`SSH Manager: Connecting to ${host.hostname}:${host.port || 22} as ${
				host.username
			}`
		);

		// Validate required host properties
		if (!host.hostname) {
			console.error("SSH Manager: Missing hostname");
			this.emit("connectionError", {
				hostId: host.id,
				error: "Missing hostname",
			});
			throw new Error("Missing hostname");
		}

		if (!host.username) {
			console.error("SSH Manager: Missing username");
			this.emit("connectionError", {
				hostId: host.id,
				error: "Missing username",
			});
			throw new Error("Missing username");
		}

		if (host.authType === "password" && !host.password) {
			console.error(
				"SSH Manager: Missing password for password authentication"
			);
			this.emit("connectionError", {
				hostId: host.id,
				error: "Missing password for password authentication",
			});
			throw new Error("Missing password for password authentication");
		}

		if (host.authType === "key" && !host.privateKeyPath && !sshKey) {
			console.error("SSH Manager: Missing private key for key authentication");
			this.emit("connectionError", {
				hostId: host.id,
				error: "Missing private key for key authentication",
			});
			throw new Error("Missing private key for key authentication");
		}

		const conn = new Client();
		const sessionId = `session-${Date.now()}-${Math.random()
			.toString(36)
			.substring(2, 9)}`;

		// Create a new terminal for this session
		console.log(`SSH Manager: Creating terminal for session ${sessionId}`);
		const terminalId = this.terminalManager.createTerminal(sessionId);

		// Create and store the session
		const session: Session = {
			id: sessionId,
			hostId: host.id,
			terminalId,
			status: "connecting",
			startTime: new Date().toISOString(),
			type: "ssh",
			portForwardings: [],
			sftpEnabled: false,
		};

		this.sessions.set(sessionId, session);
		console.log(`SSH Manager: Session created with ID ${sessionId}`);

		// Set up connection config
		const connectionConfig: any = {
			host: host.hostname,
			port: host.port || 22,
			username: host.username,
			readyTimeout: host.connectionTimeout || 30000, // 30 seconds timeout by default
		};

		// Configure authentication
		if (host.authType === "password" && host.password) {
			console.log(
				`SSH Manager: Using password authentication for ${host.username}`
			);
			connectionConfig.password = host.password;
		} else if (host.authType === "key") {
			console.log(`SSH Manager: Using key authentication for ${host.username}`);
			if (sshKey) {
				console.log(`SSH Manager: Using provided SSH key: ${sshKey.name}`);
				try {
					connectionConfig.privateKey = fs.readFileSync(sshKey.privateKeyPath);
					if (sshKey.passphrase) {
						connectionConfig.passphrase = sshKey.passphrase;
					}
				} catch (error: any) {
					console.error(
						`SSH Manager: Error reading key file: ${error.message}`
					);
					this.emit("connectionError", {
						hostId: host.id,
						error: `Error reading key file: ${error.message}`,
					});
					throw error;
				}
			} else if (host.privateKeyPath) {
				console.log(
					`SSH Manager: Using host's key path: ${host.privateKeyPath}`
				);
				try {
					connectionConfig.privateKey = fs.readFileSync(host.privateKeyPath);
					if (host.privateKeyPassphrase) {
						connectionConfig.passphrase = host.privateKeyPassphrase;
					}
				} catch (error: any) {
					console.error(
						`SSH Manager: Error reading key file: ${error.message}`
					);
					this.emit("connectionError", {
						hostId: host.id,
						error: `Error reading key file: ${error.message}`,
					});
					throw error;
				}
			}
		} else if (host.authType === "agent") {
			console.log(
				`SSH Manager: Using SSH agent authentication for ${host.username}`
			);
			connectionConfig.agent = process.env.SSH_AUTH_SOCK;
		}

		// Handle jump host if needed
		if (host.useJumpHost && host.jumpHost) {
			console.log(`SSH Manager: Using jump host: ${host.jumpHost}`);
			// Implementation for jump host connection
			// This would involve creating a tunnel through the jump host
		}

		// Set up connection promise
		return new Promise((resolve, reject) => {
			// Set up connection event handlers
			conn.on("ready", () => {
				console.log(`SSH Manager: Connection ready for session ${sessionId}`);

				// Create shell
				conn.shell((err, stream) => {
					if (err) {
						console.error(`SSH Manager: Shell error: ${err.message}`);
						session.status = "error";
						session.error = err.message;
						this.sessions.set(sessionId, session);
						this.emit("connectionError", {
							hostId: host.id,
							error: `Shell error: ${err.message}`,
						});
						reject(err);
						return;
					}

					console.log(`SSH Manager: Shell created for session ${sessionId}`);

					// Add a small delay before attaching stream to terminal
					// This helps ensure the terminal component is fully mounted
					setTimeout(() => {
						// Attach stream to terminal
						this.terminalManager.attachStream(terminalId, stream);

						// Listen for stream close events that might indicate the user typed "exit"
						stream.on("close", () => {
							console.log(
								`SSH Manager: Stream closed for session ${sessionId}, likely due to exit command`
							);
							// Emit disconnected event
							this.emit("disconnected", { sessionId });
						});

						stream.on("exit", (code: number) => {
							console.log(
								`SSH Manager: Stream exit event with code ${code} for session ${sessionId}`
							);
							// Emit disconnected event
							this.emit("disconnected", { sessionId });
						});

						// Update session status
						session.status = "connected";
						this.sessions.set(sessionId, session);
						this.connections.set(sessionId, conn);

						// Emit session started event
						console.log(
							`SSH Manager: Emitting sessionStarted event for session ${sessionId}`
						);
						this.emit("sessionStarted", session);
						resolve(session);
					}, 300); // 300ms delay to ensure terminal component is ready
				});
			});

			conn.on("error", (err) => {
				console.error(`SSH Manager: Connection error: ${err.message}`);
				session.status = "error";
				session.error = err.message;
				this.sessions.set(sessionId, session);
				this.emit("connectionError", {
					hostId: host.id,
					error: `Connection error: ${err.message}`,
				});
				reject(err);
			});

			conn.on("end", () => {
				console.log(`SSH Manager: Connection ended for session ${sessionId}`);
			});

			conn.on("close", () => {
				console.log(`SSH Manager: Connection closed for session ${sessionId}`);
				this.disconnect(sessionId);
			});

			// Connect
			try {
				console.log(`SSH Manager: Connecting with config:`, {
					host: connectionConfig.host,
					port: connectionConfig.port,
					username: connectionConfig.username,
					authType: host.authType,
				});
				conn.connect(connectionConfig);
			} catch (error: any) {
				console.error(`SSH Manager: Connection error: ${error.message}`);
				session.status = "error";
				session.error = error.message;
				this.sessions.set(sessionId, session);
				this.emit("connectionError", {
					hostId: host.id,
					error: `Connection error: ${error.message}`,
				});
				reject(error);
			}
		});
	}

	disconnect(sessionId: string): void {
		console.log(`SSH Manager: Disconnecting session ${sessionId}`);
		const conn = this.connections.get(sessionId);
		if (conn) {
			console.log(
				`SSH Manager: Found connection for session ${sessionId}, ending it`
			);
			conn.end();
			this.connections.delete(sessionId);

			// Update session
			const session = this.sessions.get(sessionId);
			if (session) {
				console.log(
					`SSH Manager: Updating session ${sessionId} status to disconnected`
				);
				session.status = "disconnected";
				session.endTime = new Date().toISOString();
				this.sessions.set(sessionId, session);
			} else {
				console.log(`SSH Manager: No session found for ${sessionId}`);
			}

			// Clean up terminal
			console.log(`SSH Manager: Destroying terminal for session ${sessionId}`);
			this.terminalManager.destroyTerminal(session?.terminalId || "");

			console.log(
				`SSH Manager: Emitting disconnected event for session ${sessionId}`
			);
			this.emit("disconnected", { sessionId });
		} else {
			console.log(`SSH Manager: No connection found for session ${sessionId}`);
			// Even if there's no connection, we should still clean up the session
			const session = this.sessions.get(sessionId);
			if (session) {
				console.log(
					`SSH Manager: Session found for ${sessionId}, updating status`
				);
				session.status = "disconnected";
				session.endTime = new Date().toISOString();
				this.sessions.set(sessionId, session);

				// Clean up terminal
				this.terminalManager.destroyTerminal(session.terminalId || "");

				// Emit disconnected event
				this.emit("disconnected", { sessionId });
			} else {
				console.log(
					`SSH Manager: No session found for ${sessionId}, nothing to clean up`
				);
			}
		}
	}

	// Additional methods for SFTP, port forwarding, etc.
	async setupSFTP(sessionId: string): Promise<boolean> {
		const conn = this.connections.get(sessionId);
		const session = this.sessions.get(sessionId);

		if (!conn || !session) {
			return false;
		}

		return new Promise((resolve, reject) => {
			conn.sftp((err, sftp) => {
				if (err) {
					reject(err);
					return;
				}

				// Store SFTP session for later use
				// Implementation details...

				session.sftpEnabled = true;
				this.sessions.set(sessionId, session);
				resolve(true);
			});
		});
	}

	async setupPortForwarding(
		sessionId: string,
		type: "local" | "remote" | "dynamic",
		localPort: number,
		remoteHost?: string,
		remotePort?: number
	): Promise<string> {
		// Implementation for port forwarding
		// Returns the ID of the created port forwarding
		return "port-forwarding-id";
	}

	getSession(sessionId: string): Session | undefined {
		return this.sessions.get(sessionId);
	}

	getAllSessions(): Session[] {
		return Array.from(this.sessions.values());
	}

	/**
	 * Completely removes a session from the manager's internal storage.
	 * This should be called after disconnect to ensure the session doesn't
	 * reappear on application refresh.
	 *
	 * @param sessionId The ID of the session to remove
	 * @returns true if the session was found and removed, false otherwise
	 */
	removeSession(sessionId: string): boolean {
		console.log(`SSH Manager: Removing session ${sessionId} from storage`);

		// First check if the session exists
		if (!this.sessions.has(sessionId)) {
			console.log(`SSH Manager: Session ${sessionId} not found in storage`);
			return false;
		}

		// Remove the session
		const result = this.sessions.delete(sessionId);
		console.log(
			`SSH Manager: Session ${sessionId} removed from storage: ${result}`
		);

		return result;
	}
}
