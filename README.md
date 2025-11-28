Collaborative Whiteboard

A real-time collaborative whiteboard built with Next.js, React Konva, Yjs, y-websocket, shadcn/ui, and Framer Motion. This project enables multiple users to draw, sketch, and interact on a shared canvas with seamless synchronization.

⸻

🚀 Features

🎨 Real-time Drawing
	•	Multi-user live collaboration using Yjs CRDT.
	•	Instant syncing of shapes, strokes, and pointer movements.
	•	React Konva powers the stage, layers, and vector graphics.

🧠 State Synchronization
	•	Distributed document synced using y-websocket.
	•	Conflict-free updates even with network delays.
	•	All elements stored as shared Yjs maps/arrays.

⚡ Smooth Animations & UI Enhancements
	•	Framer Motion for subtle UI transitions.
	•	shadcn/ui for modern, clean, and modular components.

🧩 Modular Architecture
	•	Tools like pencil, shapes, arrow, selector, and eraser.
	•	Extensible element schema for adding new tools.
	•	Optimized rendering with Konva’s batching.

📡 Optimized WebSocket Layer
	•	Uses self-hosted y-websocket server for real-time edits.
	•	Lightweight, scalable, and production-friendly.

⸻

🧬 How It Works (Methodology)
	1.	Shared Yjs Document:
	•	A Y.Doc holds collaborative data like elements, points, selections.
	•	Each user updates the doc locally.
	2.	WebSocket Provider:
	•	y-websocket syncs updates with all connected clients.
	•	Every operation is conflict-free (CRDT powered!).
	3.	React Konva Rendering Layer:
	•	Reads from the Yjs document.
	•	Renders shapes on canvas.
	•	Updates only affected elements for max performance.
	4.	Tool System:
	•	Every element follows a schema: { tool, props }.
	•	Tools decide how elements behave during pointer events.
	•	Easy to add new tools by extending the schema.
	5.	UI & UX Enhancements:
	•	Tools & settings UI via shadcn.
	•	Motion-based transitions for smoother feel.

⸻

🛠️ Setup & Installation (Instruction Manual)

Follow these steps to run the project locally:

1️⃣ Clone the Repository

git clone <your-repo-url>
cd your-project-folder

2️⃣ Install Dependencies

npm install

3️⃣ Start the Y-WebSocket Server

Run this in a separate terminal:

npx y-websocket HOST=localhost PORT=1234

This starts the collaborative sync server at ws://localhost:1234.

4️⃣ Windows Users: Add Prisma Binary Targets

In your schema.prisma:

binaryTargets = ["native", "windows"]

This ensures Prisma can run properly on Windows systems.

5️⃣ Generate Prisma Client

npx prisma generate

6️⃣ Start the Development Server

npm run dev

Your app will be live at:

http://localhost:3000


⸻

🎯 Final Notes
	•	Ensure the Y-websocket server is running before opening the app.
	•	If deployed, point the Yjs websocket provider to your hosted server.
	•	Customize tools easily by extending the element schema.

Enjoy building and drawing collaboratively!