import React from 'react';
import Barcode from 'react-barcode';

interface BarcodeTicketProps {
  sku: string;
  name: string;
  price: string;
}

const BarcodeTicket = React.forwardRef<HTMLDivElement, BarcodeTicketProps>(
  ({ sku, name, price }, ref) => {
    return (
      <>
        <style>
          {`
            @media print {
              @page { size: 50mm 30mm; margin: 0; }
              body { margin: 0; padding: 0; }
            }
          `}
        </style>
        <div
          ref={ref}
          className="flex flex-col items-center justify-center overflow-hidden"
          style={{
            width: '50mm',
            height: '30mm',
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
            background: '#fff',
            color: '#000',
            boxSizing: 'border-box',
          }}
        >
          {/* Product Name */}
          <div className="text-[10px] font-bold leading-tight mb-0.5 break-words max-h-6 overflow-hidden text-center px-1">
            {name}
          </div>

          {/* Price */}
          <div className="text-[10px] font-bold mb-1">
            {price}
          </div>

          {/* Barcode with human-readable SKU */}
          <div className="flex justify-center">
            <Barcode
              value={sku}
              displayValue={true}
              width={1}
              height={25}
              fontSize={10}
              margin={0}
              background="#ffffff"
              lineColor="#000000"
            />
          </div>
        </div>
      </>
    );
  }
);

BarcodeTicket.displayName = 'BarcodeTicket';

export default BarcodeTicket;
