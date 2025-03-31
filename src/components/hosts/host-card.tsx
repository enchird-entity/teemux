import React, { useState, useEffect } from "react";
import { Pencil, Server, AlertCircle } from "lucide-react";
import type { Host } from "../../models/host";

import { useConnection } from "../../contexts/connection.context";

interface HostCardProps {
	host: Host;
	onEdit?: (hostId: string) => void;
	onDelete?: (hostId: string) => void;
	isSelected?: boolean;
	onClick?: (hostId: string) => void;
	compact?: boolean;
	actions?: React.ReactNode;
}

export function HostCard({
	host,
	onEdit,
	onDelete,
	isSelected,
	onClick,
	compact,
	actions,
}: HostCardProps) {
	const [isHighlighted, setIsHighlighted] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const { connect, isConnecting, connectingHost } = useConnection();

	// Reset connection error when host changes
	useEffect(() => {
		setConnectionError(null);
	}, [host.id]);

	// Check if this host has a connection error
	useEffect(() => {
		if (
			connectingHost &&
			connectingHost.id === host.id &&
			connectingHost.status === "error"
		) {
			setConnectionError(connectingHost.error || "Connection failed");

			// Clear the error after 5 seconds
			const timer = setTimeout(() => {
				setConnectionError(null);
			}, 5000);

			return () => clearTimeout(timer);
		}
	}, [connectingHost, host.id]);

	const handleConnect = (e: React.MouseEvent) => {
		e.stopPropagation();
		console.log(`Connecting to host: ${host.id} (${host.label})`);
		setConnectionError(null);
		connect(host.id);
	};

	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onEdit) onEdit(host.id);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (onDelete) onDelete(host.id);
	};

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		console.log(`Double-clicked on host: ${host.id} (${host.label})`);
		setConnectionError(null);
		connect(host.id);
	};

	if (compact) {
		// List view (compact)
		return (
			<div
				className={`bg-[#1a1a24] rounded-md p-3 cursor-pointer hover:bg-[#252532] transition-colors relative group ${
					isSelected ? "ring-2 ring-[#f97316]" : ""
				} ${connectionError ? "ring-2 ring-red-500" : ""}`}
				onDoubleClick={handleDoubleClick}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div
							className={`w-10 h-10 rounded-md ${
								connectionError ? "bg-red-500" : "bg-[#f97316]"
							} flex items-center justify-center text-white`}
						>
							{/* Custom server icon with two horizontal bars */}
							<div className="flex flex-col gap-1.5">
								{connectionError ? <AlertCircle /> : <Server />}
							</div>
						</div>
						<div>
							<div className="font-medium text-white">{host.label}</div>
							<div className="text-sm text-gray-400">
								ssh, {host.username || ""}, {host.hostname.split(".")[0]}
							</div>
							{connectionError && (
								<div className="text-xs text-red-400 mt-1">
									{connectionError}
								</div>
							)}
						</div>
					</div>

					{/* Add a visible connect button */}
					<button
						className={`p-2 ${
							connectionError
								? "bg-red-700 hover:bg-red-600"
								: "bg-[#3d3d43] hover:bg-green-700"
						} rounded-xl text-white transition-colors`}
						onClick={handleConnect}
						disabled={isConnecting}
					>
						{isConnecting
							? "Connecting..."
							: connectionError
							? "Retry"
							: "Connect"}
					</button>
				</div>
			</div>
		);
	}

	// Grid view
	return (
		<div
			className={`bg-[#1a1a24] rounded-lg cursor-pointer hover:bg-[#252532] transition-colors flex items-center relative group ${
				isSelected ? "ring-2 ring-[#f97316]" : ""
			} ${isHighlighted ? "ring-2 ring-[#f97316]" : ""} ${
				connectionError ? "ring-2 ring-red-500" : ""
			}`}
			onClick={() => setIsHighlighted(true)}
			onDoubleClick={handleDoubleClick}
		>
			{/* Host icon */}
			<div className="p-4">
				<div
					className={`w-10 h-10 rounded-md ${
						connectionError ? "bg-red-500" : "bg-[#f97316]"
					} flex items-center justify-center text-white`}
				>
					{/* Custom server icon with two horizontal bars */}
					<div className="flex flex-col gap-2">
						{connectionError ? <AlertCircle /> : <Server />}
					</div>
				</div>
			</div>

			{/* Host details */}
			<div className="flex flex-col justify-center">
				<div className="font-medium text-white text-sm">{host.label}</div>
				<div className="text-gray-400 text-xs">
					{host.username} {host.authType} {host.tags}
				</div>
				{connectionError && (
					<div className="text-xs text-red-400 mt-1">{connectionError}</div>
				)}
			</div>

			{/* Edit button that appears on hover */}
			{onEdit && (
				<button
					className="absolute top-[calc(50%-20px)] right-2 p-2 bg-[#3d3d43] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={handleEdit}
				>
					<Pencil className="w-5 h-5 text-white hover:text-green-600" />
				</button>
			)}
		</div>
	);
}
