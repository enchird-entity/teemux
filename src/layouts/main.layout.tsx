import { Sidebar } from "@/components/layout/sidebar";
import { Outlet } from "react-router-dom";

export const MainLayout = () => {
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
