# Explainy Chatbox Frontend

This document provides a detailed overview of the Explainy Chatbox frontend application, built with React, TypeScript, Vite, and Shadcn UI.

## 1. Project Overview

The Explainy Chatbox frontend provides a modern, interactive user interface for users to:
- Upload documents (PDF, Word).
- View and manage uploaded documents.
- Engage in conversations with an AI assistant (powered by a backend using Groq) to ask questions about the content of the uploaded documents.
- Target specific documents for questions using an `@` mention system.
- View and manage past chat history.
- Authenticate to access the application.

## 2. Core Features

- **Document Upload:** Allows users to upload `.pdf`, `.doc`, and `.docx` files via a file selection dialog.
- **Document Listing:** Displays uploaded documents in the sidebar.
- **Real-time Chat Interface:** Provides a familiar messaging interface for interacting with the AI.
- **AI-Powered Q&A:** Sends user questions (optionally targeted at specific documents) to the backend and displays the AI's response.
- **Chat History:** Saves conversations and allows users to revisit past chats, selected from the sidebar.
- **Document Mentions (`@`):** Users can type `@` in the chat input to trigger a dropdown menu listing available documents, allowing them to select one and automatically insert `@document_name` into the message, focusing the query on that specific document.
- **Responsive Design:** Adapts to various screen sizes using Tailwind CSS.
- **Dark/Light Mode:** Supports theme switching (common with shadcn/ui setups).
- **User Authentication:** A simple login screen protects access.

## 3. Technology Stack

- **Framework/Library:** React 18+
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (built on Radix UI primitives)
- **State Management:**
    - **Local UI State:** React `useState`, `useRef`, `useEffect` hooks.
    - **Server State/Caching:** Tanstack Query (React Query) v5 for fetching, caching, and synchronizing data with the backend (documents, chat history, sessions).
    - **Authentication State:** Custom `useAuth` hook (likely using React Context).
- **Icons:** Lucide React
- **API Client:** Browser `fetch` API (used within `src/lib/api.ts`).

## 4. Project Structure (`src` directory)

```
explainy-chatbox-main/
├── public/              # Static assets
├── src/
│   ├── assets/          # Static assets like images, fonts (if any)
│   │   ├── ui/          # Shadcn UI generated components
│   │   ├── ChatHistory.tsx
│   │   ├── ChatInput.tsx     # Handles user message input, @ mentions
│   │   ├── ChatMessage.tsx   # Renders individual chat messages
│   │   ├── ChatWindow.tsx    # Orchestrates the chat view, messages
│   │   ├── FileUpload.tsx    # UI for uploading documents
│   │   ├── Header.tsx        # Top application header (if present)
│   │   ├── Sidebar.tsx       # Left sidebar for navigation, docs, history
│   │   └── Welcome.tsx       # Initial screen before chatting
│   ├── hooks/             # Custom React hooks (e.g., useAuth)
│   ├── lib/               # Core logic, utilities, API services
│   │   ├── api.ts         # Functions for backend communication
│   │   ├── auth.tsx       # Authentication context/logic
│   │   └── utils.ts       # Utility functions (like cn for Tailwind)
│   ├── pages/             # Top-level page components
│   │   ├── Index.tsx      # Main application page layout
│   │   ├── Login.tsx      # Login screen
│   │   └── NotFound.tsx   # 404 page (optional)
│   ├── App.tsx            # Main application component, routing setup
│   └── main.tsx          # Application entry point, renders App
├── index.html           # Main HTML file
├── package.json         # Project dependencies and scripts
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## 5. Key Components Breakdown

- **`App.tsx`**:
    - Sets up the main application structure.
    - Likely handles routing (e.g., using `react-router-dom`) to switch between `Login` and `Index` pages based on authentication state.
    - Wraps the application with necessary providers (e.g., `QueryClientProvider` for Tanstack Query, `AuthProvider`).

- **`pages/Login.tsx`**:
    - Provides a simple form for username/password input.
    - Uses the `useAuth` hook to handle the login process.
    - Redirects to the main application (`pages/Index.tsx`) upon successful login.

- **`pages/Index.tsx`**:
    - Represents the main authenticated application view.
    - Likely renders the `Sidebar` and `ChatWindow` components side-by-side.
    - Manages the state of the currently selected chat (`selectedChatId`).

- **`components/Sidebar.tsx`**:
    - Displays a list of uploaded documents (fetched via `getDocuments` from `api.ts` using `useQuery`).
    - Displays the chat history sessions (fetched via `getChatSessions` from `api.ts` using `useQuery`).
    - Allows users to select a previous chat or start a new one.
    - Contains the `FileUpload` component trigger.
    - Includes a logout button using the `useAuth` hook.

- **`components/ChatWindow.tsx`**:
    - Manages the state of the current chat conversation (`messages`).
    - Fetches history for the `selectedChatId` using `getChatHistory` via `useQuery`.
    - Renders the list of `ChatMessage` components.
    - Renders the `ChatInput` component.
    - Handles sending new messages via the `handleSendMessage` function, which calls the `sendMessage` function in `api.ts`.
    - Updates the `messages` state optimistically and then replaces loading indicators with the actual response.
    - Manages loading states (`isLoading`).
    - Scrolls to the bottom automatically on new messages.
    - Displays the `Welcome` component if no messages exist.

- **`components/ChatInput.tsx`**:
    - Contains the `Textarea` for user input.
    - Manages the input message state (`message`).
    - **`@` Mention Feature:**
        - Fetches the list of documents using `getDocuments`.
        - Detects when the user types `@`.
        - Calculates the cursor position using a helper function (`getCaretCoordinates`).
        - Displays a positioned dropdown menu (`showDocumentMenu`) listing fetched documents.
        - Handles selection from the dropdown (`insertDocumentMention`) to insert `@document_name` into the textarea.
        - Closes the menu on Escape or clicking outside.
    - Calls the `onSendMessage` prop (passed from `ChatWindow`) when the form is submitted (Enter or Send button).
    - Handles Ctrl/Cmd+Enter submission.

- **`components/ChatMessage.tsx`**:
    - Renders a single message bubble.
    - Styles messages differently based on `type` ('user', 'assistant', 'loading').
    - Potentially includes Markdown rendering for assistant messages.

- **`components/FileUpload.tsx`**:
    - Provides the UI for selecting files (PDF, Word).
    - Manages the state of selected files (`selectedFiles`).
    - Calls the `uploadDocuments` function from `api.ts` to send files to the backend.
    - Uses `useQueryClient` from Tanstack Query to invalidate the 'documents' query upon successful upload, triggering a refresh in the `Sidebar`.
    - Uses `useToast` (from shadcn/ui) to show success/error notifications.

## 6. State Management

- **UI State:** Managed locally within components using `useState` and `useRef` (e.g., input field values, dropdown visibility).
- **Server State:** Handled primarily by **Tanstack Query (React Query)**.
    - **Fetching:** `useQuery` hook is used to fetch documents (`queryKey: ['documents']`), chat sessions (`queryKey: ['chatSessions']`), and chat history (`queryKey: ['chatHistory', chatId]`).
    - **Caching:** Tanstack Query automatically caches fetched data, reducing redundant API calls.
    - **Synchronization:** Keeps UI consistent with server data.
    - **Mutations:** While not explicitly shown in `ChatInput` for sending messages, `useMutation` *could* be used for actions like sending messages or deleting chats for better loading/error/success state management, though the current implementation in `ChatWindow` handles it manually with `useState`. Uploading uses manual state but triggers query invalidation.
- **Authentication State:** Managed by a custom context provider (`src/lib/auth.tsx`) accessed via the `useAuth` hook. Stores whether the user is logged in.

## 7. Backend Interaction (`src/lib/api.ts`)

The frontend communicates with the backend API (running typically on `http://localhost:5000/api`) via functions defined in `src/lib/api.ts`.

