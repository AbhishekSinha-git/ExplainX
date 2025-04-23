// API service for interacting with the backend

const API_BASE_URL = 'http://localhost:5000/api';

// Add console logging for debugging the API URL
console.log('API base URL configured as:', API_BASE_URL);

// Interface for document metadata
export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'excel';
  uploadDate: Date;
}

// Interface for chat message
export interface ChatMessage {
  id: string;
  chat_id: string;
  user_message: string;
  assistant_message: string;
  timestamp: Date;
}

// Interface for chat session
export interface ChatSession {
  id: string;
  created_at: string;
  title?: string;
}

/**
 * Upload documents to the server
 * @param files Array of files to upload
 * @returns Promise with upload result
 */
export const uploadDocuments = async (files: File[]): Promise<{ success: boolean; message: string; files?: Document[] }> => {
  try {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('documents', file);
    });
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading documents:', error);
    return { success: false, message: 'Failed to upload documents' };
  }
};

/**
 * Get all uploaded documents
 * @returns Promise with array of documents
 */
export const getDocuments = async (): Promise<{ documents: Document[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { documents: [] };
  }
};

/**
 * Send a message to the chatbot and get a response
 * @param message User message
 * @param chatId Optional chat ID for continuing a conversation
 * @returns Promise with chatbot response
 */
export const sendMessage = async (message: string, chatId?: string): Promise<{ success: boolean; answer: string; chatId: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, chatId }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    return { 
      success: false, 
      answer: 'Sorry, I encountered an error processing your request. Please try again.', 
      chatId: chatId || '' 
    };
  }
};

/**
 * Get chat history for a specific chat
 * @param chatId Chat ID
 * @returns Promise with chat history
 */
export const getChatHistory = async (chatId: string): Promise<{ success: boolean; history: ChatMessage[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/${chatId}/history`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return { success: false, history: [] };
  }
};

/**
 * Get all chat sessions
 * @returns Promise with array of chat sessions
 */
export const getChatSessions = async (): Promise<{ success: boolean; sessions: ChatSession[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chats`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return { success: false, sessions: [] };
  }
};

/**
 * Delete a chat session and its history
 * @param chatId Chat ID to delete
 * @returns Promise with deletion result
 */
export const deleteChatSession = async (chatId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return { success: false, message: 'Failed to delete chat session' };
  }
};

/**
 * Debug function to test Supabase connection
 * @returns Promise with test result
 */
export const debugSupabase = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Testing Supabase connection from frontend...');
    const response = await fetch(`${API_BASE_URL}/debug/supabase`);
    
    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Supabase test result:', data);
    return data;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return { success: false, message: `Connection error: ${error}` };
  }
};