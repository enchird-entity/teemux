import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
import { Session } from "../models/session";
import { Host } from "../models/host";

interface SessionHistoryEntry {
	id: string;
	hostId: string;
	hostLabel: string; // Store the host label for display
	hostname: string; // Store the hostname for display
	startTime: string;
	endTime?: string;
	duration?: number; // Duration in seconds
	type: "ssh" | "serial" | "telnet";
	status: "success" | "error";
	error?: string;
}

export class SessionHistoryManager {
	private historyFilePath: string;
	private sessionHistory: SessionHistoryEntry[] = [];
	private maxHistoryEntries = 100; // Maximum number of entries to keep

	constructor() {
		this.historyFilePath = path.join(
			app.getPath("userData"),
			"session-history.json"
		);
		this.loadHistory();
	}

	private loadHistory(): void {
		try {
			if (fs.existsSync(this.historyFilePath)) {
				const data = fs.readFileSync(this.historyFilePath, "utf8");
				this.sessionHistory = JSON.parse(data);
			}
		} catch (error) {
			console.error("Failed to load session history:", error);
			this.sessionHistory = [];
		}
	}

	private saveHistory(): void {
		try {
			fs.writeFileSync(
				this.historyFilePath,
				JSON.stringify(this.sessionHistory, null, 2),
				"utf8"
			);
		} catch (error) {
			console.error("Failed to save session history:", error);
		}
	}

	addSession(session: Session, host: Host): void {
		// Create a new history entry
		const historyEntry: SessionHistoryEntry = {
			id: session.id,
			hostId: host.id,
			hostLabel: host.label || "Unknown",
			hostname: host.hostname || "Unknown",
			startTime: session.startTime,
			endTime: session.endTime,
			type: session.type,
			status: session.status === "error" ? "error" : "success",
			error: session.error,
		};

		// Calculate duration if session has ended
		if (session.startTime && session.endTime) {
			const start = new Date(session.startTime).getTime();
			const end = new Date(session.endTime).getTime();
			historyEntry.duration = Math.floor((end - start) / 1000);
		}

		// Add to the beginning of the array
		this.sessionHistory.unshift(historyEntry);

		// Limit the size of history
		if (this.sessionHistory.length > this.maxHistoryEntries) {
			this.sessionHistory = this.sessionHistory.slice(
				0,
				this.maxHistoryEntries
			);
		}

		this.saveHistory();
	}

	updateSession(sessionId: string, updates: Partial<Session>): void {
		const index = this.sessionHistory.findIndex(
			(entry) => entry.id === sessionId
		);
		if (index !== -1) {
			const entry = this.sessionHistory[index];

			// Update fields
			if (updates.endTime) {
				entry.endTime = updates.endTime;

				// Calculate duration
				if (entry.startTime) {
					const start = new Date(entry.startTime).getTime();
					const end = new Date(updates.endTime).getTime();
					entry.duration = Math.floor((end - start) / 1000);
				}
			}

			if (updates.status) {
				entry.status = updates.status === "error" ? "error" : "success";
			}

			if (updates.error) {
				entry.error = updates.error;
			}

			this.sessionHistory[index] = entry;
			this.saveHistory();
		}
	}

	getHistory(limit = 50): SessionHistoryEntry[] {
		return this.sessionHistory.slice(0, limit);
	}

	searchHistory(query: string): SessionHistoryEntry[] {
		if (!query) return this.getHistory();

		const lowerQuery = query.toLowerCase();
		return this.sessionHistory.filter(
			(entry) =>
				entry.hostLabel.toLowerCase().includes(lowerQuery) ||
				entry.hostname.toLowerCase().includes(lowerQuery)
		);
	}

	clearHistory(): void {
		this.sessionHistory = [];
		this.saveHistory();
	}
}

// Export a singleton instance
export const sessionHistoryManager = new SessionHistoryManager();
