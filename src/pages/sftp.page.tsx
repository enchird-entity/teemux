import React, { useState, useEffect } from "react";
import { FileText, Cloud, Folder, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SftpClientProps {}

interface Host {
	id: string;
	label: string;
	hostname: string;
	port?: number;
	username?: string;
}

export function SftpPage() {
	const [isConnected, setIsConnected] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [hosts, setHosts] = useState<Host[]>([]);
	const [isHostSelectorOpen, setIsHostSelectorOpen] = useState(false);
	const [selectedHost, setSelectedHost] = useState<Host | null>(null);

	// Load hosts when component mounts
	useEffect(() => {
		loadHosts();
	}, []);

	// Load hosts from the main process
	const loadHosts = async () => {
		try {
			//   const hostsList = await ipcRenderer.invoke('hosts:getAll');
			//   setHosts(Array.isArray(hostsList) ? hostsList : []);
		} catch (error) {
			console.error("Failed to load hosts:", error);
		}
	};

	// Function to handle connecting to an SFTP server
	const handleConnect = async (hostId: string) => {
		setIsLoading(true);
		try {
			// In a real implementation, you would connect to the SFTP server here
			// For now, we'll just simulate a connection
			await new Promise((resolve) => setTimeout(resolve, 1000));
			setIsConnected(true);
			setIsHostSelectorOpen(false);

			// Find the selected host
			const host = hosts.find((h) => h.id === hostId);
			if (host) {
				setSelectedHost(host);
			}
		} catch (error) {
			console.error("Failed to connect:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Function to open the host selector dialog
	const openHostSelector = () => {
		setIsHostSelectorOpen(true);
	};

	return (
		<div className="flex flex-col h-dvh bg-[#1e1e2e] text-white">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-[#2d2d3a]">
				<div className="flex items-center">
					<FileText className="w-5 h-5 mr-2" />
					<h2 className="text-lg font-medium">SFTP Client</h2>
				</div>
				<div className="flex space-x-2">
					{selectedHost && (
						<span className="text-sm text-gray-400 mr-2">
							Connected to: {selectedHost.label}
						</span>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							selectedHost ? handleConnect(selectedHost.id) : openHostSelector()
						}
						disabled={isLoading}
						className="bg-[#7C3AED]"
					>
						{isLoading
							? "Connecting..."
							: isConnected
							? "Connected"
							: "Connect"}
					</Button>
				</div>
			</div>

			{/* Main content */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
					{/* Left panel */}
					<div className="flex flex-col items-center justify-center p-8 bg-[#252532] rounded-lg">
						<div className="relative mb-6">
							<Cloud className="w-32 h-32 text-[#3d3d4a]" />
							<Folder className="w-24 h-24 text-[#4d4d5a] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/3" />
						</div>
						<h3 className="text-xl font-medium mb-4">Connect to a Host</h3>
						<p className="text-gray-400 text-center mb-6">
							Select from your saved SFTP hosts
						</p>
						<Button
							variant="default"
							className="bg-[#7C3AED]"
							onClick={openHostSelector}
						>
							Select host
						</Button>
					</div>

					{/* Right panel */}
					<div className="flex flex-col items-center justify-center p-8 bg-[#252532] rounded-lg">
						<div className="relative mb-6">
							<Cloud className="w-32 h-32 text-[#3d3d4a]" />
							<Folder className="w-24 h-24 text-[#4d4d5a] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/3" />
							<Plus className="w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4" />
						</div>
						<h3 className="text-xl font-medium mb-4">Create New Connection</h3>
						<p className="text-gray-400 text-center mb-6">
							Set up a new SFTP server connection
						</p>
						<Button variant="default" className="bg-[#7C3AED]">
							Create new
						</Button>
					</div>
				</div>
			</div>

			{/* Host selector dialog */}
			<Dialog open={isHostSelectorOpen} onOpenChange={setIsHostSelectorOpen}>
				<DialogContent className="sm:max-w-md bg-[#252532] text-white border-[#3d3d4a]">
					<DialogHeader>
						<DialogTitle>Select SFTP Host</DialogTitle>
						<DialogDescription className="text-gray-400">
							Choose a host to connect to via SFTP
						</DialogDescription>
					</DialogHeader>

					<ScrollArea className="mt-4 max-h-[60vh]">
						{hosts.length === 0 ? (
							<div className="py-4 text-center text-gray-400">
								No hosts found. Create a new host first.
							</div>
						) : (
							<div className="space-y-2">
								{hosts.map((host) => (
									<div
										key={host.id}
										className="flex items-center justify-between p-3 rounded-md hover:bg-[#2d2d3a] cursor-pointer"
										onClick={() => handleConnect(host.id)}
									>
										<div>
											<div className="font-medium">{host.label}</div>
											<div className="text-sm text-gray-400">
												{host.username ? `${host.username}@` : ""}
												{host.hostname}
												{host.port ? `:${host.port}` : ""}
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												handleConnect(host.id);
											}}
										>
											Connect
										</Button>
									</div>
								))}
							</div>
						)}
					</ScrollArea>

					<div className="flex justify-end mt-4">
						<Button
							variant="outline"
							onClick={() => setIsHostSelectorOpen(false)}
						>
							Cancel
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
