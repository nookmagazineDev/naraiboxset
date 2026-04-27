import express from 'express';
import cors from 'cors';
import pkg from 'node-thermal-printer';

const { printer: ThermalPrinter, types: PrinterTypes } = pkg;

const app = express();
app.use(cors());
app.use(express.json()); // For handling JSON payloads

app.post('/print', async (req, res) => {
  const { ip, type, orderData, printerType = 'receipt' } = req.body;

  if (!ip) {
    return res.status(400).json({ success: false, error: 'Printer IP address is required' });
  }

  try {
    let printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `tcp://${ip}:9100`,
      characterSet: "PC858_EURO",
      removeSpecialCharacters: false,
      lineCharacter: "=",
      options:{
        timeout: 5000
      }
    });

    let isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(500).json({ success: false, error: 'Printer is not connected or reachable at ' + ip });
    }

    // ====== Format Receipt ======
    printer.alignCenter();
    printer.println("กะเพรา 10 หน้า");
    printer.println("--------------------------------");
    
    if (printerType === 'kitchen') {
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println("ใบสั่งทำอาหาร (KITCHEN)");
      printer.setTextNormal();
    } else {
      printer.println("ใบเสร็จรับเงิน (RECEIPT)");
    }
    
    printer.println("--------------------------------");
    printer.alignLeft();
    printer.println(`Order No: ${orderData.orderNumber || '-'}`);
    printer.println(`Date: ${new Date().toLocaleString('th-TH')}`);
    if (orderData.customerDetails?.name) {
      printer.println(`Customer: ${orderData.customerDetails.name}`);
    }
    printer.println("--------------------------------");

    // Print Items
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items.forEach(item => {
        // Front-end formatting depends on whether it's flattened or full object
        let itemName = item.isFlattened ? item.name : item.food?.name;
        let qty = item.isFlattened ? 1 : (item.quantity || 1);
        
        if (item.isFlattened) {
          const match = itemName.match(/\(x(\d+)\)$/);
          if (match) {
            qty = parseInt(match[1], 10);
            itemName = itemName.replace(/\s*\(x\d+\)$/, '').trim();
          }
        }

        printer.println(`${qty}x ${itemName}`);
        
        // Print SubItems / Options
        if (item.isFlattened && item.subItems) {
           item.subItems.forEach(sub => {
              printer.println(`   ${sub}`);
           });
        } else if (!item.isFlattened) {
          if (item.spice && item.spice.name) {
            printer.println(`   (ความเผ็ด: ${item.spice.name})`);
          }
          const popups = [...(item.allPopups || []), ...(item.addOns || [])];
          popups.forEach(p => {
             printer.println(`   ↳ ${p.name}`);
          });
          if (item.promo && item.promo.id !== 'none') {
             printer.println(`   ↳ ${item.promo.name}`);
          }
        }
      });
    }

    printer.println("--------------------------------");
    
    if (printerType === 'receipt') {
      printer.alignRight();
      printer.println(`TOTAL: B ${orderData.total || 0}`);
      printer.println("--------------------------------");
      printer.alignCenter();
      printer.println("Thank you!");
    } else {
      printer.alignCenter();
      printer.println("*** END OF TICKET ***");
    }

    printer.cut();
    
    if (printerType === 'receipt') {
      printer.openCashDrawer();
    }

    await printer.execute();
    console.log(`Print job sent successfully to ${ip}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Print failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Print bridge server running on http://localhost:${PORT}`);
  console.log(`Ready to print to LAN ESP/POS thermal printers`);
});
