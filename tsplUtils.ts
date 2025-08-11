/**
 * TSPL Utility Functions for Label Printers
 * Supports MUNBYN, Zebra, and other TSPL-compatible printers
 */

export interface LabelSize {
  width: number; // in mm
  height: number; // in mm
}

export interface LabelData {
  text: string;
  barcode?: string;
  qrCode?: string;
  image?: string; // Base64 encoded image
}

export interface TSPLConfig {
  dpi: number; // Printer DPI (default: 203)
  gap: number; // Gap between labels in mm (default: 3)
  direction: number; // Print direction (0: normal, 1: reverse)
  density: number; // Print density (0-15)
}

/**
 * Convert millimeters to dots based on printer DPI
 */
export const mmToDots = (mm: number, dpi: number): number => {
  return Math.round((mm * dpi) / 25.4);
};

/**
 * Generate basic TSPL label setup commands
 */
export const generateLabelSetup = (
  size: LabelSize,
  config: Partial<TSPLConfig> = {},
): string => {
  const {dpi = 203, gap = 3, direction = 0, density = 8} = config;

  let tspl = '';

  // Initialize label
  tspl += `SIZE ${size.width}mm,${size.height}mm\n`;
  tspl += `GAP ${gap}mm,0mm\n`;
  tspl += `DIRECTION ${direction}\n`;
  tspl += `DENSITY ${density}\n`;
  tspl += 'CLS\n';

  return tspl;
};

/**
 * Generate TSPL text command
 */
export const generateTextCommand = (
  text: string,
  x: number,
  y: number,
  font: number = 3,
  rotation: number = 0,
  xMultiplier: number = 1,
  yMultiplier: number = 1,
): string => {
  return `TEXT ${x},${y},"${font}",${rotation},${xMultiplier},${yMultiplier},"${text}"\n`;
};

/**
 * Generate TSPL barcode command (Code 128)
 */
export const generateBarcodeCommand = (
  data: string,
  x: number,
  y: number,
  height: number = 50,
  rotation: number = 0,
  narrow: number = 2,
  wide: number = 2,
): string => {
  return `BARCODE ${x},${y},"128",${height},${rotation},${narrow},${wide},"${data}"\n`;
};

/**
 * Generate TSPL QR code command
 */
export const generateQRCodeCommand = (
  data: string,
  x: number,
  y: number,
  level: string = 'L', // L, M, Q, H
  cellWidth: number = 7,
  rotation: number = 0,
): string => {
  return `QRCODE ${x},${y},${level},${cellWidth},${rotation},"${data}"\n`;
};

/**
 * Generate TSPL image command
 */
export const generateImageCommand = (
  imageData: string,
  x: number,
  y: number,
  mode: number = 0,
): string => {
  return `PUTBMP ${x},${y},"${imageData}",${mode}\n`;
};

/**
 * Generate complete TSPL label with all elements
 */
export const generateCompleteLabel = (
  data: LabelData,
  size: LabelSize,
  config: Partial<TSPLConfig> = {},
): string => {
  const {dpi = 203} = config;

  let tspl = generateLabelSetup(size, config);

  // Calculate positions based on label size
  const centerX = mmToDots(size.width, dpi) / 2;
  const textY = 20;
  const barcodeY = textY + 40;
  const qrY = barcodeY + 60;

  // Add text (centered)
  if (data.text) {
    const textWidth = data.text.length * 8; // Approximate text width
    const textX = centerX - textWidth / 2;
    tspl += generateTextCommand(data.text, textX, textY, 3, 0, 1, 1);
  }

  // Add barcode (centered)
  if (data.barcode) {
    const barcodeX = centerX - 50; // Center barcode
    tspl += generateBarcodeCommand(data.barcode, barcodeX, barcodeY, 50);
  }

  // Add QR code (centered)
  if (data.qrCode) {
    const qrSize = 50; // QR code size in dots
    const qrX = centerX - qrSize / 2;
    tspl += generateQRCodeCommand(data.qrCode, qrX, qrY, 'L', 7, 0);
  }

  // Add image if provided
  if (data.image) {
    const imageX = centerX - 25; // Center image
    tspl += generateImageCommand(data.image, imageX, textY - 15, 0);
  }

  // Print label
  tspl += 'PRINT 1\n';

  return tspl;
};

/**
 * Generate shipping label template
 */
