import express from 'express'; //The web framework for creating the API server.
import cors from 'cors';  //Middleware to allow requests from different origins (like your frontend).
import multer from 'multer';  //Middleware to handle file uploads.
import path from 'path';
import fs from 'fs';  //Node.js module for interacting with the file system (reading/writing files, checking directories).
import { fileURLToPath } from 'url'; //Utilities to work with file paths in ES Modules.
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; //Library to make HTTP requests (used here to call the Groq API).
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;  // Use 5001 as default port to avoid conflicts

// Initialize Groq API client (using fetch)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-70b-8192'; // Using the powerful llama3-70b model

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Store document content in memory (in a production app, use a database)
let documentStore = {};

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up documents directory path
const documentsDir = path.join(path.dirname(__dirname), 'documents');

// Ensure documents directory exists
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Function to process a document file
async function processDocument(filePath) {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath).toLowerCase();
  let text = '';
  
  console.log(`Processing document: ${fileName}`);
  
  try {
    // Check if file exists and is accessible
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return;
    }
    
    // Extract text based on file type
    if (fileExt === '.pdf') {
      console.log(`Extracting text from PDF: ${fileName}`);
      text = await extractTextFromPDF(filePath);
    } else if (['.doc', '.docx'].includes(fileExt)) {
      console.log(`Extracting text from Word document: ${fileName}`);
      text = await extractTextFromWord(filePath);
    } else {
      console.log(`Unsupported file type: ${fileExt}`);
      return;
    }
    
    // Check if text was successfully extracted
    if (!text || text.trim() === '') {
      console.warn(`No text content extracted from ${fileName}`);
      text = `[Empty or unreadable document: ${fileName}]`;
    } else {
      console.log(`Extracted ${text.length} characters from ${fileName}`);
    }
    
    // Store document content with a unique ID
    const docId = Date.now() + '-' + fileName;
    documentStore[docId] = {
      id: docId,
      name: fileName,
      text: text,
      uploadDate: new Date()
    };
    
    console.log(`Document processed and stored with ID: ${docId}`);
    
    // Log the current state of the document store
    console.log(`Document store now contains ${Object.keys(documentStore).length} documents`);
  } catch (error) {
    console.error(`Error processing document ${fileName}:`, error);
  }
}

// Process all existing documents in the directory
fs.readdir(documentsDir, async (err, files) => {
  if (err) {
    console.error('Error reading documents directory:', err);
    return;
  }
  
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf') || 
        file.toLowerCase().endsWith('.doc') || 
        file.toLowerCase().endsWith('.docx')) {
      await processDocument(path.join(documentsDir, file));
    }
  }
});

// Enhanced file watcher with error handling and continuous monitoring
const watcher = fs.watch(documentsDir, { persistent: true }, async (eventType, filename) => {
  try {
    if (eventType === 'rename' && filename) {
      const filePath = path.join(documentsDir, filename);
      
      // Wait for file to be fully written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (fs.existsSync(filePath) && 
          (filename.toLowerCase().endsWith('.pdf') || 
           filename.toLowerCase().endsWith('.doc') || 
           filename.toLowerCase().endsWith('.docx'))) {
        await processDocument(filePath);
        
        // Update document context
        const documentContext = Object.values(documentStore)
          .map(doc => doc.text)
          .join('\n\n');
        
        console.log(`New document processed: ${filename}`);
      } else if (!fs.existsSync(filePath)) {
        // Handle file deletion
        const docId = Object.keys(documentStore).find(key => key.includes(filename));
        if (docId) {
          delete documentStore[docId];
          console.log(`Document removed: ${filename}`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing document change:', error);
  }
});

// Handle watcher errors
watcher.on('error', error => {
  console.error('File watcher error:', error);
  // Attempt to restart watcher
  setTimeout(() => {
    watcher.close();  // Close the broken watcher
    fs.watch(documentsDir, watcher.listener);  // Recreate watcher
  }, 1000);
});

// Configure CORS Allows frontend applications (e.g., React/Vue) on different domains/ports to access the API.
app.use(cors());
app.use(express.json());

// Root route handler (API Documentation)
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Explainy Chatbox API',
    endpoints: {
      documents: {
        upload: 'POST /api/upload',  //Endpoint for uploading documents.
        list: 'GET /api/documents' //Endpoint for listing all uploaded documents.
      },
      chat: {
        sendMessage: 'POST /api/chat',  //Endpoint for sending a chat message.
        getHistory: 'GET /api/chat/:chatId/history'  //Endpoint for retrieving the chat history of a specific chat, where :chatId is a placeholder for the chat's unique identifier.
      }
    }
  });
});

