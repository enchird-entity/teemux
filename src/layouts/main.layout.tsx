import { Sidebar } from "@/components/layout/sidebar";
import { Outlet, useNavigate } from "react-router-dom";

import { NavLink } from "react-router-dom";

export const MainLayout = () => {
	const navigate = useNavigate();

	return (
		<div className="main-layout">
			<div className="flex-1 flex overflow-hidden">
				<div className="border-r border-[#2d2d3a] bg-[#1a1a24] overflow-y-auto">
					<Sidebar />
				</div>
				<main className="main-content">
					<Outlet />
				</main>
			</div>
		</div>
	);
};
