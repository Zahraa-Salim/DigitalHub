import React, { useState, useRef, useEffect } from 'react';
import { X as XIcon, Upload as UploadIcon } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  onUpload?: (file: File) => Promise<string>;
  label?: string;
  hint?: string;
  previewLabel?: string;
  allowedTypes?: string[];
  maxSizeMB?: number;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onUpload,
  label = 'Image Upload',
  hint = 'Upload an image or paste a URL',
  previewLabel = 'Preview',
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxSizeMB = 5,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreview(value);
    setPreviewError(false);
  }, [value]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setError('');
    
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);

    // Upload if handler provided
    if (onUpload) {
      setIsLoading(true);
      try {
        const uploadedUrl = await onUpload(file);
        onChange(uploadedUrl);
        setPreview(uploadedUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onChange(url);
    setPreview(url);
    setPreviewError(false);
    setError('');
  };

  const handleClear = () => {
    onChange('');
    setPreview('');
    setError('');
    setPreviewError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload-wrapper">
      <div className="image-upload-form">
        <div className="form-group">
          <label className="field__label">{label}</label>
          <small className="field__hint">{hint}</small>
        </div>

        <div className="image-upload-inputs">
          <div className="input-group">
            <input
              className="field__control"
              type="file"
              ref={fileInputRef}
              accept={allowedTypes.join(',')}
              onChange={handleFileSelect}
              disabled={disabled || isLoading}
              aria-label="Upload image file"
            />
            <button
              className="btn btn--secondary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              aria-label="Choose file"
            >
              <UploadIcon size={16} />
              {isLoading ? 'Uploading...' : 'Choose File'}
            </button>
          </div>

          <div className="input-group">
            <input
              className="field__control"
              type="url"
              placeholder="Or paste image URL..."
              value={preview}
              onChange={handleUrlChange}
              disabled={disabled}
              aria-label="Image URL"
            />
            {preview && (
              <button
                className="btn btn--danger"
                type="button"
                onClick={handleClear}
                disabled={disabled}
                aria-label="Clear image"
              >
                <XIcon size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
      </div>

      {preview && !previewError && (
        <div className="image-preview">
          <p className="image-preview-label">{previewLabel}</p>
          <img
            className="image-preview-content"
            src={preview}
            alt="Preview"
            onError={() => setPreviewError(true)}
          />
        </div>
      )}
    </div>
  );
};
