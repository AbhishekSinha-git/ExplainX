import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Upload, File, Loader2 } from 'lucide-react';
import { uploadDocuments } from '@/lib/api';
import { useToast } from './ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      // Filter for only PDF and Word documents
      const validFiles = fileArray.filter(file => {
        const isValid = 
          file.type === 'application/pdf' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword';
        
        if (!isValid) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not a PDF or Word document`,
            variant: 'destructive'
          });
        }
        
        return isValid;
      });
      
      setSelectedFiles(validFiles);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one PDF or Word document',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadDocuments(selectedFiles);
      
      if (result.success) {
        toast({
          title: 'Upload successful',
          description: result.message,
        });
        setSelectedFiles([]);
        // Refresh the documents list
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        onUploadSuccess();
      } else {
        toast({
          title: 'Upload failed',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Upload error',
        description: 'An unexpected error occurred while uploading files',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full p-4 border border-dashed border-border rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium mb-1">Upload Documents</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select PDF and Word documents from your computer
          </p>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
        />
        
        <Button 
          onClick={handleSelectFiles}
          variant="outline"
          className="mb-2"
        >
          Select Files
        </Button>
        
        {selectedFiles.length > 0 && (
          <div className="w-full">
            <div className="text-sm font-medium mb-2">
              Selected Files ({selectedFiles.length}):
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2 mb-4 p-2 bg-accent/50 rounded-md">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <File className="h-4 w-4" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Documents'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};