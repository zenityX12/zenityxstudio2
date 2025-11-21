import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PromptHistoryItem {
  id: string;
  prompt: string;
  timestamp: Date;
  modelName: string;
}

interface PromptHistoryProps {
  history: PromptHistoryItem[];
  onSelectPrompt: (prompt: string) => void;
  onClearHistory: () => void;
}

export function PromptHistory({ history, onSelectPrompt, onClearHistory }: PromptHistoryProps) {
  const handleCopy = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Prompt History</DialogTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearHistory}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No prompt history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer group"
                  onClick={() => onSelectPrompt(item.prompt)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium line-clamp-2">{item.prompt}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{item.modelName}</span>
                        <span>•</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(item.prompt);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

