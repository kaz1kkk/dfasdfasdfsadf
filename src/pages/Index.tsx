
import React, { useState, useEffect } from 'react';
import LoginForm from '@/components/LoginForm';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Share, Copy, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Index: React.FC = () => {
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      setSelectedText(selection?.toString() || '');
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleCopy = () => {
    try {
      // If there's selected text, copy that; otherwise, copy the URL
      if (selectedText) {
        navigator.clipboard.writeText(selectedText);
        toast({
          title: "Скопировано",
          description: "Выделенный текст скопирован в буфер обмена",
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Скопировано",
          description: "Ссылка скопирована в буфер обмена",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    const shareData = {
      title: "Geek Records - ЛКПО",
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => {
          toast({
            title: "Поделиться",
            description: "Спасибо, что делитесь нашим сайтом!",
          });
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Share error:", error);
            toast({
              title: "Ошибка",
              description: "Не удалось поделиться: " + error.message,
              variant: "destructive",
            });
          }
        });
    } else {
      // Fallback to copying URL if Web Share API isn't available
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Поделиться",
        description: "Ссылка скопирована, вы можете поделиться ею вручную",
      });
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-gray-900 opacity-80"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full filter blur-3xl"></div>
          
          <div className="futuristic-container w-full max-w-md p-8 mx-auto rounded-lg border border-border/30 backdrop-blur-sm relative z-10">
            <LoginForm />
          </div>
          
          <div className="mt-8 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Geek Records
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="bg-black border border-white/10 text-white w-48 z-50">
        <ContextMenuItem 
          className="focus:bg-white/10 cursor-pointer"
          onClick={handleCopy}
        >
          <Copy className="mr-2 h-4 w-4" />
          <span>Копировать</span>
        </ContextMenuItem>
        <ContextMenuItem 
          className="focus:bg-white/10 cursor-pointer"
          onClick={handleShare}
        >
          <Share className="mr-2 h-4 w-4" />
          <span>Поделиться</span>
        </ContextMenuItem>
        <ContextMenuItem 
          className="focus:bg-white/10 cursor-pointer"
          onClick={handleRefresh}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Обновить страницу</span>
        </ContextMenuItem>
        <ContextMenuItem 
          className="focus:bg-white/10 cursor-pointer hover:bg-white/10"
          onClick={() => window.open('https://geek-records.com/', '_blank')}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>Вернуться на сайт</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default Index;
