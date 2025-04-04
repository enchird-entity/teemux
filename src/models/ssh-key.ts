export interface SSHKey {
	id: string;
	name: string;
	type: "rsa" | "dsa" | "ecdsa" | "ed25519";
	bits?: number; // For RSA keys
	private_key_path: string;
	public_key_path: string;
	passphrase?: string; // Only stored encrypted
	host_ids: string[]; // Hosts using this key
	created_at: Date;
	updated_at: Date;
}
