import React, { useState, useEffect, useRef } from 'react';

const HeroCarousel = () => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const images = [
    '/images/promo1.png',
    '/images/promo2.png',
    '/images/promo3.png'
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
        setActiveIndex(index);
      }
    };
    
    const slider = scrollRef.current;
    if (slider) {
      slider.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (slider) slider.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const nextIndex = (activeIndex + 1) % images.length;
        const width = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({
          left: nextIndex * width,
          behavior: 'smooth'
        });
      }
    }, 4500); // 4.5 second delay
    return () => clearInterval(interval);
  }, [activeIndex, images.length]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto 1.5rem auto', overflow: 'hidden' }}>
      <div 
        ref={scrollRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        }}
        className="hide-scrollbar"
      >
        {images.map((src, idx) => (
          <div 
            key={idx} 
            style={{ 
              flex: '0 0 100%', 
              scrollSnapAlign: 'start',
              padding: '0 1rem'
            }}
          >
            <div style={{ position: 'relative', width: '100%', paddingTop: '42.85%' /* 21:9 aspect ratio */ }}>
              <img 
                src={src} 
                alt={`Promotion ${idx + 1}`} 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '16px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  display: 'block'
                }} 
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
        {images.map((_, idx) => (
          <div 
            key={idx}
            style={{
              width: activeIndex === idx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: activeIndex === idx ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onClick={() => {
              const width = scrollRef.current.offsetWidth;
              scrollRef.current.scrollTo({ left: idx * width, behavior: 'smooth' });
            }}
          />
        ))}
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default HeroCarousel;
