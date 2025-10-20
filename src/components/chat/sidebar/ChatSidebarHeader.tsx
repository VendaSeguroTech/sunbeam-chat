import React from "react";
import { Button } from "@/components/ui/button";
import { Shield, Settings } from "lucide-react";
import sunbeamLogo from "@/assets/logo2.png";
import { useNavigate } from "react-router-dom";

interface ChatSidebarHeaderProps {
  isOpen: boolean;
  isAdmin: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
}

const ChatSidebarHeader: React.FC<ChatSidebarHeaderProps> = ({
  isOpen,
  isAdmin,
  setIsSettingsOpen,
}) => {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        {isOpen ? (
          <>
          <div className="flex items-center gap-2">
            <span 
              className="font-semibold text-2xl text-gray-900"
            >
              Experta
            </span>
          </div>
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            {/* Settings Button */}
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <img
            src={sunbeamLogo}
            alt="Experta"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
          />
        )}
      </div>
    </div>
  );
};

export default ChatSidebarHeader;
