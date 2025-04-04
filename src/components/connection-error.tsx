import React, { useState } from "react";
import {
	AlertTriangle,
	Copy,
	ChevronRight,
	ChevronDown,
	RefreshCw,
	X,
} from "lucide-react";
import { Button } from "./ui/button";

interface ConnectionErrorProps {
	hostId: string;
	hostLabel: string;
	hostAddress: string;
	error: string;
	logs?: string[];
	onRetry: () => void;
	onCancel: () => void;
}

export const ConnectionError: React.FC<ConnectionErrorProps> = ({
	hostId,
	hostLabel,
	hostAddress,
	error,
	logs = [],
	onRetry,
	onCancel,
}) => {
	const [showLogs, setShowLogs] = useState(true);

	const copyLogs = () => {
		const logText = logs.join("\n");
		navigator.clipboard.writeText(logText);
	};

	return (
		<div className="flex flex-col items-center justify-center h-[calc(100vh-50px)] w-full bg-[#1a1a24] p-8">
			<div className="w-full max-w-md bg-[#252532] rounded-lg shadow-lg p-6">
				<div className="flex justify-between items-center mb-6">
					<div className="flex items-center">
						<AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
						<h2 className="text-xl font-semibold text-white">
							Connection Failed
						</h2>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full"
						onClick={onCancel}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<div className="mb-6">
					<p className="text-white font-medium">{hostLabel}</p>
					<p className="text-gray-400 text-sm">{hostAddress}</p>
				</div>

				<div className="mb-6 p-3 bg-[#1a1a24] rounded border border-red-900/30">
					<p className="text-red-400 text-sm">{error}</p>
				</div>

				{logs && logs.length > 0 && (
					<div className="mb-6">
						<div
							className="flex items-center justify-between cursor-pointer mb-2"
							onClick={() => setShowLogs(!showLogs)}
						>
							<p className="text-sm font-medium text-gray-300">
								Connection Log
							</p>
							<div className="flex items-center">
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6"
									onClick={(e) => {
										e.stopPropagation();
										copyLogs();
									}}
								>
									<Copy className="h-3 w-3" />
								</Button>
								{showLogs ? (
									<ChevronDown className="h-4 w-4 text-gray-400" />
								) : (
									<ChevronRight className="h-4 w-4 text-gray-400" />
								)}
							</div>
						</div>

						{showLogs && (
							<div className="bg-[#121218] rounded p-2 max-h-44 overflow-y-auto text-xs font-mono text-gray-300">
								{logs.map((log, index) => (
									<div key={index} className="py-1">
										{log}
									</div>
								))}
							</div>
						)}
					</div>
				)}

				<div className="flex gap-3">
					<Button
						className="flex-1 bg-[#f97316] hover:bg-[#ea580c]"
						onClick={onRetry}
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Retry Connection
					</Button>
					<Button
						variant="outline"
						className="flex-1 border-gray-700 text-gray-800"
						onClick={onCancel}
					>
						Cancel
					</Button>
				</div>
			</div>
		</div>
	);
};
