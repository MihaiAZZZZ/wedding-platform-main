'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { ImageIcon, Download, Filter, PlayCircle } from 'lucide-react';
import Image from 'next/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import PhotoViewer from './PhotoViewer';

interface Photo {
  id: string;
  image_url: string;
  uploader_name: string;
  message: string;
}

const PHOTOS_PER_PAGE = 24;

export default function PhotoGallery({ refreshTrigger }: { refreshTrigger: number }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  
  const [guestFilter, setGuestFilter] = useState<string>('All');
  const [uniqueGuests, setUniqueGuests] = useState<string[]>([]);
  
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [downloadingSection, setDownloadingSection] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch unique guests for filter dropdown
  useEffect(() => {
    const fetchGuests = async () => {
      const { data, error } = await supabase.from('photos').select('uploader_name');
      if (data && !error) {
        const guests = Array.from(new Set(data.map(p => p.uploader_name || 'Anonymous')));
        setUniqueGuests(guests.sort());
      }
    };
    fetchGuests();
  }, [refreshTrigger]);

  const fetchPhotos = async (pageNum: number, guest: string) => {
    if (pageNum === 0 && guest !== guestFilter) setLoading(true);
    else setLoadingMore(true);

    let query = supabase
      .from('photos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (guest !== 'All') {
      query = query.eq('uploader_name', guest === 'Anonymous' ? '' : guest);
    }

    const from = pageNum * PHOTOS_PER_PAGE;
    const to = from + PHOTOS_PER_PAGE - 1;

    const { data, error, count } = await query.range(from, to);

    if (!error && data) {
      setPhotos(data);
      if (count !== null) {
        setTotalPages(Math.ceil(count / PHOTOS_PER_PAGE));
      }
    } else if (error) {
      console.error("Supabase error: ", error.message || JSON.stringify(error));
    }
    
    setLoading(false);
    setLoadingMore(false);
    return data;
  };

  useEffect(() => {
    setPage(0);
    fetchPhotos(0, guestFilter);
  }, [refreshTrigger, guestFilter]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchPhotos(newPage, guestFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    pages.push(0);
    if (page > 3) pages.push('...');
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages - 2, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 4) pages.push('...');
    pages.push(totalPages - 1);
    return pages;
  };

  const handleBulkDownload = async () => {
    setDownloadingSection(guestFilter);
    try {
      const zip = new JSZip();
      const folderName = `Photos_${guestFilter.replace(/[^a-z0-9]/gi, '_')}`;
      const folder = zip.folder(folderName);
      
      const promises = photos.map(async (photo, index) => {
        try {
          const res = await fetch(`/api/download?url=${encodeURIComponent(photo.image_url)}`);
          if (!res.ok) throw new Error('Failed to fetch photo');
          const blob = await res.blob();
          
          const urlParts = new URL(photo.image_url).pathname.split('/');
          const filename = urlParts[urlParts.length - 1] || `photo_${index + 1}.jpg`;
          
          folder?.file(filename, blob);
        } catch (e) {
          console.error('Error downloading photo for zip:', e);
        }
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${folderName}.zip`);
    } catch (e) {
      console.error('Error generating zip:', e);
      alert('Failed to create zip file.');
    } finally {
      setDownloadingSection(null);
    }
  };

  const handleNext = async () => {
    if (!selectedPhoto) return;
    setSlideDirection('right');
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1]);
    } else {
      let newPage = page + 1;
      if (newPage >= totalPages) {
        newPage = 0;
      }
      setPage(newPage);
      const newPhotos = await fetchPhotos(newPage, guestFilter);
      if (newPhotos && newPhotos.length > 0) {
        setSelectedPhoto(newPhotos[0]);
      }
    }
  };

  const handlePrev = async () => {
    if (!selectedPhoto) return;
    setSlideDirection('left');
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1]);
    } else {
      let newPage = page - 1;
      if (newPage < 0) {
        newPage = totalPages - 1;
      }
      setPage(newPage);
      const newPhotos = await fetchPhotos(newPage, guestFilter);
      if (newPhotos && newPhotos.length > 0) {
        setSelectedPhoto(newPhotos[newPhotos.length - 1]);
      }
    }
  };

  return (
    <div>
      {/* Gallery Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ color: 'var(--color-black)', margin: 0, fontFamily: 'var(--font-script)', fontSize: '3.5rem', flex: '0 1 auto' }}>
          {guestFilter === 'All' ? 'Toate Fotografiile' : `Momente de la ${guestFilter}`}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', flex: '1 1 320px' }}>
          {/* Searchable guest filter */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
            {/* Input with icon inside via flex wrapper */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              height: '40px',
              borderRadius: '50px',
              border: '1px solid var(--color-champagne-dark)',
              backgroundColor: 'var(--color-white)',
              paddingLeft: '12px',
              paddingRight: guestFilter !== 'All' ? '8px' : '16px',
              width: '100%',
              boxSizing: 'border-box',
              gap: '8px',
            }}>
              <Filter size={15} color="var(--color-champagne-dark)" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Cauta un invitat..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  backgroundColor: 'transparent',
                  color: 'var(--color-black)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  minWidth: 0,
                  padding: 0,
                  margin: 0,
                  height: '38px',
                  lineHeight: '38px',
                  boxShadow: 'none',
                  WebkitAppearance: 'none',
                }}
              />
              {guestFilter !== 'All' && (
                <button
                  onClick={() => { setGuestFilter('All'); setSearchQuery(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '1.1rem', lineHeight: 1, padding: '0 2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  title="Resetare filtru"
                >×</button>
              )}
            </div>
            {showSuggestions && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'var(--color-white)',
                border: '1px solid rgba(166,138,86,0.3)',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 100,
                maxHeight: '260px',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}>
                <button
                  onMouseDown={() => { setGuestFilter('All'); setSearchQuery(''); setShowSuggestions(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.65rem 1rem', background: guestFilter === 'All' ? 'rgba(166,138,86,0.1)' : 'none', border: 'none', borderBottom: '1px solid rgba(166,138,86,0.15)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-champagne-dark)', fontWeight: 600 }}
                >
                  Toti Invitatii
                </button>
                {uniqueGuests
                  .filter(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(g => (
                    <button
                      key={g}
                      onMouseDown={() => { setGuestFilter(g); setSearchQuery(g); setShowSuggestions(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.65rem 1rem', background: guestFilter === g ? 'rgba(166,138,86,0.1)' : 'none', border: 'none', borderTop: '1px solid rgba(166,138,86,0.08)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-black)' }}
                    >
                      {g}
                    </button>
                  ))
                }
                {uniqueGuests.filter(g => g.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <p style={{ padding: '0.75rem 1rem', color: '#aaa', fontSize: '0.9rem', margin: 0 }}>Niciun rezultat gasit</p>
                )}
              </div>
            )}
          </div>

          {/* Download button */}
          <button
            onClick={handleBulkDownload}
            disabled={downloadingSection === guestFilter || photos.length === 0}
            style={{
              height: '40px',
              boxSizing: 'border-box',
              background: 'var(--color-champagne)',
              border: 'none',
              color: 'var(--color-black)',
              cursor: photos.length === 0 ? 'not-allowed' : 'pointer',
              opacity: (downloadingSection === guestFilter || photos.length === 0) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0 1.25rem',
              borderRadius: '50px',
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              whiteSpace: 'nowrap',
            }}
            title="Descarcă Fotografiile Afișate"
          >
            <Download size={16} />
            {downloadingSection === guestFilter ? 'Se arhivează...' : 'Descarcă'}
          </button>
        </div>
      </div>

      {loading && photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: '#666' }}>Se încarcă momentele frumoase...</div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 2rem', opacity: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <ImageIcon size={48} color="var(--color-champagne-dark)" />
          <p style={{ fontSize: '1.2rem', color: '#666' }}>Nicio fotografie găsită. Fii primul care împărtășește o amintire!</p>
        </div>
      ) : (
        <>
          <div className="photo-grid" style={{ marginBottom: '2rem', opacity: loadingMore ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
            {photos.map((photo) => (
              <button 
                key={photo.id} 
                className="photo-item"
                onClick={() => setSelectedPhoto(photo)}
                aria-label={`View media by ${photo.uploader_name || 'Anonymous'}`}
              >
                {photo.image_url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <>
                    <video
                      src={`${photo.image_url}#t=0.1`} // #t=0.1 attempts to fetch the first frame as poster
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                      <PlayCircle size={48} color="white" opacity={0.8} />
                    </div>
                  </>
                ) : (
                  <Image 
                    src={photo.image_url} 
                    alt={`Uploaded by ${photo.uploader_name || 'Anonymous'}`} 
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                )}
              </button>
            ))}
          </div>

          {totalPages > 1 && (() => {
            const pageNums = getPageNumbers();
            const btnBase: React.CSSProperties = {
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid rgba(166, 138, 86, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              background: 'var(--color-white)',
              color: 'var(--color-black)',
            };
            const activeBtnStyle: React.CSSProperties = {
              ...btnBase,
              background: 'var(--color-champagne-dark)',
              color: '#fff',
              border: '1px solid var(--color-champagne-dark)',
              boxShadow: '0 4px 12px rgba(166, 138, 86, 0.35)',
            };
            const navBtnBase: React.CSSProperties = {
              padding: '0 1.25rem',
              height: '40px',
              borderRadius: '50px',
              border: '1px solid rgba(166, 138, 86, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              transition: 'all 0.2s ease',
              background: 'var(--color-white)',
              color: 'var(--color-black)',
              gap: '0.4rem',
            };
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '2rem 0', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0 || loadingMore}
                  style={{ ...navBtnBase, opacity: page === 0 ? 0.4 : 1 }}
                  title="Pagina anterioară"
                >
                  ← Anterior
                </button>

                {pageNums.map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} style={{ width: '40px', textAlign: 'center', color: '#aaa', lineHeight: '40px' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      disabled={loadingMore}
                      style={page === p ? activeBtnStyle : btnBase}
                      title={`Pagina ${(p as number) + 1}`}
                    >
                      {(p as number) + 1}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages - 1 || loadingMore}
                  style={{ ...navBtnBase, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
                  title="Pagina următoare"
                >
                  Următor →
                </button>
              </div>
            );
          })()}
        </>
      )}

      {selectedPhoto && (
        <PhotoViewer 
          photo={selectedPhoto} 
          onClose={() => setSelectedPhoto(null)} 
          onNext={handleNext}
          onPrev={handlePrev}
          direction={slideDirection}
        />
      )}
    </div>
  );
}
