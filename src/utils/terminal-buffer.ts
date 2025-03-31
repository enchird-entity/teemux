import { Terminal as XTerm } from "xterm";

export class TerminalDataBuffer {
	private buffer: string = "";
	private term: XTerm;
	private flushTimeout: ReturnType<typeof setTimeout> | null = null;
	private readonly flushInterval: number = 16; // ~60fps
	private debugId: string;

	constructor(term: XTerm, debugId: string = "unknown") {
		this.term = term;
		this.debugId = debugId;
		console.log(
			`Terminal buffer: Created new data buffer for terminal ${debugId}`
		);
	}

	write(data: string): void {
		this.buffer += data;
		console.log(
			`Terminal buffer: Added ${data.length} bytes to buffer for terminal ${this.debugId}`
		);

		// If this is the first write in this cycle, schedule a flush
		if (this.flushTimeout === null) {
			this.flushTimeout = setTimeout(() => this.flush(), this.flushInterval);
		}
	}

	flush(): void {
		if (this.buffer.length > 0) {
			console.log(
				`Terminal buffer: Flushing ${this.buffer.length} bytes to terminal ${this.debugId}`
			);
			this.term.write(this.buffer);
			this.buffer = "";
		}

		this.flushTimeout = null;
	}

	dispose(): void {
		console.log(
			`Terminal buffer: Disposing data buffer for terminal ${this.debugId}`
		);
		if (this.flushTimeout !== null) {
			clearTimeout(this.flushTimeout);
			this.flush();
		}
	}
}
