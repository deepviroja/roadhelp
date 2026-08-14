import { ImageUpload } from "./ImageUpload";

interface ImageUrlInputProps {
  currentImage?: string | null;
  onImageChange: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  variant?: "default" | "avatar";
}

export function ImageUrlInput({ currentImage, onImageChange, onRemove, className = "", variant = "default" }: ImageUrlInputProps) {
  return (
    <ImageUpload
      currentImage={currentImage || undefined}
      onUploadComplete={onImageChange}
      onRemove={onRemove}
      className={className}
      variant={variant}
    />
  );
}
