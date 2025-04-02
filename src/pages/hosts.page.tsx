import React, { useState, useEffect, useCallback } from "react";
import { HostList } from "../components/hosts/host-list";
import type { Host } from "../models/host";
import { HostDetailsSidebar } from "../components/hosts/host-details-sidebar";
import { useConnection } from "../contexts/connection.context";
import { Header } from "@/components/hosts/header";
import { useHost } from "@/hooks/use-host";
import { debug } from "@tauri-apps/plugin-log";

export interface HostsPageRef {
	openAddHostDialog: () => void;
	openEditHostDialog: (hostId: string) => void;
}

export const HostsPage = () => {
	const [hosts, setHosts] = useState<Host[]>([]);
	const [selectedHostId, setSelectedHostId] = useState<string | undefined>();
	const [isEditing, setIsEditing] = useState(false);
	const [editingHost, setEditingHost] = useState<Host | undefined>();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isConnecting, setIsConnecting] = useState(false);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [sortMode, setSortMode] = useState<"a-z" | "z-a" | "newest" | "oldest">(
		"a-z"
	);

	// Get the connect function from the ConnectionContext
	const { connect, setIsHostSelectorOpen, activeSessions } = useConnection();
	const { getAllHosts, saveHost } = useHost();

	useEffect(() => {
		// Load hosts from the main process
		loadHosts();
	}, [activeSessions]);

	// When a host is selected, open the sidebar to show details
	useEffect(() => {
		if (selectedHostId) {
			setIsSidebarOpen(true);
		}
	}, [selectedHostId]);

	const loadHosts = async () => {
		setIsLoading(true);
		//todo: get hosts from secure storage
		try {
			const hosts = await getAllHosts();
			debug(`HostsPage: Loaded ${hosts.length} hosts`);
			setHosts(hosts);
		} catch (error) {
			debug(`HostsPage: Error loading hosts: ${error}`);
			alert(`Failed to load hosts: ${error}`);
		}

		// ipcRenderer
		//   .invoke('hosts:getAll')
		//   .then((result: Host[]) => {
		//     console.log(`HostsPage: Loaded ${result.length} hosts`);
		//     setHosts(result);
		//   })
		//   .catch((err) => {
		//     console.error('Failed to load hosts:', err);
		// toast({
		//   title: 'Error',
		//   description: 'Failed to load hosts',
		//   variant: 'destructive',
		// });
		//   })
		//   .finally(() => {
		//     setIsLoading(false);
		//   });
	};

	// Filter hosts based on selected tags
	const filteredHosts = hosts.filter((host) => {
		// Filter by selected tags
		if (selectedTags.length === 0) return true;

		return (
			host.tags &&
			host.tags.length > 0 &&
			selectedTags.every((tag) => host.tags!.includes(tag))
		);
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

	const handleAddHost = () => {
		setSelectedHostId(undefined);
		setEditingHost(undefined);
		setIsEditing(true);
		setIsSidebarOpen(true);
	};

	const openEditHostDialog = (host: Host) => {
		setSelectedHostId(host.id);
		setEditingHost(host);
		setIsSidebarOpen(true);
		setIsEditing(true);
	};

	const handleEditHost = (host: Host) => {
		setSelectedHostId(host.id);
		setEditingHost(host);
		setIsSidebarOpen(true);
		setIsEditing(true);
	};

	const handleDeleteHost = (host: Host) => {
		if (confirm(`Are you sure you want to delete ${host.label}?`)) {
			//todo: delete host from secure storage
			//   ipcRenderer
			//     .invoke('hosts:delete', host.id)
			//     .then(() => {
			//       setHosts(hosts.filter((h) => h.id !== host.id));
			//       if (selectedHostId === host.id) {
			//         setSelectedHostId(undefined);
			//         setIsSidebarOpen(false);
			//       }
			//       toast({
			//         title: 'Host Deleted',
			//         description: `${host.label} has been deleted`,
			//       });
			//     })
			//     .catch((err) => {
			//       console.error('Failed to delete host:', err);
			//       toast({
			//         title: 'Error',
			//         description: 'Failed to delete host',
			//         variant: 'destructive',
			//       });
			//     });
		}
	};

	const handleSaveHost = async (hostData: Partial<Host>) => {
		debug(`===> HostsPage: Saving host data: ${hostData}`);

		// If we're editing an existing host
		if (editingHost?.id) {
			const updatedHost = {
				...editingHost,
				...hostData,
				id: editingHost.id, // Ensure ID is preserved
				created_at: editingHost.created_at,
				updated_at: new Date().toISOString(),
				last_connected: hostData.last_connected,
				jump_host: hostData.jump_host,
				use_jump_host: hostData.use_jump_host,
				auth_type: hostData.auth_type,
				connection_count: hostData.connection_count,
			};

			// todo: test and update
			try {
				const savedHost = await saveHost(updatedHost);
				if (savedHost) {
					setHosts(hosts.map((h) => (h.id === savedHost.id ? savedHost : h)));
					setIsEditing(false);
					setEditingHost(undefined);
				} else {
					debug(`===> HostsPage: Error updating host: `);
				}
			} catch (error: any) {
				debug(`===> HostsPage: Error updating host: ${error}`);
				alert(`Failed to update host: ${error.message}`);
			}
		} else {
			// We're creating a new host
			const newHost: Partial<Host> = {
				...hostData,
				id: crypto.randomUUID() as string, // Generate a new ID
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				snippets: [],
				connection_count: 0,
				is_pro_feature: false,
			};

			debug(`===> HostsPage: Creating new host: ${newHost}`);

			//todo: add host to secure storage
			try {
				const savedHost = await saveHost(newHost);
				if (savedHost) {
					debug(`===> HostsPage: Host created successfully: ${savedHost}`);
					setHosts([...hosts, savedHost]);
					setIsEditing(false);
					setEditingHost(undefined);
				} else {
					debug(`===> HostsPage: Error updating host: ${savedHost}`);
				}
			} catch (error: any) {
				debug(`===> HostsPage: Error creating host: ${error}`);
				alert(`Failed to create host: ${error.message}`);
			}
		}
	};

	const handleConnectToHost = (host: Host) => {
		setIsConnecting(true);

		// Use the connect function from the ConnectionContext
		connect(host.id)
			.then(() => {
				// Close the sidebar after initiating connection
				setIsSidebarOpen(false);
				// The ConnectionContext will handle the rest of the connection flow
			})
			.catch((error) => {
				console.error(`HostsPage: Connection failed: ${error}`);
				// The ConnectionContext will handle error toasts
			})
			.finally(() => {
				setIsConnecting(false);
			});
	};

	const handleCloseSidebar = () => {
		setIsSidebarOpen(false);
		if (isEditing) {
			setIsEditing(false);
		}
		setSelectedHostId(undefined);
	};

	const handleSearch = (query: string) => {
		const filteredHosts = hosts.filter((host) => {
			// Filter by search query
			const matchesSearch =
				query === "" ||
				host.label.toLowerCase().includes(query.toLowerCase()) ||
				host.hostname.toLowerCase().includes(query.toLowerCase()) ||
				(host.username &&
					host.username.toLowerCase().includes(query.toLowerCase()));

			// Filter by selected tags
			const matchesTags =
				selectedTags.length === 0 ||
				(host.tags &&
					host.tags.length > 0 &&
					selectedTags.every((tag) => host.tags!.includes(tag)));

			return matchesSearch && matchesTags;
		});

		setHosts(filteredHosts);
	};

	const handleOpenHostSelector = useCallback(() => {
		setIsHostSelectorOpen(true);
	}, []);

	return (
		<div className="flex h-full flex-col relative">
			<Header
				onNewHost={handleAddHost}
				onSearch={handleSearch}
				onOpenHostSelector={handleOpenHostSelector}
				hosts={hosts}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
				onTagsChange={setSelectedTags}
				onSortChange={setSortMode}
			/>
			<div
				className={`flex-1 h-full transition-all ${
					isSidebarOpen ? "mr-[400px]" : ""
				}`}
			>
				<HostList
					hosts={sortedHosts}
					selectedHostId={selectedHostId}
					onHostSelect={(host) => setSelectedHostId(host.id)}
					onHostConnect={handleConnectToHost}
					onAddHost={handleAddHost}
					onEditHost={handleEditHost}
					onDeleteHost={handleDeleteHost}
					viewMode={viewMode}
					isSidebarOpen={isSidebarOpen}
				/>
			</div>

			{/* Host Details Sidebar */}
			{isSidebarOpen && (
				<HostDetailsSidebar
					host={editingHost}
					isEditing={isEditing}
					onClose={handleCloseSidebar}
					onSave={handleSaveHost}
					onConnect={handleConnectToHost}
					onDelete={handleDeleteHost}
				/>
			)}
		</div>
	);
};
