import React, { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "./ui/button";

interface ConnectionLoadingProps {
	hostId: string;
	hostLabel: string;
	hostAddress: string;
	logs?: string[];
	onCancel: () => void;
}

export function ConnectionLoading({
	hostId,
	hostLabel,
	hostAddress,
	logs = [],
	onCancel,
}: ConnectionLoadingProps) {
	const [progress, setProgress] = useState(0);

	// Log when component mounts or updates
	useEffect(() => {
		console.log(
			`ConnectionLoading: Rendering for host: ${hostLabel} (${hostId})`
		);

		return () => {
			console.log(
				`ConnectionLoading: Component unmounting for host: ${hostLabel}`
			);
		};
	}, [hostLabel, hostId]);

	// Animate progress
	useEffect(() => {
		const interval = setInterval(() => {
			setProgress((prev) => {
				// Increment progress but cap at 95% to show it's still in progress
				const newProgress = Math.min(prev + 1, 95);
				return newProgress;
			});
		}, 300);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-50px)] w-full bg-[#1a1a24] p-8">
			<div className="w-full max-w-md bg-[#252532] rounded-lg shadow-lg p-6">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold text-white">Connecting...</h2>
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

				<div className="mb-6">
					<div className="h-2 w-full bg-[#1a1a24] rounded-full overflow-hidden">
						<div
							className="h-full bg-blue-500 transition-all duration-300 ease-out"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<p className="text-gray-400 text-sm mt-2">
						Establishing secure connection...
					</p>
				</div>

				{logs && logs.length > 0 && (
					<div className="mt-4">
						<p className="text-sm font-medium text-gray-300 mb-2">
							Connection Log:
						</p>
						<div className="bg-[#1a1a24] rounded p-2 max-h-32 overflow-y-auto text-xs font-mono text-gray-300">
							{logs.map((log, index) => (
								<div key={index} className="py-1">
									{log}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
