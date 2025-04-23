import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useState, FormEvent, useRef, useEffect } from "react";
import { Send, FileText } from "lucide-react";
import { getDocuments, Document } from "@/lib/api";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocumentMenu, setShowDocumentMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const documentMenuRef = useRef<HTMLDivElement>(null);

  // Fetch documents when component mounts
  useEffect(() => {
    const fetchDocuments = async () => {
      const data = await getDocuments();
      setDocuments(data.documents);
    };
    fetchDocuments();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "0";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + "px";
    }
  }, [message]);

  // Handle Cmd/Ctrl + Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit(e);
      return;
    }

    // Close the document menu on Escape
    if (e.key === "Escape" && showDocumentMenu) {
      setShowDocumentMenu(false);
      return;
    }

    // If @ is typed, show document menu
    if (e.key === "@") {
      const textarea = textareaRef.current;
      if (textarea) {
        // Calculate position for the document menu
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = message.substring(0, cursorPos);
        
        // Get cursor coordinates
        const cursorCoordinates = getCaretCoordinates(textarea, cursorPos);
        
        setMenuPosition({
          top: cursorCoordinates.top + 20,
          left: cursorCoordinates.left
        });
        setShowDocumentMenu(true);
        setCursorPosition(cursorPos + 1); // Add 1 to account for the @ that will be added
      }
    }
  };

  // Handle input changes, including checking for @ symbol
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    // If @ symbol is typed, show the document menu
    const cursorPos = e.target.selectionStart;
    if (newMessage[cursorPos - 1] === '@') {
      // Calculate position for the document menu
      const cursorCoordinates = getCaretCoordinates(e.target, cursorPos);
      
      setMenuPosition({
        top: cursorCoordinates.top + 20,
        left: cursorCoordinates.left
      });
      setShowDocumentMenu(true);
      setCursorPosition(cursorPos);
    } else if (showDocumentMenu) {
      // Check if we're still in the mention context
      const textBeforeCursor = newMessage.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex === -1 || textBeforeCursor.substring(lastAtIndex).includes(' ')) {
        setShowDocumentMenu(false);
      }
    }
  };

  // Insert the selected document name into the message
  const insertDocumentMention = (doc: Document) => {
    const beforeCursor = message.substring(0, cursorPosition - 1); // Remove the @ symbol
    const afterCursor = message.substring(cursorPosition);
    
    // Insert the document name with the @ symbol
    const newMessage = `${beforeCursor}@${doc.name} ${afterCursor}`;
    setMessage(newMessage);
    setShowDocumentMenu(false);
    
    // Focus the textarea again
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Helper function to get caret coordinates in the textarea
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const { offsetLeft, offsetTop } = element;
    
    // Create a temporary mirror element to calculate position
    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    
    // Copy styles that affect positioning
    const styles = window.getComputedStyle(element);
    ['font-family', 'font-size', 'font-weight', 'line-height', 'padding-left', 'padding-top', 'padding-right', 'padding-bottom', 'width', 'box-sizing', 'border'].forEach(prop => {
      mirror.style[prop as any] = styles.getPropertyValue(prop);
    });
    
    // Create text content up to the caret position
    mirror.textContent = element.value.substring(0, position);
    
    // Add a span at the caret position
    const span = document.createElement('span');
    span.textContent = '.';  // Needed for measurement
    mirror.appendChild(span);
    
    document.body.appendChild(mirror);
    const coords = {
      top: span.offsetTop + offsetTop,
      left: span.offsetLeft + offsetLeft
    };
    document.body.removeChild(mirror);
    
    return coords;
  };

  // Click outside to close the document menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (documentMenuRef.current && !documentMenuRef.current.contains(e.target as Node)) {
        setShowDocumentMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [documentMenuRef]);

  return (
    <div className="sticky bottom-0 w-full bg-background/80 backdrop-blur-md border-t border-border p-4 transition-all duration-300">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end max-w-3xl mx-auto gap-2"
      >
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents... (Type @ to mention a specific document)"
            className={cn(
              "min-h-[60px] max-h-[200px] p-4 pr-12 resize-none rounded-xl border border-input bg-background shadow-sm transition-all duration-200",
              "focus:ring-1 focus:ring-ring"
            )}
            disabled={isLoading}
          />
          {showDocumentMenu && documents.length > 0 && (
            <div 
              ref={documentMenuRef}
              style={{ 
                top: `${menuPosition.top}px`, 
                left: `${menuPosition.left}px`,
                position: 'absolute',
                zIndex: 100
              }}
              className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px] max-w-[300px] max-h-[250px] overflow-y-auto"
            >
              <div className="p-2 text-xs font-medium border-b text-gray-500 dark:text-gray-400">
                Documents
              </div>
              <ul className="py-1">
                {documents.map((doc) => (
                  <li 
                    key={doc.id}
                    onClick={() => insertDocumentMention(doc)}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 text-sm"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="truncate">{doc.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="absolute right-3 bottom-3">
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || isLoading}
              className="rounded-full h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
      <div className="text-xs text-center text-muted-foreground mt-2">
        <span className="opacity-70">
          Press <kbd className="px-1 py-0.5 rounded bg-muted">⌘</kbd> +{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> to send.
          Type <kbd className="px-1 py-0.5 rounded bg-muted">@</kbd> to mention a document.
        </span>
      </div>
    </div>
  );
};
