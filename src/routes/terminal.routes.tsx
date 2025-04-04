import { useConnection } from "@/contexts/connection.context";
import { TerminalLayout } from "@/layouts/terminal.layout";
import { TerminalPage } from "@/pages/terminal.page";
import React from "react";
import { Navigate, RouteObject } from "react-router-dom";

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
			path: ":hostId",
			element: <TerminalPage />,
		},
	],
};

// Separate component to handle the redirect logic
function TerminalRedirect() {
	const { activeSessions } = useConnection();
	const firstSession = Object.values(activeSessions)[0];

	if (!Object.keys(activeSessions).length) {
		return <Navigate to="/vaults/hosts" replace />;
	}

	if (firstSession) {
		return <Navigate to={firstSession.host_id} replace />;
	}

	return null;
}
