import React from 'react';
import { Menu, MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  toggleSidebar: () => void;
}

export const Header = ({ toggleSidebar }: HeaderProps) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
    // Redirect will happen automatically due to RequireAuth
  };

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-4 border-b bg-background px-4 md:px-6">
      <Button variant="outline" size="icon" onClick={toggleSidebar} className="md:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
      
      <div className="flex-1 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Explainy Chatbox</h1>
      </div>
      
      <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
        <LogOut className="h-5 w-5" />
        <span className="sr-only">Logout</span>
      </Button>
    </header>
  );
};
