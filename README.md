Below are the `README.md` and `CONTRIBUTORS.md` files for your Teemux project. These files are designed to provide clear documentation for an open-source project, including setup instructions, feature descriptions, contribution guidelines, and a template for tracking contributors. The `README.md` is detailed to attract potential users and contributors, while the `CONTRIBUTORS.md` sets up a structure for acknowledging contributions.

---

### README.md

````markdown
# Teemux

![Teemux Logo](https://via.placeholder.com/150.png?text=Teemux) <!-- Replace with actual logo if available -->

Teemux is a lightweight, futuristic SSH client built with [Tauri](https://tauri.app/), [React](https://reactjs.org/), and [Tailwind CSS](https://tailwindcss.com/). Designed to surpass Termius, Teemux offers a modern, sci-fi-inspired interface with robust features like automatic SSH reconnection, SSH key management, terminal customization, snippets, port forwarding, SFTP, and more. It also introduces innovative enhancements such as a connection health bar, SSH Galaxy View, and voice command support, making it a powerful tool for system administrators, DevOps engineers, and developers.

## Features

- **Tabbed Terminal Interface:** Manage multiple SSH sessions with xterm.js, featuring a glowing active tab and "Session Pulse" animation.
- **Automatic Reconnection:** Seamlessly reconnects on unstable internet with a dynamic connection health bar (teal for connected, yellow for retrying, red for failed).
- **SSH Key Management:** Generate, list, and connect with SSH keys via a futuristic Key Wizard (Ctrl+K).
- **Terminal Customization:** Switch themes (dark/light), adjust font size, and apply custom CSS with live previews (Ctrl+C).
- **Snippets & Command Palette:** Save and run snippets with contextual suggestions via a sleek popup (Ctrl+P).
- **Port Forwarding:** Configure Local, Remote, and Dynamic forwarding with an intuitive, card-based interface.
- **SFTP Support:** Browse and manage remote files with a file explorer-like view.
- **Connection Animation:** A mesmerizing circular progress animation during SSH connections, inspired by Termius but enhanced with neon effects.
- **Sidebar Navigation:** A collapsible sidebar with sections for Hosts, Keychain, Port Forwarding, Snippets, Known Hosts, History, and SFTP, with a toggle for "Vaults" and "SFTP."
- **Quick Connect:** A floating button for fast connections to recent hosts.
- **Session Time Machine:** Rewind and replay session history with a futuristic slider.
- **Voice Commands:** Trigger actions (e.g., "connect to server") using the Web Speech API.
- **SSH Galaxy View:** Visualize connected servers as interactive nodes with neon colors and animated connection lines.

## Screenshots

<!-- Add actual screenshots once available -->

- **Home View:** Recent connections with OS icons and a glowing "Connect" button.
- **Port Forwarding:** Card-based interface with animated hover effects.
- **SFTP View:** File explorer with a futuristic dark theme.
- **Connection Animation:** Circular progress with neon gradients.

## Installation

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (for Tauri backend)
- [Node.js](https://nodejs.org/) (LTS version, for React frontend)
- [pnpm](https://pnpm.io/) (recommended package manager, or use npm/yarn)

### Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/teemux.git
   cd teemux
   ```
````

2. **Install Dependencies:**

   ```bash
   pnpm install
   ```

3. **Run the Development Server:**

   ```bash
   pnpm tauri dev
   ```

   This will launch Teemux in development mode with hot reloading.

4. **Build for Production:**
   ```bash
   pnpm tauri build
   ```
   This generates a production-ready binary for your platform (Windows, macOS, or Linux).

## Usage

1. **Connect to a Host:**

   - Navigate to the "Hosts" section in the sidebar.
   - Use the search bar or "New Host" button to add a host.
   - Click "Connect" on a recent host card to initiate a connection, and watch the futuristic connection animation.

2. **Manage SSH Keys:**

   - Press `Ctrl+K` to open the Key Wizard.
   - Generate a new key or select an existing one to connect.

3. **Customize the Terminal:**

   - Press `Ctrl+C` to open the Customization Panel.
   - Switch themes, adjust font size, or add custom CSS with live previews.

4. **Use Snippets:**

   - Press `Ctrl+P` to open the Command Palette.
   - Search for snippets or use contextual suggestions to run commands.

5. **Explore Advanced Features:**
   - Toggle to "Port Forwarding" to set up Local, Remote, or Dynamic forwarding.
   - Use the "SFTP" view to browse remote files.
   - Activate the "SSH Galaxy View" to visualize your server network.

## Tech Stack

- **Tauri:** Lightweight framework for building cross-platform desktop apps with Rust and web technologies.
- **React:** Component-based frontend for a modular UI.
- **Tailwind CSS:** Utility-first CSS framework for a futuristic, responsive design.
- **xterm.js:** Terminal emulator for SSH sessions.
- **Rust:** Backend for SSH operations, key management, and snippets.
