import { Session } from "@/models/session";

export const TerminalPage = ({ session }: { session: Session }) => {
	return <div>Terminal {session.id}</div>;
};
