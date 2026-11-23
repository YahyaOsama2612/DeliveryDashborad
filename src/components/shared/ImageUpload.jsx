import { useState, useRef } from 'react';
import {
  Upload,
  X,
  RefreshCw,
  Link as LinkIcon,
  Check,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { fileToDataUrl, isValidImageUrl } from '../../lib/imageUtils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Modern, accessible ImageUpload component.
 * Allows uploading standard image files from device, converting them to a link (Data URL),
 * with live preview, drag-and-drop, remove/replace controls, and optional direct link entry.
 */
const ImageUpload = ({
  id = 'image-upload',
  label = 'Image',
  description = 'Upload a normal image file. It will be converted into a link automatically.',
  value = '',
  onChange,
  disabled = false,
  shape = 'rounded', // 'rounded' | 'circle' | 'square'
  size = 'md', // 'sm' | 'md' | 'lg'
  accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
  className = '',
  error = '',
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const displayError = error || internalError;
  const hasValue = Boolean(value && typeof value === 'string' && value.trim() !== '');

  // Shape and preview sizing styles
  const previewSizeClasses = {
    sm: 'size-20',
    md: 'size-28',
    lg: 'size-36',
  }[size] || 'size-28';

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-xl',
  }[shape] || 'rounded-xl';

  const handleProcessFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const msg = 'Please choose a valid image file (PNG, JPG, WEBP, GIF, SVG).';
      setInternalError(msg);
      toast.error(msg);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = 'Image size exceeds 5MB limit. Please choose a smaller image.';
      setInternalError(msg);
      toast.error(msg);
      return;
    }

    try {
      setIsProcessing(true);
      setInternalError('');
      const dataUrl = await fileToDataUrl(file);
      onChange?.(dataUrl);
      toast.success('Image uploaded and converted successfully!');
    } catch (err) {
      const msg = err?.message || 'Failed to process selected image.';
      setInternalError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      // Reset input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setInternalError('');
    onChange?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = (e) => {
    e?.preventDefault();
    if (!urlDraft.trim()) return;
    if (!isValidImageUrl(urlDraft)) {
      setInternalError('Please enter a valid image URL.');
      return;
    }
    onChange?.(urlDraft.trim());
    setUrlDraft('');
    setShowUrlInput(false);
    setInternalError('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-xs font-semibold text-foreground">
            {label}
          </Label>
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(!showUrlInput);
              setUrlDraft(hasValue ? value : '');
            }}
            className="text-[11px] font-medium text-muted-foreground hover:text-primary transition flex items-center gap-1"
          >
            <LinkIcon className="size-3" />
            <span>{showUrlInput ? 'Hide link input' : 'Or use link'}</span>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
        className="hidden"
      />

      {/* Direct Link Input Mode (Collapsible) */}
      {showUrlInput && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 animate-in fade-in duration-200">
          <Input
            type="url"
            placeholder="https://example.com/image.png or data:image/..."
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            disabled={disabled || isProcessing}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleApplyUrl}
            disabled={!urlDraft.trim() || disabled}
            className="h-8 px-2 text-xs gap-1"
          >
            <Check className="size-3.5" />
            Apply
          </Button>
        </div>
      )}

      {/* Main Upload / Preview Area */}
      {hasValue ? (
        /* Image Preview State */
        <div className="flex items-center gap-4 p-3 rounded-xl border border-border/70 bg-card shadow-xs transition">
          <div
            className={`relative shrink-0 overflow-hidden border border-border bg-muted/40 shadow-xs ${previewSizeClasses} ${shapeClasses}`}
          >
            <img
              src={value}
              alt="Uploaded preview"
              className="size-full object-cover transition"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '';
                setInternalError('Could not render image preview. The link may be broken.');
              }}
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-xs">
                <RefreshCw className="size-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Check className="size-3" />
                Image Attached
              </span>
              <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {value.startsWith('data:') ? 'Converted to Data URL link' : 'External link'}
              </span>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-1">
              You can change this image anytime by choosing a new file.
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                className="h-7 px-2.5 text-xs gap-1.5"
              >
                <RefreshCw className="size-3" />
                Change Image
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isProcessing}
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
              >
                <X className="size-3" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Dropzone / Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isProcessing) {
              fileInputRef.current?.click();
            }
          }}
          className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition select-none ${
            isDragging
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 scale-[0.99]'
              : 'border-border/80 hover:border-primary/60 hover:bg-accent/40 bg-card/50'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-xs font-semibold text-foreground">
                Processing & converting image...
              </p>
              <p className="text-[11px] text-muted-foreground">Please wait a moment</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition duration-200">
                <Upload className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">
                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-muted-foreground">
                  PNG, JPG, WEBP, GIF or SVG (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description / Helper text */}
      {description && !displayError && (
        <p className="text-[11px] text-muted-foreground leading-normal">
          {description}
        </p>
      )}

      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive animate-in fade-in duration-150">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
