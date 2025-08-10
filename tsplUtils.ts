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
};
