import React, { useState, TouchEvent } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import CustomVideoPlayer from './CustomVideoPlayer';

interface Photo {
  id: string;
  image_url: string;
  uploader_name: string;
  message: string;
}

interface PhotoViewerProps {
  photo: Photo;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  direction?: 'left' | 'right';
}

export default function PhotoViewer({ photo, onClose, onNext, onPrev, direction = 'right' }: PhotoViewerProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      onNext();
    } else if (isRightSwipe) {
      onPrev();
    }
  };

  const handleDownload = () => {
    // Navigate to our secure download API
    window.location.href = `/api/download?url=${encodeURIComponent(photo.image_url)}`;
  };

  return (
    <div className="viewer-overlay" onClick={onClose}>
      <button className="viewer-close" onClick={onClose} aria-label="Close viewer">
        <X size={32} />
      </button>

      <div className="viewer-content" onClick={(e) => e.stopPropagation()}>
        <div 
          className="viewer-image-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div key={photo.id} className={`slide-anim ${direction === 'right' ? 'slide-right' : 'slide-left'}`}>
            {photo.image_url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
              <CustomVideoPlayer src={photo.image_url} autoPlay />
            ) : (
              <Image 
                src={photo.image_url} 
                alt={`Media by ${photo.uploader_name || 'Anonymous'}`}
                fill
                style={{ objectFit: 'contain' }}
                sizes="100vw"
                priority
              />
            )}
          </div>
          
          <button className="viewer-nav-btn prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous photo">
            <ChevronLeft size={36} />
          </button>
          
          <button className="viewer-nav-btn next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next photo">
            <ChevronRight size={36} />
          </button>
        </div>
        
        <div className="viewer-info">
          <div className="viewer-text">
            <h3 className="viewer-name">From {photo.uploader_name || 'Anonymous'}</h3>
            {photo.message && <p className="viewer-message">{photo.message}</p>}
          </div>
          <button className="viewer-download-btn" onClick={handleDownload} title="Download Photo">
            <Download size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
