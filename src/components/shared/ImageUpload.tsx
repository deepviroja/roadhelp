import { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Image as ImageIcon, Upload, X, Loader2, User } from "lucide-react";
const storage = null; // import { storage } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadProps {
  currentImage?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  className?: string;
  variant?: "default" | "avatar";
}

export function ImageUpload({ currentImage, onUploadComplete, onRemove, folder = "uploads", className = "", variant = "default" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    uploadFile(file);
  };

  const uploadFile = (file: File) => {
    if (!storage) {
      toast.error("Storage is not configured correctly.");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const p = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(p);
      },
      (error) => {
        console.error("Upload error:", error);
        toast.error("Failed to upload image. Please check your storage rules.");
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onUploadComplete(downloadURL);
          toast.success("Image uploaded successfully!");
        } catch (err) {
          toast.error("Failed to retrieve image URL.");
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }
    );
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {isUploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 bg-blue-50 rounded-2xl gap-3 w-full"
          >
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Uploading {progress}%</p>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden mt-2">
               <motion.div 
                 className="h-full bg-blue-600"
                 initial={{ width: 0 }}
                 animate={{ width: `${progress}%` }}
               />
            </div>
          </motion.div>
        ) : currentImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative group rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 w-full"
          >
            <img src={currentImage} alt="Uploaded" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg h-9"
              >
                <Upload className="w-4 h-4 mr-2" /> Change
              </Button>
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={onRemove}
                  className="rounded-xl shadow-lg h-9 w-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 gap-3 w-full cursor-pointer transition-all group ${variant === 'avatar' ? 'rounded-full aspect-square p-2' : 'rounded-2xl'}`}
          >
            {variant === 'avatar' ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                <User className="w-8 h-8" />
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                   <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-center">
                   <p className="text-xs font-bold text-slate-700">Click to upload image</p>
                   <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">PNG, JPG up to 5MB</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
