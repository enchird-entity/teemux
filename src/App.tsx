import { lazy, Suspense } from "react";
import {
	Navigate,
	Route,
	Routes,
	NavLink,
	Outlet,
	useNavigate,
} from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import "./App.css";
import { RootLayout } from "./layouts/root.layout";
import { MainLayout } from "./layouts/main.layout";
import { ConnectionProvider } from "./contexts/connection.context";
import { HostsPage } from "./pages/hosts.page";
import { PortForwardingPage } from "./pages/port-forwarding.page";
import { KeychainPage } from "./pages/keychain.page";
import { KnownHostsPage } from "./pages/known-hosts.page";
import { SnippetsPage } from "./pages/snippets.page";
import { SettingsLayout } from "./layouts/settins.layout";
import { AccountSettingsPage } from "./pages/settings.page";
import { ProfileSettingsPage } from "./pages/settings.page";
import { SftpPage } from "./pages/sftp.page";

// Auth Layout (now nested inside RootLayout)
function AuthLayout() {
	const navigate = useNavigate();

	return (
		<div className="auth-layout">
			<main className="auth-content">
				<Outlet />
				<div className="auth-navigation">
					<NavLink to="/auth/login" className="auth-link">
						Login
					</NavLink>
					<NavLink to="/auth/register" className="auth-link">
						Register
					</NavLink>
					<button
						onClick={() => navigate("/vaults/example-view")}
						className="auth-link"
					>
						Back to Main
					</button>
				</div>
			</main>
		</div>
	);
}

// Login Component
function Login() {
	const navigate = useNavigate();

	return (
		<div>
			<h2>Login</h2>
			<button onClick={() => navigate("/standalone")} className="button">
				Go to Standalone Page
			</button>
		</div>
	);
}

// Register Component
function Register() {
	return <h2>Register</h2>;
}

// Standalone Component (outside of any layout)
function StandalonePage() {
	const navigate = useNavigate();

	return (
		<div className="standalone-page">
			<h1>Standalone Page</h1>
			<button onClick={() => navigate(-1)} className="button">
				Go Back
			</button>

			<div>Show terminals here and repurpose component when time comes</div>
			<button
				onClick={() => navigate("/vaults/example-view")}
				className="button"
			>
				Go to Main Layout
			</button>
		</div>
	);
}

export default function App() {
	return (
		<div className="app">
			<ConnectionProvider>
				<ErrorBoundary FallbackComponent={ErrorFallback}>
					<Suspense fallback={<div>Loading...</div>}>
						<Routes>
							{/* Root Layout wraps both Main and Auth layouts */}
							<Route element={<RootLayout />}>
								{/* Main Layout and its nested routes */}
								<Route path="/vaults" element={<MainLayout />}>
									<Route path="" element={<HostsPage />} />
									<Route path="hosts" element={<HostsPage />} />
									<Route
										path="port-forwarding"
										element={<PortForwardingPage />}
									/>
									<Route path="keychain" element={<KeychainPage />} />
									<Route path="known-hosts" element={<KnownHostsPage />} />
									<Route path="snippets" element={<SnippetsPage />} />

									{/* Settings Layout nested inside Main Layout */}
									<Route path="settings" element={<SettingsLayout />}>
										<Route path="" element={<Navigate to="profile" />} />
										<Route path="profile" element={<ProfileSettingsPage />} />
										<Route path="account" element={<AccountSettingsPage />} />
									</Route>
								</Route>

								{/* Auth Layout and its routes */}
								<Route path="/auth" element={<AuthLayout />}>
									<Route path="login" element={<Login />} />
									<Route path="register" element={<Register />} />
								</Route>

								{/* Standalone route (no layout) */}
								<Route path="/sftp" element={<SftpPage />} />
								<Route path="/terminal" element={<StandalonePage />} />
							</Route>

							{/* Root redirect */}
							<Route path="/" element={<Navigate to="/vaults" />} />
						</Routes>
					</Suspense>
				</ErrorBoundary>
			</ConnectionProvider>
		</div>
	);
}

function ErrorFallback({ error }: { error: Error }) {
	return (
		<div className="error-container">
			<h2>Something went wrong:</h2>
			<pre>{error.message}</pre>
		</div>
	);
}
