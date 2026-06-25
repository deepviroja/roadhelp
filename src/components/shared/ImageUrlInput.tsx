import { useState } from "react";
import { Image as ImageIcon, Link as LinkIcon, Check, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ImageUrlInputProps {
  currentImage?: string | null;
  onImageChange: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  variant?: "default" | "avatar";
}

export function ImageUrlInput({ currentImage, onImageChange, onRemove, className = "", variant = "default" }: ImageUrlInputProps) {
  const [url, setUrl] = useState("");
  const [isEditing, setIsEditing] = useState(!currentImage);

  const handleSave = () => {
    if (url.trim()) {
      onImageChange(url.trim());
      setIsEditing(false);
    }
  };

  const handleClear = () => {
    setUrl("");
    if (onRemove) onRemove();
    setIsEditing(true);
  };

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait">
        {currentImage && !isEditing ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative group overflow-hidden border border-slate-200 bg-slate-50 ${variant === 'avatar' ? 'rounded-full aspect-square w-full h-full' : 'rounded-2xl w-full h-48'}`}
          >
            <img 
              src={currentImage} 
              alt="Preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Invalid+Image+URL';
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
              <Button 
                size="sm" 
                variant="secondary" 
                className={`rounded-xl font-bold uppercase text-[10px] tracking-widest ${variant === 'avatar' ? 'w-9 h-9 p-0 rounded-full' : 'h-9'}`}
                onClick={() => setIsEditing(true)}
              >
                {variant === 'avatar' ? <ImageIcon className="w-4 h-4" /> : 'Change'}
              </Button>
              {onRemove && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="rounded-xl h-9 w-9 p-0"
                  onClick={handleClear}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-blue-300 bg-slate-50 gap-4 w-full cursor-pointer transition-all ${variant === 'avatar' ? 'rounded-[2rem] aspect-square p-4 h-full' : 'rounded-2xl h-48'}`}
                onClick={() => setIsEditing(true)}
              >
                <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 ${variant === 'avatar' ? 'mb-0' : ''}`}>
                   {variant === 'avatar' ? <User className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                </div>
                
                {variant !== 'avatar' && (
                   <div className="w-full space-y-2 text-center">
                       <p className="text-xs font-bold text-slate-700">Paste Image URL</p>
                       <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Direct link to JPG/PNG</p>
                   </div>
                )}
              </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl p-6 border-slate-100 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 mb-2 tracking-tight">Image Source URL</DialogTitle>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Provide a direct link to an image (JPG, PNG)</p>
              </DialogHeader>
              <div className="flex items-center gap-2 mt-4">
                 <div className="relative flex-1">
                   <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                   <Input 
                     value={url}
                     onChange={(e) => setUrl(e.target.value)}
                     placeholder="https://..."
                     className="pl-9 h-12 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium"
                     onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                     autoFocus
                   />
                 </div>
                 <Button 
                   size="icon"
                   className="h-12 w-12 rounded-xl shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20"
                   onClick={handleSave}
                   disabled={!url.trim()}
                 >
                   <Check className="w-5 h-5" />
                 </Button>
              </div>
              {currentImage && (
                 <Button 
                   variant="ghost" 
                   className="w-full mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700"
                   onClick={() => setIsEditing(false)}
                 >
                   Cancel Editing
                 </Button>
               )}
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
