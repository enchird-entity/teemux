import React, { useState, useEffect } from "react";
import { Search, X, Grid, List, Tag, AlignJustify, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Host } from "@/models/host";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SecureStorage } from "@/services/secure-storage";
import { useConnection } from "@/contexts/connection.context";

interface HostSelectorProps {}

export function HostSelector({}: HostSelectorProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagSearchQuery, setTagSearchQuery] = useState("");
	const [sortMode, setSortMode] = useState<"a-z" | "z-a" | "newest" | "oldest">(
		"a-z"
	);
	const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
	const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
	const [availableTags, setAvailableTags] = useState<string[]>([]);
	const [hosts, setHosts] = useState<Host[]>([]);
	const [selectedHost, setSelectedHost] = useState<string | null>(null);

	const { connect, setIsHostSelectorOpen } = useConnection();

	useEffect(() => {
		// Only log in development mode
		if (process.env.NODE_ENV === "development") {
			console.log("App: Loading initial data");
		}

		//todo: get hosts from secure storage
		// const secureStorage = new SecureStorage();

		// const result =  secureStorage.getAllHosts()
		// setHosts(result);
	}, []);

	useEffect(() => {
		// Extract all unique tags from hosts
		const tags = new Set<string>();
		hosts.forEach((host) => {
			if (host.tags && host.tags.length > 0) {
				host.tags.forEach((tag) => tags.add(tag));
			}
		});
		setAvailableTags(Array.from(tags));
	}, [hosts]);

	// Use the connect function from context

	const handleConnect = (hostId: string) => {
		setSelectedHost(hostId);
		connect(hostId);
		setIsHostSelectorOpen(false);
	};

	const toggleTag = (tag: string) => {
		if (selectedTags.includes(tag)) {
			setSelectedTags(selectedTags.filter((t) => t !== tag));
		} else {
			setSelectedTags([...selectedTags, tag]);
		}
	};

	const clearTagSelection = () => {
		setSelectedTags([]);
	};

	// Filter tags based on search query
	const filteredTags = availableTags.filter(
		(tag) =>
			!tagSearchQuery ||
			tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
	);

	// Filter hosts based on search query and selected tags
	const filteredHosts = hosts.filter((host) => {
		// Filter by search query
		const matchesSearch =
			searchQuery === "" ||
			host.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			host.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(host.username &&
				host.username.toLowerCase().includes(searchQuery.toLowerCase()));

		// Filter by selected tags
		const matchesTags =
			selectedTags.length === 0 ||
			(host.tags &&
				host.tags.length > 0 &&
				selectedTags.every((tag) => host.tags!.includes(tag)));

		return matchesSearch && matchesTags;
	});

	// Sort hosts based on sort mode
	const sortedHosts = [...filteredHosts].sort((a, b) => {
		switch (sortMode) {
			case "a-z":
				return a.label.localeCompare(b.label);
			case "z-a":
				return b.label.localeCompare(a.label);
			case "newest":
				return (
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			case "oldest":
				return (
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
				);
			default:
				return 0;
		}
	});

	return (
		<div className="fixed inset-0 bg-black/70 bg-opacity-50 z-50 flex items-start justify-center pt-16 h-dvh">
			<div className="bg-[#1e1e2e] rounded-md shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
				{/* Header with search and close button */}
				<div className="flex items-center justify-between p-4 border-b border-[#2d2d3a]">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Find a host or ssh user@hostname..."
							className="w-full h-10 bg-[#252532] text-white pl-10 pr-4 rounded-md border border-[#2d2d3a] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] outline-none"
							autoFocus
						/>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsHostSelectorOpen(false)}
						className="text-gray-400 hover:text-white"
					>
						<X className="w-5 h-5" />
					</Button>
				</div>

				{/* Toolbar */}
				<div className="flex items-center p-2 border-b border-[#2d2d3a] gap-2">
					{/* View mode toggle */}
					<div className="flex items-center bg-[#252532] rounded-md">
						<Button
							variant="ghost"
							size="icon"
							className={`h-8 w-8 ${
								viewMode === "grid"
									? "bg-[#2d2d3a] text-white"
									: "text-gray-400"
							}`}
							onClick={() => setViewMode("grid")}
						>
							<Grid className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className={`h-8 w-8 ${
								viewMode === "list"
									? "bg-[#2d2d3a] text-white"
									: "text-gray-400"
							}`}
							onClick={() => setViewMode("list")}
						>
							<List className="w-4 h-4" />
						</Button>
					</div>

					{/* Tag filter */}
					<DropdownMenu open={isTagMenuOpen} onOpenChange={setIsTagMenuOpen}>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								className={`gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a] ${
									selectedTags.length > 0
										? "border-[#f97316] ring-1 ring-[#f97316]"
										: ""
								}`}
							>
								<Tag className="w-4 h-4" />
								{selectedTags.length > 0 && (
									<span className="ml-1 text-xs bg-[#f97316] text-white rounded-full w-5 h-5 flex items-center justify-center">
										{selectedTags.length}
									</span>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="bg-[#252532] border-[#2d2d3a] text-white p-2 w-64">
							<div className="mb-2">
								<Input
									placeholder="Search tags"
									value={tagSearchQuery}
									onChange={(e) => setTagSearchQuery(e.target.value)}
									className="bg-[#1e1e2e] border-[#2d2d3a] text-white h-8"
								/>
							</div>
							<div className="max-h-60 overflow-y-auto">
								{filteredTags.length === 0 ? (
									<div className="text-center py-2 text-gray-400 text-sm">
										No tags found
									</div>
								) : (
									filteredTags.map((tag) => (
										<div
											key={tag}
											className="flex items-center p-2 hover:bg-[#2d2d3a] rounded-md cursor-pointer"
											onClick={() => toggleTag(tag)}
										>
											<div
												className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
													selectedTags.includes(tag)
														? "bg-[#f97316]"
														: "bg-[#3d3d4a]"
												}`}
											>
												{selectedTags.includes(tag) && (
													<span className="text-white text-xs">✓</span>
												)}
											</div>
											<span>{tag}</span>
										</div>
									))
								)}
							</div>
							{selectedTags.length > 0 && (
								<div className="mt-2 pt-2 border-t border-[#3d3d4a]">
									<Button
										variant="ghost"
										className="w-full justify-center text-gray-400 hover:text-white"
										onClick={clearTagSelection}
									>
										Clear selection
									</Button>
								</div>
							)}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Sort options */}
					<DropdownMenu open={isSortMenuOpen} onOpenChange={setIsSortMenuOpen}>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a]"
							>
								<AlignJustify className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="bg-[#252532] border-[#2d2d3a] text-white">
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "a-z" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => {
									setSortMode("a-z");
									setIsSortMenuOpen(false);
								}}
							>
								<div className="w-6 h-6 flex items-center justify-center bg-[#3d3d4a] rounded-md">
									A-z
								</div>
								<span>A-z</span>
								{sortMode === "a-z" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "z-a" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => {
									setSortMode("z-a");
									setIsSortMenuOpen(false);
								}}
							>
								<div className="w-6 h-6 flex items-center justify-center bg-[#3d3d4a] rounded-md">
									Z-a
								</div>
								<span>Z-a</span>
								{sortMode === "z-a" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "newest" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => {
									setSortMode("newest");
									setIsSortMenuOpen(false);
								}}
							>
								<div className="w-6 h-6 flex items-center justify-center bg-[#3d3d4a] rounded-md">
									<span className="text-xs">⏱️</span>
								</div>
								<span>Newest to oldest</span>
								{sortMode === "newest" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "oldest" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => {
									setSortMode("oldest");
									setIsSortMenuOpen(false);
								}}
							>
								<div className="w-6 h-6 flex items-center justify-center bg-[#3d3d4a] rounded-md">
									<span className="text-xs">⏱️</span>
								</div>
								<span>Oldest to newest</span>
								{sortMode === "oldest" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Host list */}
				<div className="flex-1 overflow-y-auto p-4">
					{sortedHosts.length === 0 ? (
						<div className="text-center py-8">
							<p className="text-gray-400 mb-2">No hosts found</p>
							<p className="text-gray-500 text-sm">
								Try a different search term or clear filters
							</p>
						</div>
					) : (
						<div
							className={
								viewMode === "grid"
									? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
									: "flex flex-col gap-2"
							}
						>
							{sortedHosts.map((host) => (
								<div
									key={host.id}
									className={`
                    ${
											viewMode === "grid"
												? "bg-[#252532] rounded-md p-4 cursor-pointer hover:bg-[#2d2d3a] transition-colors"
												: "bg-[#252532] rounded-md p-3 cursor-pointer hover:bg-[#2d2d3a] transition-colors flex items-center"
										}
                  `}
									onClick={() => handleConnect(host.id)}
								>
									<div
										className={`${
											viewMode === "grid"
												? ""
												: "flex items-center gap-3 flex-1"
										}`}
									>
										<div
											className={`${
												viewMode === "grid"
													? "mb-2 flex items-center gap-2"
													: "flex items-center gap-3"
											}`}
										>
											<div className="w-8 h-8 rounded-md bg-[#f97316] flex items-center justify-center text-white">
												<User className="w-4 h-4" />
											</div>
											<div className={viewMode === "list" ? "flex-1" : ""}>
												<div className="font-medium text-white">
													{host.label}
												</div>
												<div className="text-sm text-gray-400">
													{host.username ? `${host.username}@` : ""}
													{host.hostname}
													{host.port && host.port !== 22 ? `:${host.port}` : ""}
												</div>
											</div>
										</div>

										{viewMode === "grid" &&
											host.tags &&
											host.tags.length > 0 && (
												<div className="flex flex-wrap gap-1 mt-2">
													{host.tags.map((tag) => (
														<span
															key={tag}
															className={`px-2 py-0.5 text-xs rounded-full ${
																selectedTags.includes(tag)
																	? "bg-[#f97316] text-white"
																	: "bg-[#2d2d3a] text-gray-400"
															}`}
														>
															{tag}
														</span>
													))}
												</div>
											)}

										{viewMode === "list" &&
											host.tags &&
											host.tags.length > 0 && (
												<div className="flex flex-wrap gap-1 ml-auto">
													{host.tags.map((tag) => (
														<span
															key={tag}
															className={`px-2 py-0.5 text-xs rounded-full ${
																selectedTags.includes(tag)
																	? "bg-[#f97316] text-white"
																	: "bg-[#2d2d3a] text-gray-400"
															}`}
														>
															{tag}
														</span>
													))}
												</div>
											)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
