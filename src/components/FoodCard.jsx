import React from 'react';
import { Plus, Minus } from 'lucide-react';

const FoodCard = ({ food, onOrderClick, onDecreaseClick, cartQuantity = 0, lang = 'th' }) => {
  return (
    <div 
      className={`food-card ${cartQuantity > 0 ? 'selected' : ''}`}
      onClick={() => onOrderClick(food)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        background: 'var(--bg-card)',
        padding: '0.85rem',
        borderRadius: '16px',
        marginBottom: '1rem',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        gap: '1rem',
        transition: 'all 0.2s',
        position: 'relative',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}
    >
      {/* Image Left */}
      <div style={{ flexShrink: 0 }}>
        <img 
          src={food.image} 
          alt={food.name} 
          style={{ width: '160px', height: '160px', objectFit: 'cover', borderRadius: '16px', display: 'block' }}
        />
      </div>

      {/* Content Right */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'white', lineHeight: '1.3' }}>
            {lang === 'th' ? food.name : (food.nameEn || food.name)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {lang === 'th' ? food.description : (food.descriptionEn || food.description)}
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
          <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.05rem' }}>
            ฿{food.price}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {cartQuantity > 0 ? (
              <div 
                style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-dark)', borderRadius: '20px', padding: '0.15rem', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={(e) => e.stopPropagation()} // Prevent clicking stepper from triggering card click
              >
                <button 
                  onClick={() => onDecreaseClick(food)}
                  style={{
                    background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none',
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                ><Minus size={16} /></button>
                <div style={{ margin: '0 0.6rem', fontWeight: 'bold', minWidth: '12px', textAlign: 'center' }}>{cartQuantity}</div>
                <button 
                  onClick={() => onOrderClick(food)}
                  style={{
                    background: 'var(--accent)', color: 'white', border: 'none',
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                ><Plus size={16} /></button>
              </div>
            ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); onOrderClick(food); }}
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={lang === 'th' ? 'สั่ง' : 'Order'}
                >
                  <Plus size={20} />
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
