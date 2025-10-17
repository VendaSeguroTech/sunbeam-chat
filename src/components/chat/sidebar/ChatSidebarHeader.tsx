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
    <div className="border-b border-border p-4">
      <div className="flex items-center justify-between">
        {isOpen ? (
          <>
          <div className="flex items-center gap-2">
            <span 
              className="font-light text-5xl animate-fade-in ml-10"
              style={{
                background: 'linear-gradient(90deg, #FFDBB5 0%, #FFAA7F 25%, #FF8A95 50%, #B68AC8 75%, #8FC5ED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Experta
            </span>
            <img
              src={sunbeamLogo}
              alt="Experta"
              className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
            />
          </div>
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            {/* Settings Button */}
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <img
            src={sunbeamLogo}
            alt="Experta"
            className="w-8 h-8 rounded-lg object-contain flex-shrink-0 mt-10"
          />
        )}
      </div>
    </div>
  );
};

export default ChatSidebarHeader;
