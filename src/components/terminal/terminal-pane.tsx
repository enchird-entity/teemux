import React, { useRef, useEffect } from "react";
import { useTerminalInstance } from "../../hooks/use-terminal-instance";
import { Loader2 } from "lucide-react";

interface TerminalPaneProps {
	id: string;
	terminalId: string;
	isActive: boolean;
	isVisible: boolean;
	onData?: (data: string) => void;
	onResize?: (cols: number, rows: number) => void;
	onError?: (error: string) => void;
	connectionStatus: "connected" | "disconnected" | "reconnecting";
	onRetryConnection?: () => void;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
	id,
	terminalId,
	isActive,
	isVisible,
	onData,
	onResize,
	onError,
	connectionStatus,
	onRetryConnection,
}) => {
	const terminalRef = useRef<HTMLDivElement>(null);
	const { xterm } = useTerminalInstance({
		terminalId,
		elementRef: terminalRef as React.RefObject<HTMLDivElement>,
		isVisible,
		onData,
		onResize,
		onError,
	});

	// Focus terminal when it becomes active
	useEffect(() => {
		if (isActive && isVisible && xterm) {
			xterm.focus();
		}
	}, [isActive, isVisible, xterm]);

	return (
		<div
			className={`flex-1 relative ${
				isActive ? "border border-green-200 border-opacity-20 rounded-lg" : ""
			}`}
			style={{
				minHeight: "150px",
				minWidth: "200px",
				flex: 1,
				position: "relative",
			}}
		>
			{/* Connection status indicator */}
			{connectionStatus === "reconnecting" && (
				<div className="absolute top-2 right-2 z-10 bg-yellow-600 text-white text-xs px-2 py-1 rounded flex items-center">
					<Loader2 className="h-3 w-3 animate-spin mr-1" />
					Reconnecting...
				</div>
			)}
			{connectionStatus === "disconnected" && (
				<div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center">
					Disconnected
					{onRetryConnection && (
						<button
							className="ml-2 bg-[#252532] hover:bg-[#2d2d3a] p-1 rounded"
							onClick={(e) => {
								e.stopPropagation();
								onRetryConnection();
							}}
						>
							<Loader2 className="h-3 w-3" />
						</button>
					)}
				</div>
			)}
			<div
				ref={terminalRef}
				className="w-full h-full overflow-hidden"
				style={{
					display: "block",
					minHeight: "150px",
					minWidth: "200px",
					flex: 1,
					position: "relative",
				}}
				data-terminal-pane-id={id}
			/>
		</div>
	);
};
