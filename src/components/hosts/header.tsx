import React, { useState, useEffect } from "react";
import {
	Search,
	Grid,
	List,
	ChevronDown,
	Info,
	Tag,
	AlignJustify,
	User,
	Plus,
	Server,
	Usb,
	CalendarArrowDown,
	CalendarArrowUp,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { Host } from "../../models/host";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";

interface HeaderProps {
	onNewHost: () => void;
	onSearch: (query: string) => void;
	onOpenHostSelector?: () => void;
	hosts?: Host[];
	onViewModeChange?: (mode: "grid" | "list") => void;
	onTagsChange?: (tags: string[]) => void;
	onSortChange?: (sort: "a-z" | "z-a" | "newest" | "oldest") => void;
	viewMode?: "grid" | "list";
}

export function Header({
	onNewHost,
	onSearch,
	onOpenHostSelector,
	hosts = [],
	onViewModeChange,
	onTagsChange,
	onSortChange,
	viewMode = "grid",
}: HeaderProps) {
	const [searchValue, setSearchValue] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagSearchQuery, setTagSearchQuery] = useState("");
	const [sortMode, setSortMode] = useState<"a-z" | "z-a" | "newest" | "oldest">(
		"a-z"
	);
	const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
	const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
	const [availableTags, setAvailableTags] = useState<string[]>([]);

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

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchValue(e.target.value);
		onSearch(e.target.value);
	};

	const toggleTag = (tag: string) => {
		const newSelectedTags = selectedTags.includes(tag)
			? selectedTags.filter((t) => t !== tag)
			: [...selectedTags, tag];

		setSelectedTags(newSelectedTags);
		if (onTagsChange) {
			onTagsChange(newSelectedTags);
		}
	};

	const clearTagSelection = () => {
		setSelectedTags([]);
		if (onTagsChange) {
			onTagsChange([]);
		}
	};

	const handleSortChange = (mode: "a-z" | "z-a" | "newest" | "oldest") => {
		setSortMode(mode);
		if (onSortChange) {
			onSortChange(mode);
		}
		setIsSortMenuOpen(false);
	};

	const handleViewModeChange = (mode: "grid" | "list") => {
		if (onViewModeChange) {
			onViewModeChange(mode);
		}
	};

	// Filter tags based on search query
	const filteredTags = availableTags.filter(
		(tag) =>
			!tagSearchQuery ||
			tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
	);

	const checkIsValidSshConnectionString = (text: string) => {
		const regex = /^ssh\s+[a-zA-Z0-9._%+-]+@[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/;

		return regex.test(text);
	};

	return (
		<div className="bg-[#1a1a24] border-b border-[#2d2d3a] flex flex-col">
			{/* Top search bar */}
			<div className="flex items-center px-4 py-3 border-b border-[#2d2d3a]">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<input
						type="text"
						value={searchValue}
						onChange={handleSearch}
						placeholder="Find a host or ssh user@hostname..."
						className="w-full h-10 bg-[#252532] text-white pl-10 pr-4 text-[12px] rounded-md border border-[#2d2d3a] focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] outline-none"
					/>
					{searchValue && !checkIsValidSshConnectionString(searchValue) ? (
						<button
							onClick={() => {
								setSearchValue("");
								onSearch("");
							}}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
						>
							×
						</button>
					) : (
						<Button
							disabled={!checkIsValidSshConnectionString(searchValue)}
							className="absolute text-xs right-2 top-1/2 transform -translate-y-1/2 bg-[#f97316] hover:bg-[#ea580c] text-white h-6 px-2 rounded-sm"
							onClick={onOpenHostSelector}
						>
							Connect
						</Button>
					)}
				</div>
			</div>

			{/* Buttons bar */}
			<div className="flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<div className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a] h-8 flex items-center px-2 rounded-md hover:text-primary">
							<Server size={14} />

							<div
								className="font-semibold text-xs border-r pr-2 flex-1 hover:cursor-pointer"
								onClick={onNewHost}
							>
								NEW HOST
							</div>
							<DropdownMenuTrigger asChild>
								<ChevronDown className="w-4 h-4" />
							</DropdownMenuTrigger>
						</div>
						<DropdownMenuContent className="bg-[#252532] border-[#2d2d3a] text-white">
							<DropdownMenuItem
								onClick={onNewHost}
								className="hover:bg-[#2d2d3a]"
							>
								New Host
							</DropdownMenuItem>
							<DropdownMenuItem className="hover:bg-[#2d2d3a]">
								Import from SSH Config
							</DropdownMenuItem>
							<DropdownMenuItem className="hover:bg-[#2d2d3a]">
								Import from OpenSSH
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						variant="outline"
						className="gap-2 bg-[#252532] border-[#2d2d3a] text-white hover:bg-[#2d2d3a] hover:text-primary h-8 px-1"
					>
						<Usb size={14} />
						<span className="font-semibold text-xs">SERIAL</span>
						<Info className="w-4 h-4" />
					</Button>
				</div>

				<div className="flex items-center gap-2">
					{/* View mode toggle */}
					<div className="flex items-center bg-[#252532] rounded-md">
						<Button
							variant="ghost"
							size="icon"
							className={`h-8 w-8 hover:bg-gray-700 hover:text-gray-50 ${
								viewMode === "grid"
									? "bg-[#64647d] text-white"
									: "text-gray-400"
							}`}
							onClick={() => handleViewModeChange("grid")}
						>
							<Grid className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className={`h-8 w-8 hover:bg-gray-700 hover:text-gray-50 ${
								viewMode === "list"
									? "bg-[#64647d] text-white"
									: "text-gray-400"
							}`}
							onClick={() => handleViewModeChange("list")}
						>
							<List className="w-4 h-4" />
						</Button>
					</div>

					{/* Tag filter */}
					<DropdownMenu open={isTagMenuOpen} onOpenChange={setIsTagMenuOpen}>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className={`text-gray-400 hover:text-white hover:bg-[#2d2d3a] ${
									selectedTags.length > 0 ? "text-[#f97316]" : ""
								}`}
							>
								<Tag className="w-5 h-5" />
								{selectedTags.length > 0 && (
									<span className="absolute -top-1 -right-1 text-xs bg-[#f97316] text-white rounded-full w-4 h-4 flex items-center justify-center">
										{selectedTags.length}
									</span>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="bg-[#252532] border-[#2d2d3a] text-white p-2 w-64"
						>
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
								variant="ghost"
								size="icon"
								className="text-gray-400 hover:text-white hover:bg-[#2d2d3a]"
							>
								{sortMode === "a-z" ? (
									<div className="w-6 h-6 text-[10px] text-gray-200 flex font-medium items-center justify-center bg-gray-500 rounded-sm">
										Az
									</div>
								) : sortMode === "z-a" ? (
									<div className="w-6 h-6 text-[10px] text-gray-200 flex font-medium items-center justify-center bg-gray-500 rounded-sm">
										Za
									</div>
								) : sortMode === "newest" ? (
									<div className="p-1 flex items-center justify-center bg-gray-500 rounded-sm">
										<CalendarArrowDown size={5} className="text-gray-200" />
									</div>
								) : (
									<div className="p-1 flex items-center justify-center bg-gray-500 rounded-sm">
										<CalendarArrowUp size={5} className="text-gray-200" />
									</div>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="bg-[#252532] border-[#2d2d3a] text-white"
						>
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "a-z" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => handleSortChange("a-z")}
							>
								<div className="w-6 h-6 text-[10px] text-gray-200 flex font-medium items-center justify-center bg-gray-500 rounded-sm">
									Az
								</div>
								<span>A-z</span>
								{sortMode === "a-z" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "z-a" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => handleSortChange("z-a")}
							>
								<div className="w-6 h-6 text-[10px] text-gray-200 flex font-medium items-center justify-center bg-gray-500 rounded-sm">
									Za
								</div>
								<span>Z-a</span>
								{sortMode === "z-a" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
							<Separator className="my-3 bg-gray-500" />
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "newest" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => handleSortChange("newest")}
							>
								<div className="p-1 flex items-center justify-center bg-gray-500 rounded-sm">
									<CalendarArrowDown size={5} className="text-gray-200" />
								</div>
								<span>Newest to oldest</span>
								{sortMode === "newest" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
							<DropdownMenuItem
								className={`flex items-center gap-2 cursor-pointer ${
									sortMode === "oldest" ? "bg-[#2d2d3a]" : ""
								}`}
								onClick={() => handleSortChange("oldest")}
							>
								<div className="p-1 flex items-center justify-center bg-gray-500 rounded-sm">
									<CalendarArrowUp size={5} className="text-gray-200" />
								</div>
								<span>Oldest to newest</span>
								{sortMode === "oldest" && <span className="ml-auto">✓</span>}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center overflow-hidden">
							<User className="w-5 h-5 text-white" />
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="text-gray-400 hover:text-white hover:bg-[#2d2d3a] ml-1"
							onClick={onOpenHostSelector}
						>
							<Plus className="w-5 h-5" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
