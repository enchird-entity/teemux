import React, { useState, useEffect, useRef } from "react";
import {
	ChevronDown,
	X,
	Tag,
	Server,
	User,
	Key,
	Plus,
	Share2,
	Check,
	Trash2,
	Copy,
	Terminal,
	Wifi,
	Eye,
	EyeOff,
	Ellipsis,
	ArrowRightToLine,
	Boxes,
	Loader2,
} from "lucide-react";
import type { Host } from "../../models/host";
import { Input } from "../ui/input";

interface HostDetailsSidebarProps {
	host?: Host;
	isEditing: boolean;
	onClose: () => void;
	onSave: (host: Partial<Host>) => Promise<void>;
	onConnect?: (host: Host) => void;
	onDelete?: (host: Host) => void;
}

export function HostDetailsSidebar({
	host,
	isEditing,
	onClose,
	onSave,
	onConnect,
	onDelete,
}: HostDetailsSidebarProps) {
	const [formData, setFormData] = useState<Partial<Host>>(
		host
			? { ...host }
			: {
					label: "",
					hostname: "",
					port: 22,
					username: "",
					auth_type: "password",
					password: "",
					tags: [],
					group: "",
			  }
	);

	// State for tags and groups
	const [tagInput, setTagInput] = useState("");
	const [groupInput, setGroupInput] = useState("");
	const [showTagSuggestions, setShowTagSuggestions] = useState(false);
	const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
	const [availableTags, setAvailableTags] = useState<string[]>([]);
	const [availableGroups, setAvailableGroups] = useState<string[]>([]);
	const [filteredTags, setFilteredTags] = useState<string[]>([]);
	const [filteredGroups, setFilteredGroups] = useState<string[]>([]);
	const [allHosts, setAllHosts] = useState<Host[]>([]);
	const [showMenu, setShowMenu] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Add state for password visibility
	const [showPassword, setShowPassword] = useState(false);

	const sidebarRef = useRef<HTMLDivElement>(null);
	const tagInputRef = useRef<HTMLInputElement>(null);
	const groupInputRef = useRef<HTMLInputElement>(null);
	const tagSuggestionsRef = useRef<HTMLDivElement>(null);
	const groupSuggestionsRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);

	// Update form data when host changes
	useEffect(() => {
		if (host) {
			setFormData({ ...host });
		} else {
			setFormData({
				label: "",
				hostname: "",
				port: 22,
				username: "",
				auth_type: "password",
				password: "",
				tags: [],
				group: "",
			});
		}
	}, [host]);

	// Load all hosts to extract tags and groups
	useEffect(() => {
		loadHostsData();
	}, []);

	// Reload hosts data when entering edit mode
	useEffect(() => {
		if (isEditing) {
			loadHostsData();
		}
	}, [isEditing]);

	const loadHostsData = () => {
		//todo: get hosts from secure storage
		// ipcRenderer
		//   .invoke('hosts:getAll')
		//   .then((hosts: Host[]) => {
		//     setAllHosts(hosts);
		//     // Extract all unique tags
		//     const tags = new Set<string>();
		//     hosts.forEach((host) => {
		//       if (host.tags && host.tags.length > 0) {
		//         host.tags.forEach((tag) => tags.add(tag));
		//       }
		//     });
		//     setAvailableTags(Array.from(tags));
		//     // Extract all unique groups
		//     const groups = new Set<string>();
		//     hosts.forEach((host) => {
		//       if (host.group) {
		//         groups.add(host.group);
		//       }
		//     });
		//     // Add default groups if none exist
		//     if (groups.size === 0) {
		//       groups.add('Production');
		//       groups.add('Staging');
		//       groups.add('Development');
		//     }
		//     setAvailableGroups(Array.from(groups));
		//   })
		//   .catch((err) => {
		//     console.error('Failed to load hosts for tags/groups:', err);
		//   });
	};

	// Filter tags and groups based on input
	useEffect(() => {
		if (tagInput) {
			setFilteredTags(
				availableTags.filter((tag) =>
					tag.toLowerCase().includes(tagInput.toLowerCase())
				)
			);
		} else {
			setFilteredTags(availableTags);
		}
	}, [tagInput, availableTags]);

	useEffect(() => {
		if (groupInput) {
			setFilteredGroups(
				availableGroups.filter((group) =>
					group.toLowerCase().includes(groupInput.toLowerCase())
				)
			);
		} else {
			setFilteredGroups(availableGroups);
		}
	}, [groupInput, availableGroups]);

	// Close suggestions and menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				tagSuggestionsRef.current &&
				!tagSuggestionsRef.current.contains(event.target as Node) &&
				tagInputRef.current &&
				!tagInputRef.current.contains(event.target as Node)
			) {
				setShowTagSuggestions(false);
			}
			if (
				groupSuggestionsRef.current &&
				!groupSuggestionsRef.current.contains(event.target as Node) &&
				groupInputRef.current &&
				!groupInputRef.current.contains(event.target as Node)
			) {
				setShowGroupSuggestions(false);
			}
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				menuButtonRef.current &&
				!menuButtonRef.current.contains(event.target as Node)
			) {
				setShowMenu(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	//close sidebar if clicked outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				sidebarRef.current &&
				!sidebarRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		setIsLoading(true);
		e.preventDefault();
		// Ensure we're sending the correct data structure
		const dataToSave = {
			...formData,
			tags: formData.tags || [],
			group: formData.group || "",
		};

		console.log("Saving host data:", dataToSave);
		setTimeout(async () => {
			await onSave(dataToSave);
		}, 500);
		setIsLoading(false);
	};

	const handleConnect = () => {
		if (host && onConnect) {
			onConnect(host);
		}
	};

	const handleDelete = () => {
		if (host && onDelete) {
			onDelete(host);
		}
	};

	const handleDuplicate = () => {
		if (host) {
			const duplicatedHost: Partial<Host> = {
				...formData,
				label: `${formData.label} (copy)`,
				id: undefined, // Remove ID so a new one will be generated
			};
			onSave(duplicatedHost);
		}
	};

	const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setTagInput(e.target.value);
		setShowTagSuggestions(true);
	};

	const handleGroupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setGroupInput(e.target.value);
		setShowGroupSuggestions(true);
	};

	const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && tagInput.trim()) {
			e.preventDefault();
			addTag(tagInput);
		}
	};

	const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && groupInput.trim()) {
			e.preventDefault();
			selectGroup(groupInput);
		}
	};

	const addTag = (tag: string) => {
		if (!tag.trim()) return;

		const newTag = tag.trim();
		const currentTags = formData.tags || [];

		if (!currentTags.includes(newTag)) {
			// Add to form data
			const updatedTags = [...currentTags, newTag];
			setFormData((prev) => ({
				...prev,
				tags: updatedTags,
			}));

			// Add to available tags if it's new
			if (!availableTags.includes(newTag)) {
				setAvailableTags((prev) => [...prev, newTag]);
			}
		}

		setTagInput("");
		setShowTagSuggestions(false);
	};

	const removeTag = (tagToRemove: string) => {
		const currentTags = formData.tags || [];
		const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);

		setFormData((prev) => ({
			...prev,
			tags: updatedTags,
		}));
	};

	const selectGroup = (group: string) => {
		if (!group.trim()) return;

		const newGroup = group.trim();

		// Set the group in form data
		setFormData((prev) => ({
			...prev,
			group: newGroup,
		}));

		// Add to available groups if it's new
		if (!availableGroups.includes(newGroup)) {
			setAvailableGroups((prev) => [...prev, newGroup]);
		}

		setGroupInput("");
		setShowGroupSuggestions(false);
	};

	// Toggle password visibility
	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	const isNewHost = isEditing && !host;

	return (
		<div
			ref={sidebarRef}
			className="absolute top-0 right-0 w-[400px] h-full bg-[#1e1e2a] border-l border-[#2d2d3a]  z-10 transition-all flex flex-col"
		>
			{/* Header */}
			<div className="bg-[#1a1a24] p-4 flex items-center justify-between">
				<div>
					<h2 className="text-sm font-semibold text-white">
						{isNewHost ? "New Host" : isEditing ? "Edit Host" : "Host Details"}
					</h2>
					<div className="flex items-center text-gray-400 text-xs">
						<span>Personal vault</span>
						<ChevronDown className="w-4 h-4 ml-1" />
					</div>
				</div>
				<div className="flex items-center gap-2 relative">
					<button
						ref={menuButtonRef}
						onClick={() => setShowMenu(!showMenu)}
						className="text-gray-400 hover:text-white mt-1.2"
					>
						<Ellipsis />
					</button>

					{/* Dropdown Menu */}
					{showMenu && (
						<div
							ref={menuRef}
							className="absolute text-xs right-0 top-5 p-2 border border-[#6a6a6f] mt-2 w-40 bg-[#252532] rounded-lg shadow-lg z-20 overflow-hidden"
						>
							<div className="py-1">
								<button
									onClick={() => {
										handleConnect();
										setShowMenu(false);
									}}
									className={`flex items-center w-full px-2 py-2 text-left hover:bg-[#3d3d4a] rounded-lg ${
										isNewHost
											? "cursor-not-allowed text-[#505060]"
											: "text-gray-400"
									}`}
								>
									<Wifi className="w-5 h-5 mr-3" />
									Connect
								</button>
								<button
									disabled={isNewHost}
									onClick={() => {
										// Add Telnet functionality
										setShowMenu(false);
									}}
									className={`flex items-center w-full px-2 py-2 text-left hover:bg-[#3d3d4a] rounded-lg ${
										isNewHost
											? "cursor-not-allowed text-[#505060]"
											: "text-gray-400"
									}`}
								>
									<Terminal className="w-5 h-5 mr-3" />
									Add Telnet
								</button>
								<button
									disabled={isNewHost}
									onClick={() => {
										handleDuplicate();
										setShowMenu(false);
									}}
									className={`flex items-center w-full px-2 py-2 text-left hover:bg-[#3d3d4a] rounded-lg ${
										isNewHost
											? "cursor-not-allowed text-[#505060]"
											: "text-gray-400"
									}`}
								>
									<Copy className="w-5 h-5 mr-3" />
									Duplicate
								</button>
								<button
									disabled={isNewHost}
									onClick={() => {
										handleDelete();
										setShowMenu(false);
									}}
									className={`flex items-center w-full px-2 py-2 text-left hover:bg-[#3d3d4a] rounded-lg ${
										isNewHost
											? "cursor-not-allowed text-[#505060]"
											: "text-gray-400"
									}`}
								>
									<Trash2 className="w-5 h-5 mr-3" />
									Remove
								</button>
							</div>
						</div>
					)}
					<button onClick={onClose} className="text-gray-400 hover:text-white">
						<ArrowRightToLine />
					</button>
				</div>
			</div>

			<form
				onSubmit={handleSubmit}
				className="flex-1 flex flex-col overflow-hidden"
			>
				<div className="p-4 flex-1 space-y-6 overflow-auto">
					{/* Address Section */}
					<div className="bg-[#252532] rounded-lg p-4">
						<h3 className="text-sm font-medium text-white mb-4">Address</h3>
						<div className="flex items-center gap-3">
							<div
								className={`w-9 h-9 rounded-md ${
									isNewHost ? "bg-primary-400" : "bg-secondary-500"
								} flex items-center justify-center text-white`}
							>
								{isNewHost ? (
									<Server className="w-6 h-6" />
								) : (
									<Server className="w-6 h-6" />
								)}
							</div>
							<Input
								name="hostname"
								value={formData.hostname || ""}
								onChange={handleChange}
								placeholder={isNewHost ? "IP or Hostname" : ""}
								className="flex-1 bg-[#1a1a24] border-[#3d3d4a] focus:border-[#4f46e5] text-sm text-white h-10"
								readOnly={!isEditing}
							/>
						</div>
					</div>

					{/* General Section */}
					<div className="bg-[#252532] rounded-lg p-4">
						<h3 className="text-sm font-medium text-white mb-4">General</h3>
						<div className="space-y-3 text-sm">
							<Input
								name="label"
								value={formData.label || ""}
								onChange={handleChange}
								placeholder="Label"
								className="w-full bg-[#1a1a24] text-sm border-[#3d3d4a] focus:border-[#4f46e5] text-white h-10"
								readOnly={!isEditing}
							/>

							{/* Group Selection */}
							<div className="relative">
								<div className="flex items-center gap-2 bg-[#1a1a24] border border-[#3d3d4a] rounded-md px-3 h-10">
									<Boxes size={16} className="text-gray-300" />

									{isEditing ? (
										<input
											ref={groupInputRef}
											type="text"
											value={groupInput}
											onChange={handleGroupInputChange}
											onKeyDown={handleGroupKeyDown}
											onFocus={() => setShowGroupSuggestions(true)}
											placeholder={formData.group || "Parent Group"}
											className="bg-transparent border-none text-white focus:outline-none w-full"
										/>
									) : (
										<span className="text-white">
											{formData.group || "Parent Group"}
										</span>
									)}
								</div>

								{/* Group Suggestions Popup */}
								{isEditing && showGroupSuggestions && (
									<div
										ref={groupSuggestionsRef}
										className="absolute z-10 mt-1 w-full bg-[#252532] border border-[#3d3d4a] rounded-md shadow-lg max-h-60 overflow-auto"
									>
										{filteredGroups.length > 0 ? (
											filteredGroups.map((group, index) => (
												<div
													key={index}
													className="px-3 py-2 hover:bg-[#3d3d4a] cursor-pointer flex items-center justify-between"
													onClick={() => selectGroup(group)}
												>
													<span className="text-white">{group}</span>
													{formData.group === group && (
														<Check className="w-4 h-4 text-green-500" />
													)}
												</div>
											))
										) : (
											<div className="px-3 py-2 text-gray-400">
												Press Enter to create "{groupInput}"
											</div>
										)}
									</div>
								)}
							</div>

							{/* Tags Selection */}
							<div className="relative">
								<div className="flex items-center gap-2 bg-[#1a1a24] border border-[#3d3d4a] rounded-md px-3 h-10 min-h-10">
									<Tag size={16} className="text-gray-300" />

									{isEditing ? (
										<div className="flex flex-wrap gap-1 items-center flex-1 py-1">
											{(formData.tags || []).map((tag) => (
												<div
													key={tag}
													className="bg-[#3d3d4a] text-gray-300 px-2 py-1 rounded-md flex items-center gap-1"
												>
													<span>{tag}</span>
													<X
														className="w-3 h-3 cursor-pointer"
														onClick={() => removeTag(tag)}
													/>
												</div>
											))}
											<input
												ref={tagInputRef}
												type="text"
												value={tagInput}
												onChange={handleTagInputChange}
												onKeyDown={handleTagKeyDown}
												onFocus={() => setShowTagSuggestions(true)}
												placeholder={
													(formData.tags || []).length === 0 ? "Tags" : ""
												}
												className="bg-transparent border-none text-white focus:outline-none flex-1 min-w-[50px]"
											/>
										</div>
									) : (
										<div className="flex flex-wrap gap-1 py-1">
											{(formData.tags || []).length > 0 ? (
												(formData.tags || []).map((tag) => (
													<div
														key={tag}
														className="bg-[#3d3d4a] text-gray-300 px-2 py-1 rounded-md"
													>
														<span>{tag}</span>
													</div>
												))
											) : (
												<span className="text-gray-400">Tags</span>
											)}
										</div>
									)}
								</div>

								{/* Tag Suggestions Popup */}
								{isEditing && showTagSuggestions && (
									<div
										ref={tagSuggestionsRef}
										className="absolute z-10 mt-1 w-full bg-[#252532] border border-[#3d3d4a] rounded-md shadow-lg max-h-60 overflow-auto"
									>
										{filteredTags.length > 0 ? (
											filteredTags.map((tag, index) => (
												<div
													key={index}
													className="px-3 py-2 hover:bg-[#3d3d4a] cursor-pointer flex items-center justify-between"
													onClick={() => addTag(tag)}
												>
													<span className="text-white">{tag}</span>
													{(formData.tags || []).includes(tag) && (
														<Check className="w-4 h-4 text-green-500" />
													)}
												</div>
											))
										) : (
											<div className="px-3 py-2 text-gray-400">
												Press Enter to create "{tagInput}"
											</div>
										)}
									</div>
								)}
							</div>

							<div className="flex items-center justify-between bg-[#1a1a24] border border-[#3d3d4a] rounded-md px-3 h-10">
								<div className="flex items-center gap-2">
									<X size={16} className="text-gray-300" />
									<span className="text-gray-400">Backspace</span>
								</div>
								<span className="text-gray-400">Default</span>
							</div>
						</div>
					</div>

					{/* Share Section */}
					<div className="bg-[#252532] rounded-lg p-3">
						<button
							type="button"
							className={`w-full flex items-center justify-center gap-2 h-10 hover:bg-green-200 hover:text-black bg-opacity-50 rounded-md ${
								isEditing ? "text-gray-400" : "text-green-500"
							}`}
						>
							<Share2 className="w-5 h-5" />
							<span>Share this host</span>
						</button>
					</div>

					{/* SSH Section */}
					<div className="bg-[#252532] rounded-lg p-4 text-sm">
						<div className="flex items-center gap-2 mb-4">
							<span className="text-white">SSH on</span>
							<Input
								name="port"
								type="number"
								value={formData.port || 22}
								onChange={handleChange}
								className="w-18 bg-[#1a1a24] border-[#3d3d4a] focus:border-[#4f46e5] text-white h-10"
								readOnly={!isEditing}
							/>
							<span className="text-white">port</span>
						</div>

						<div className="space-y-4">
							<div className="flex items-center gap-2 text-gray-400">
								<span>Credentials from</span>
								<span>Personal vault</span>
							</div>

							<div className="flex items-center gap-2 bg-[#1a1a24] border border-[#3d3d4a] rounded-md px-3 h-12">
								<User className="w-5 h-5 text-gray-400" />
								{isEditing ? (
									<Input
										name="username"
										value={formData.username || ""}
										onChange={handleChange}
										placeholder="Username"
										className="border-none bg-transparent text-white focus:outline-none w-full"
									/>
								) : (
									<span className="text-white">{formData.username}</span>
								)}
							</div>

							<div className="flex items-center gap-2 bg-[#1a1a24] border border-[#3d3d4a] rounded-md px-3 h-12">
								<Key className="w-5 h-5 text-gray-400" />
								{isEditing ? (
									<div className="flex items-center w-full">
										<Input
											name="password"
											type={showPassword ? "text" : "password"}
											value={formData.password || ""}
											onChange={handleChange}
											placeholder="Password"
											className="border-none bg-transparent text-white focus:outline-none w-full"
										/>
										<button
											type="button"
											onClick={togglePasswordVisibility}
											className="text-gray-400 hover:text-white focus:outline-none"
										>
											{showPassword ? (
												<EyeOff className="w-5 h-5" />
											) : (
												<Eye className="w-5 h-5" />
											)}
										</button>
									</div>
								) : (
									<div className="flex-1">
										{Array(14)
											.fill("•")
											.map((dot, i) => (
												<span key={i} className="text-white">
													{dot}
												</span>
											))}
									</div>
								)}
							</div>

							<button
								type="button"
								className="flex items-center gap-2 text-gray-400 mt-2"
							>
								<Plus className="w-5 h-5" />
								<span>Key, Certificate, FIDO2</span>
							</button>

							{!isNewHost && (
								<button
									type="button"
									className="flex items-center justify-between w-full text-gray-400 mt-2 bg-[#1a1a24] border border-[#3d3d4a] rounded-md px-3 h-12"
								>
									<div className="flex items-center gap-2">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
										</svg>
										<span>Agent Forwarding</span>
									</div>
									<span>Disabled</span>
								</button>
							)}

							{!isNewHost && (
								<button
									type="button"
									className="flex items-center justify-center w-full text-gray-400 mt-4"
								>
									<span>Show more</span>
									<ChevronDown className="w-4 h-4 ml-1" />
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Action Button */}
				<div className="p-4">
					<button
						type={isEditing ? "submit" : "button"}
						onClick={isEditing ? undefined : handleConnect}
						className={`w-full py-2 rounded-md text-white font-medium ${
							isEditing
								? "bg-primary  hover:bg-primary-700"
								: "bg-[#4ade80] hover:bg-[#22c55e]"
						}`}
					>
						{isLoading ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : isEditing ? (
							"Save"
						) : (
							"Connect"
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
