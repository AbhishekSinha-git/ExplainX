# Explainy Chatbox Backend

This is the backend server for the Explainy Chatbox application. It handles document processing, chat functionality, and integration with Groq for AI-powered document analysis and responses.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Groq API key to the `.env` file
   - Configure Supabase URL and key if you're using Supabase

3. Start the server:

   For Windows PowerShell:
   ```powershell
   npm run dev
   ```
   
   For Command Prompt or bash:
   ```
   npm run dev
   ```

## Features

### Document Targeting
You can target specific documents in your questions by using the `@document_name` syntax. For example:

```
@Unit1_2_OB_SK.pdf What are the key concepts covered in this document?
```

This will search only within the specified document instead of across all documents, making responses more relevant and focused.

## Supabase Database Setup

The application uses Supabase for storing chat history. You need to set up the following tables:

### chats
- `id` (uuid, primary key)
- `created_at` (timestamp)

### chat_history
- `id` (uuid, primary key)
- `chat_id` (uuid, foreign key to chats.id)
- `user_message` (text)
- `assistant_message` (text)
- `timestamp` (timestamp)

## Architecture

- **Document Processing**: The server watches for documents added to the `../documents` folder and processes them automatically
- **API Endpoints**: RESTful API for document upload, chat, and document management
- **AI Integration**: Uses Groq's llama3-70b-8192 model for document understanding and question answering
- **Database**: Supabase for chat history storage

## API Endpoints

- `GET /api/documents` - List all uploaded documents
- `POST /api/upload` - Upload new documents
- `POST /api/chat` - Send a message and get an AI response based on document context
- `GET /api/chat/:chatId/history` - Get chat history for a specific chat session
- `GET /api/chats` - Get all chat sessions
- `DELETE /api/chats/:chatId` - Delete a chat session and its history

## Troubleshooting

- If you see errors about missing API keys, ensure your `.env` file is properly configured
- Check that the `documents` directory exists at the root level of the project
- Ensure the Groq API key is valid and has sufficient quota
- For PowerShell users: Use semicolons (`;`) instead of ampersands (`&&`) when chaining commands