export const generateShippingLabel = (
  recipientName: string,
  address: string,
  city: string,
  state: string,
  zipCode: string,
  trackingNumber: string,
  size: LabelSize = {width: 100, height: 50},
): string => {
  const config: TSPLConfig = {dpi: 203, gap: 3, direction: 0, density: 8};

  let tspl = generateLabelSetup(size, config);

  // Header
  tspl += generateTextCommand('SHIPPING LABEL', 10, 10, 4, 0, 1, 1);

  // Recipient info
  tspl += generateTextCommand(`To: ${recipientName}`, 10, 30, 2, 0, 1, 1);
  tspl += generateTextCommand(address, 10, 45, 2, 0, 1, 1);
  tspl += generateTextCommand(
    `${city}, ${state} ${zipCode}`,
    10,
    60,
    2,
    0,
    1,
    1,
  );

  // Tracking barcode
  tspl += generateBarcodeCommand(trackingNumber, 10, 80, 40);
  tspl += generateTextCommand(
    `Tracking: ${trackingNumber}`,
    10,
    125,
    1,
    0,
    1,
    1,
  );

  tspl += 'PRINT 1\n';
  return tspl;
};

/**
 * Generate product label template
 */
export const generateProductLabel = (
  productName: string,
  sku: string,
  price: string,
  barcode: string,
  size: LabelSize = {width: 60, height: 40},
): string => {
  const config: TSPLConfig = {dpi: 203, gap: 3, direction: 0, density: 8};

  let tspl = generateLabelSetup(size, config);

  // Product name
  tspl += generateTextCommand(productName, 10, 10, 3, 0, 1, 1);

  // SKU
  tspl += generateTextCommand(`SKU: ${sku}`, 10, 30, 2, 0, 1, 1);

  // Price
  tspl += generateTextCommand(`$${price}`, 10, 45, 4, 0, 1, 1);

  // Barcode
  tspl += generateBarcodeCommand(barcode, 10, 70, 30);

  tspl += 'PRINT 1\n';
  return tspl;
};

/**
 * Generate receipt template
 */
export const generateReceipt = (
  items: Array<{name: string; price: number}>,
  total: number,
  size: LabelSize = {width: 80, height: 120},
): string => {
  const config: TSPLConfig = {dpi: 203, gap: 3, direction: 0, density: 8};

  let tspl = generateLabelSetup(size, config);

  // Header
  tspl += generateTextCommand('=== RECEIPT ===', 10, 10, 3, 0, 1, 1);

  // Items
  let yPosition = 35;
  items.forEach((item, index) => {
    tspl += generateTextCommand(
      `${index + 1}. ${item.name}`,
      10,
      yPosition,
      2,
      0,
      1,
      1,
    );
    tspl += generateTextCommand(
      `$${item.price.toFixed(2)}`,
      60,
      yPosition,
      2,
      0,
      1,
      1,
    );
    yPosition += 20;
  });

  // Total
  tspl += generateTextCommand('---', 10, yPosition, 2, 0, 1, 1);
  yPosition += 20;
  tspl += generateTextCommand(
    `Total: $${total.toFixed(2)}`,
    10,
    yPosition,
    3,
    0,
    1,
    1,
  );

  // Footer
  tspl += generateTextCommand('Thank you!', 10, yPosition + 25, 2, 0, 1, 1);

  tspl += 'PRINT 1\n';
  return tspl;
};

/**
 * Generate inventory label template
 */
export const generateInventoryLabel = (
  itemName: string,
  quantity: number,
  location: string,
  date: string,
  size: LabelSize = {width: 70, height: 50},
): string => {
  const config: TSPLConfig = {dpi: 203, gap: 3, direction: 0, density: 8};

  let tspl = generateLabelSetup(size, config);

  // Item name
  tspl += generateTextCommand(itemName, 10, 10, 3, 0, 1, 1);

  // Quantity
  tspl += generateTextCommand(`Qty: ${quantity}`, 10, 30, 2, 0, 1, 1);

  // Location
  tspl += generateTextCommand(`Loc: ${location}`, 10, 45, 2, 0, 1, 1);

  // Date
  tspl += generateTextCommand(`Date: ${date}`, 10, 60, 1, 0, 1, 1);

  tspl += 'PRINT 1\n';
  return tspl;
};

/**
 * Generate 56x31mm label with border, white background, and black text
 */
