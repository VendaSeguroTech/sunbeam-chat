import React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface ChatSidebarFooterProps {
  isOpen: boolean;
  handleLogout: () => Promise<void>;
}

const ChatSidebarFooter: React.FC<ChatSidebarFooterProps> = ({
  isOpen,
  handleLogout,
}) => {
  return (
    <div className="border-t border-border p-4">
      {isOpen ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="justify-start gap-2 text-muted-foreground hover:text-foreground text-xs p-2 h-auto"
            >
              <LogOut className="w-3 h-3" />
              Sair
            </Button>

            <ThemeToggle />
          </div>
          <div className="text-xs text-muted-foreground text-center animate-fade-in">
            VIA v1.0
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <ThemeToggle />
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-6 h-6 p-0 mx-auto flex items-center justify-center"
          >
            <LogOut className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatSidebarFooter;
