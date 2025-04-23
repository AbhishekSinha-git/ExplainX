import { useEffect, useRef, useState } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage, Message, MessageType } from "./ChatMessage";
import { Welcome } from "./Welcome";
import { sendMessage, getChatHistory, ChatMessage as ChatMessageType } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface ChatWindowProps {
  selectedChatId?: string | null;
  onChatIdChange?: (chatId: string) => void;
}

export const ChatWindow = ({ selectedChatId = null, onChatIdChange }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatId, setChatId] = useState<string>("");
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  // Fetch chat history when a chat is selected
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['chatHistory', selectedChatId],
    queryFn: () => getChatHistory(selectedChatId || ""),
    enabled: !!selectedChatId,
  });

  // Process chat history when it's loaded
  useEffect(() => {
    if (historyData?.success && historyData.history && !hasLoadedHistory && selectedChatId) {
      // Convert history messages to the right format
      const historyMessages: Message[] = historyData.history.flatMap((msg) => [
        {
          id: `user-${msg.id}`,
          type: "user" as MessageType,
          content: msg.user_message,
          timestamp: new Date(msg.timestamp),
        },
        {
          id: `assistant-${msg.id}`,
          type: "assistant" as MessageType,
          content: msg.assistant_message,
          timestamp: new Date(msg.timestamp),
        }
      ]);
      
      setMessages(historyMessages);
      setChatId(selectedChatId);
      setHasLoadedHistory(true);
    }
  }, [historyData, selectedChatId, hasLoadedHistory]);

  // Reset messages when a new chat is selected or created
  useEffect(() => {
    if (selectedChatId !== chatId) {
      if (!selectedChatId) {
        // Clear messages for new chat
        setMessages([]);
        setChatId("");
        setHasLoadedHistory(false);
      } else {
        // A different chat was selected, history will be loaded by the query
        setHasLoadedHistory(false);
      }
    }
  }, [selectedChatId]);

  // Handle sending a new message
  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Add loading message
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      type: "loading",
      content: "",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, loadingMessage]);
    setIsLoading(true);
    
    try {
      console.log("Sending message to API with chatId:", chatId);
      // Get response from real API
      const response = await sendMessage(content, chatId);
      console.log("API response:", response);
      
      if (response.success) {
        // Update chat ID if it's a new conversation
        if (!chatId && response.chatId) {
          console.log("New chat created with ID:", response.chatId);
          setChatId(response.chatId);
          // Notify parent about the new chat ID
          if (onChatIdChange) {
            console.log("Notifying parent of new chat ID:", response.chatId);
            onChatIdChange(response.chatId);
          }
        }

        // Replace loading message with assistant response
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === loadingMessageId
              ? {
                  id: msg.id,
                  type: "assistant",
                  content: response.answer,
                  timestamp: new Date(),
                }
              : msg
          )
        );
      } else {
        throw new Error(response.answer);
      }
    } catch (error) {
      // Handle error
      console.error("Error getting response:", error);
      // Replace loading message with error message
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === loadingMessageId
            ? {
                id: msg.id,
                type: "assistant",
                content: "Sorry, I encountered an error processing your request. Please try again.",
                timestamp: new Date(),
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {messages.length === 0 ? (
        <Welcome />
      ) : (
        <div className="flex-1 overflow-y-auto chat-scrollbar">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};
