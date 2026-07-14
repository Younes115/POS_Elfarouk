import React from 'react';

export interface ExchangeReceiptTicketProps {
  receiptNumber: string;
  date: string;
  oldItem: {
    name: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    price: number;
  };
  newItem: {
    name: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    price: number;
  };
  netDifference: number;
}

const ExchangeReceiptTicket = React.forwardRef<HTMLDivElement, ExchangeReceiptTicketProps>(
  ({ receiptNumber, date, oldItem, newItem, netDifference }, ref) => {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    const oldTotal = oldItem.price * oldItem.quantity;
    const newTotal = newItem.price * newItem.quantity;

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
          <div style={{ fontSize: '10px', marginTop: '2px' }}>Exchange Receipt / إيصال استبدال</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Receipt info */}
        <div style={{ fontSize: '10px', marginBottom: '6px' }}>
          <div>Orig. Receipt: {receiptNumber}</div>
          <div>Date: {date}</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Returned Item */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '2px' }}>RETURNED ITEM</div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '3px', fontSize: '10px' }}>
                  {oldItem.name}
                  {oldItem.color ? ` (${oldItem.color})` : ''}
                  {oldItem.size ? ` - Sz:${oldItem.size}` : ''}
                </td>
                <td style={{ textAlign: 'center', paddingBottom: '3px', width: '30px' }}>×{oldItem.quantity}</td>
                <td style={{ textAlign: 'right', paddingBottom: '3px', width: '60px' }}>{fmt(oldItem.price)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ textAlign: 'right', fontSize: '10px', marginTop: '2px' }}>
            Allowance: {fmt(oldTotal)} EGP
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* New Item */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '2px' }}>NEW ITEM</div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '3px', fontSize: '10px' }}>
                  {newItem.name}
                  {newItem.color ? ` (${newItem.color})` : ''}
                  {newItem.size ? ` - Sz:${newItem.size}` : ''}
                </td>
                <td style={{ textAlign: 'center', paddingBottom: '3px', width: '30px' }}>×{newItem.quantity}</td>
                <td style={{ textAlign: 'right', paddingBottom: '3px', width: '60px' }}>{fmt(newItem.price)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ textAlign: 'right', fontSize: '10px', marginTop: '2px' }}>
            Cost: {fmt(newTotal)} EGP
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

        {/* Net Difference */}
        <div style={{ fontSize: '11px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '13px',
              marginTop: '4px',
            }}
          >
            <span>{netDifference > 0 ? 'TO PAY / مطلوب دفعه:' : netDifference < 0 ? 'REFUND / مستحق للعميل:' : 'NET DIFFERENCE:'}</span>
            <span>{fmt(Math.abs(netDifference))} EGP</span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          <div>Thank you for your visit!</div>
          <div style={{ marginTop: '2px', opacity: 0.6 }}>No refunds without receipt</div>
        </div>
      </div>
    );
  }
);

ExchangeReceiptTicket.displayName = 'ExchangeReceiptTicket';

export default ExchangeReceiptTicket;
