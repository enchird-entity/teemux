import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import { Unicode11Addon } from "xterm-addon-unicode11";
import { invoke } from "@tauri-apps/api/core";
import { Event, UnlistenFn, listen } from "@tauri-apps/api/event";
import { TerminalDataBuffer } from "../utils/terminal-buffer";

interface UseTerminalInstanceProps {
	terminalId: string;
	elementRef: React.RefObject<HTMLDivElement>;
	isVisible?: boolean;
	onData?: (data: string) => void;
	onResize?: (cols: number, rows: number) => void;
	onError?: (error: string) => void;
}

interface TerminalInstance {
	xterm: XTerm | null;
	fitAddon: FitAddon | null;
	searchAddon: SearchAddon | null;
	dataBuffer: TerminalDataBuffer | null;
}

interface TerminalEventPayload {
	terminalId: string;
	data: string;
}

interface TerminalDataEvent extends Event<TerminalEventPayload> {}

export function useTerminalInstance({
	terminalId,
	elementRef,
	isVisible = true,
	onData,
	onResize,
	onError,
}: UseTerminalInstanceProps) {
	const [instance, setInstance] = useState<TerminalInstance>({
		xterm: null,
		fitAddon: null,
		searchAddon: null,
		dataBuffer: null,
	});
	const [isInitialized, setIsInitialized] = useState(false);
	const cleanupRef = useRef<(() => void)[]>([]);

	useEffect(() => {
		if (!elementRef.current || !isVisible || isInitialized) return;

		const initializeTerminal = async () => {
			try {
				const term = new XTerm({
					cursorBlink: true,
					macOptionIsMeta: true,
					scrollback: 10000,
					fontFamily: 'Menlo, Monaco, "Courier New", monospace',
					fontSize: 14,
					lineHeight: 1.2,
					theme: {
						background: "#1a1a24",
						foreground: "#f0f0f0",
						cursor: "#ffffff",
						cursorAccent: "#000000",
						black: "#000000",
						red: "#e06c75",
						green: "#98c379",
						yellow: "#e5c07b",
						blue: "#61afef",
						magenta: "#c678dd",
						cyan: "#56b6c2",
						white: "#dcdfe4",
						brightBlack: "#5c6370",
						brightRed: "#e06c75",
						brightGreen: "#98c379",
						brightYellow: "#e5c07b",
						brightBlue: "#61afef",
						brightMagenta: "#c678dd",
						brightCyan: "#56b6c2",
						brightWhite: "#ffffff",
					},
				});

				const dataBuffer = new TerminalDataBuffer(term, terminalId);
				const fitAddon = new FitAddon();
				const webLinksAddon = new WebLinksAddon();
				const searchAddon = new SearchAddon();
				const unicode11Addon = new Unicode11Addon();

				term.loadAddon(fitAddon);
				term.loadAddon(webLinksAddon);
				term.loadAddon(searchAddon);
				term.loadAddon(unicode11Addon);

				term.open(elementRef.current);
				fitAddon.fit();

				// Handle terminal input
				term.onData((data) => {
					onData?.(data);
					invoke<void>("send_data", { terminalId, data }).catch(
						(error: unknown) => {
							console.error("Error sending data:", error);
							onError?.(String(error));
						}
					);
				});

				// Handle terminal resize
				term.onResize(({ cols, rows }) => {
					onResize?.(cols, rows);
					invoke<void>("resize_terminal", { terminalId, cols, rows }).catch(
						(error: unknown) => {
							console.error("Error resizing terminal:", error);
							onError?.(String(error));
						}
					);
				});

				// Listen for terminal data from Tauri
				const unlisten = await listen<TerminalEventPayload>(
					"terminal:data",
					(event) => {
						if (event.payload.terminalId === terminalId) {
							dataBuffer.write(event.payload.data);
						}
					}
				);

				cleanupRef.current.push(() => {
					unlisten();
					term.dispose();
					dataBuffer.dispose();
				});

				setInstance({
					xterm: term,
					fitAddon,
					searchAddon,
					dataBuffer,
				});
				setIsInitialized(true);
			} catch (error) {
				console.error("Error initializing terminal:", error);
				onError?.(error instanceof Error ? error.message : String(error));
			}
		};

		initializeTerminal();

		return () => {
			cleanupRef.current.forEach((cleanup) => cleanup());
			cleanupRef.current = [];
		};
	}, [
		terminalId,
		elementRef,
		isVisible,
		isInitialized,
		onData,
		onResize,
		onError,
	]);

	return instance;
}
