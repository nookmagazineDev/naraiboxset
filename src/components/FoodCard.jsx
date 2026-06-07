import React from 'react';
import { Plus, Minus } from 'lucide-react';

const CATEGORY_FOLDERS = {
  "Promotion": "Promotion",
  "SET": "กับแกล้ม3อย่าง  ทอด ต้ม ย่าง",
  "ของกินเล่น": "ของกินเล่น",
  "ย่าง": "ย่าง",
  "อาหารจานเดียว": "อาหารจานเดียว",
  "ต้ม": "ต้ม",
  "ผัด": "ผัด",
  "ยำ": "ยำ",
  "เบียร์": "เบียร์",
  "เหล้า": "เหล้า",
  "มิกเซอร์": "มิกเซอร์",
  "โชจู": "โชจู",
  "cat_1779987830937": "เหล้าอะไรก๋ได้ แถมไข่ตุ๋น",
  "cat_1779988171217": "setเจ้าสัว"
};

const FoodCard = ({ food, onOrderClick, onDecreaseClick, cartQuantity = 0, lang = 'th', displayPrice }) => {
  const name = lang === 'th' ? food.name : (food.nameEn || food.name);
  const desc = lang === 'th' ? food.description : (food.descriptionEn || food.description);

  const folder = CATEGORY_FOLDERS[food.category] || food.category || 'uncategorized';
  const sanitizedFileName = (food.name || '').replace(/[\\/:*?"<>|]/g, '_').trim();

  // ลำดับรูปที่จะลองโหลด (ไม่แก้ไข object ของเมนูโดยตรง)
  const candidates = React.useMemo(() => {
    const list = [];
    if (food.image) list.push(food.image);
    list.push(`/images/${folder}/${sanitizedFileName}.png`);
    list.push(`/images/${folder}/${sanitizedFileName}.svg`);
    return list;
  }, [food.image, folder, sanitizedFileName]);

  const [imgIdx, setImgIdx] = React.useState(0);
  React.useEffect(() => { setImgIdx(0); }, [food.id, candidates.length]);

  const imageSrc = imgIdx < candidates.length ? candidates[imgIdx] : null;
  const handleImageError = () => setImgIdx(i => i + 1);

  return (
    <div
      className={`pos-food-card ${cartQuantity > 0 ? 'in-cart' : ''}`}
      onClick={() => onOrderClick(food)}
    >
      <div className="pos-card-img-wrap">
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={name} 
            className="pos-card-img" 
            onError={handleImageError}
          />
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
          <span className="pos-card-price">
            ฿{Number(displayPrice != null ? displayPrice : food.price).toLocaleString()}
          </span>

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

export default React.memo(FoodCard);
