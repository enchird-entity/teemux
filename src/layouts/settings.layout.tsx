import { NavLink } from "react-router-dom";

import { Outlet } from "react-router-dom";

// Settings Layout (nested inside MainLayout)
export const SettingsLayout = () => {
	return (
		<div className="settings-layout">
			<nav className="settings-nav">
				<NavLink to="/vaults/settings/profile" className="settings-link">
					Profile
				</NavLink>
				<NavLink to="/vaults/settings/account" className="settings-link">
					Account
				</NavLink>
			</nav>
			<div className="settings-content">
				<Outlet />
			</div>
		</div>
	);
};
