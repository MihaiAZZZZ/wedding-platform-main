'use client';
import React, { useState } from 'react';
import PhotoGallery from '../components/PhotoGallery';
import UploadModal from '../components/UploadModal';
import Onboarding from '../components/Onboarding';
import { Camera } from 'lucide-react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [userName, setUserName] = useState('');

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!hasOnboarded) {
    return (
      <Onboarding 
        onComplete={() => setHasOnboarded(true)} 
        onSetUploaderName={setUserName} 
      />
    );
  }

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '6rem', paddingTop: '2rem' }}>
      <div className="container">
        <PhotoGallery refreshTrigger={refreshTrigger} />
      </div>

      <button className="fab" onClick={() => setIsModalOpen(true)} title="Upload a photo">
        <Camera size={28} />
      </button>

      {isModalOpen && (
        <UploadModal 
          onClose={() => setIsModalOpen(false)} 
          onUploadSuccess={handleUploadSuccess} 
          defaultName={userName}
        />
      )}
    </main>
  );
}
