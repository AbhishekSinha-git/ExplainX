import React from 'react';
import { 
  Sidebar as UISidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton
} from "@/components/ui/sidebar";
import { File, FolderClosed, BookOpen, MessageSquare, Plus, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChatId?: string | null;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
}

import { useQuery } from '@tanstack/react-query';
import { getDocuments, Document } from '@/lib/api';
import { ChatHistory } from './ChatHistory';

export const Sidebar = ({ 
  isOpen, 
  onClose, 
  selectedChatId = null, 
  onSelectChat = () => {}, 
  onNewChat = () => {}
}: SidebarProps) => {
  const { logout } = useAuth();
  const { data, isLoading, error } = useQuery<{ documents: Document[] }, Error>({ 
    queryKey: ['documents'],
    queryFn: getDocuments
  });
  const documents = data?.documents || [];
  
  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
  };

  if (isLoading) {
    return (
      <UISidebar>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">Loading documents...</div>
        </SidebarContent>
      </UISidebar>
    );
  }

  if (error) {
    return (
      <UISidebar>
        <SidebarContent>
          <div className="p-4 text-sm text-red-500">Error loading documents. Please try again.</div>
        </SidebarContent>
      </UISidebar>
    );
  }
  
  // Calculate document type counts
  const documentCounts = {
    pdf: documents.filter(doc => doc.type === 'pdf').length,
    word: documents.filter(doc => doc.type === 'word').length,
    excel: documents.filter(doc => doc.type === 'excel').length,
  };

  // Map file types to icons
  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <File className="h-4 w-4 text-red-500" />;
      case "word":
        return <File className="h-4 w-4 text-blue-500" />;
      case "excel":
        return <File className="h-4 w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <UISidebar>
      <SidebarContent>
        <SidebarHeader>
          <div className="flex items-center justify-between p-2">
            <h2 className="font-medium text-lg">Explainy</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNewChat}
              title="Start new chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </SidebarHeader>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Chat History</span>
          </SidebarGroupLabel>
          
          <ChatHistory 
            onSelectChat={onSelectChat} 
            selectedChatId={selectedChatId} 
          />
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <FolderClosed className="h-4 w-4" />
            <span>All Documents</span>
            <Badge variant="secondary" className="ml-auto font-normal text-xs">
              {documents.length}
            </Badge>
          </SidebarGroupLabel>
          
          <SidebarMenu>
            {documents.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No documents uploaded yet
              </div>
            ) : (
              documents.map((doc) => (
                <SidebarMenuItem key={doc.id}>
                  <SidebarMenuButton className="w-full text-left" tooltip={doc.name}>
                    {getFileIcon(doc.type)}
                    <span>{doc.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Document Types</span>
          </SidebarGroupLabel>
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full text-left">
                <File className="h-4 w-4 text-red-500" />
                <span>PDF Documents</span>
                <Badge className="ml-auto">{documentCounts.pdf}</Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full text-left">
                <File className="h-4 w-4 text-blue-500" />
                <span>Word Documents</span>
                <Badge className="ml-auto">{documentCounts.word}</Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full text-left">
                <File className="h-4 w-4 text-green-500" />
                <span>Excel Documents</span>
                <Badge className="ml-auto">{documentCounts.excel}</Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </SidebarFooter>
    </UISidebar>
  );
};

// Re-export SidebarProvider from ui/sidebar
export { SidebarProvider } from "@/components/ui/sidebar";
