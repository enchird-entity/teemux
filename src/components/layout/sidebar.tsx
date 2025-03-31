"use client";

import React, { useState, useRef, useEffect } from "react";
import {
	Server,
	History,
	Settings,
	Braces,
	ArrowRightFromLine,
	KeyRound,
	Fingerprint,
	X,
	Search,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Input } from "../ui/input";
import { useSessionHistory } from "../../hooks/use-session-history";
import { useLocation, useNavigate } from "react-router-dom";

interface SidebarProps {}

interface SidebarItem {
	id: string;
	icon: React.ElementType;
	label: string;
	count?: number;
	path?: string;
}

// Sidebar items configuration
const sidebarItems: SidebarItem[] = [
	{ id: "hosts", icon: Server, label: "Hosts", path: "/vaults/hosts" },
	{
		id: "keychain",
		icon: KeyRound,
		label: "Keychain",
		path: "/vaults/keychain",
	},
	{
		id: "port-forwarding",
		icon: ArrowRightFromLine,
		label: "Port Forwarding",
		path: "/vaults/port-forwarding",
	},
	{ id: "snippets", icon: Braces, label: "Snippets", path: "/vaults/snippets" },
	{
		id: "known-hosts",
		icon: Fingerprint,
		label: "Known Hosts",
		path: "/vaults/known-hosts",
	},
	{ id: "history", icon: History, label: "History", path: "#" },
];

export function Sidebar({}: SidebarProps) {
	const [isSearching, setIsSearching] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const location = useLocation();

	// Use the session history hook
	const {
		sessionHistory,
		isLoading,
		error,
		searchSessionHistory,
		connectToHost,
	} = useSessionHistory();

	// Filter history items based on search query
	useEffect(() => {
		if (isSearching) {
			searchSessionHistory(searchQuery);
		}
	}, [searchQuery, isSearching, searchSessionHistory]);

	// Focus search input when search mode is activated
	useEffect(() => {
		if (isSearching && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [isSearching]);

	// Handle clicking outside to close search
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isSearching &&
				searchInputRef.current &&
				!searchInputRef.current.contains(event.target as Node)
			) {
				setIsSearching(false);
				setSearchQuery("");
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isSearching]);

	// Format the date for display
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return (
			date.toLocaleDateString() +
			" " +
			date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		);
	};

	// Handle connection to a host from history
	const handleConnectFromHistory = async (hostId: string) => {
		try {
			await connectToHost(hostId);
			// The app component will handle the session:started event
		} catch (error) {
			console.error("Failed to connect:", error);
		}
	};

	return (
		<div className="w-[204px] bg-[#1a1a24] border-r border-[#2d2d3a] flex flex-col h-full">
			<div className="flex flex-col gap-2 overflow-y-auto py-4 px-2">
				{sidebarItems.map((item) => (
					<button
						key={item.id}
						onClick={() => {
							if (item.id === "history") {
								setIsSearching(true);
							} else {
								navigate(item.path || "");
							}
						}}
						className={cn(
							"flex flex-row items-center px-2 py-3 text-sm transition-colors",
							"hover:bg-[#2d2d3a]",
							location.pathname === item.path ||
								(item.id === "hosts" &&
									(location.pathname.startsWith("/vaults") ||
										location.pathname === "/"))
								? "bg-[#2d2d3a] text-white border-l-2 border-[#7C3AED]"
								: "text-gray-400"
						)}
					>
						<item.icon className="w-4 h-4 mr-3" />
						<span className="flex-1 text-left text-sm">{item.label}</span>
						{item.count && (
							<span className="text-xs bg-[#2d2d3a] px-2 py-1 rounded-full">
								{item.count}
							</span>
						)}
						{item.id === "history" && isSearching && (
							<X
								className="w-4 h-4 cursor-pointer"
								onClick={(e) => {
									e.stopPropagation();
									setIsSearching(false);
									setSearchQuery("");
								}}
							/>
						)}
					</button>
				))}
			</div>

			{/* History search input */}
			{isSearching && (
				<div className="px-4 py-2 border-t border-[#2d2d3a]">
					<div className="relative">
						<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
						<Input
							ref={searchInputRef}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search history..."
							className="pl-8 bg-[#252532] border-[#3d3d4a] text-white h-8 text-sm"
						/>
					</div>
				</div>
			)}

			{/* Connection history */}
			<div className="flex-1 overflow-y-auto border-t border-[#2d2d3a]">
				<div className="py-2">
					{isLoading ? (
						<div className="px-4 py-2 text-sm text-gray-500">
							Loading history...
						</div>
					) : error ? (
						<div className="px-4 py-2 text-sm text-red-500">{error}</div>
					) : sessionHistory.length > 0 ? (
						sessionHistory.map((entry, index) => (
							<button
								key={entry.id}
								className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-[#2d2d3a] hover:text-white"
								onClick={() => handleConnectFromHistory(entry.hostId)}
							>
								<div className="truncate">{entry.hostLabel}</div>
								<div className="text-xs text-gray-500 truncate">
									{formatDate(entry.startTime)}
								</div>
							</button>
						))
					) : (
						<div className="px-4 py-2 text-sm text-gray-500">
							No connection history
						</div>
					)}
				</div>
			</div>

			<button
				onClick={() => navigate("/vaults/settings")}
				className="flex flex-row items-center px-4 py-3 text-sm text-gray-400 hover:bg-[#2d2d3a] border-t border-[#2d2d3a]"
			>
				<Settings className="w-5 h-5 mr-3" />
				<span>Settings</span>
			</button>
		</div>
	);
}