- **`getDocuments()`**: Sends a `GET` request to `/api/documents` to fetch the list of uploaded documents. Used by `Sidebar` and `ChatInput`.
- **`uploadDocuments(files)`**: Sends a `POST` request to `/api/upload` with `FormData` containing the files. Used by `FileUpload`.
- **`sendMessage(message, chatId?)`**: Sends a `POST` request to `/api/chat` with the user's message and optional `chatId`. If the message contains `@document_name`, the backend handles filtering the context. Used by `ChatWindow`.
- **`getChatHistory(chatId)`**: Sends a `GET` request to `/api/chat/:chatId/history` to fetch messages for a specific chat. Used by `ChatWindow`.
- **`getChatSessions()`**: Sends a `GET` request to `/api/chats` to fetch the list of past chat sessions. Used by `Sidebar`.
- **`deleteChatSession(chatId)`**: Sends a `DELETE` request to `/api/chats/:chatId` to delete a chat session. Used by `ChatHistory` (likely within `Sidebar`).
- **`debugSupabase()`**: Sends a `GET` request to `/api/debug/supabase`. (Likely for development/testing).

**Data Flow Example (Sending a Message):**

1.  User types message (optionally using `@` mention) in `ChatInput`.
2.  User submits the message (Enter/Button).
3.  `ChatInput` calls `onSendMessage` prop function (defined in `ChatWindow`).
4.  `ChatWindow` updates its local `messages` state to show the user's message optimistically.
5.  `ChatWindow` adds a 'loading' message to the state.
6.  `ChatWindow` calls `sendMessage(message, chatId)` from `src/lib/api.ts`.
7.  `api.ts` sends a `POST` request to the backend `/api/chat`.
8.  Backend processes the request:
    *   Parses the message for `@` mentions.
    *   Selects appropriate document context (all docs or specific one).
    *   Calls the Groq API with the context and cleaned message.
    *   (If Groq fails, uses fallback document search).
    *   Saves the exchange to Supabase (if applicable).
    *   Sends the AI response back to the frontend.
9.  `ChatWindow` receives the response from `sendMessage`.
10. `ChatWindow` updates the `messages` state, replacing the 'loading' message with the assistant's response.
11. `ChatWindow` updates the `chatId` if it was a new chat.

## 8. Setup & Running

1.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```
2.  **Run Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```
3.  **Ensure Backend is Running:** The backend server (typically on `http://localhost:5000`) must be running for the frontend to function correctly.
4.  **Access:** Open the URL provided by Vite (usually `http://localhost:5173`).

## 9. Potential Improvements

- Implement `useMutation` from Tanstack Query for sending messages and deleting chats for cleaner state handling.
- Add more robust error handling and user feedback.
- Implement real-time updates (e.g., using WebSockets) if multiple users or sessions are a future goal.
- Add unit and integration tests.
- Refine the `@` mention dropdown UI/UX (e.g., filtering documents as the user types after `@`). 