// Configure file upload storage, Multer is a Node.js middleware designed for handling multipart/form-data
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }
    cb(null, documentsDir);
  },
  filename: function (req, file, cb) {  //Generates unique filenames using timestamp + original name.
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only PDF and Word documents Rejects non-PDF/Word files with an error.
    // Configures file upload validation and handling.
    if (
      file.mimetype === 'application/pdf' ||  //Multipurpose Internet Mail Extensions
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'));
    }
  }
});

// Extract text from PDF files
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error extracting text from PDF ${path.basename(filePath)}:`, error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// Extract text from Word documents
async function extractTextFromWord(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error(`Error extracting text from Word document ${path.basename(filePath)}:`, error);
    throw new Error(`Failed to extract text from Word document: ${error.message}`);
  }
} //Supports: Both .doc (old format) and .docx (modern format).

// API endpoint to upload documents
app.post('/api/upload', upload.array('documents'), async (req, res) => {
  try {
    const uploadedFiles = [];
    
    for (const file of req.files) {
      let text = '';
      
      // Extract text based on file type
      if (file.mimetype === 'application/pdf') {
        text = await extractTextFromPDF(file.path);
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'  //mime : standard way of identifying the type of data being sent over the internet
      ) {
        text = await extractTextFromWord(file.path);
      }
      
      // Store document content with a unique ID
      const docId = Date.now() + '-' + file.originalname;
      documentStore[docId] = {
        id: docId,
        name: file.originalname,
        text: text,
        uploadDate: new Date()
      };
      
      uploadedFiles.push({
        id: docId,
        name: file.originalname,
        type: file.mimetype.includes('pdf') ? 'pdf' : 'word',
        uploadDate: new Date()
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: `${req.files.length} files uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API endpoint to get all uploaded documents
app.get('/api/documents', (req, res) => {
  const documents = Object.values(documentStore).map(doc => ({
    id: doc.id,
    name: doc.name,
    type: doc.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'word',
    uploadDate: doc.uploadDate
  }));
  
  res.status(200).json({ documents });
});

