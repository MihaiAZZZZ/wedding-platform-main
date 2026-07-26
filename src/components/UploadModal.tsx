'use client';
import React, { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { Camera, X, Upload, Check } from 'lucide-react';

export default function UploadModal({ onClose, onUploadSuccess, defaultName = '' }: { onClose: () => void, onUploadSuccess: () => void, defaultName?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadComplete, setUploadComplete] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEOS = 3;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const videoCount = selectedFiles.filter(f => f.type.startsWith('video/')).length;

      if (videoCount > MAX_VIDEOS) {
        alert(`Puteți încărca maxim ${MAX_VIDEOS} videoclipuri per sesiune. Ați selectat ${videoCount}. Vă rugăm să alegeți mai puține videoclipuri.`);
        e.target.value = ''; // reset input so they can try again
        return;
      }

      setFiles(selectedFiles);
      setPreviews(selectedFiles.map(f => URL.createObjectURL(f)));
    }
  };

  const resetSelection = () => {
    setFiles([]);
    setPreviews([]);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const imgbbKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

    if (!cloudName || !uploadPreset || !imgbbKey) {
      alert('Configurarea lipsește! Vă rugăm să verificați variabilele de mediu.');
      setUploading(false);
      return;
    }

    try {
      const total = files.length;
      const uploadedUrls: string[] = [];

      // Upload files one-by-one sequentially to avoid overwhelming the network
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        setUploadStatusText(
          total === 1
            ? `Se încarcă ${isVideo ? 'videoclipul' : 'fotografia'}...`
            : `Se încarcă fișierul ${i + 1} din ${total}...`
        );

        let finalUrl = '';

        if (isVideo) {
          // Cloudinary for videos
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);

          const cloudinaryRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
            { method: 'POST', body: formData }
          );
          const cloudinaryData = await cloudinaryRes.json();
          if (cloudinaryData.error) throw new Error(cloudinaryData.error.message || `Eroare la videoclipul ${i + 1}`);
          finalUrl = cloudinaryData.secure_url;
        } else {
          // ImgBB for images
          const formData = new FormData();
          formData.append('image', file);

          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
            method: 'POST',
            body: formData,
          });
          const imgbbData = await imgbbRes.json();
          if (!imgbbData.success) throw new Error('Eroare la încărcarea fotografiei');
          finalUrl = imgbbData.data.url;
        }

        uploadedUrls.push(finalUrl);

        // Advance progress bar accurately based on completed files
        setUploadProgress(Math.round(((i + 1) / total) * 90));
      }

      // Save all URLs to Supabase at once
      setUploadStatusText('Se salvează în galerie...');
      const insertData = uploadedUrls.map((url) => ({
        image_url: url,
        uploader_name: name || 'Anonymous',
        message: message,
      }));

      const { error } = await supabase.from('photos').insert(insertData);
      if (error) throw error;

      setUploadProgress(100);
      setUploadComplete(true);

      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'A apărut o eroare în timpul încărcării.');
      setUploading(false);
      setUploadStatusText('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={24} /></button>
        
        <h2 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--color-black)', fontFamily: 'var(--font-script)', fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', lineHeight: '1.2' }}>Impartasiti o amintire</h2>
        
        {uploadComplete ? (
          <div className="success-animation">
            <div className="checkmark-circle">
              <Check size={40} />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--color-black)' }}>Încărcat cu succes!</h3>
          </div>
        ) : (
          <form onSubmit={handleUpload}>
            {!previews.length ? (
              <div 
                style={{ 
                  border: '2px dashed rgba(226, 209, 184, 0.8)', 
                  borderRadius: '16px', 
                  padding: '2rem 1rem', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                  backgroundColor: 'rgba(247, 231, 206, 0.1)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => fileInputRef.current?.click()}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(247, 231, 206, 0.3)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(247, 231, 206, 0.1)'}
              >
                <Camera size={48} color="var(--color-champagne-dark)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: '#666', fontSize: '1.05rem' }}>Apăsați aici pentru a selecta fotografii sau videoclipuri</p>
              </div>
            ) : (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                  gap: '10px', 
                  maxHeight: '260px', 
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid rgba(226, 209, 184, 0.5)',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(245, 245, 220, 0.2)'
                }}>
                  {previews.map((preview, i) => {
                    const isVideo = files[i]?.type.startsWith('video/');
                    return isVideo ? (
                      <video key={i} src={preview} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} muted />
                    ) : (
                      <img key={i} src={preview} alt={`Preview ${i+1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} />
                    );
                  })}
                </div>
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <button type="button" onClick={resetSelection} style={{ background: 'none', color: '#888', textDecoration: 'underline', fontSize: '0.9rem' }} disabled={uploading}>
                    Alegeți alte fișiere
                  </button>
                </div>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*,video/*" 
              multiple
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            
            <input 
              type="text" 
              placeholder="Numele dumneavoastră (opțional)" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={uploading}
            />
            
            <textarea 
              placeholder="Adăugați un mesaj frumos... (opțional)" 
              rows={2} 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              disabled={uploading}
            />
            
            {uploading ? (
              <div style={{ margin: '1rem 0' }}>
                <p style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#666', fontSize: '0.95rem' }}>
                  {uploadStatusText} <strong>{uploadProgress}%</strong>
                </p>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${uploadProgress}%`, transition: 'width 0.4s ease' }}></div>
                </div>
              </div>
            ) : (
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '1rem' }}
                disabled={files.length === 0}
              >
                <><Upload size={20} /> Încarcă Fotografia</>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
