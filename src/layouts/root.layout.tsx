import { Plus } from "lucide-react";
import { FileText, FolderOpenDot, Unplug, X } from "lucide-react";
import { useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConnection } from "@/contexts/connection.context";
import { HostSelector } from "@/components/hosts/host-selector";

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
	} = useConnection();

	const handleTabChange = useCallback(
		(sessionId: string | null) => {
			if (sessionId) {
				console.log(
					`App: Changing to session ${sessionId} and setting section to terminal`
				);
				setActiveTabFromContext(sessionId);
				navigate(`/terminal/${sessionId}`);
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

				<Tabs
					value={activeTab || undefined}
					onValueChange={handleTabChange}
					className="flex-1 flex justify-start border-l-2 pl-2 ml-2 border-[#2d2d3a]"
				>
					<TabsList className="h-12 bg-transparent">
						{activeSessions.map((session) => (
							<TabsTrigger
								key={session.id}
								value={session.id}
								className={`flex items-center gap-2 px-4 h-12 rounded-none border-b-2 ${
									activeTab === session.id
										? "border-[#f97316] text-white"
										: "border-transparent text-gray-400 hover:text-white"
								}`}
							>
								<FileText strokeWidth={1.25} size={16} />
								<span>Terminal {session.id.split("-")[1]}</span>
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
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>

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