// Diagnostic endpoint to check document store status
app.get('/api/diagnostics', (req, res) => {
  try {
    // Count documents by type
    const pdfCount = Object.values(documentStore).filter(doc => 
      doc.name.toLowerCase().endsWith('.pdf')).length;
    
    const wordCount = Object.values(documentStore).filter(doc => 
      doc.name.toLowerCase().endsWith('.doc') || 
      doc.name.toLowerCase().endsWith('.docx')).length;
    
    // Calculate total text content size
    const totalTextLength = Object.values(documentStore)
      .reduce((sum, doc) => sum + (doc.text ? doc.text.length : 0), 0);
    
    // Get list of documents in the folder
    const documentsInFolder = fs.readdirSync(documentsDir)
      .filter(file => file.toLowerCase().endsWith('.pdf') || 
                      file.toLowerCase().endsWith('.doc') || 
                      file.toLowerCase().endsWith('.docx'));
    
    res.status(200).json({
      status: 'ok',
      documentStoreStatus: {
        totalDocuments: Object.keys(documentStore).length,
        pdfDocuments: pdfCount,
        wordDocuments: wordCount,
        totalTextLength: totalTextLength,
        averageTextLength: totalTextLength / (Object.keys(documentStore).length || 1)
      },
      documentsInFolder: documentsInFolder,
      apiStatus: {
        groqApiConfigured: !!GROQ_API_KEY,
        supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
      }
    });
  } catch (error) {
    console.error('Error in diagnostics endpoint:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// API endpoint to get all chat sessions
app.get('/api/chats', async (req, res) => {
  try {
    console.log('Fetching all chat sessions from Supabase');
    
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error querying chats table:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} chat sessions`);
    
    if (!data || data.length === 0) {
      return res.status(200).json({ success: true, sessions: [] });
    }
    
    // Get the first message from each chat to use as a title
    const sessions = await Promise.all(data.map(async (chat) => {
      try {
        console.log(`Fetching title for chat ID: ${chat.id}`);
        
        const { data: historyData, error: historyError } = await supabase
          .from('chat_history')
          .select('user_message')
          .eq('chat_id', chat.id)
          .order('timestamp', { ascending: true })
          .limit(1);
        
        if (historyError) {
          console.error(`Error fetching history for chat ${chat.id}:`, historyError);
          return chat;
        }
        
        if (historyData && historyData.length > 0) {
          const title = historyData[0].user_message.substring(0, 30) + (historyData[0].user_message.length > 30 ? '...' : '');
          console.log(`Created title for chat ${chat.id}: "${title}"`);
          return { ...chat, title };
        } else {
          console.log(`No messages found for chat ${chat.id}`);
        }
        
        return chat;
      } catch (innerError) {
        console.error(`Error processing chat ${chat.id}:`, innerError);
        return chat;
      }
    }));
    
    console.log(`Returning ${sessions.length} formatted chat sessions`);
    res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API endpoint to get chat history
app.get('/api/chat/:chatId/history', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    res.status(200).json({ success: true, history: data });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API endpoint to delete a chat session and its history
app.delete('/api/chats/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log(`Deleting chat session: ${chatId}`);

    // First delete all chat history for this chat
    const { error: historyError } = await supabase
      .from('chat_history')
      .delete()
      .eq('chat_id', chatId);
    
    if (historyError) {
      console.error('Error deleting chat history:', historyError);
      throw historyError;
    }
    
    // Then delete the chat session itself
    const { error: chatError } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);
    
    if (chatError) {
      console.error('Error deleting chat session:', chatError);
      throw chatError;
    }
    
    console.log(`Successfully deleted chat session: ${chatId}`);
    res.status(200).json({ success: true, message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Error in delete chat endpoint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, chatId } = req.body;
    
    console.log('Received chat request:', { message, chatId });
    
    // Check if document store has any documents
    if (Object.keys(documentStore).length === 0) {
      console.log('No documents found in document store');
      return res.status(400).json({ 
        success: false, 
        answer: 'No documents have been uploaded yet. Please upload some documents first.' 
      });
    }
    
    // Check if user is targeting a specific document using @document_name syntax
    const documentMentionRegex = /@([^\s]+)/;
    const mentionMatch = message.match(documentMentionRegex);
    let targetDocumentName = null;
    let cleanedMessage = message;
    
    if (mentionMatch && mentionMatch[1]) {
      targetDocumentName = mentionMatch[1];
      console.log(`User is targeting document: ${targetDocumentName}`);
      
      // Remove the @mention from the message for processing
      cleanedMessage = message.replace(documentMentionRegex, '').trim();
      
      // Check if any document matches or partially matches the mentioned name
      const matchingDocIds = Object.keys(documentStore).filter(docId => {
        const docName = documentStore[docId].name.toLowerCase();
        return docName.includes(targetDocumentName.toLowerCase());
      });
      
      if (matchingDocIds.length === 0) {
        return res.status(400).json({
          success: false,
          answer: `I couldn't find any document matching "${targetDocumentName}". Please check the document name and try again.`
        });
      }
      
      if (matchingDocIds.length > 1) {
        const docNames = matchingDocIds.map(id => `"${documentStore[id].name}"`).join(', ');
        console.log(`Multiple matching documents found: ${docNames}`);
      }
    }
    
    // Combine document texts for context (either all or just the targeted one)
    let documentContext;
    if (targetDocumentName) {
      // Find documents that match the name
      const matchingDocIds = Object.keys(documentStore).filter(docId => {
        const docName = documentStore[docId].name.toLowerCase();
        return docName.includes(targetDocumentName.toLowerCase());
      });
      
      // Use the first matching document (most relevant match)
      if (matchingDocIds.length > 0) {
        const targetDocId = matchingDocIds[0];
        documentContext = documentStore[targetDocId].text;
        console.log(`Using targeted document: ${documentStore[targetDocId].name}`);
      } else {
        // Fallback to all documents if no match (shouldn't happen with the earlier check)
        documentContext = Object.values(documentStore)
          .map(doc => doc.text)
          .join('\n\n');
      }
    } else {
      // If no specific document targeted, use all documents
      documentContext = Object.values(documentStore)
        .map(doc => doc.text)
        .join('\n\n');
    }
    
    console.log(`Document context length: ${documentContext.length} characters`);
    
    // If no documents are uploaded, return an error
    if (!documentContext || documentContext.trim() === '') {
      console.log('Empty document context');
      return res.status(400).json({ 
        success: false, 
        answer: 'No documents have been uploaded yet. Please upload some documents first.' 
      });
    }
    
    // Verify Groq API key
    if (!GROQ_API_KEY) {
      console.log('Missing Groq API key');
      return res.status(500).json({
        success: false,
        answer: 'API configuration error. Please contact support.'
      });
    }

    // Create prompt for the model with a more structured format
    const prompt = `You are a helpful assistant that answers questions based on document content. 
    
Context information from documents:
${documentContext.substring(0, 600)}

User question: ${cleanedMessage}

Provide a clear and concise answer based only on the context information.`;
    
    console.log('Sending request to Groq API');
    
    // Query Groq API
    let response;
    try {
      console.log('Attempting to use Groq API');
      let apiResponse;
      
      try {
        // Format the prompt for the chat completion API
        console.log('Trying model: llama3-70b-8192');
        
        // Create system message with document context
        const systemMessage = `You are a helpful assistant that answers questions based on document content. Your task is to provide clear, accurate responses based solely on the information in the provided documents.`;
        
        // Create user message with the question and document context
        const userMessage = `I have the following document content:
${documentContext.substring(0, 1500)} //User Role: Provides truncated document context (1,500 chars) and the question.

My question is: ${cleanedMessage}

Please answer based only on the information in these documents.`;
        
        apiResponse = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.7,  //temperature: Lower values (0.7) make responses more focused
            max_tokens: 1000,  //max_tokens: Restricts response to ~1000 tokens (≈750 words).
            top_p: 0.95 //top_p: High value (0.95) allows broader word selection.
          })
        });
        
        // If we got here, the API call was successful
        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(`Groq API error: ${JSON.stringify(errorData)}`);
        }
        
        const responseData = await apiResponse.json();
        console.log('Groq API call successful');
        response = responseData.choices[0].message.content.trim();
      } catch (primaryModelError) {
        // If the primary model fails, try a fallback document search approach
        console.log('Groq API failed:', primaryModelError.message);
        console.log('Falling back to direct document search');
        throw primaryModelError; // Pass to the outer catch block to trigger document search
      }
      
      // Add source information to the API response
      response += "\n\nThis response was generated using Groq's AI based on information from your documents.";
    } catch (groqError) {
      // If Groq API call fails, log the error and fall back to document search
      console.error('Groq API error:', groqError);
      console.log('Error details:', groqError.message);
      console.log('Falling back to direct document search');
      
      try {
        // Enhanced document search mechanism as fallback
        const keywords = cleanedMessage.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        console.log(`Searching for keywords: ${keywords.join(', ')}`);
        
        // Improved paragraph extraction and scoring
        let matchingParagraphs = [];
        
        // Make sure we have the latest document store content
        console.log(`Searching through ${Object.keys(documentStore).length} documents`);
        
        // Split the document context into paragraphs and analyze each document separately
        Object.values(documentStore).forEach(doc => {
          // Log document details including upload time
          const uploadTimeAgo = Math.round((Date.now() - doc.uploadDate.getTime()) / 1000);
          console.log(`Analyzing document: ${doc.name}, Upload time: ${doc.uploadDate.toISOString()}, ${uploadTimeAgo} seconds ago`);
          
          const paragraphs = doc.text.split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p.length > 30); // Filter out very short paragraphs
          
          console.log(`Document ${doc.name} has ${paragraphs.length} paragraphs`);
          
          paragraphs.forEach(paragraph => {
            const paragraphLower = paragraph.toLowerCase();
            
            // Calculate basic keyword match score
            const keywordMatches = keywords.filter(keyword => paragraphLower.includes(keyword));
            const matchScore = keywordMatches.length;
            
            // Only consider paragraphs with at least one keyword match
            if (matchScore > 0) {
              // Additional relevance scoring - exact matches get higher scores
              let relevanceScore = matchScore;
              
              // Boost score for paragraphs containing multiple keywords
              if (keywordMatches.length > 1) {
                relevanceScore += Math.pow(2, keywordMatches.length - 1); // Exponential boost for multiple matches
              }
              
              // Boost score for paragraphs that have keywords close to each other
              if (keywordMatches.length > 1) {
                // Simple heuristic: shorter paragraphs with multiple keywords are likely more relevant
                relevanceScore += 500 / (paragraph.length + 1);
              }
              
              // Boost score for paragraphs that appear to be headings or titles
              if (paragraph.length < 200 && paragraph.length > 20 && 
                  (paragraph.includes(':') || /[A-Z][A-Z]/.test(paragraph))) {
                relevanceScore += 2;
              }
              
              // Add to matching paragraphs
              matchingParagraphs.push({
                text: paragraph,
                score: relevanceScore,
                source: doc.name
              });
            }
          });
        });
        
        console.log(`Found ${matchingParagraphs.length} relevant paragraphs`);
        
        // Sort by relevance score
        matchingParagraphs.sort((a, b) => b.score - a.score);
        
        // Take top results
        const topResults = matchingParagraphs.slice(0, 5);
        
        if (topResults.length > 0) {
          // Format a helpful response
          let searchResponse = `Based on your question about "${cleanedMessage}", I found these relevant sections:\n\n`;
          
          topResults.forEach((result, index) => {
            // Include the source document name for each result
            searchResponse += `${index + 1}. From "${result.source}": ${result.text.trim()}\n\n`;
          });
          
          // Add a summary of which documents were used
          const uniqueSources = [...new Set(topResults.map(result => result.source))];
          searchResponse += `Information was found in the following document(s): ${uniqueSources.join(', ')}.\n\n`;
          
          searchResponse += "If you need more specific details, please ask a more focused question.";
          response = searchResponse;
        } else {
          response = "I couldn't find information in the documents that directly matches your query. Please try rephrasing your question or ask about a different topic covered in the documents.";
        }
      } catch (searchError) {
        console.error('Document search error:', searchError);
        
        // Ultra simple fallback if even our document search fails
        response = "I encountered an error searching through the documents. Please try a simpler question or check that your documents contain relevant information.";
      }
    }
    
    // Try/catch specifically for Supabase operations
    try {
      // Store chat history in Supabase if chatId is provided
      if (chatId) {
        try {
          await supabase.from('chat_history').insert([
            {
              chat_id: chatId,
              user_message: cleanedMessage,
              assistant_message: response,
              timestamp: new Date()
            }
          ]);
        } catch (supabaseError) {
          console.error('Error saving to chat history:', supabaseError);
          // Continue despite Supabase error
        }
      } else {
        // Create a new chat session
        // Creates a new chat record.
        // Stores the first Q&A pair.
        // Returns newChatId to the client for future interactions.

        try {
          console.log('Creating new chat session in Supabase...');
          const { data, error } = await supabase.from('chats').insert([
            { created_at: new Date() }
          ]).select();
          
          if (error) {
            console.error('Error creating chat session:', error);
            // Return answer without chat history
            return res.status(200).json({ 
              success: true, 
              answer: response,
              chatId: null
            });
          }
          
          console.log('New chat session created with ID:', data[0].id);
          const newChatId = data[0].id;
          
          try {
            console.log('Saving first message to chat history...');
            await supabase.from('chat_history').insert([
              {
                chat_id: newChatId,
                user_message: cleanedMessage,
                assistant_message: response,
                timestamp: new Date()
              }
            ]);
            console.log('First message saved successfully!');
          } catch (historyError) {
            console.error('Error saving to new chat history:', historyError);
            // Continue despite history error
          }
          
          return res.status(200).json({ 
            success: true, 
            answer: response, 
            chatId: newChatId 
          });
        } catch (chatError) {
          console.error('Error in chat creation:', chatError);
          // Return answer without chat history
          return res.status(200).json({ 
            success: true, 
            answer: response,
            chatId: null
          });
        }
      }
      
      // If we get here with chatId, respond with it
      return res.status(200).json({ success: true, answer: response, chatId });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      // Even if DB operations fail, still return the answer
      return res.status(200).json({ 
        success: true, 
        answer: response,
        note: 'Chat history not saved due to a database error'
      });
    }
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      success: false, 
      answer: 'Sorry, I encountered an error processing your request. Please try again.'
    });
  }
});

