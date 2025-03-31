import { useConnection } from "@/contexts/connection.context";
import { TerminalLayout } from "@/layouts/terminal.layout";
import { TerminalPage } from "@/pages/terminal.page";
import React from "react";
import { Navigate, RouteObject } from "react-router-dom";
import { useParams } from "react-router-dom";

// Export a route configuration object instead of a component
export const terminalRoutes: RouteObject = {
	path: "terminal",
	element: <TerminalLayout />,
	children: [
		{
			index: true,
			element: <TerminalRedirect />,
		},
		{
			path: ":sessionId",
			element: <TerminalSessionRoute />,
		},
	],
};

// Separate component to handle the redirect logic
function TerminalRedirect() {
	const { activeSessions } = useConnection();
	const firstSession = activeSessions[0];

	if (!activeSessions.length) {
		return <Navigate to="/vaults/hosts" replace />;
	}

	if (firstSession) {
		return <Navigate to={firstSession.id} replace />;
	}

	return null;
}

// Separate component to handle the session routing
function TerminalSessionRoute() {
	const { activeSessions } = useConnection();
	const params = useParams<{ sessionId: string }>();

	const session = activeSessions.find((s) => s.id === params.sessionId);

	if (!session) {
		return <Navigate to="/vaults/hosts" replace />;
	}

	return <TerminalPage session={session} />;
}
