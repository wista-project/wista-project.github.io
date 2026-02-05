import React, { useState, useCallback } from 'react';
import { GripVertical, RotateCcw, Check, Info } from 'lucide-react';
import { 
  ApiSource, 
  getApiPriority, 
  setApiPriority, 
  resetApiPriority, 
  DEFAULT_API_PRIORITY,
  API_LABELS 
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const ApiPrioritySettings: React.FC = () => {
  const { language } = useLanguage();
  const [priority, setPriority] = useState<ApiSource[]>(getApiPriority());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPriority = [...priority];
    const [draggedItem] = newPriority.splice(draggedIndex, 1);
    newPriority.splice(dropIndex, 0, draggedItem);
    
    setPriority(newPriority);
    setApiPriority(newPriority);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    toast.success(language === 'ja' ? 'API優先順位を更新しました' : 'API priority updated');
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleReset = useCallback(() => {
    resetApiPriority();
    setPriority(DEFAULT_API_PRIORITY);
    toast.success(language === 'ja' ? 'デフォルトの優先順位に戻しました' : 'Reset to default priority');
  }, [language]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === priority.length - 1)
    ) {
      return;
    }

    const newPriority = [...priority];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newPriority[index], newPriority[newIndex]] = [newPriority[newIndex], newPriority[index]];
    
    setPriority(newPriority);
    setApiPriority(newPriority);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {language === 'ja' 
            ? 'ドラッグ&ドロップで優先順位を変更できます。上位のAPIから順に試行されます。'
            : 'Drag and drop to change priority. APIs are tried from top to bottom.'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          {language === 'ja' ? 'リセット' : 'Reset'}
        </Button>
      </div>

      <div className="space-y-2">
        {priority.map((api, index) => {
          const label = API_LABELS[api];
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          
          return (
            <div
              key={api}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isDragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border bg-secondary/50'}
                hover:border-primary/50 hover:bg-secondary
              `}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <GripVertical className="w-4 h-4" />
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {index + 1}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{label.name}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{label.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground truncate">{label.description}</p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === 0}
                  onClick={() => moveItem(index, 'up')}
                >
                  <span className="sr-only">Move up</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === priority.length - 1}
                  onClick={() => moveItem(index, 'down')}
                >
                  <span className="sr-only">Move down</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </div>

              {index === 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {language === 'ja' ? '優先' : 'Primary'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Check className="w-4 h-4 text-primary flex-shrink-0" />
        <span>
          {language === 'ja' 
            ? '変更は自動保存されます。上位のAPIが失敗した場合、自動的に次のAPIに切り替わります。'
            : 'Changes are saved automatically. If a higher priority API fails, it automatically falls back to the next one.'}
        </span>
      </div>
    </div>
  );
};

export default ApiPrioritySettings;