// Debugging endpoint to check Supabase connection
app.get('/api/debug/supabase', async (req, res) => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test connection to chats table
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('count')
      .limit(1);
    
    if (chatsError) {
      console.error('Error accessing chats table:', chatsError);
      return res.status(500).json({
        success: false, 
        message: 'Error accessing chats table',
        error: chatsError
      });
    }
    
    // Test connection to chat_history table
    const { data: historyData, error: historyError } = await supabase
      .from('chat_history')
      .select('count')
      .limit(1);
    
    if (historyError) {
      console.error('Error accessing chat_history table:', historyError);
      return res.status(500).json({
        success: false, 
        message: 'Error accessing chat_history table',
        error: historyError
      });
    }
    
    // Test insert permission on chats table
    const testTimestamp = new Date().toISOString();
    const { data: insertData, error: insertError } = await supabase
      .from('chats')
      .insert([{ created_at: testTimestamp }])
      .select();
    
    if (insertError) {
      console.error('Error inserting test data into chats table:', insertError);
      return res.status(500).json({
        success: false, 
        message: 'Error inserting test data into chats table',
        error: insertError
      });
    }
    
    // Test insert permission on chat_history table
    const testChatId = insertData[0].id;
    const { error: historyInsertError } = await supabase
      .from('chat_history')
      .insert([{
        chat_id: testChatId,
        user_message: 'Test message',
        assistant_message: 'Test response',
        timestamp: testTimestamp
      }]);
    
    if (historyInsertError) {
      console.error('Error inserting test data into chat_history table:', historyInsertError);
      return res.status(500).json({
        success: false, 
        message: 'Error inserting test data into chat_history table',
        error: historyInsertError
      });
    }
    
    // Clean up test data
    await supabase.from('chat_history').delete().eq('chat_id', testChatId);
    await supabase.from('chats').delete().eq('id', testChatId);
    
    console.log('Supabase connection and permissions verified successfully!');
    return res.status(200).json({
      success: true,
      message: 'Supabase connection and permissions verified successfully!'
    });
  } catch (error) {
    console.error('Error in Supabase debug endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing Supabase connection',
      error: error.message
    });
  }
});

// Start the server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});