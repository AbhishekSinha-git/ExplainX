
import { ChevronRight, FileText, MessageSquare, Search } from "lucide-react";

export const Welcome = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center mb-20">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-glow-pulse">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-display font-medium tracking-tight mb-2">
        Welcome to Explainx
      </h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Ask questions about your documents and get instant answers powered by AI.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
        {[
          {
            icon: FileText,
            title: "Upload Documents",
            description: "Add PDF and Word documents to analyze.",
          },
          {
            icon: Search,
            title: "Ask Questions",
            description: "Get instant answers from your document library.",
          },
          {
            icon: MessageSquare,
            title: "Chat Interface",
            description: "Continue the conversation with follow-up questions.",
          },
        ].map((item, i) => (
          <div 
            key={i}
            className="glass-panel rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 hover:translate-y-[-5px] animate-fade-in"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-medium mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-sm text-muted-foreground flex items-center">
        <span>Start by asking a question about your documents</span>
        <ChevronRight className="h-4 w-4 ml-1" />
      </div>
    </div>
  );
};
