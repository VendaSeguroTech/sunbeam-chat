import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatSidebarNewButtonProps {
  isOpen: boolean;
  handleNewConversation: () => void;
}

const ChatSidebarNewButton: React.FC<ChatSidebarNewButtonProps> = ({
  isOpen,
  handleNewConversation,
}) => {
  return (
    <div className="p-4">
      <Button
        onClick={handleNewConversation}
        variant="default"
        className={`${
          isOpen ? "w-full justify-start gap-2" : "w-10 h-10 p-0 mx-auto"
        } bg-[#2C5F8D] hover:bg-[#234B73] text-white rounded-full transition-all duration-200`}
      >
        <Plus className="w-4 h-4 flex-shrink-0" />
        {isOpen && <span className="animate-fade-in">Novo Chat</span>}
      </Button>
    </div>
  );
};

export default ChatSidebarNewButton;
