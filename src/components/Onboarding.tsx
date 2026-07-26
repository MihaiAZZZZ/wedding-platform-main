'use client';
import React, { useState, useRef } from 'react';
import { Camera, Upload, ArrowRight, User, Check } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Onboarding({ onComplete, onSetUploaderName }: { onComplete: () => void, onSetUploaderName: (name: string) => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Anonymous';
    onSetUploaderName(finalName);
    setStep(2);
  };

  const handleAnonymous = () => {
    onSetUploaderName('Anonymous');
    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
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

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 200);

    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey || apiKey === 'your_imgbb_api_key_here') {
        alert('ImgBB API key is not configured.');
        setUploading(false);
        clearInterval(progressInterval);
        return;
      }

      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        });

        const imgbbData = await imgbbRes.json();
        if (!imgbbData.success) throw new Error('Failed to upload image');
        return imgbbData.data.url;
      });

      const imageUrls = await Promise.all(uploadPromises);
      const finalName = name.trim() || 'Anonymous';

      const insertData = imageUrls.map((url) => ({
        image_url: url,
        uploader_name: finalName,
        message: message,
      }));

      const { error } = await supabase.from('photos').insert(insertData);
      if (error) throw error;

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadComplete(true);
      
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      clearInterval(progressInterval);
      alert(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <h1 className="names-title" style={{ color: 'var(--color-champagne-dark)', marginBottom: '2rem', textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        Izabela & Adelin
      </h1>
      <div className="onboarding-content">
        {step === 1 && (
          <div className="onboarding-step" style={{ animation: 'modalFadeIn 0.5s ease forwards' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '3rem', marginBottom: '0.5rem', fontFamily: 'var(--font-script)' }}>Bine ati venit!</h2>
              <p style={{ color: '#666', fontSize: '1.1rem' }}>Înainte de a intra în galerie, cine sărbătorește cu noi?</p>
            </div>

            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                placeholder="Introduceți numele dumneavoastră..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: '1.25rem', fontSize: '1.1rem', textAlign: 'center' }}
                autoFocus
              />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.25rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
                Continuă <ArrowRight size={20} />
              </button>
            </form>

            <button onClick={handleAnonymous} className="btn-ghost" data-text="Sari peste și rămâi anonim">
              Sari peste și rămâi anonim
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step" style={{ animation: 'modalFadeIn 0.5s ease forwards' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '3.5rem', marginBottom: '0.5rem', fontFamily: 'var(--font-script)' }}>Impartasiti o amintire</h2>
              <p style={{ color: '#666' }}>Aveți fotografii pe care ați dori să le împărtășiți acum?</p>
            </div>

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
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={48} color="var(--color-champagne-dark)" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: '#666', fontSize: '1.05rem' }}>Apăsați aici pentru a selecta fotografii</p>
                  </div>
                ) : (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div className="preview-grid">
                      {previews.map((preview, i) => (
                        <img key={i} src={preview} alt={`Preview ${i + 1}`} className="preview-img" />
                      ))}
                    </div>
                    <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                      <button type="button" onClick={resetSelection} style={{ background: 'none', color: '#888', textDecoration: 'underline', fontSize: '0.9rem' }} disabled={uploading}>
                        Alegeți alte fotografii
                      </button>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {previews.length > 0 && (
                  <textarea
                    placeholder="Adăugați un mesaj frumos... (opțional)"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={uploading}
                  />
                )}

                {uploading ? (
                  <div style={{ margin: '1rem 0' }}>
                    <p style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#666' }}>Se încarcă... {uploadProgress}%</p>
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  previews.length > 0 ? (
                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginBottom: '1rem' }} disabled={uploading}>
                      <><Upload size={20} /> Încarcă și Intră</>
                    </button>
                  ) : (
                    <button type="button" onClick={onComplete} className="btn-ghost" data-text="Sari la Galerie" style={{ marginBottom: '1rem' }}>
                      Sari la Galerie
                    </button>
                  )
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
