
import { cn } from "@/lib/utils";
import { Avatar } from "./ui/avatar";
import { Bot, User } from "lucide-react";

export type MessageType = "system" | "user" | "assistant" | "loading";

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
}

export const ChatMessage = ({ message, isLastMessage }: ChatMessageProps) => {
  const isUser = message.type === "user";
  const isLoading = message.type === "loading";
  
  return (
    <div
      className={cn(
        "group flex gap-3 p-4 transition-all",
        isUser ? "bg-accent/50" : "bg-background",
        isLastMessage && isLoading && "animate-pulse"
      )}
    >
      <Avatar
        className={cn(
          "h-8 w-8 rounded-md border border-border flex items-center justify-center",
          !isUser && "bg-primary text-primary-foreground",
          isUser && "bg-secondary"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </Avatar>
      
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            {isUser ? "You" : "Explainx"}
          </p>
          <span className="text-xs text-muted-foreground">
            {isLoading 
              ? "Typing..." 
              : new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
            }
          </span>
        </div>
        
        <div className={cn("prose prose-sm max-w-none", 
          isLoading && "animate-pulse"
        )}>
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-foreground/50 animate-pulse"></div>
              <div className="h-2 w-2 rounded-full bg-foreground/50 animate-pulse delay-75"></div>
              <div className="h-2 w-2 rounded-full bg-foreground/50 animate-pulse delay-150"></div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
};