export const generate56x31Label = (
  text: string,
  barcode?: string,
  qrCode?: string,
  config: Partial<TSPLConfig> = {},
): string => {
  const {dpi = 203, gap = 2, direction = 0, density = 8} = config;

  let tspl = '';

  // Initialize label with exact 56x31mm dimensions
  tspl += `SIZE 56mm,31mm\n`;
  tspl += `GAP ${gap}mm,0mm\n`;
  tspl += `DIRECTION ${direction}\n`;
  tspl += `DENSITY ${density}\n`;
  tspl += 'CLS\n';

  // Add border around the entire label (BOX command: BOX x1,y1,x2,y2,thickness)
  // Using 203 DPI: 56mm = ~447 dots, 31mm = ~248 dots
  // Border with 2-dot thickness, leaving small margin
  tspl += 'BOX 5,5,442,243,2\n';

  // Calculate center position
  const centerX = 447 / 2; // 56mm in dots / 2

  // Add main text (centered, black text on white background)
  if (text) {
    const textX = Math.max(10, centerX - text.length * 4); // Approximate text positioning
    tspl += `TEXT ${textX},20,"3",0,1,1,"${text}"\n`;
  }

  // Add barcode if provided (centered)
  if (barcode) {
    const barcodeX = centerX - 50; // Center barcode
    tspl += `BARCODE ${barcodeX},60,"128",30,0,2,2,"${barcode}"\n`;
  }

  // Add QR code if provided (centered)
  if (qrCode) {
    const qrSize = 40; // QR code size in dots
    const qrX = centerX - qrSize / 2;
    tspl += `QRCODE ${qrX},100,L,5,0,"${qrCode}"\n`;
  }

  // Print label
  tspl += 'PRINT 1\n';

  return tspl;
};

/**
 * Generate complex label with header bar, expiry line, printed line, and ingredients
 * This matches the exact layout shown in the label preview
 */
export const generateComplexLabel = (
  labelData: {
    header: string;
    expiryLine?: string;
    printedLine?: string;
    ingredientsLine?: string;
    initialsLine?: string;
  },
  config: Partial<TSPLConfig> = {},
): string => {
  const {dpi = 203, gap = 2, direction = 0, density = 8} = config;

  let tspl = '';

  // Initialize label with exact 56x31mm dimensions
  tspl += `SIZE 56mm,31mm\n`;
  tspl += `GAP ${gap}mm,0mm\n`;
  tspl += `DIRECTION ${direction}\n`;
  tspl += `DENSITY ${density}\n`;
  tspl += 'CLS\n';

  // Using 203 DPI: 56mm = ~447 dots, 31mm = ~248 dots

  // 1. Draw black header bar at the top (rounded corners)
  // Header bar: full width, height ~40 dots (about 5mm)
  tspl += 'BOX 0,0,447,40,0\n'; // Black background for header

  // 2. Header text (white text on black background)
  if (labelData.header) {
    // Center the header text
    const headerText = labelData.header.toUpperCase();
    const headerX = Math.max(10, (447 - headerText.length * 8) / 2); // Approximate centering
    tspl += `TEXT ${headerX},25,"3",0,1,1,"${headerText}"\n`;
  }

  // 3. Expiry line (if exists)
  if (labelData.expiryLine) {
    const expiryY = 50; // Below header
    tspl += `TEXT 10,${expiryY},"2",0,1,1,"${labelData.expiryLine}"\n`;
  }

  // 4. Printed line (if exists)
  if (labelData.printedLine) {
    const printedY = 70; // Below expiry line
    tspl += `TEXT 10,${printedY},"2",0,1,1,"${labelData.printedLine}"\n`;
  }

  // 5. Ingredients line (if exists)
  if (labelData.ingredientsLine) {
    const ingredientsY = 90; // Below printed line
    tspl += `TEXT 10,${ingredientsY},"2",0,1,1,"${labelData.ingredientsLine}"\n`;
  }

  // 6. Initials line (if exists and not already shown in printed line)
  if (labelData.initialsLine && !labelData.printedLine) {
    const initialsY = 110; // Below ingredients line
    tspl += `TEXT 10,${initialsY},"2",0,1,1,"${labelData.initialsLine}"\n`;
  }

  // Print label
  tspl += 'PRINT 1\n';

  return tspl;
};

export default {
  mmToDots,
  generateLabelSetup,
  generateTextCommand,
  generateBarcodeCommand,
  generateQRCodeCommand,
  generateImageCommand,
  generateCompleteLabel,
  generateShippingLabel,
  generateProductLabel,
  generateReceipt,
  generateInventoryLabel,
  generate56x31Label,
  generateComplexLabel,
};
