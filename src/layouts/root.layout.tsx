import { Plus, Terminal } from "lucide-react";
import { FileText, FolderOpenDot, Unplug, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConnection } from "@/contexts/connection.context";
import { HostSelector } from "@/components/hosts/host-selector";
import { useHost } from "@/hooks/use-host";
import { Host } from "@/models/host";
import { debug, info } from "@tauri-apps/plugin-log";

export const RootLayout = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const {
		activeSessions,
		activeTab,
		disconnect,
		setActiveTab: setActiveTabFromContext,
		setIsHostSelectorOpen,
		isHostSelectorOpen,
		connectingHost,
		setConnectingHost,
	} = useConnection();

	const { getHost } = useHost();
	const [hosts, setHosts] = useState<Host[]>([]);

	useEffect(() => {
		console.log(`Current Path is ====> ${location.pathname}`);
	}, [location]);

	useEffect(() => {
		const fetchHosts = async () => {
			activeSessions.forEach(async (session) => {
				const host = await getHost(session.host_id);

				if (host) {
					setHosts((prev) => [...prev, host]);
				}
			});
		};
		fetchHosts();
	}, [getHost, activeSessions]);

	const handleTabChange = useCallback(
		(hostId: string | null, sessionId: string | null) => {
			if (hostId) {
				console.log(
					`App: Changing to session ${hostId} and setting section to terminal`
				);
				setActiveTabFromContext(sessionId);
				navigate(`/terminal/${hostId}`);
			}
		},
		[setActiveTabFromContext, navigate]
	);

	const handleCloseSession = useCallback(
		(sessionId: string) => {
			disconnect(sessionId);

			// Handle section change if needed
			if (activeSessions.length <= 1) {
				navigate("/vaults/hosts");
			}
		},
		[disconnect, activeSessions]
	);

	const handleOpenHostSelector = useCallback(() => {
		setIsHostSelectorOpen(true);
	}, []);

	const getHostById = (hostId: string) => {
		return hosts.find((host) => host.id === hostId);
	};

	return (
		<div className="root-layout">
			{/* Top bar with terminal tabs and plus button - ALWAYS visible */}
			<div className="bg-[#1a1a24] border-b border-[#2d2d3a] pr-2 flex items-center justify-between h-12">
				{/* Vaults and SFTP buttons - moved to the left */}
				<div className="flex items-center gap-4">
					<Button
						onClick={() => navigate("/vaults")}
						variant="ghost"
						className={`flex items-center gap-2 px-5 h-12 rounded-none border-b-2 ${
							location.pathname === "/" ||
							location.pathname.startsWith("/vaults")
								? "border-[#f97316] text-white"
								: "border-transparent text-gray-400"
						}`}
					>
						<Unplug strokeWidth={1.25} size={16} />
						<span>Vaults</span>
					</Button>

					<Button
						onClick={() => navigate("/sftp")}
						variant="ghost"
						className={`flex items-center gap-2 px-5 h-12 rounded-none border-b-2 ${
							location.pathname.startsWith("/sftp")
								? "border-[#f97316] text-white"
								: "border-transparent text-gray-400"
						}`}
					>
						<FolderOpenDot strokeWidth={1.25} size={16} />
						<span>SFTP</span>
					</Button>
				</div>

				<div className="flex-1 flex justify-start border-l-2 pl-2 ml-2 border-[#2d2d3a]">
					<div className="flex h-12 bg-[#1a1a24]">
						{activeSessions &&
							activeSessions?.map((session) => {
								const host = getHostById(session.host_id);
								return (
									<button
										key={session.id}
										onClick={() => handleTabChange(session.host_id, session.id)}
										className={`flex items-center gap-2 px-1 h-12 bg-[#1a1a24] rounded-none border-b-2 ${
											activeTab === session.id &&
											location.pathname.startsWith("/terminal")
												? "border-[#f97316] text-white"
												: "border-[#1a1a24] text-gray-400 hover:text-white"
										}`}
									>
										<Terminal strokeWidth={1.25} size={16} />
										<span>
											{host?.label} - {session.id.split("-")[1]}
										</span>
										<span
											role="button"
											className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-[#2d2d3a] cursor-pointer"
											onClick={(e) => {
												e.stopPropagation();
												handleCloseSession(session.id);
											}}
										>
											<X size={12} />
										</span>
									</button>
								);
							})}

						{connectingHost && (
							<button
								onClick={() => handleTabChange(connectingHost.id, null)}
								className={`flex items-center gap-2 px-1 h-12 bg-[#1a1a24] rounded-none border-b-2 ${
									activeTab === connectingHost.id &&
									location.pathname.startsWith("/terminal")
										? "border-[#f97316] text-white"
										: "border-[#1a1a24] text-gray-400 hover:text-white"
								}`}
							>
								<Terminal strokeWidth={1.25} size={16} />
								<span>{connectingHost.label}</span>
								<span
									role="button"
									className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-[#2d2d3a] cursor-pointer"
									onClick={(e) => {
										e.stopPropagation();
										// handleCloseSession(session.id);
										setConnectingHost(null);
										setActiveTabFromContext(null);
										navigate("/");
									}}
								>
									<X size={12} />
								</span>
							</button>
						)}
					</div>
				</div>

				<div className="flex items-center">
					<Button
						variant="ghost"
						size="icon"
						className="h-10 w-10 rounded-lg"
						onClick={handleOpenHostSelector}
					>
						<Plus size={18} />
					</Button>
				</div>
			</div>
			<Outlet />

			{isHostSelectorOpen && <HostSelector />}
		</div>
	);
};
