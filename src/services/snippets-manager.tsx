import React, { useState, useEffect } from "react";
import { ipcRenderer } from "electron";
import { Plus, Trash2, Edit, Copy, Play } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "../ui/use-toast";
import type { Session } from "../../../models/session";

interface Snippet {
	id: string;
	name: string;
	command: string;
	description?: string;
	tags?: string[];
}

interface SnippetsManagerProps {
	activeSessions: Session[];
	onRunSnippet?: (snippetId: string, sessionId: string) => void;
}

export const SnippetsManager: React.FC<SnippetsManagerProps> = ({
	activeSessions,
	onRunSnippet,
}) => {
	const [snippets, setSnippets] = useState<Snippet[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [editedSnippet, setEditedSnippet] = useState<Partial<Snippet>>({});
	const [selectedSession, setSelectedSession] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		loadSnippets();

		if (activeSessions.length > 0) {
			setSelectedSession(activeSessions[0].id);
		}
	}, [activeSessions]);

	const loadSnippets = async () => {
		setIsLoading(true);
		try {
			const result = (await ipcRenderer.invoke("snippets:getAll")) as Snippet[];
			setSnippets(result);
		} catch (error) {
			console.error("Failed to load snippets:", error);
			toast({
				title: "Error",
				description: "Failed to load snippets",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateSnippet = async () => {
		if (!editedSnippet.name || !editedSnippet.command) {
			toast({
				title: "Validation Error",
				description: "Name and command are required",
				variant: "destructive",
			});
			return;
		}

		try {
			const newSnippet = (await ipcRenderer.invoke(
				"snippets:add",
				editedSnippet
			)) as Snippet;
			setSnippets([...snippets, newSnippet]);
			setIsCreating(false);
			setEditedSnippet({});
			toast({
				title: "Success",
				description: "Snippet created successfully",
			});
		} catch (error) {
			console.error("Failed to create snippet:", error);
			toast({
				title: "Error",
				description: "Failed to create snippet",
				variant: "destructive",
			});
		}
	};

	const handleUpdateSnippet = async () => {
		if (!selectedSnippet || !editedSnippet.name || !editedSnippet.command) {
			toast({
				title: "Validation Error",
				description: "Name and command are required",
				variant: "destructive",
			});
			return;
		}

		try {
			const updatedSnippet = (await ipcRenderer.invoke("snippets:update", {
				id: selectedSnippet.id,
				...editedSnippet,
			})) as Snippet;

			setSnippets(
				snippets.map((s) => (s.id === updatedSnippet.id ? updatedSnippet : s))
			);
			setSelectedSnippet(updatedSnippet);
			setIsEditing(false);
			toast({
				title: "Success",
				description: "Snippet updated successfully",
			});
		} catch (error) {
			console.error("Failed to update snippet:", error);
			toast({
				title: "Error",
				description: "Failed to update snippet",
				variant: "destructive",
			});
		}
	};

	const handleDeleteSnippet = async (snippetId: string) => {
		try {
			await ipcRenderer.invoke("snippets:delete", snippetId);
			setSnippets(snippets.filter((s) => s.id !== snippetId));

			if (selectedSnippet?.id === snippetId) {
				setSelectedSnippet(null);
			}

			toast({
				title: "Success",
				description: "Snippet deleted successfully",
			});
		} catch (error) {
			console.error("Failed to delete snippet:", error);
			toast({
				title: "Error",
				description: "Failed to delete snippet",
				variant: "destructive",
			});
		}
	};

	const handleRunSnippet = (snippetId: string) => {
		if (!selectedSession) {
			toast({
				title: "Error",
				description: "No active session selected",
				variant: "destructive",
			});
			return;
		}

		if (onRunSnippet) {
			onRunSnippet(snippetId, selectedSession);
			toast({
				title: "Success",
				description: "Snippet executed successfully",
			});
		}
	};

	const handleCopyToClipboard = (command: string) => {
		navigator.clipboard.writeText(command);
		toast({
			title: "Copied",
			description: "Command copied to clipboard",
		});
	};

	const filteredSnippets = snippets.filter(
		(snippet) =>
			searchQuery === "" ||
			snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			snippet.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
			snippet.description?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="flex h-full bg-gray-900 text-white">
			{/* Snippet list */}
			<div className="w-72 border-r border-gray-800 flex flex-col">
				<div className="p-4 border-b border-gray-800">
					<div className="flex items-center mb-4">
						<Input
							placeholder="Search snippets..."
							value={searchQuery}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setSearchQuery(e.target.value)
							}
							className="bg-gray-800 border-gray-700"
						/>
					</div>
					<Button
						className="w-full"
						onClick={() => {
							setIsCreating(true);
							setIsEditing(false);
							setEditedSnippet({});
							setSelectedSnippet(null);
						}}
					>
						<Plus size={16} className="mr-2" /> New Snippet
					</Button>
				</div>

				<div className="flex-1 overflow-auto">
					{isLoading ? (
						<div className="flex items-center justify-center h-full">
							<p className="text-gray-400">Loading snippets...</p>
						</div>
					) : filteredSnippets.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<p className="text-gray-400">No snippets found</p>
						</div>
					) : (
						<div className="p-2">
							{filteredSnippets.map((snippet) => (
								<div
									key={snippet.id}
									className={`p-3 mb-2 rounded-md cursor-pointer hover:bg-gray-800 ${
										selectedSnippet?.id === snippet.id ? "bg-gray-800" : ""
									}`}
									onClick={() => {
										setSelectedSnippet(snippet);
										setIsEditing(false);
										setIsCreating(false);
									}}
								>
									<div className="flex justify-between items-start">
										<h3 className="font-medium truncate">{snippet.name}</h3>
										<Button
											variant="ghost"
											size="icon"
											onClick={(e: React.MouseEvent) => {
												e.stopPropagation();
												handleDeleteSnippet(snippet.id);
											}}
										>
											<Trash2
												size={14}
												className="text-gray-400 hover:text-red-400"
											/>
										</Button>
									</div>
									<p className="text-sm text-gray-400 truncate mt-1">
										{snippet.command}
									</p>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Snippet details */}
			<div className="flex-1 p-6">
				{isCreating ? (
					<div>
						<h2 className="text-xl font-medium mb-4">Create New Snippet</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Name</label>
								<Input
									value={editedSnippet.name || ""}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEditedSnippet({ ...editedSnippet, name: e.target.value })
									}
									placeholder="Snippet name"
									className="bg-gray-800 border-gray-700"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Command
								</label>
								<textarea
									value={editedSnippet.command || ""}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setEditedSnippet({
											...editedSnippet,
											command: e.target.value,
										})
									}
									placeholder="Enter command"
									className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 h-32"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Description
								</label>
								<textarea
									value={editedSnippet.description || ""}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setEditedSnippet({
											...editedSnippet,
											description: e.target.value,
										})
									}
									placeholder="Enter description"
									className="w-full bg-gray-800 border border-gray-700 rounded-md p-2"
								/>
							</div>

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									variant="outline"
									onClick={() => {
										setIsCreating(false);
										setEditedSnippet({});
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleCreateSnippet}>Create Snippet</Button>
							</div>
						</div>
					</div>
				) : isEditing && selectedSnippet ? (
					<div>
						<h2 className="text-xl font-medium mb-4">Edit Snippet</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Name</label>
								<Input
									value={editedSnippet.name || selectedSnippet.name}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEditedSnippet({ ...editedSnippet, name: e.target.value })
									}
									placeholder="Snippet name"
									className="bg-gray-800 border-gray-700"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Command
								</label>
								<textarea
									value={editedSnippet.command || selectedSnippet.command}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setEditedSnippet({
											...editedSnippet,
											command: e.target.value,
										})
									}
									placeholder="Enter command"
									className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 h-32"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Description
								</label>
								<textarea
									value={
										editedSnippet.description ||
										selectedSnippet.description ||
										""
									}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setEditedSnippet({
											...editedSnippet,
											description: e.target.value,
										})
									}
									placeholder="Enter description"
									className="w-full bg-gray-800 border border-gray-700 rounded-md p-2"
								/>
							</div>

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									variant="outline"
									onClick={() => {
										setIsEditing(false);
										setEditedSnippet({});
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleUpdateSnippet}>Save Changes</Button>
							</div>
						</div>
					</div>
				) : selectedSnippet ? (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-xl font-medium">{selectedSnippet.name}</h2>
							<div className="flex space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setIsEditing(true);
										setEditedSnippet({
											name: selectedSnippet.name,
											command: selectedSnippet.command,
											description: selectedSnippet.description,
											tags: selectedSnippet.tags,
										});
									}}
								>
									<Edit size={16} className="mr-2" /> Edit
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleCopyToClipboard(selectedSnippet.command)}
								>
									<Copy size={16} className="mr-2" /> Copy
								</Button>
							</div>
						</div>

						{selectedSnippet.description && (
							<div className="mb-6">
								<h3 className="text-sm font-medium text-gray-400 mb-2">
									Description
								</h3>
								<p className="text-gray-300">{selectedSnippet.description}</p>
							</div>
						)}

						<div className="mb-6">
							<h3 className="text-sm font-medium text-gray-400 mb-2">
								Command
							</h3>
							<div className="bg-gray-800 p-4 rounded-md font-mono text-sm overflow-x-auto">
								{selectedSnippet.command}
							</div>
						</div>

						{activeSessions.length > 0 && (
							<div>
								<h3 className="text-sm font-medium text-gray-400 mb-2">
									Run in Session
								</h3>
								<div className="flex items-center space-x-2">
									<select
										value={selectedSession || ""}
										onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
											setSelectedSession(e.target.value)
										}
										className="bg-gray-800 border border-gray-700 rounded-md p-2 text-sm"
									>
										{activeSessions.map((session) => (
											<option key={session.id} value={session.id}>
												{`Session ${session.id.substring(0, 8)}`}
											</option>
										))}
									</select>
									<Button
										onClick={() => handleRunSnippet(selectedSnippet.id)}
										disabled={!selectedSession}
									>
										<Play size={16} className="mr-2" /> Run
									</Button>
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="h-full flex flex-col items-center justify-center">
						<h2 className="text-xl font-medium mb-4">Snippets</h2>
						<p className="text-gray-400 mb-6">
							Select a snippet to view details or create a new one
						</p>
						<Button
							onClick={() => {
								setIsCreating(true);
								setEditedSnippet({});
							}}
						>
							<Plus size={16} className="mr-2" /> Create New Snippet
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
