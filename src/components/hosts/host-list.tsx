import React from "react";
import { HostCard } from "./host-card";
import { Button } from "../ui/button";
import type { Host } from "../../models/host";
import { Server, Plus, Search, Cloud } from "lucide-react";

interface HostListProps {
	hosts: Host[];
	onHostSelect?: (host: Host) => void;
	onHostConnect?: (host: Host) => void;
	onAddHost?: () => void;
	onEditHost?: (host: Host) => void;
	onDeleteHost?: (host: Host) => void;
	selectedHostId?: string;
	searchQuery?: string;
	viewMode?: "grid" | "list";
}

export function HostList({
	hosts,
	onHostSelect,
	onHostConnect,
	onAddHost,
	onEditHost,
	onDeleteHost,
	selectedHostId,
	searchQuery = "",
	viewMode = "grid",
}: HostListProps) {
	const filteredHosts = hosts.filter((host) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		return (
			host.label.toLowerCase().includes(query) ||
			host.hostname.toLowerCase().includes(query) ||
			(host.username && host.username.toLowerCase().includes(query)) ||
			(host.tags && host.tags.some((tag) => tag.toLowerCase().includes(query)))
		);
	});

	return (
		<div className="flex flex-col h-full bg-[#1e1e2a]">
			<div className="flex-1 overflow-y-auto p-4">
				{filteredHosts.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full p-4 text-center relative">
						{hosts.length === 0 ? (
							<>
								<div className="relative w-full h-full flex flex-col items-center justify-center">
									{/* Animated clouds */}
									<div className="absolute top-[70px] left-[10%] animate-float opacity-30">
										<Cloud className="w-40 h-24 " fill="white" />
									</div>
									<div className="absolute top-[100px] right-[10%] animate-float-delayed opacity-30">
										<Cloud className="w-52 h-24" fill="white" />
									</div>
									<div className="absolute top-[40px] right-[40%] animate-float-slow opacity-30">
										<Cloud className="w-56 h-24" fill="white" />
									</div>

									{/* Main content */}
									<div className="relative z-10 bg-[#2d2d3a] p-8 rounded-lg shadow-lg border border-[#3d3d4a] transform transition-all hover:scale-105 duration-300">
										<div className="mb-6">
											<Server className="w-16 h-16 mx-auto text-primary-400 mb-4" />
											<h3 className="text-xl font-semibold text-gray-200 mb-2">
												No hosts found
											</h3>
											<p className="text-gray-400 text-sm mb-6">
												Add your first host to get started with remote
												connections
											</p>
										</div>
										{onAddHost && (
											<Button
												variant="outline"
												size="lg"
												onClick={onAddHost}
												className="w-full border-[#2d2d3a] bg-primary-400 hover:bg-primary-800 text-white hover:text-gray-200 hover:cursor-pointer p-4 group transition-all duration-300"
											>
												<Plus className="mr-2 w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
												Add Host
											</Button>
										)}
									</div>
								</div>
							</>
						) : (
							<>
								<div className="bg-[#2d2d3a] p-6 rounded-lg shadow-lg border border-[#3d3d4a]">
									<Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
									<p className="text-gray-400 mb-2">
										No hosts match your search
									</p>
									<p className="text-gray-500 text-sm">
										Try a different search term
									</p>
								</div>
							</>
						)}
					</div>
				) : (
					<div
						className={
							viewMode === "grid"
								? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
								: "flex flex-col gap-2"
						}
					>
						{filteredHosts.map((host) => (
							<HostCard
								key={host.id}
								host={host}
								isSelected={selectedHostId === host.id}
								onEdit={onEditHost ? () => onEditHost(host) : undefined}
								onDelete={onDeleteHost ? () => onDeleteHost(host) : undefined}
								compact={viewMode === "list"}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
