import { Outlet } from "react-router-dom";

// Terminal Layout (nested inside MainLayout)
export const TerminalLayout = () => {
	return (
		<div className="terminal-layout">
			<div className="terminal-content">
				<Outlet />
			</div>
		</div>
	);
};
