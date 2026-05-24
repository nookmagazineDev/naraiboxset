import React from 'react';
import { Plus, Minus } from 'lucide-react';

const FoodCard = ({ food, onOrderClick, onDecreaseClick, cartQuantity = 0, lang = 'th' }) => {
  const name = lang === 'th' ? food.name : (food.nameEn || food.name);
  const desc = lang === 'th' ? food.description : (food.descriptionEn || food.description);

  return (
    <div
      className={`pos-food-card ${cartQuantity > 0 ? 'in-cart' : ''}`}
      onClick={() => onOrderClick(food)}
    >
      <div className="pos-card-img-wrap">
        {food.image ? (
          <img src={food.image} alt={name} className="pos-card-img" />
        ) : (
          <div className="pos-card-img-placeholder">🍽️</div>
        )}
        {cartQuantity > 0 && (
          <span className="pos-qty-badge">{cartQuantity}</span>
        )}
      </div>

      <div className="pos-card-body">
        <h3 className="pos-card-name">{name}</h3>
        {desc && <p className="pos-card-desc">{desc}</p>}

        <div className="pos-card-footer">
          <span className="pos-card-price">฿{Number(food.price).toLocaleString()}</span>

          {cartQuantity > 0 ? (
            <div className="pos-stepper" onClick={(e) => e.stopPropagation()}>
              <button
                className="pos-stepper-btn minus"
                onClick={(e) => { e.stopPropagation(); onDecreaseClick(food); }}
              >
                <Minus size={13} />
              </button>
              <span className="pos-stepper-qty">{cartQuantity}</span>
              <button
                className="pos-stepper-btn plus"
                onClick={(e) => { e.stopPropagation(); onOrderClick(food); }}
              >
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button
              className="pos-add-btn"
              onClick={(e) => { e.stopPropagation(); onOrderClick(food); }}
              title={lang === 'th' ? 'สั่ง' : 'Order'}
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
