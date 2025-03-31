import React, { useState, useEffect } from "react";
import {
	Plus,
	Trash2,
	Play,
	Square,
	Server,
	ArrowRight,
	RefreshCw,
	Laptop,
	Globe,
	Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";

interface PortForwardingRule {
	id: string;
	hostId: string;
	type: "local" | "remote" | "dynamic";
	localPort: number;
	remoteHost?: string;
	remotePort?: number;
	description?: string;
	active: boolean;
}

interface Host {
	id: string;
	label: string;
	hostname: string;
	username?: string;
}

export function PortForwardingPage() {
	const [rules, setRules] = useState<PortForwardingRule[]>([]);
	const [hosts, setHosts] = useState<Host[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showNewRuleForm, setShowNewRuleForm] = useState(false);
	const [newRule, setNewRule] = useState<Partial<PortForwardingRule>>({
		type: "local",
		localPort: 8080,
		remotePort: 80,
	});
	const [selectedHost, setSelectedHost] = useState<string | null>(null);
	const [selectedRule, setSelectedRule] = useState<PortForwardingRule | null>(
		null
	);
	const [showDiagramModal, setShowDiagramModal] = useState(false);

	useEffect(() => {
		// Load hosts
		loadHosts();

		// Load port forwarding rules
		loadRules();
	}, []);

	const loadHosts = () => {
		setIsLoading(true);
		//todo: load hosts
		// ipcRenderer
		//   .invoke('hosts:getAll')
		//   .then((result: Host[]) => {
		//     setHosts(result);
		//   })
		//   .catch((error) => {
		//     console.error('Failed to load hosts:', error);
		//   })
		//   .finally(() => {
		//     setIsLoading(false);
		//   });
	};

	const loadRules = () => {
		setIsLoading(true);
		//todo: load port forwarding rules
		// ipcRenderer
		//   .invoke('port-forwarding:getAll')
		//   .then((result: PortForwardingRule[]) => {
		//     setRules(result || []);
		//   })
		//   .catch((error) => {
		//     console.error('Failed to load port forwarding rules:', error);
		//   })
		//   .finally(() => {
		//     setIsLoading(false);
		//   });
	};

	const handleAddRule = () => {
		if (!selectedHost) return;

		const ruleToAdd = {
			...newRule,
			hostId: selectedHost,
			active: false,
		};

		setIsLoading(true);
		//todo: add port forwarding rule
		// ipcRenderer
		//   .invoke('port-forwarding:add', ruleToAdd)
		//   .then((result: PortForwardingRule) => {
		//     setRules((prev) => [...prev, result]);
		//     setShowNewRuleForm(false);
		//     setNewRule({
		//       type: 'local',
		//       localPort: 8080,
		//       remotePort: 80,
		//     });
		//   })
		//   .catch((error) => {
		//     console.error('Failed to add port forwarding rule:', error);
		//   })
		//   .finally(() => {
		//     setIsLoading(false);
		//   });
	};

	const handleDeleteRule = (id: string) => {
		setIsLoading(true);
		//todo: delete port forwarding rule
		// ipcRenderer
		// .invoke('port-forwarding:delete', id)
		// .then(() => {
		//     setRules((prev) => prev.filter((rule) => rule.id !== id));
		// })
		// .catch((error) => {
		//     console.error('Failed to delete port forwarding rule:', error);
		// })
		// .finally(() => {
		//     setIsLoading(false);
		// });
	};

	const handleToggleRule = (id: string, active: boolean) => {
		setIsLoading(true);
		//todo: toggle port forwarding rule
		// ipcRenderer
		//   .invoke('port-forwarding:toggle', { id, active })
		//   .then(() => {
		//     setRules((prev) =>
		//       prev.map((rule) => (rule.id === id ? { ...rule, active } : rule))
		//     );
		//   })
		//   .catch((error) => {
		//     console.error('Failed to toggle port forwarding rule:', error);
		//   })
		//   .finally(() => {
		//     setIsLoading(false);
		//   });
	};

	const getHostLabel = (hostId: string) => {
		const host = hosts.find((h) => h.id === hostId);
		return host ? host.label : "Unknown Host";
	};

	const renderRuleDescription = (rule: PortForwardingRule) => {
		switch (rule.type) {
			case "local":
				return `localhost:${rule.localPort} → ${rule.remoteHost || "remote"}:${
					rule.remotePort
				}`;
			case "remote":
				return `${rule.remoteHost || "remote"}:${rule.remotePort} → localhost:${
					rule.localPort
				}`;
			case "dynamic":
				return `SOCKS proxy on localhost:${rule.localPort}`;
			default:
				return "";
		}
	};

	const handleViewDiagram = (rule: PortForwardingRule) => {
		setSelectedRule(rule);
		setShowDiagramModal(true);
	};

	const renderDiagram = (rule: PortForwardingRule) => {
		const host = hosts.find((h) => h.id === rule.hostId);

		if (!host) return null;

		if (rule.type === "local") {
			return (
				<div className="flex flex-col items-center">
					<div className="flex items-center gap-8 mb-8">
						<div className="flex flex-col items-center">
							<Laptop className="w-16 h-16 text-blue-500 mb-2" />
							<div className="text-white font-medium">Your Computer</div>
							<div className="text-gray-400 text-sm">
								localhost:{rule.localPort}
							</div>
						</div>

						<div className="flex flex-col items-center">
							<div className="w-32 h-1 bg-green-500"></div>
							<div className="text-green-500 text-xs mt-1">SSH Tunnel</div>
							<ArrowRight className="w-6 h-6 text-green-500 mt-1" />
						</div>

						<div className="flex flex-col items-center">
							<Server className="w-16 h-16 text-orange-500 mb-2" />
							<div className="text-white font-medium">{host.label}</div>
							<div className="text-gray-400 text-sm">{host.hostname}</div>
						</div>

						<div className="flex flex-col items-center">
							<div className="w-32 h-1 bg-blue-500"></div>
							<div className="text-blue-500 text-xs mt-1">TCP Connection</div>
							<ArrowRight className="w-6 h-6 text-blue-500 mt-1" />
						</div>

						<div className="flex flex-col items-center">
							<Globe className="w-16 h-16 text-purple-500 mb-2" />
							<div className="text-white font-medium">
								{rule.remoteHost || "Remote Server"}
							</div>
							<div className="text-gray-400 text-sm">
								port {rule.remotePort}
							</div>
						</div>
					</div>

					<div className="bg-[#252532] p-4 rounded-md w-full max-w-2xl">
						<h3 className="text-white font-medium mb-2">How it works</h3>
						<p className="text-gray-400 text-sm">
							This local port forwarding creates a secure tunnel from port{" "}
							{rule.localPort} on your local machine to{" "}
							{rule.remoteHost || "remote host"} on port {rule.remotePort} via
							the SSH server {host.hostname}. Any connection to localhost:
							{rule.localPort} will be forwarded to{" "}
							{rule.remoteHost || "remote host"}:{rule.remotePort}
							through the SSH server.
						</p>
					</div>
				</div>
			);
		} else if (rule.type === "remote") {
			return (
				<div className="flex flex-col items-center">
					<div className="flex items-center gap-8 mb-8">
						<div className="flex flex-col items-center">
							<Globe className="w-16 h-16 text-purple-500 mb-2" />
							<div className="text-white font-medium">Remote Client</div>
							<div className="text-gray-400 text-sm">Any remote client</div>
						</div>

						<div className="flex flex-col items-center">
							<div className="w-32 h-1 bg-blue-500"></div>
							<div className="text-blue-500 text-xs mt-1">TCP Connection</div>
							<ArrowRight className="w-6 h-6 text-blue-500 mt-1" />
						</div>

						<div className="flex flex-col items-center">
							<Server className="w-16 h-16 text-orange-500 mb-2" />
							<div className="text-white font-medium">{host.label}</div>
							<div className="text-gray-400 text-sm">
								{host.hostname}:{rule.remotePort}
							</div>
						</div>

						<div className="flex flex-col items-center">
							<div className="w-32 h-1 bg-green-500"></div>
							<div className="text-green-500 text-xs mt-1">SSH Tunnel</div>
							<ArrowRight className="w-6 h-6 text-green-500 mt-1" />
						</div>

						<div className="flex flex-col items-center">
							<Laptop className="w-16 h-16 text-blue-500 mb-2" />
							<div className="text-white font-medium">Your Computer</div>
							<div className="text-gray-400 text-sm">
								localhost:{rule.localPort}
							</div>
						</div>
					</div>

					<div className="bg-[#252532] p-4 rounded-md w-full max-w-2xl">
						<h3 className="text-white font-medium mb-2">How it works</h3>
						<p className="text-gray-400 text-sm">
							This remote port forwarding creates a secure tunnel from port{" "}
							{rule.remotePort} on the remote SSH server to port{" "}
							{rule.localPort} on your local machine. Any connection to{" "}
							{host.hostname}:{rule.remotePort} will be forwarded to your local
							machine on port {rule.localPort}.
						</p>
					</div>
				</div>
			);
		} else {
			// Dynamic (SOCKS) proxy
			return (
				<div className="flex flex-col items-center">
					<div className="flex items-center gap-8 mb-8">
						<div className="flex flex-col items-center">
							<Laptop className="w-16 h-16 text-blue-500 mb-2" />
							<div className="text-white font-medium">Your Computer</div>
							<div className="text-gray-400 text-sm">
								SOCKS Proxy on localhost:{rule.localPort}
							</div>
						</div>

						<div className="flex flex-col items-center">
							<div className="w-32 h-1 bg-green-500"></div>
							<div className="text-green-500 text-xs mt-1">SSH Tunnel</div>
							<ArrowRight className="w-6 h-6 text-green-500 mt-1" />
						</div>

						<div className="flex flex-col items-center">
							<Server className="w-16 h-16 text-orange-500 mb-2" />
							<div className="text-white font-medium">{host.label}</div>
							<div className="text-gray-400 text-sm">{host.hostname}</div>
						</div>

						<div className="flex flex-col items-center">
							<div className="w-32 h-1 bg-blue-500"></div>
							<div className="text-blue-500 text-xs mt-1">
								Dynamic Connections
							</div>
							<ArrowRight className="w-6 h-6 text-blue-500 mt-1" />
						</div>

						<div className="flex flex-col items-center">
							<Globe className="w-16 h-16 text-purple-500 mb-2" />
							<div className="text-white font-medium">Internet</div>
							<div className="text-gray-400 text-sm">Any destination</div>
						</div>
					</div>

					<div className="bg-[#252532] p-4 rounded-md w-full max-w-2xl">
						<h3 className="text-white font-medium mb-2">How it works</h3>
						<p className="text-gray-400 text-sm">
							This dynamic port forwarding creates a SOCKS proxy on port{" "}
							{rule.localPort} on your local machine. Applications configured to
							use this SOCKS proxy will route their traffic through the SSH
							server {host.hostname}, which can access any destination on the
							internet. This is useful for securely browsing the web or
							accessing resources that are only available from the SSH server's
							network.
						</p>
					</div>
				</div>
			);
		}
	};

	return (
		<div className="h-full flex flex-col bg-[#1a1a24]">
			<div className="flex items-center justify-between p-4 border-b border-[#2d2d3a]">
				<h2 className="text-white font-medium">Port Forwarding</h2>
				<div className="flex items-center gap-2">
					<Button
						onClick={() => setShowNewRuleForm(true)}
						className="bg-[#7C3AED] hover:bg-[#6D31D0] text-white text-sm px-3 py-1 h-8"
					>
						<Plus className="w-4 h-4 mr-1" />
						New Rule
					</Button>
					<Button
						onClick={loadRules}
						className="bg-transparent border border-[#2d2d3a] text-gray-400 hover:text-white hover:bg-[#2d2d3a] text-sm px-3 py-1 h-8"
					>
						<RefreshCw className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{showNewRuleForm && (
				<div className="p-4 border-b border-[#2d2d3a] bg-[#252532]">
					<h3 className="text-white font-medium mb-4">
						New Port Forwarding Rule
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label className="block text-gray-400 text-sm mb-1">Host</label>
							<select
								value={selectedHost || ""}
								onChange={(e) => setSelectedHost(e.target.value || null)}
								className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
							>
								<option value="">Select a host</option>
								{hosts.map((host) => (
									<option key={host.id} value={host.id}>
										{host.label} ({host.hostname})
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-gray-400 text-sm mb-1">Type</label>
							<select
								value={newRule.type}
								onChange={(e) =>
									setNewRule({
										...newRule,
										type: e.target.value as "local" | "remote" | "dynamic",
									})
								}
								className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
							>
								<option value="local">Local (Local → Remote)</option>
								<option value="remote">Remote (Remote → Local)</option>
								<option value="dynamic">Dynamic (SOCKS Proxy)</option>
							</select>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<div>
							<label className="block text-gray-400 text-sm mb-1">
								Local Port
							</label>
							<input
								type="number"
								value={newRule.localPort}
								onChange={(e) =>
									setNewRule({
										...newRule,
										localPort: parseInt(e.target.value),
									})
								}
								className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
							/>
						</div>

						{newRule.type !== "dynamic" && (
							<>
								<div>
									<label className="block text-gray-400 text-sm mb-1">
										Remote Host
									</label>
									<input
										type="text"
										value={newRule.remoteHost || ""}
										onChange={(e) =>
											setNewRule({ ...newRule, remoteHost: e.target.value })
										}
										placeholder={
											newRule.type === "local"
												? "e.g., database.internal"
												: "e.g., api.example.com"
										}
										className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
									/>
								</div>

								<div>
									<label className="block text-gray-400 text-sm mb-1">
										Remote Port
									</label>
									<input
										type="number"
										value={newRule.remotePort || ""}
										onChange={(e) =>
											setNewRule({
												...newRule,
												remotePort: parseInt(e.target.value),
											})
										}
										className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
									/>
								</div>
							</>
						)}
					</div>

					<div className="mb-4">
						<label className="block text-gray-400 text-sm mb-1">
							Description (Optional)
						</label>
						<input
							type="text"
							value={newRule.description || ""}
							onChange={(e) =>
								setNewRule({ ...newRule, description: e.target.value })
							}
							placeholder="e.g., Database connection"
							className="w-full bg-[#1a1a24] border border-[#2d2d3a] rounded text-white text-sm px-3 py-2"
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button
							onClick={() => setShowNewRuleForm(false)}
							className="bg-transparent border border-[#2d2d3a] text-gray-400 hover:text-white hover:bg-[#2d2d3a] text-sm px-3 py-1 h-8"
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddRule}
							disabled={!selectedHost}
							className="bg-[#7C3AED] hover:bg-[#6D31D0] text-white text-sm px-3 py-1 h-8"
						>
							Add Rule
						</Button>
					</div>
				</div>
			)}

			<div className="flex-1 overflow-auto p-4">
				{isLoading && rules.length === 0 ? (
					<div className="flex items-center justify-center h-full">
						<RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
					</div>
				) : rules.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<Server className="w-16 h-16 text-gray-400 mb-4" />
						<h3 className="text-white font-medium mb-2">
							No Port Forwarding Rules
						</h3>
						<p className="text-gray-400 mb-6">
							Create your first port forwarding rule to securely access remote
							services
						</p>
						<Button
							onClick={() => setShowNewRuleForm(true)}
							className="bg-[#7C3AED] hover:bg-[#6D31D0] text-white"
						>
							<Plus className="w-4 h-4 mr-2" />
							New Rule
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4">
						{rules.map((rule) => (
							<div
								key={rule.id}
								className="bg-[#252532] border border-[#2d2d3a] rounded-md overflow-hidden"
							>
								<div className="flex items-center justify-between p-4 border-b border-[#2d2d3a]">
									<div className="flex items-center gap-3">
										<div
											className={`w-3 h-3 rounded-full ${
												rule.active ? "bg-green-500" : "bg-gray-500"
											}`}
										/>
										<h3 className="text-white font-medium">
											{rule.description ||
												`${rule.type.toUpperCase()} Port Forwarding`}
										</h3>
										<span className="text-xs px-2 py-0.5 rounded-full bg-[#2d2d3a] text-gray-400">
											{rule.type}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											className="text-gray-400 hover:text-white"
											onClick={() => handleViewDiagram(rule)}
											title="View Diagram"
										>
											<Info className="w-4 h-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className={`${
												rule.active ? "text-red-500" : "text-green-500"
											} hover:text-white`}
											onClick={() => handleToggleRule(rule.id, !rule.active)}
											title={rule.active ? "Stop" : "Start"}
										>
											{rule.active ? (
												<Square className="w-4 h-4" />
											) : (
												<Play className="w-4 h-4" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="text-red-500 hover:text-white"
											onClick={() => handleDeleteRule(rule.id)}
											title="Delete"
										>
											<Trash2 className="w-4 h-4" />
										</Button>
									</div>
								</div>
								<div className="p-4">
									<div className="flex items-center gap-4 mb-4">
										<div className="flex-1">
											<div className="text-sm text-gray-400 mb-1">Host</div>
											<div className="text-white">
												{getHostLabel(rule.hostId)}
											</div>
										</div>
										<div className="flex-1">
											<div className="text-sm text-gray-400 mb-1">
												Local Port
											</div>
											<div className="text-white">{rule.localPort}</div>
										</div>
										{rule.type !== "dynamic" && (
											<>
												<div className="flex-1">
													<div className="text-sm text-gray-400 mb-1">
														{rule.type === "local"
															? "Remote Host"
															: "Remote Port"}
													</div>
													<div className="text-white">
														{rule.type === "local"
															? rule.remoteHost || "localhost"
															: rule.remotePort}
													</div>
												</div>
												<div className="flex-1">
													<div className="text-sm text-gray-400 mb-1">
														{rule.type === "local"
															? "Remote Port"
															: "Forwards To"}
													</div>
													<div className="text-white">
														{rule.type === "local"
															? rule.remotePort
															: `localhost:${rule.localPort}`}
													</div>
												</div>
											</>
										)}
									</div>
									<div className="text-sm text-gray-400">
										{renderRuleDescription(rule)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Diagram Modal */}
			<Dialog open={showDiagramModal} onOpenChange={setShowDiagramModal}>
				<DialogContent className="bg-[#1a1a24] border-[#2d2d3a] text-white max-w-4xl">
					<DialogHeader>
						<DialogTitle>
							{selectedRule?.description ||
								`${selectedRule?.type?.toUpperCase()} Port Forwarding`}{" "}
							- Visual Diagram
						</DialogTitle>
					</DialogHeader>
					<div className="py-6">
						{selectedRule && renderDiagram(selectedRule)}
					</div>
					<DialogFooter>
						<Button
							onClick={() => setShowDiagramModal(false)}
							className="bg-[#f97316] hover:bg-[#ea580c] text-white"
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
