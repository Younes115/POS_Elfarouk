import Barcode from 'react-barcode';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface BarcodeTicketProps {
  sku: string;
  name: string;
  price: string;
}

export default function BarcodeTicket({ sku, name, price }: BarcodeTicketProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Printable Label ── */}
      <div
        id="barcode-ticket"
        className="flex flex-col items-center justify-center overflow-hidden bg-white text-black border border-dashed border-gray-300 rounded"
        style={{
          width: '50mm',
          height: '25mm',
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          boxSizing: 'border-box',
          padding: '1mm 2mm',
        }}
      >
        {/* Product Name */}
        <div className="text-[9px] font-bold leading-tight text-center px-0.5 max-h-[10px] overflow-hidden whitespace-nowrap text-ellipsis w-full">
          {name}
        </div>

        {/* Price */}
        <div className="text-[10px] font-extrabold mt-[1px]">
          {price}
        </div>

        {/* Barcode */}
        <div className="flex justify-center mt-[1px]">
          <Barcode
            value={sku}
            displayValue={true}
            width={1}
            height={22}
            fontSize={8}
            margin={0}
            background="#ffffff"
            lineColor="#000000"
          />
        </div>
      </div>

      {/* ── Print Button (hidden during print) ── */}
      <Button
        id="btn-print-barcode"
        className="no-print gap-2 px-6 h-10 font-bold"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        طباعة
      </Button>
    </div>
  );
}
