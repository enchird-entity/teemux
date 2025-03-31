import React, { useState, useEffect } from "react";
import { ipcRenderer } from "electron";
import { Plus, Trash2, Edit, Copy, Key, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "../ui/use-toast";

interface SshKey {
	id: string;
	name: string;
	publicKey: string;
	privateKey: string;
	passphrase?: string;
	type: "rsa" | "dsa" | "ecdsa" | "ed25519";
	createdAt: Date;
}

export const KeychainManager: React.FC = () => {
	const [keys, setKeys] = useState<SshKey[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedKey, setSelectedKey] = useState<SshKey | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [editedKey, setEditedKey] = useState<Partial<SshKey>>({});
	const [isLoading, setIsLoading] = useState(true);
	const [showPrivateKey, setShowPrivateKey] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		loadKeys();
	}, []);

	const loadKeys = async () => {
		setIsLoading(true);
		try {
			const result = (await ipcRenderer.invoke("keys:getAll")) as SshKey[];
			setKeys(result);
		} catch (error) {
			console.error("Failed to load SSH keys:", error);
			toast({
				title: "Error",
				description: "Failed to load SSH keys",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateKey = async () => {
		if (!editedKey.name || !editedKey.type) {
			toast({
				title: "Validation Error",
				description: "Name and key type are required",
				variant: "destructive",
			});
			return;
		}

		try {
			// For a real implementation, we would generate the key pair here
			// or allow the user to upload existing keys
			const newKey = (await ipcRenderer.invoke(
				"keys:add",
				editedKey
			)) as SshKey;
			setKeys([...keys, newKey]);
			setIsCreating(false);
			setEditedKey({});
			toast({
				title: "Success",
				description: "SSH key created successfully",
			});
		} catch (error) {
			console.error("Failed to create SSH key:", error);
			toast({
				title: "Error",
				description: "Failed to create SSH key",
				variant: "destructive",
			});
		}
	};

	const handleUpdateKey = async () => {
		if (!selectedKey || !editedKey.name) {
			toast({
				title: "Validation Error",
				description: "Name is required",
				variant: "destructive",
			});
			return;
		}

		try {
			const updatedKey = (await ipcRenderer.invoke("keys:update", {
				id: selectedKey.id,
				...editedKey,
			})) as SshKey;

			setKeys(keys.map((k) => (k.id === updatedKey.id ? updatedKey : k)));
			setSelectedKey(updatedKey);
			setIsEditing(false);
			toast({
				title: "Success",
				description: "SSH key updated successfully",
			});
		} catch (error) {
			console.error("Failed to update SSH key:", error);
			toast({
				title: "Error",
				description: "Failed to update SSH key",
				variant: "destructive",
			});
		}
	};

	const handleDeleteKey = async (keyId: string) => {
		try {
			await ipcRenderer.invoke("keys:delete", keyId);
			setKeys(keys.filter((k) => k.id !== keyId));

			if (selectedKey?.id === keyId) {
				setSelectedKey(null);
			}

			toast({
				title: "Success",
				description: "SSH key deleted successfully",
			});
		} catch (error) {
			console.error("Failed to delete SSH key:", error);
			toast({
				title: "Error",
				description: "Failed to delete SSH key",
				variant: "destructive",
			});
		}
	};

	const handleCopyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast({
			title: "Copied",
			description: "Key copied to clipboard",
		});
	};

	const filteredKeys = keys.filter(
		(key) =>
			searchQuery === "" ||
			key.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className="flex h-full bg-gray-900 text-white">
			{/* Key list */}
			<div className="w-72 border-r border-gray-800 flex flex-col">
				<div className="p-4 border-b border-gray-800">
					<div className="flex items-center mb-4">
						<Input
							placeholder="Search keys..."
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
							setEditedKey({});
							setSelectedKey(null);
						}}
					>
						<Plus size={16} className="mr-2" /> New SSH Key
					</Button>
				</div>

				<div className="flex-1 overflow-auto">
					{isLoading ? (
						<div className="flex items-center justify-center h-full">
							<p className="text-gray-400">Loading SSH keys...</p>
						</div>
					) : filteredKeys.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<p className="text-gray-400">No SSH keys found</p>
						</div>
					) : (
						<div className="p-2">
							{filteredKeys.map((key) => (
								<div
									key={key.id}
									className={`p-3 mb-2 rounded-md cursor-pointer hover:bg-gray-800 ${
										selectedKey?.id === key.id ? "bg-gray-800" : ""
									}`}
									onClick={() => {
										setSelectedKey(key);
										setIsEditing(false);
										setIsCreating(false);
										setShowPrivateKey(false);
									}}
								>
									<div className="flex justify-between items-start">
										<h3 className="font-medium truncate">{key.name}</h3>
										<Button
											variant="ghost"
											size="icon"
											onClick={(e: React.MouseEvent) => {
												e.stopPropagation();
												handleDeleteKey(key.id);
											}}
										>
											<Trash2
												size={14}
												className="text-gray-400 hover:text-red-400"
											/>
										</Button>
									</div>
									<p className="text-sm text-gray-400 truncate mt-1">
										{key.type} key
									</p>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Key details */}
			<div className="flex-1 p-6">
				{isCreating ? (
					<div>
						<h2 className="text-xl font-medium mb-4">Create New SSH Key</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Name</label>
								<Input
									value={editedKey.name || ""}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEditedKey({ ...editedKey, name: e.target.value })
									}
									placeholder="Key name"
									className="bg-gray-800 border-gray-700"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Key Type
								</label>
								<select
									value={editedKey.type || ""}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEditedKey({ ...editedKey, type: e.target.value as any })
									}
									className="w-full bg-gray-800 border border-gray-700 rounded-md p-2"
								>
									<option value="">Select key type</option>
									<option value="rsa">RSA</option>
									<option value="dsa">DSA</option>
									<option value="ecdsa">ECDSA</option>
									<option value="ed25519">ED25519</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Passphrase (Optional)
								</label>
								<Input
									type="password"
									value={editedKey.passphrase || ""}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEditedKey({ ...editedKey, passphrase: e.target.value })
									}
									placeholder="Passphrase"
									className="bg-gray-800 border-gray-700"
								/>
							</div>

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									variant="outline"
									onClick={() => {
										setIsCreating(false);
										setEditedKey({});
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleCreateKey}>Generate Key</Button>
							</div>
						</div>
					</div>
				) : isEditing && selectedKey ? (
					<div>
						<h2 className="text-xl font-medium mb-4">Edit SSH Key</h2>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1">Name</label>
								<Input
									value={editedKey.name || selectedKey.name}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEditedKey({ ...editedKey, name: e.target.value })
									}
									placeholder="Key name"
									className="bg-gray-800 border-gray-700"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1">
									Passphrase (Optional)
								</label>
								<Input
									type="password"
									value={editedKey.passphrase || ""}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEditedKey({ ...editedKey, passphrase: e.target.value })
									}
									placeholder="Leave blank to keep current passphrase"
									className="bg-gray-800 border-gray-700"
								/>
							</div>

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									variant="outline"
									onClick={() => {
										setIsEditing(false);
										setEditedKey({});
									}}
								>
									Cancel
								</Button>
								<Button onClick={handleUpdateKey}>Save Changes</Button>
							</div>
						</div>
					</div>
				) : selectedKey ? (
					<div>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-xl font-medium">{selectedKey.name}</h2>
							<div className="flex space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setIsEditing(true);
										setEditedKey({
											name: selectedKey.name,
										});
									}}
								>
									<Edit size={16} className="mr-2" /> Edit
								</Button>
							</div>
						</div>

						<div className="mb-6">
							<div className="flex justify-between items-center mb-2">
								<h3 className="text-sm font-medium text-gray-400">
									Public Key
								</h3>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleCopyToClipboard(selectedKey.publicKey)}
								>
									<Copy size={14} className="mr-2" /> Copy
								</Button>
							</div>
							<div className="bg-gray-800 p-4 rounded-md font-mono text-xs overflow-x-auto">
								{selectedKey.publicKey}
							</div>
						</div>

						<div className="mb-6">
							<div className="flex justify-between items-center mb-2">
								<h3 className="text-sm font-medium text-gray-400">
									Private Key
								</h3>
								<div className="flex space-x-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowPrivateKey(!showPrivateKey)}
									>
										{showPrivateKey ? "Hide" : "Show"}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											handleCopyToClipboard(selectedKey.privateKey)
										}
									>
										<Copy size={14} className="mr-2" /> Copy
									</Button>
								</div>
							</div>
							{showPrivateKey ? (
								<div className="bg-gray-800 p-4 rounded-md font-mono text-xs overflow-x-auto">
									{selectedKey.privateKey}
								</div>
							) : (
								<div className="bg-gray-800 p-4 rounded-md text-center">
									<p className="text-gray-400">Private key is hidden</p>
								</div>
							)}
						</div>

						<div className="mb-6">
							<h3 className="text-sm font-medium text-gray-400 mb-2">
								Details
							</h3>
							<div className="bg-gray-800 p-4 rounded-md">
								<div className="grid grid-cols-2 gap-2">
									<div className="text-gray-400">Type:</div>
									<div>{selectedKey.type.toUpperCase()}</div>
									<div className="text-gray-400">Created:</div>
									<div>
										{new Date(selectedKey.createdAt).toLocaleDateString()}
									</div>
									<div className="text-gray-400">Passphrase:</div>
									<div>{selectedKey.passphrase ? "Yes" : "No"}</div>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="h-full flex flex-col items-center justify-center">
						<h2 className="text-xl font-medium mb-4">SSH Keys</h2>
						<p className="text-gray-400 mb-6">
							Select a key to view details or create a new one
						</p>
						<Button
							onClick={() => {
								setIsCreating(true);
								setEditedKey({});
							}}
						>
							<Plus size={16} className="mr-2" /> Create New SSH Key
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
