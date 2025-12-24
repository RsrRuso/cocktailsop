import { format } from 'date-fns';

export interface OrderData {
  id: string;
  orderNumber?: string;
  tableName: string;
  tableNumber?: number | null;
  serverName: string;
  covers: number;
  createdAt: string;
  items: OrderItemData[];
  subtotal: number;
  taxTotal: number;
  serviceCharge: number;
  discountTotal: number;
  total: number;
  paymentMethod?: string;
  paidAt?: string;
  outletName?: string;
}

export interface OrderItemData {
  id: string;
  name: string;
  qty: number;
  price: number;
  note?: string;
  category?: string;
  categoryType?: 'food' | 'drink';
  sentAt?: string;
}

const RECEIPT_WIDTH = 42; // Characters for 80mm thermal printer
const DIVIDER = '─'.repeat(RECEIPT_WIDTH);
const DOUBLE_DIVIDER = '═'.repeat(RECEIPT_WIDTH);

const centerText = (text: string, width = RECEIPT_WIDTH) => {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
};

const rightAlign = (left: string, right: string, width = RECEIPT_WIDTH) => {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
};

const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;

// Generate short order reference from UUID
const getOrderRef = (orderId: string) => {
  const cleanId = orderId.replace(/-/g, '').toUpperCase();
  return cleanId.substring(0, 8);
};

/**
 * Kitchen Order Ticket (KOT) - Food items for kitchen
 * Micros-style format with clear item display
 */
