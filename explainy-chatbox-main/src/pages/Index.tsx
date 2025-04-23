import { useState } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { Header } from "@/components/Header";
import { Sidebar, SidebarProvider } from "@/components/Sidebar";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleNewChat = () => {
    setSelectedChatId(null);
  };
  
  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };
  
  const handleChatIdChange = (chatId: string) => {
    setSelectedChatId(chatId);
  };
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col">
        <Header toggleSidebar={toggleSidebar} />
        
        <div className="flex-1 flex">
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
          />
          
          <main className="flex-1 transition-all duration-300 md:ml-72">
            <ChatWindow 
              selectedChatId={selectedChatId} 
              onChatIdChange={handleChatIdChange} 
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
