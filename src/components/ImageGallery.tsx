"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  fenceName: string;
  initialIndex?: number;
  onClose: () => void;
  onSetPrimary: (imageId: string) => void;
  onDelete: (imageId: string) => void;
  onCaptionChange: (imageId: string, caption: string) => void;
  onUpload: () => void;
}

export function ImageGallery({
  images,
  fenceName,
  initialIndex = 0,
  onClose,
  onSetPrimary,
  onDelete,
  onCaptionChange,
  onUpload,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionValue, setCaptionValue] = useState("");
  const [showControls, setShowControls] = useState(true);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const captionInputRef = useRef<HTMLInputElement>(null);

  const current = images[currentIndex];

  // Prevent body scroll when gallery is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Sync caption when image changes
  useEffect(() => {
    if (current) setCaptionValue(current.caption || "");
    setEditingCaption(false);
  }, [current]);

  // Auto-focus caption input
  useEffect(() => {
    if (editingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
    }
  }, [editingCaption]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editingCaption) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goTo(currentIndex - 1);
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goTo(currentIndex + 1);
      }
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, editingCaption, onClose]);

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        setCurrentIndex(index);
      }
    },
    [images.length]
  );

  // Touch swipe handling
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only swipe horizontally if horizontal movement > vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        goTo(currentIndex + 1);
      } else {
        goTo(currentIndex - 1);
      }
    }
  }

  function handleSaveCaption() {
    if (current) {
      onCaptionChange(current.id, captionValue);
    }
    setEditingCaption(false);
  }

  function handleDeleteCurrent() {
    if (!current) return;
    const confirmed = window.confirm("Ta bort denna bild?");
    if (!confirmed) return;
    onDelete(current.id);
    // Move to prev or next
    if (images.length <= 1) {
      onClose();
    } else if (currentIndex >= images.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3 safe-top">
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        >
          ← Tillbaka
        </button>
        <div className="text-center text-sm font-medium text-white/80">
          {fenceName}
        </div>
        <div className="text-sm text-white/60">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Main image area */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowControls((v) => !v)}
      >
        {/* Previous arrow */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(currentIndex - 1);
            }}
            className="absolute left-2 z-10 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 max-[600px]:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <img
          src={current.imageUrl}
          alt={current.caption || fenceName}
          className="max-w-full object-contain p-2"
          style={{ maxHeight: "100%" }}
          draggable={false}
        />

        {/* Next arrow */}
        {currentIndex < images.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goTo(currentIndex + 1);
            }}
            className="absolute right-2 z-10 rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 max-[600px]:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        {/* Primary badge */}
        {current.isPrimary && (
          <div className="absolute top-2 left-4 rounded-full bg-[#27ae60] px-2.5 py-0.5 text-xs font-bold text-white">
            Primarbild
          </div>
        )}
      </div>

      {/* Caption area */}
      <div
        className={`shrink-0 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-2">
          {editingCaption ? (
            <div className="flex items-center gap-2">
              <input
                ref={captionInputRef}
                type="text"
                value={captionValue}
                onChange={(e) => setCaptionValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCaption();
                  if (e.key === "Escape") setEditingCaption(false);
                }}
                placeholder="Skriv bildtext..."
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
              />
              <button
                onClick={handleSaveCaption}
                className="rounded-lg bg-[#27ae60] px-3 py-2 text-sm font-medium text-white"
              >
                Spara
              </button>
              <button
                onClick={() => setEditingCaption(false)}
                className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/60"
              >
                Avbryt
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingCaption(true)}
              className="w-full text-left text-sm text-white/60 hover:text-white/80"
            >
              {current.caption || "Tryck for att lagga till bildtext..."}
            </button>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="shrink-0 border-t border-white/10 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => goTo(idx)}
                className={`relative shrink-0 overflow-hidden rounded-lg transition-all ${
                  idx === currentIndex
                    ? "ring-2 ring-[#2F5496] ring-offset-2 ring-offset-black"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                <img
                  src={img.imageUrl}
                  alt={img.caption || `Bild ${idx + 1}`}
                  className="h-14 w-14 object-cover"
                />
                {img.isPrimary && (
                  <div className="absolute bottom-0 left-0 right-0 bg-[#27ae60]/80 text-center text-[0.6em] font-bold text-white">
                    P
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div
        className={`shrink-0 border-t border-white/10 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex items-center justify-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onUpload}
            className="flex items-center gap-1.5 rounded-lg bg-[#2F5496] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a3a6e]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Lagg till
          </button>

          {!current.isPrimary && (
            <button
              onClick={() => onSetPrimary(current.id)}
              className="flex items-center gap-1.5 rounded-lg bg-[#27ae60] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e8a4c]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Primarbild
            </button>
          )}

          <button
            onClick={handleDeleteCurrent}
            className="flex items-center gap-1.5 rounded-lg bg-[#e74c3c] px-3 py-2 text-sm font-medium text-white hover:bg-[#c0392b]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Ta bort
          </button>
        </div>
      </div>
    </div>
  );
}
