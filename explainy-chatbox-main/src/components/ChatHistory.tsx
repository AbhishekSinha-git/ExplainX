import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getChatSessions, deleteChatSession, debugSupabase, ChatSession } from '@/lib/api';
import { MessageCircle, AlertCircle, Trash, Bug } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

interface ChatHistoryProps {
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ onSelectChat, selectedChatId }) => {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: getChatSessions,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: 3
  });

  // Debugging - log what we're getting
  useEffect(() => {
    console.log('Chat history data:', data);
    if (error) console.error('Chat history error:', error);
  }, [data, error]);

  // Force refetch on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
    }, 1000);

    return () => clearTimeout(timer);
  }, [refetch]);

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    
    try {
      const result = await deleteChatSession(chatId);
      
      if (result.success) {
        // Invalidate the sessions query to refetch
        queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
        
        toast({
          title: "Chat deleted",
          description: "The chat history has been successfully deleted.",
          variant: "default"
        });
        
        // If the deleted chat was selected, clear selection
        if (selectedChatId === chatId) {
          onSelectChat('');
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to delete chat history. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sessions = data?.sessions || [];

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Error loading chat history
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <div className="text-center mb-4">
          No chat history yet. Start a new conversation!
        </div>
        
        <div className="mt-4 flex justify-center">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1 text-xs"
            onClick={async () => {
              try {
                const result = await debugSupabase();
                if (result.success) {
                  toast({
                    title: "Success",
                    description: "Supabase connection is working correctly!",
                    variant: "default"
                  });
                  // Force refetch after successful test
                  refetch();
                } else {
                  toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive"
                  });
                }
              } catch (error) {
                console.error("Debug test error:", error);
                toast({
                  title: "Error",
                  description: "Failed to test connection. Check console for details.",
                  variant: "destructive"
                });
              }
            }}
          >
            <Bug className="h-3 w-3" />
            <span>Test Connection</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      {sessions.map((session) => (
        <div key={session.id} className="relative group">
          <Button
            variant={selectedChatId === session.id ? "secondary" : "ghost"}
            className={`w-full justify-start px-2 py-1.5 mb-1 ${
              selectedChatId === session.id ? "bg-secondary" : ""
            }`}
            onClick={() => onSelectChat(session.id)}
          >
            <div className="flex items-start gap-2 w-full overflow-hidden">
              <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-medium text-sm truncate">
                  {session.title || "New Chat"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {session.created_at ? formatDistanceToNow(new Date(session.created_at), { addSuffix: true }) : "Just now"}
                </span>
              </div>
            </div>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
            onClick={(e) => handleDeleteChat(session.id, e)}
            title="Delete chat"
          >
            <Trash className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}; 