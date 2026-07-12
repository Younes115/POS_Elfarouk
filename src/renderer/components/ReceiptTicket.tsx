import React from 'react';
import type { CartItem } from '@/store/useCartStore';

interface ReceiptTicketProps {
  receiptNumber: string;
  items: CartItem[];
  subTotal: number;
  discount: number;
  total: number;
  date: string;
}

const ReceiptTicket = React.forwardRef<HTMLDivElement, ReceiptTicketProps>(
  ({ receiptNumber, items, subTotal, discount, total, date }, ref) => {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    return (
      <div
        ref={ref}
        style={{
          width: '80mm',
          padding: '8mm 4mm',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          lineHeight: 1.5,
          color: '#000',
          background: '#fff',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>EL FAROUK</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>POS Receipt</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Receipt info */}
        <div style={{ fontSize: '10px', marginBottom: '6px' }}>
          <div>Receipt: {receiptNumber}</div>
          <div>Date: {date}</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Items */}
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: 700 }}>Item</th>
              <th style={{ textAlign: 'center', paddingBottom: '4px', fontWeight: 700, width: '30px' }}>Qty</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 700, width: '60px' }}>Price</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 700, width: '65px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.product.id}>
                <td style={{ paddingBottom: '3px', fontSize: '10px' }}>
                  {item.product.name}
                  {item.product.size ? ` (${item.product.size})` : ''}
                </td>
                <td style={{ textAlign: 'center', paddingBottom: '3px' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', paddingBottom: '3px' }}>{fmt(item.product.sellingPrice)}</td>
                <td style={{ textAlign: 'right', paddingBottom: '3px' }}>
                  {fmt(item.product.sellingPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Totals */}
        <div style={{ fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{fmt(subTotal)} EGP</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount:</span>
              <span>-{fmt(discount)} EGP</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '14px',
              marginTop: '4px',
            }}
          >
            <span>TOTAL:</span>
            <span>{fmt(total)} EGP</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          <div>Thank you for your purchase!</div>
          <div style={{ marginTop: '2px', opacity: 0.6 }}>No refunds without receipt</div>
        </div>
      </div>
    );
  }
);

ReceiptTicket.displayName = 'ReceiptTicket';

export default ReceiptTicket;
