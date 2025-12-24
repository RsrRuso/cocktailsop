import { format } from 'date-fns';
import { OrderData } from './KOTTemplates';

interface KOTPreviewProps {
  order: OrderData;
  type: 'kitchen' | 'bar' | 'precheck' | 'closing' | 'combined';
}

const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;
const getOrderRef = (orderId: string) => orderId.replace(/-/g, '').toUpperCase().substring(0, 8);

export function KOTPreview({ order, type }: KOTPreviewProps) {
  const foodItems = order.items.filter(item => item.categoryType === 'food' || !item.categoryType);
  const drinkItems = order.items.filter(item => item.categoryType === 'drink');

  // Kitchen KOT Preview
  if (type === 'kitchen') {
    if (foodItems.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No food items in this order
        </div>
      );
    }

    return (
      <div className="font-mono text-xs bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto shadow-lg">
        <div className="text-center font-bold text-lg mb-1">*** KITCHEN ORDER ***</div>
        <div className="text-center text-sm mb-2">KOT #{getOrderRef(order.id)}</div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        
        <div className="space-y-1 text-sm">
          <div>TABLE: {order.tableName}{order.tableNumber ? ` (#${order.tableNumber})` : ''}</div>
          <div>SERVER: {order.serverName}</div>
          <div>COVERS: {order.covers}</div>
          <div>TIME: {format(new Date(order.createdAt), 'HH:mm:ss')}</div>
          <div>DATE: {format(new Date(order.createdAt), 'dd/MM/yyyy')}</div>
        </div>
        
        <div className="border-t-2 border-black my-3" />
        
        <div className="space-y-3">
          {foodItems.map((item, idx) => (
            <div key={idx} className="text-lg font-bold">
              <span className="text-2xl mr-2">{item.qty}x</span>
              {item.name.toUpperCase()}
              {item.note && (
                <div className="text-sm text-red-600 font-bold ml-8">*** {item.note.toUpperCase()} ***</div>
              )}
            </div>
          ))}
        </div>
        
        <div className="border-t-2 border-black my-3" />
        <div className="text-center font-bold">
          TOTAL ITEMS: {foodItems.reduce((sum, i) => sum + i.qty, 0)}
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="text-center text-xs text-gray-500">
          {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
        </div>
      </div>
    );
  }

  // Bar KOT Preview
  if (type === 'bar') {
    if (drinkItems.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No drink items in this order
        </div>
      );
    }

    return (
      <div className="font-mono text-xs bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto shadow-lg">
        <div className="text-center font-bold text-lg mb-1 text-amber-700">*** BAR ORDER ***</div>
        <div className="text-center text-sm mb-2">BOT #{getOrderRef(order.id)}</div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        
        <div className="space-y-1 text-sm">
          <div>TABLE: {order.tableName}{order.tableNumber ? ` (#${order.tableNumber})` : ''}</div>
          <div>SERVER: {order.serverName}</div>
          <div>TIME: {format(new Date(order.createdAt), 'HH:mm:ss')}</div>
        </div>
        
        <div className="border-t-2 border-amber-700 my-3" />
        
        <div className="space-y-3">
          {drinkItems.map((item, idx) => (
            <div key={idx} className="text-lg font-bold">
              <span className="text-2xl mr-2">{item.qty}x</span>
              {item.name.toUpperCase()}
              {item.note && (
                <div className="text-sm text-red-600 font-bold ml-8">*** {item.note.toUpperCase()} ***</div>
              )}
            </div>
          ))}
        </div>
        
        <div className="border-t-2 border-amber-700 my-3" />
        <div className="text-center font-bold">
          TOTAL DRINKS: {drinkItems.reduce((sum, i) => sum + i.qty, 0)}
        </div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        <div className="text-center text-xs text-gray-500">
          {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
        </div>
      </div>
    );
  }

  // Pre-Check Preview
  if (type === 'precheck') {
    return (
      <div className="font-mono text-xs bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto shadow-lg">
        {order.outletName && (
          <div className="text-center font-bold text-lg mb-1">{order.outletName.toUpperCase()}</div>
        )}
        <div className="text-center font-bold text-base mb-1">*** PRE-CHECK ***</div>
        <div className="text-center text-sm mb-2">CHECK #{getOrderRef(order.id)}</div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        
        <div className="space-y-1 text-sm">
          <div>TABLE: {order.tableName}</div>
          <div>SERVER: {order.serverName}</div>
          <div>COVERS: {order.covers}</div>
          <div>DATE: {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</div>
        </div>
        
        <div className="border-t-2 border-black my-3" />
        
        <div className="space-y-2">
          {order.items.map((item, idx) => {
            const itemTotal = item.qty * item.price;
            return (
              <div key={idx}>
                {item.qty > 1 ? (
                  <>
                    <div>{item.name}</div>
                    <div className="flex justify-between text-gray-600">
                      <span className="ml-2">{item.qty} @ {formatPrice(item.price)}</span>
                      <span>{formatPrice(itemTotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{formatPrice(itemTotal)}</span>
                  </div>
                )}
                {item.note && <div className="text-gray-500 ml-2">- {item.note}</div>}
              </div>
            );
          })}
        </div>
        
        <div className="border-t border-dashed border-gray-400 my-3" />
        
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.taxTotal > 0 && (
            <div className="flex justify-between">
              <span>TAX:</span>
              <span>{formatPrice(order.taxTotal)}</span>
            </div>
          )}
          {order.serviceCharge > 0 && (
            <div className="flex justify-between">
              <span>SERVICE:</span>
              <span>{formatPrice(order.serviceCharge)}</span>
            </div>
          )}
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-green-600">
              <span>DISCOUNT:</span>
              <span>-{formatPrice(order.discountTotal)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t-2 border-black my-3" />
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL DUE:</span>
          <span>{formatPrice(order.total)}</span>
        </div>
        <div className="border-t-2 border-black my-3" />
        
        <div className="text-center mt-4">
          <div className="font-bold text-red-600">** NOT A RECEIPT **</div>
          <div className="text-sm text-gray-600 mt-2">Thank you for dining with us!</div>
          <div className="text-xs text-gray-500 mt-2">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</div>
        </div>
      </div>
    );
  }

  // Closing Check / Receipt Preview
  if (type === 'closing') {
    return (
      <div className="font-mono text-xs bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto shadow-lg">
        {order.outletName && (
          <div className="text-center font-bold text-lg mb-1">{order.outletName.toUpperCase()}</div>
        )}
        <div className="text-center font-bold text-base mb-1">*** RECEIPT ***</div>
        <div className="text-center text-sm mb-2">#{getOrderRef(order.id)}</div>
        <div className="border-t border-dashed border-gray-400 my-2" />
        
        <div className="space-y-1 text-sm">
          <div>TABLE: {order.tableName}</div>
          <div>SERVER: {order.serverName}</div>
          <div>COVERS: {order.covers}</div>
          <div>DATE: {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</div>
        </div>
        
        <div className="border-t-2 border-black my-3" />
        
        <div className="space-y-2">
          {order.items.map((item, idx) => {
            const itemTotal = item.qty * item.price;
            return (
              <div key={idx}>
                {item.qty > 1 ? (
                  <>
                    <div>{item.name}</div>
                    <div className="flex justify-between text-gray-600">
                      <span className="ml-2">{item.qty} @ {formatPrice(item.price)}</span>
                      <span>{formatPrice(itemTotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{formatPrice(itemTotal)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="border-t border-dashed border-gray-400 my-3" />
        
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.taxTotal > 0 && (
            <div className="flex justify-between">
              <span>TAX:</span>
              <span>{formatPrice(order.taxTotal)}</span>
            </div>
          )}
          {order.serviceCharge > 0 && (
            <div className="flex justify-between">
              <span>SERVICE:</span>
              <span>{formatPrice(order.serviceCharge)}</span>
            </div>
          )}
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-green-600">
              <span>DISCOUNT:</span>
              <span>-{formatPrice(order.discountTotal)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t-2 border-black my-3" />
        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL:</span>
          <span>{formatPrice(order.total)}</span>
        </div>
        
        {order.paymentMethod && (
          <>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between">
                <span>PAYMENT:</span>
                <span>{order.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>PAID:</span>
                <span>{formatPrice(order.total)}</span>
              </div>
              {order.paidAt && (
                <div>PAID AT: {format(new Date(order.paidAt), 'HH:mm:ss')}</div>
              )}
            </div>
          </>
        )}
        
        <div className="border-t-2 border-black my-3" />
        
        <div className="text-center mt-4">
          <div className="text-sm">Thank you for visiting!</div>
          <div className="text-sm">Please come again</div>
          <div className="text-xs text-gray-500 mt-2">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</div>
        </div>
      </div>
    );
  }

  // Combined KOT Preview
  return (
    <div className="font-mono text-xs bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto shadow-lg">
      <div className="text-center font-bold text-lg mb-1">*** ORDER TICKET ***</div>
      <div className="text-center text-sm mb-2">#{getOrderRef(order.id)}</div>
      <div className="border-t border-dashed border-gray-400 my-2" />
      
      <div className="space-y-1 text-sm">
        <div>TABLE: {order.tableName}{order.tableNumber ? ` (#${order.tableNumber})` : ''}</div>
        <div>SERVER: {order.serverName}</div>
        <div>COVERS: {order.covers}</div>
        <div>TIME: {format(new Date(order.createdAt), 'HH:mm:ss')}</div>
      </div>
      
      <div className="border-t-2 border-black my-3" />
      
      {drinkItems.length > 0 && (
        <>
          <div className="text-center text-amber-700 font-bold">─── BAR ───</div>
          <div className="space-y-2 mt-2 mb-4">
            {drinkItems.map((item, idx) => (
              <div key={idx} className="text-base font-bold">
                <span className="text-xl mr-2">{item.qty}x</span>
                {item.name.toUpperCase()}
                {item.note && (
                  <div className="text-sm text-red-600 font-bold ml-8">*** {item.note.toUpperCase()} ***</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      
      {foodItems.length > 0 && (
        <>
          <div className="text-center text-green-700 font-bold">─── KITCHEN ───</div>
          <div className="space-y-2 mt-2">
            {foodItems.map((item, idx) => (
              <div key={idx} className="text-base font-bold">
                <span className="text-xl mr-2">{item.qty}x</span>
                {item.name.toUpperCase()}
                {item.note && (
                  <div className="text-sm text-red-600 font-bold ml-8">*** {item.note.toUpperCase()} ***</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      
      <div className="border-t-2 border-black my-3" />
      <div className="text-center font-bold">
        TOTAL ITEMS: {order.items.reduce((sum, i) => sum + i.qty, 0)}
      </div>
      <div className="border-t border-dashed border-gray-400 my-2" />
      <div className="text-center text-xs text-gray-500">
        {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
      </div>
    </div>
  );
}
