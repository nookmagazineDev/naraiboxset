import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ShoppingCart, ClipboardList, Store, Globe, ShoppingBag } from 'lucide-react';
import FoodCard from './components/FoodCard';
import OrderWizardModal from './components/OrderWizardModal';
import CartModal from './components/CartModal';
import CheckoutModal from './components/CheckoutModal';
import KitchenMonitor from './components/KitchenMonitor';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import ManageMenu from './components/admin/ManageMenu';
import ManagePromotions from './components/admin/ManagePromotions';
import ManageCategories from './components/admin/ManageCategories';
import ManagePrinters from './components/admin/ManagePrinters';
import ManageUsers from './components/admin/ManageUsers';
import ManageSettings from './components/admin/ManageSettings';
import ManageStock from './components/admin/ManageStock';
import ManageBOM from './components/admin/ManageBOM';
import TableSelection from './components/TableSelection';
import TableOrderView from './components/TableOrderView';
import LoginScreen from './components/LoginScreen';
import LiquorStorage from './components/LiquorStorage';
import ShiftModal from './components/ShiftModal';
import Reports from './components/admin/Reports';
import { resolvePopupSource, flattenPopupConfig } from './utils/popupConfig';
import './index.css';

const MENU_ITEMS = [];


function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState('food');
  const [lang, setLang] = useState('th');
  // ทุกครั้งที่เปิด/รีเฟรชแอป ให้เริ่มที่หน้าเลือกโต๊ะเสมอ (ไม่จำเลขโต๊ะเดิม)
  const [tableNumber, setTableNumber] = useState('');

  // Users & Auth — seed from cache so login shows immediately without waiting for GAS
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cached_users') || '[]'); } catch { return []; }
  });
  const [currentUser, setCurrentUser] = useState(null);

  // สิทธิ์แอดมิน: รองรับ flag isAdmin จากชีต และเผื่อ user ชื่อ admin
  const isAdmin = !!(currentUser && (currentUser.isAdmin === true || currentUser.isAdmin === 'TRUE' || String(currentUser.username || '').toLowerCase() === 'admin'));

  // Shift state
  const [currentShift, setCurrentShift] = useState(() => {
    try { return JSON.parse(localStorage.getItem('current_shift') || 'null'); } catch { return null; }
  });
  const [shiftSales, setShiftSales] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shift_sales') || 'null') || { totalSales: 0, totalCash: 0, totalCard: 0, totalTransfer: 0, totalOrders: 0 }; } catch { return { totalSales: 0, totalCash: 0, totalCard: 0, totalTransfer: 0, totalOrders: 0 }; }
  });
  const [shiftModalMode, setShiftModalMode] = useState(null); // null | 'open' | 'close'

  const handleOpenShift = async (openCash) => {
    try {
      const res  = await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'openShift', staff: currentUser?.username || '', openCash }) });
    } catch (e) {}
    const shiftId = 'SHIFT-' + Date.now();
    const shift = { id: shiftId, openTime: new Date().toISOString(), openStaff: currentUser?.username || '', openCash };
    const freshSales = { totalSales: 0, totalCash: 0, totalCard: 0, totalTransfer: 0, totalOrders: 0 };
    setCurrentShift(shift);
    setShiftSales(freshSales);
    localStorage.setItem('current_shift', JSON.stringify(shift));
    localStorage.setItem('shift_sales', JSON.stringify(freshSales));
    setShiftModalMode(null);
  };

  const handleCloseShift = async (closeCash, note) => {
    if (!currentShift) return;
    try {
      await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'closeShift', shiftId: currentShift.id, staff: currentUser?.username || '', closeCash, note, ...shiftSales }) });
    } catch (e) {}
    setCurrentShift(null);
    setShiftSales({ totalSales: 0, totalCash: 0, totalCard: 0, totalTransfer: 0, totalOrders: 0 });
    localStorage.removeItem('current_shift');
    localStorage.removeItem('shift_sales');
    setShiftModalMode(null);
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    // เข้าสู่ระบบใหม่ → กลับไปหน้าเลือกโต๊ะเสมอ
    setTableNumber('');
    navigate('/table-select', { replace: true });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setTableNumber('');
    navigate('/table-select', { replace: true });
  };

  // เปิด/รีเฟรชแอป → บังคับกลับหน้าเลือกโต๊ะ (รันครั้งเดียวตอน mount)
  React.useEffect(() => {
    setTableNumber('');
    navigate('/table-select', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (tableNumber) localStorage.setItem('table_number', tableNumber);
    else localStorage.removeItem('table_number');
  }, [tableNumber]);

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzxzhnOhSPWssbEfRVG8doa4G4fQ_98B9_Kog34gguPrG7fgbY5gPnuvTIoneJcmdKgrA/exec';

  const [orders, setOrders] = useState([]);
  const [maxOrderNum, setMaxOrderNum] = useState(0);
  const [liveMenu, setLiveMenu] = useState([...MENU_ITEMS]);
  const [categories, setCategories] = useState([
    { slug: 'food', name: 'อาหาร', nameEn: 'Food', icon: '🍲' },
    { slug: 'drink', name: 'เครื่องดื่ม', nameEn: 'Drinks', icon: '🥤' }
  ]);
  const [allCategories, setAllCategories] = useState([]);
  const [allMenu, setAllMenu] = useState([...MENU_ITEMS]);

  // POS Settings (service charge, VAT)
  const [posSettings, setPosSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pos_settings') || '{}'); } catch { return {}; }
  });

  React.useEffect(() => {
    const handler = () => {
      try { setPosSettings(JSON.parse(localStorage.getItem('pos_settings') || '{}')); } catch {}
    };
    window.addEventListener('pos_settings_changed', handler);
    return () => window.removeEventListener('pos_settings_changed', handler);
  }, []);

  // POS Discounts
  const [posDiscounts, setPosDiscounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pos_discounts') || '[]'); } catch { return []; }
  });

  React.useEffect(() => {
    const handler = () => {
      try { setPosDiscounts(JSON.parse(localStorage.getItem('pos_discounts') || '[]')); } catch {}
    };
    window.addEventListener('pos_discounts_changed', handler);
    return () => window.removeEventListener('pos_discounts_changed', handler);
  }, []);

  // TABLE ORDERS STATE
  const [tableOrders, setTableOrders] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CHECKOUT (from table view)
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const processAppGASData = (data) => {
    if (data.categories && Array.isArray(data.categories)) {
      setAllCategories(data.categories);
      setCategories(data.categories.filter(c => c.isActive !== false));
    }
    if (data.orders && Array.isArray(data.orders)) {
      const groupedOrders = {};
      data.orders.forEach(row => {
        const num = row.OrderNumber;
        if (!num) return;
        if (!groupedOrders[num]) {
          groupedOrders[num] = {
            id: num,
            orderNumber: num,
            customerDetails: { name: row.CustomerName, address: row.Address },
            items: [],
            total: parseFloat(row.TotalAmount) || 0,
            status: (row.Status || 'pending').toLowerCase(),
            timestamp: row.OrderStartTime || row.Timestamp
          };
        } else if ((row.Status || '').toLowerCase() === 'pending') {
          groupedOrders[num].status = 'pending';
        }
        const isSubItem = typeof row.ItemDetail === 'string' && row.ItemDetail.trim().startsWith('↳');
        if (isSubItem && groupedOrders[num].items.length > 0) {
          const lastItem = groupedOrders[num].items[groupedOrders[num].items.length - 1];
          if (!lastItem.subItems) lastItem.subItems = [];
          lastItem.subItems.push(row.ItemDetail);
        } else {
          groupedOrders[num].items.push({ isFlattened: true, name: row.ItemDetail, dining: row.DiningOption });
        }
      });
      const sortedOrders = Object.values(groupedOrders).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setOrders(sortedOrders);
      let currentMax = 0;
      data.orders.forEach(row => {
        if (row.OrderNumber) {
          const val = parseInt(row.OrderNumber.replace(/\D/g, ''), 10);
          if (!isNaN(val) && val > currentMax) currentMax = val;
        }
      });
      setMaxOrderNum(prev => Math.max(prev, currentMax));
    }
    if (data.menu && Array.isArray(data.menu)) {
      // flatten per-item popupConfig JSON onto each menu item for the wizard
      const flatMenu = data.menu.map(flattenPopupConfig);
      setAllMenu(flatMenu);
      setLiveMenu(flatMenu.filter(m => m.isActive !== false));
    }
    if (data.tableOrders && Array.isArray(data.tableOrders)) {
      setTableOrders(data.tableOrders);
    }
    if (data.users && Array.isArray(data.users)) {
      localStorage.setItem('cached_users', JSON.stringify(data.users));
      setUsers(data.users);
    }
    if (data.settings && typeof data.settings === 'object') {
      localStorage.setItem('pos_settings', JSON.stringify(data.settings));
      setPosSettings(data.settings);
    }
    if (data.printers && Array.isArray(data.printers) && data.printers.length > 0) {
      localStorage.setItem('printers_config', JSON.stringify(data.printers));
      window.dispatchEvent(new Event('printers_changed'));
    }
    if (data.discounts && Array.isArray(data.discounts) && data.discounts.length > 0) {
      localStorage.setItem('pos_discounts', JSON.stringify(data.discounts));
      setPosDiscounts(data.discounts);
    }
  };

  const fetchOrdersFromSheet = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // timeout 15 วิ
    try {
      const resp = await fetch(GAS_URL + '?action=getAllData', { signal: controller.signal });
      clearTimeout(timer);
      const data = await resp.json();
      if (data) {
        localStorage.setItem('gas_all_data', JSON.stringify(data));
        processAppGASData(data);
      }
    } catch (e) {
      clearTimeout(timer);
      if (e.name !== 'AbortError') console.error('Error fetching from GAS:', e);
      // ถ้า cache มีอยู่แล้ว ให้ใช้ cache แสดงแทน
      const cached = localStorage.getItem('gas_all_data');
      if (cached) {
        try { processAppGASData(JSON.parse(cached)); } catch {}
      }
    }
  };

  const refreshTableOrders = async () => {
    setIsRefreshing(true);
    await fetchOrdersFromSheet();
    setIsRefreshing(false);
  };

  React.useEffect(() => {
    fetchOrdersFromSheet();
    const interval = setInterval(fetchOrdersFromSheet, 10000);
    const handleLocalUpdate = () => {
      const cached = localStorage.getItem('gas_all_data');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed) processAppGASData(parsed);
        } catch (e) { }
      }
    };
    window.addEventListener('appDataChanged', handleLocalUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('appDataChanged', handleLocalUpdate);
    };
  }, []);

  React.useEffect(() => {
    const visibleCats = categories.filter(cat => liveMenu.some(i => (i.category || 'food') === cat.slug));
    if (visibleCats.length > 0 && !visibleCats.find(c => c.slug === activeCategory)) {
      setActiveCategory(visibleCats[0].slug);
    }
  }, [categories, liveMenu]);

  const [selectedFood, setSelectedFood] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleOrderClick = (food) => {
    if (food.category === 'drink') {
      setCart([...cart, {
        cartId: Date.now() + Math.random(),
        food,
        quantity: 1,
        allPopups: [],
        spice: { name: '', nameEn: '' },
        promo: { id: 'none', name: '', nameEn: '', price: 0 },
        dining: { name: 'เครื่องดื่ม', nameEn: 'Drinks' }
      }]);
      setIsCartOpen(true);
    } else {
      // ถ้ารายการนี้ไม่ได้เซต popup ไว้เลย → เพิ่มลงตะกร้าทันทีโดยไม่ต้องเด้ง wizard
      const cats = allCategories.length > 0 ? allCategories : categories;
      const cfg = resolvePopupSource(food, cats);
      const hasPopups = [1, 2, 3, 4, 5, 6].some(i => cfg[`hasPopup${i}`] === true);
      if (!hasPopups) {
        handleConfirmOrder(food, {
          allPopups: [],
          dining: { id: 'dine_in', name: 'ทานที่ร้าน', nameEn: 'Dine-in' }
        });
      } else {
        setSelectedFood(food);
      }
    }
  };

  const handleConfirmOrder = (baseFood, orderDetails) => {
    const bundledPopups = [];
    if (baseFood.bundledItems && baseFood.bundledItems.length > 0) {
      baseFood.bundledItems.forEach(bundledId => {
        const bundledFood = liveMenu.find(m => String(m.id) === String(bundledId));
        if (bundledFood) {
          bundledPopups.push({ ...bundledFood, id: `bundled_${bundledFood.id}`, price: 0, isBundled: true });
        }
      });
    }
    const allPopupsWithBundled = [...(orderDetails.allPopups || []), ...bundledPopups];
    const popupsIds = allPopupsWithBundled.map(p => p.id).sort().join('-') || 'no_popups';
    const cartItemId = `${baseFood.id}_${popupsIds}_${orderDetails.spice?.id}_${orderDetails.promo?.id}_${orderDetails.dining?.id}`;
    const existingItemIndex = cart.findIndex(item => item.cartItemId === cartItemId);
    let newCart;
    if (existingItemIndex >= 0) {
      newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
    } else {
      newCart = [...cart, {
        cartId: Date.now() + Math.random(),
        cartItemId,
        food: baseFood,
        quantity: 1,
        allPopups: allPopupsWithBundled,
        spice: orderDetails.spice,
        promo: orderDetails.promo,
        dining: orderDetails.dining
      }];
    }
    setCart(newCart);
    setSelectedFood(null);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartId, delta) => {
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = (item.quantity || 1) + delta;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  // หมายเหตุอาหารต่อรายการ
  const handleUpdateCartNote = (cartId, note) => {
    setCart(cart.map(item => item.cartId === cartId ? { ...item, note } : item));
  };

  const handleDecreaseQuantity = (food) => {
    const cartItems = cart.filter(c => c.food.id === food.id);
    if (cartItems.length > 0) {
      const lastItem = cartItems[cartItems.length - 1];
      if (lastItem.quantity > 1) handleUpdateQuantity(lastItem.cartId, -1);
      else handleRemoveFromCart(lastItem.cartId);
    }
  };

  const getThaiTimeISO = () => {
    const d = new Date();
    const thaiTzOptions = { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const parts = new Intl.DateTimeFormat('en-GB', thaiTzOptions).formatToParts(d);
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+07:00`;
  };

  // =============================================
  // NEW: Send cart items to TableOrders sheet
  // =============================================
  const handleSendOrderToTable = async () => {
    if (cart.length === 0) return;

    const sessionId = String(Date.now());
    const timestamp = getThaiTimeISO();

    // Optimistic update: add to local tableOrders immediately
    const newLocalItems = cart.map(item => {
      const parts = [];
      if (item.spice && item.spice.name) parts.push('ความเผ็ด: ' + item.spice.name);
      if (item.allPopups && item.allPopups.length > 0) item.allPopups.forEach(p => parts.push(p.name));
      if (item.promo && item.promo.id !== 'none' && item.promo.name) parts.push(item.promo.name);
      if (item.note && item.note.trim()) parts.push('📝 ' + item.note.trim());
      return {
        TableNumber: tableNumber,
        SessionId: sessionId,
        ItemName: item.food.name,
        ItemNameEn: item.food.nameEn || item.food.name,
        ItemPrice: Number(item.food.price) || 0,
        Quantity: Number(item.quantity) || 1,
        Options: parts.join(', '),
        Timestamp: timestamp,
        Status: 'pending',
        RecordedBy: currentUser ? currentUser.username : ''
      };
    });

    setTableOrders(prev => [...prev, ...newLocalItems]);
    setCart([]);
    setIsCartOpen(false);
    navigate('/table-orders');

    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'addTableOrder',
          tableNumber: String(tableNumber),
          sessionId,
          items: cart,
          timestamp,
          recordedBy: currentUser ? currentUser.username : ''
        })
      });
      // Refresh after saving
      setTimeout(() => fetchOrdersFromSheet(), 2000);
    } catch (error) {
      console.error('Error saving table order:', error);
    }
  };

  // =============================================
  // NEW: Open checkout from table view
  // =============================================
  const handleOpenCheckoutFromTable = (items, total) => {
    setCheckoutItems(items);
    setCheckoutTotal(total);
    setIsCheckoutOpen(true);
  };

  // =============================================
  // NEW: Complete payment - save to Orders, clear TableOrders
  // =============================================
  const handleCheckoutComplete = async (grandTotal, paymentMethod) => {
    const finalTotal = grandTotal || checkoutTotal;

    // Update shift sales accumulator
    setShiftSales(prev => {
      const m = (paymentMethod || '').toLowerCase();
      const updated = {
        totalSales:    (prev.totalSales    || 0) + finalTotal,
        totalOrders:   (prev.totalOrders   || 0) + 1,
        totalCash:     (prev.totalCash     || 0) + (m.includes('สด') || m === 'cash' ? finalTotal : 0),
        totalTransfer: (prev.totalTransfer || 0) + (m.includes('โอน') || m.includes('qr') ? finalTotal : 0),
        totalCard:     (prev.totalCard     || 0) + (m.includes('บัตร') || m === 'card' ? finalTotal : 0),
      };
      localStorage.setItem('shift_sales', JSON.stringify(updated));
      return updated;
    });
    const nextNum = maxOrderNum + 1;
    setMaxOrderNum(nextNum);
    const newOrderNumber = `#${String(nextNum).padStart(3, '0')}`;
    const timestamp = getThaiTimeISO();

    const count = localStorage.getItem('customer_count_' + tableNumber) || '';
    const countText = count ? ` (${count} ท่าน)` : '';
    const customerName = tableNumber ? `โต๊ะ ${tableNumber}${countText}` : 'ไม่ระบุ';
    const address = tableNumber ? `โต๊ะ ${tableNumber}` : 'ไม่ได้กรอกพิกัด';

    const rowsToSend = [];
    checkoutItems.forEach(item => {
      const qty = Number(item.Quantity) || 1;
      const qtyText = qty > 1 ? ` (x${qty})` : '';
      const price = (Number(item.ItemPrice) || 0) * qty;
      rowsToSend.push([
        timestamp, newOrderNumber, customerName, address,
        item.ItemName + qtyText, 'ทานที่ร้าน', price,
        finalTotal, 'Completed', timestamp, timestamp, currentUser ? currentUser.username : ''
      ]);
      if (item.Options) {
        rowsToSend.push([
          timestamp, newOrderNumber, customerName, address,
          `↳ ${item.Options}`, 'ทานที่ร้าน', 0,
          finalTotal, 'Completed', timestamp, timestamp, currentUser ? currentUser.username : ''
        ]);
      }
    });

    const newOrder = {
      id: newOrderNumber,
      orderNumber: newOrderNumber,
      customerDetails: { name: customerName, address },
      items: checkoutItems.map(i => ({ isFlattened: true, name: i.ItemName, dining: 'ทานที่ร้าน' })),
      total: finalTotal,
      status: 'completed',
      timestamp
    };

    // Optimistic clear table orders
    setTableOrders(prev => prev.filter(o => String(o.TableNumber) !== String(tableNumber)));
    setOrders(prev => [...prev, newOrder]);
    setCheckoutItems([]);
    setIsCheckoutOpen(false);
    localStorage.removeItem('customer_count_' + tableNumber);
    setTableNumber('');
    navigate('/table-select');

    try {
      // Save to Orders sheet
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'insertOrder', rows: rowsToSend })
      });
    } catch (error) {
      console.error('Error saving order:', error);
    }

    try {
      // Clear TableOrders for this table
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'clearTableOrders', tableNumber: String(tableNumber) })
      });
    } catch (error) {
      console.error('Error clearing table orders:', error);
    }

    try {
      // Save payment record for reports
      await fetch(GAS_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'savePaymentRecord', orderNumber: newOrderNumber, tableNo: String(tableNumber), paymentMethod, grandTotal: finalTotal, staff: currentUser?.username || '', shiftId: currentShift?.id || '' })
      });
    } catch (error) { console.error('Error saving payment record:', error); }

    try {
      // Deduct stock based on BOM
      const deductItems = checkoutItems
        .map(item => {
          const menuItem = allMenu.find(m => m.name === item.ItemName || m.nameEn === item.ItemNameEn);
          return menuItem ? { menuId: String(menuItem.id), menuName: item.ItemName, qty: Number(item.Quantity) || 1 } : null;
        })
        .filter(Boolean);
      if (deductItems.length > 0) {
        await fetch(GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'deductStock', orderNumber: newOrderNumber, tableNo: String(tableNumber), items: deductItems })
        });
      }
    } catch (error) {
      console.error('Error deducting stock:', error);
    }

    try {
      // Print receipt
      const receiptIP = localStorage.getItem('printer_receipt_ip');
      if (receiptIP) {
        fetch(`http://${window.location.hostname}:3001/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: receiptIP, printerType: 'receipt', orderData: newOrder })
        }).catch(err => console.error('Silent print failed:', err));
      }
    } catch (e) { }
  };

  // =============================================
  // NEW: Move or Merge Table
  // =============================================
  const handleMoveMergeTable = async (fromTable, toTable, isMerge) => {
    // Optimistic update
    setTableOrders(prev => prev.map(o => {
      if (String(o.TableNumber) === String(fromTable)) {
        return { ...o, TableNumber: toTable };
      }
      return o;
    }));

    // Move customer count
    const count = localStorage.getItem('customer_count_' + fromTable);
    if (count) {
      if (isMerge) {
        const toCount = localStorage.getItem('customer_count_' + toTable);
        if (!toCount) localStorage.setItem('customer_count_' + toTable, count);
      } else {
        localStorage.setItem('customer_count_' + toTable, count);
      }
      localStorage.removeItem('customer_count_' + fromTable);
    }

    setTableNumber(toTable);
    navigate('/table-orders');

    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'moveTable',
          fromTable: String(fromTable),
          toTable: String(toTable)
        })
      });
      setTimeout(() => fetchOrdersFromSheet(), 2000);
    } catch (e) {
      console.error('Error moving table:', e);
    }
  };

  // =============================================
  // Delete a single item from table orders
  // =============================================
  const handleDeleteTableItem = async (item) => {
    // Optimistic remove
    setTableOrders(prev => {
      const idx = prev.findIndex(o =>
        String(o.TableNumber) === String(item.TableNumber) &&
        String(o.SessionId) === String(item.SessionId) &&
        String(o.ItemName) === String(item.ItemName)
      );
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });

    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'deleteTableOrderItem',
          tableNumber: String(item.TableNumber),
          sessionId: String(item.SessionId),
          itemName: String(item.ItemName)
        })
      });
    } catch (e) {
      console.error('Error deleting table item:', e);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'updateStatus',
          orderId,
          status: newStatus,
          completionTime: newStatus.toLowerCase() === 'completed' ? getThaiTimeISO() : ''
        })
      });
    } catch (e) {
      console.error('Failed to update status in GAS:', e);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      let itemTotal = Number(item.food.price);
      if (item.allPopups && item.allPopups.length > 0) item.allPopups.forEach(p => { itemTotal += Number(p.price || 0); });
      if (item.promo && item.promo.price) itemTotal += Number(item.promo.price);
      return sum + (itemTotal * item.quantity);
    }, 0);
  };

  // Only block main app with login. Kitchen can be viewed without login, or we can just block everything.
  // For simplicity, block everything except if the user specifically goes to /kitchen maybe?
  // Let's just block the entire app until logged in.
  if (!currentUser) {
    // If path is /kitchen, allow it? Optional. Let's just require login for everything.
    return (
      <LoginScreen
        users={users}
        onLogin={handleLogin}
        lang={lang}
        isOfflineMode={users.length === 0}
        onRetry={fetchOrdersFromSheet}
      />
    );
  }

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Navigate to="/table-select" replace />} />

        <Route path="/table-select" element={
          <div style={{ position: 'relative' }}>
            <TableSelection
              setGlobalTableNumber={setTableNumber}
              lang={lang}
              tableOrders={tableOrders}
            />
            {/* Shift button */}
            <button
              onClick={() => setShiftModalMode(currentShift ? 'close' : 'open')}
              style={{ position: 'fixed', bottom: '5.5rem', right: '1.5rem', zIndex: 100, background: currentShift ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.85)', border: 'none', borderRadius: '50px', color: 'white', cursor: 'pointer', padding: '0.75rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: `0 4px 20px ${currentShift ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}` }}
            >
              {currentShift ? '🔴 ปิดกะ' : '🟢 เปิดกะ'}
            </button>
            {/* Liquor storage button */}
            <button
              onClick={() => navigate('/liquor')}
              style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100, background: '#7c3aed', border: 'none', borderRadius: '50px', color: 'white', cursor: 'pointer', padding: '0.75rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
            >
              🍾 {lang === 'th' ? 'ฝาก/เบิกเหล้า' : 'Liquor Storage'}
            </button>
            {/* Admin / backend button — admin only */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', zIndex: 100, background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50px', color: 'white', cursor: 'pointer', padding: '0.75rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              >
                👑 {lang === 'th' ? 'หลังบ้าน' : 'Admin'}
              </button>
            )}
          </div>
        } />

        <Route path="/table-orders" element={
          !tableNumber ? <Navigate to="/table-select" replace /> :
            <TableOrderView
              tableNumber={tableNumber}
              tableOrders={tableOrders}
              lang={lang}
              currentUser={currentUser}
              settings={posSettings}
              onAddMore={() => navigate('/index')}
              onCheckout={handleOpenCheckoutFromTable}
              onDeleteItem={handleDeleteTableItem}
              onBack={() => {
                setTableNumber('');
                navigate('/table-select');
              }}
              onRefresh={refreshTableOrders}
              isRefreshing={isRefreshing}
              onMoveMerge={handleMoveMergeTable}
            />
        } />

        <Route path="/index" element={
          !tableNumber ? <Navigate to="/table-select" replace /> :
            <div className="pos-layout">
              {/* ─── POS Header ─── */}
              <header className="pos-header">
                <div className="pos-header-left">
                  <img src="/logo.png" alt="Logo" className="pos-logo" />
                  <div className="pos-header-info">
                    <span className="pos-restaurant-name">{lang === 'th' ? 'เสน่ห์' : 'Sa-Nae'}</span>
                    <span className="pos-table-label">{lang === 'th' ? `โต๊ะ ${tableNumber}` : `Table ${tableNumber}`}</span>
                  </div>
                </div>
                <div className="pos-header-right">
                  <button className="pos-header-btn" onClick={() => { setTableNumber(''); navigate('/table-select'); }}>
                    🪑 {lang === 'th' ? 'เลือกโต๊ะ' : 'Tables'}
                  </button>
                  <button className="pos-header-btn" onClick={() => navigate('/table-orders')}>
                    🧾 {lang === 'th' ? 'รายการโต๊ะ' : 'Table'}
                  </button>
                  <button className="pos-header-btn" onClick={() => setLang(lang === 'th' ? 'en' : 'th')}>
                    <Globe size={14} /> {lang === 'th' ? 'TH' : 'EN'}
                  </button>
                  <button className="pos-cart-btn" onClick={() => setIsCartOpen(true)}>
                    <ShoppingBag size={20} />
                    <div className="pos-cart-info">
                      <span className="pos-cart-count">{cart.reduce((s, i) => s + (i.quantity || 1), 0)} {lang === 'th' ? 'รายการ' : 'items'}</span>
                      <span className="pos-cart-total">฿{getCartTotal().toLocaleString()}</span>
                    </div>
                    {cart.length > 0 && (
                      <span className="pos-cart-badge">{cart.reduce((s, i) => s + (i.quantity || 1), 0)}</span>
                    )}
                  </button>
                </div>
              </header>

              <div className="pos-body">
                {/* ─── Category Sidebar ─── */}
                <aside className="pos-sidebar">
                  <div className="pos-sidebar-header">{lang === 'th' ? 'หมวดหมู่' : 'Categories'}</div>
                  {categories
                    .filter(cat => liveMenu.some(i => (i.category || 'food') === cat.slug))
                    .map(cat => {
                      const count = liveMenu.filter(i => (i.category || 'food') === cat.slug).length;
                      return (
                        <button
                          key={cat.slug}
                          className={`pos-cat-btn ${activeCategory === cat.slug ? 'active' : ''}`}
                          onClick={() => setActiveCategory(cat.slug)}
                        >
                          <span className="pos-cat-icon">{cat.icon}</span>
                          <div className="pos-cat-text">
                            <span className="pos-cat-name">{lang === 'th' ? cat.name : cat.nameEn}</span>
                            <span className="pos-cat-count">{count} {lang === 'th' ? 'รายการ' : 'items'}</span>
                          </div>
                        </button>
                      );
                    })}
                </aside>

                {/* ─── Food Grid ─── */}
                <main className="pos-main">
                  {(() => {
                    const activeCat = categories.find(c => c.slug === activeCategory);
                    const filteredItems = liveMenu.filter(i => (i.category || 'food') === activeCategory);
                    return (
                      <>
                        <div className="pos-section-header">
                          <div className="pos-section-title">
                            <span className="pos-section-icon">{activeCat?.icon}</span>
                            <h2>{lang === 'th' ? activeCat?.name : activeCat?.nameEn}</h2>
                          </div>
                          <span className="pos-item-count">{filteredItems.length} {lang === 'th' ? 'รายการ' : 'items'}</span>
                        </div>
                        <div className="pos-food-grid">
                          {filteredItems.map(item => (
                            <FoodCard
                              key={item.id}
                              food={item}
                              lang={lang}
                              onOrderClick={handleOrderClick}
                              onDecreaseClick={handleDecreaseQuantity}
                              cartQuantity={cart.filter(c => c.food.id === item.id).reduce((sum, c) => sum + (c.quantity || 1), 0)}
                            />
                          ))}
                          {filteredItems.length === 0 && (
                            <div className="pos-empty-category">
                              <span>{lang === 'th' ? 'ไม่มีรายการในหมวดหมู่นี้' : 'No items in this category'}</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </main>
              </div>
            </div>
        } />

        <Route path="/kitchen" element={
          <KitchenMonitor
            orders={orders.filter(o => o.status && o.status.toLowerCase() === 'pending')}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onNewOrder={() => navigate('/index')}
          />
        } />

        <Route path="/liquor" element={
          <LiquorStorage currentUser={currentUser} lang={lang} onBack={() => navigate('/table-select')} />
        } />

        <Route path="/admin" element={isAdmin ? <AdminLayout lang={lang} setLang={setLang} onLogout={handleLogout} /> : <Navigate to="/table-select" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="menu" element={<ManageMenu />} />
          <Route path="categories" element={<ManageCategories />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="promotions" element={<ManagePromotions />} />
          <Route path="printers" element={<ManagePrinters />} />
          <Route path="settings" element={<ManageSettings />} />
          <Route path="bom" element={<ManageBOM />} />
          <Route path="stock" element={<ManageStock />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>

      {selectedFood && (
        <OrderWizardModal
          food={selectedFood}
          lang={lang}
          liveMenu={allMenu.length > 0 ? allMenu : liveMenu}
          categories={allCategories.length > 0 ? allCategories : categories}
          onClose={() => setSelectedFood(null)}
          onConfirm={handleConfirmOrder}
        />
      )}

      {isCartOpen && (
        <CartModal
          cart={cart}
          lang={lang}
          onClose={() => setIsCartOpen(false)}
          onRemove={handleRemoveFromCart}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdateNote={handleUpdateCartNote}
          onCheckout={handleSendOrderToTable}
          settings={posSettings}
        />
      )}

      {shiftModalMode && (
        <ShiftModal
          mode={shiftModalMode}
          currentShift={currentShift}
          shiftSales={shiftSales}
          currentUser={currentUser}
          onConfirmOpen={handleOpenShift}
          onConfirmClose={handleCloseShift}
          onClose={() => setShiftModalMode(null)}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          tableOrderItems={checkoutItems}
          total={checkoutTotal}
          lang={lang}
          orderNumber={`#${String(maxOrderNum + 1).padStart(3, '0')}`}
          onClose={() => setIsCheckoutOpen(false)}
          onComplete={handleCheckoutComplete}
          settings={posSettings}
          discounts={posDiscounts}
        />
      )}
    </div>
  );
}

export default App;