export function generateKitchenKOT(order: OrderData): string[] {
  const lines: string[] = [];
  const foodItems = order.items.filter(item => item.categoryType === 'food' || !item.categoryType);
  
  if (foodItems.length === 0) return [];

  // Header
  lines.push(centerText('*** KITCHEN ORDER ***'));
  lines.push(centerText(`KOT #${getOrderRef(order.id)}`));
  lines.push(DIVIDER);
  
  // Order Info
  lines.push(`TABLE: ${order.tableName}${order.tableNumber ? ` (#${order.tableNumber})` : ''}`);
  lines.push(`SERVER: ${order.serverName}`);
  lines.push(`COVERS: ${order.covers}`);
  lines.push(`TIME: ${format(new Date(order.createdAt), 'HH:mm:ss')}`);
  lines.push(`DATE: ${format(new Date(order.createdAt), 'dd/MM/yyyy')}`);
  lines.push(DOUBLE_DIVIDER);

  // Items with large qty display
  for (const item of foodItems) {
    lines.push('');
    lines.push(`  ${item.qty}x  ${item.name.toUpperCase()}`);
    if (item.note) {
      lines.push(`       *** ${item.note.toUpperCase()} ***`);
    }
  }

  lines.push('');
  lines.push(DOUBLE_DIVIDER);
  lines.push(centerText(`TOTAL ITEMS: ${foodItems.reduce((sum, i) => sum + i.qty, 0)}`));
  lines.push(DIVIDER);
  lines.push(centerText(format(new Date(), 'dd/MM/yyyy HH:mm:ss')));
  lines.push('');

  return lines;
}

/**
 * Bar Order Ticket (BOT) - Drink items for bar
 * Micros-style format with drink-specific display
 */
export function generateBarKOT(order: OrderData): string[] {
  const lines: string[] = [];
  const drinkItems = order.items.filter(item => item.categoryType === 'drink');
  
  if (drinkItems.length === 0) return [];

  // Header
  lines.push(centerText('*** BAR ORDER ***'));
  lines.push(centerText(`BOT #${getOrderRef(order.id)}`));
  lines.push(DIVIDER);
  
  // Order Info
  lines.push(`TABLE: ${order.tableName}${order.tableNumber ? ` (#${order.tableNumber})` : ''}`);
  lines.push(`SERVER: ${order.serverName}`);
  lines.push(`TIME: ${format(new Date(order.createdAt), 'HH:mm:ss')}`);
  lines.push(DOUBLE_DIVIDER);

  // Items
  for (const item of drinkItems) {
    lines.push('');
    lines.push(`  ${item.qty}x  ${item.name.toUpperCase()}`);
    if (item.note) {
      lines.push(`       *** ${item.note.toUpperCase()} ***`);
    }
  }

  lines.push('');
  lines.push(DOUBLE_DIVIDER);
  lines.push(centerText(`TOTAL DRINKS: ${drinkItems.reduce((sum, i) => sum + i.qty, 0)}`));
  lines.push(DIVIDER);
  lines.push(centerText(format(new Date(), 'dd/MM/yyyy HH:mm:ss')));
  lines.push('');

  return lines;
}

/**
 * Pre-Check / Guest Check - Itemized bill before payment
 * Shows all items with prices for guest review
 */
export function generatePreCheck(order: OrderData): string[] {
  const lines: string[] = [];

  // Header
  if (order.outletName) {
    lines.push(centerText(order.outletName.toUpperCase()));
  }
  lines.push(centerText('*** PRE-CHECK ***'));
  lines.push(centerText(`CHECK #${getOrderRef(order.id)}`));
  lines.push(DIVIDER);
  
  // Order Info
  lines.push(`TABLE: ${order.tableName}`);
  lines.push(`SERVER: ${order.serverName}`);
  lines.push(`COVERS: ${order.covers}`);
  lines.push(`DATE: ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}`);
  lines.push(DOUBLE_DIVIDER);

  // Items with prices
  for (const item of order.items) {
    const itemTotal = item.qty * item.price;
    if (item.qty > 1) {
      lines.push(item.name);
      lines.push(rightAlign(`  ${item.qty} @ ${formatPrice(item.price)}`, formatPrice(itemTotal)));
    } else {
      lines.push(rightAlign(item.name, formatPrice(itemTotal)));
    }
    if (item.note) {
      lines.push(`  - ${item.note}`);
    }
  }

  lines.push(DIVIDER);
  
  // Totals
  lines.push(rightAlign('SUBTOTAL:', formatPrice(order.subtotal)));
  
  if (order.taxTotal > 0) {
    lines.push(rightAlign('TAX:', formatPrice(order.taxTotal)));
  }
  
  if (order.serviceCharge > 0) {
    lines.push(rightAlign('SERVICE:', formatPrice(order.serviceCharge)));
  }
  
  if (order.discountTotal > 0) {
    lines.push(rightAlign('DISCOUNT:', `-${formatPrice(order.discountTotal)}`));
  }

  lines.push(DOUBLE_DIVIDER);
  lines.push(rightAlign('TOTAL DUE:', formatPrice(order.total)));
  lines.push(DOUBLE_DIVIDER);

  // Footer
  lines.push('');
  lines.push(centerText('** NOT A RECEIPT **'));
  lines.push(centerText('Thank you for dining with us!'));
  lines.push(centerText(format(new Date(), 'dd/MM/yyyy HH:mm:ss')));
  lines.push('');

  return lines;
}

/**
 * Closing Check / Final Receipt - After payment
 * Complete receipt with payment information
 */
export function generateClosingCheck(order: OrderData): string[] {
  const lines: string[] = [];

  // Header
  if (order.outletName) {
    lines.push(centerText(order.outletName.toUpperCase()));
    lines.push('');
  }
  lines.push(centerText('*** RECEIPT ***'));
  lines.push(centerText(`#${getOrderRef(order.id)}`));
  lines.push(DIVIDER);
  
  // Order Info
  lines.push(`TABLE: ${order.tableName}`);
  lines.push(`SERVER: ${order.serverName}`);
  lines.push(`COVERS: ${order.covers}`);
  lines.push(`DATE: ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}`);
  lines.push(DOUBLE_DIVIDER);

  // Items with prices
  for (const item of order.items) {
    const itemTotal = item.qty * item.price;
    if (item.qty > 1) {
      lines.push(item.name);
      lines.push(rightAlign(`  ${item.qty} @ ${formatPrice(item.price)}`, formatPrice(itemTotal)));
    } else {
      lines.push(rightAlign(item.name, formatPrice(itemTotal)));
    }
  }

  lines.push(DIVIDER);
  
  // Totals
  lines.push(rightAlign('SUBTOTAL:', formatPrice(order.subtotal)));
  
  if (order.taxTotal > 0) {
    lines.push(rightAlign('TAX:', formatPrice(order.taxTotal)));
  }
  
  if (order.serviceCharge > 0) {
    lines.push(rightAlign('SERVICE:', formatPrice(order.serviceCharge)));
  }
  
  if (order.discountTotal > 0) {
    lines.push(rightAlign('DISCOUNT:', `-${formatPrice(order.discountTotal)}`));
  }

  lines.push(DOUBLE_DIVIDER);
  lines.push(rightAlign('TOTAL:', formatPrice(order.total)));
  lines.push('');
  
  // Payment Info
  if (order.paymentMethod) {
    lines.push(rightAlign('PAYMENT:', order.paymentMethod.toUpperCase()));
    lines.push(rightAlign('PAID:', formatPrice(order.total)));
    if (order.paidAt) {
      lines.push(`PAID AT: ${format(new Date(order.paidAt), 'HH:mm:ss')}`);
    }
  }

  lines.push(DOUBLE_DIVIDER);

  // Footer
  lines.push('');
  lines.push(centerText('Thank you for visiting!'));
  lines.push(centerText('Please come again'));
  lines.push('');
  lines.push(centerText(format(new Date(), 'dd/MM/yyyy HH:mm:ss')));
  lines.push('');

  return lines;
}

/**
 * Combined KOT - All items on single ticket
 * For venues that use a single printer
 */
export function generateCombinedKOT(order: OrderData): string[] {
  const lines: string[] = [];

  // Header
  lines.push(centerText('*** ORDER TICKET ***'));
  lines.push(centerText(`#${getOrderRef(order.id)}`));
  lines.push(DIVIDER);
  
  // Order Info
  lines.push(`TABLE: ${order.tableName}${order.tableNumber ? ` (#${order.tableNumber})` : ''}`);
  lines.push(`SERVER: ${order.serverName}`);
  lines.push(`COVERS: ${order.covers}`);
  lines.push(`TIME: ${format(new Date(order.createdAt), 'HH:mm:ss')}`);
  lines.push(DOUBLE_DIVIDER);

  // Group items by category type
  const foodItems = order.items.filter(item => item.categoryType === 'food' || !item.categoryType);
  const drinkItems = order.items.filter(item => item.categoryType === 'drink');

  if (drinkItems.length > 0) {
    lines.push('');
    lines.push(centerText('─── BAR ───'));
    for (const item of drinkItems) {
      lines.push(`  ${item.qty}x  ${item.name.toUpperCase()}`);
      if (item.note) {
        lines.push(`       *** ${item.note.toUpperCase()} ***`);
      }
    }
  }

  if (foodItems.length > 0) {
    lines.push('');
    lines.push(centerText('─── KITCHEN ───'));
    for (const item of foodItems) {
      lines.push(`  ${item.qty}x  ${item.name.toUpperCase()}`);
      if (item.note) {
        lines.push(`       *** ${item.note.toUpperCase()} ***`);
      }
    }
  }

  lines.push('');
  lines.push(DOUBLE_DIVIDER);
  lines.push(centerText(`TOTAL ITEMS: ${order.items.reduce((sum, i) => sum + i.qty, 0)}`));
  lines.push(DIVIDER);
  lines.push(centerText(format(new Date(), 'dd/MM/yyyy HH:mm:ss')));
  lines.push('');

  return lines;
}
