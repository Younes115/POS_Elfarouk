import Barcode from 'react-barcode';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ExchangeReceiptTicketProps {
  receiptNumber: string;
  invoiceNumber: string | null;
  originalReceiptNumber: string;
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
    originalPrice?: number;
  };
  netDifference: number;
  onPrintComplete?: () => void;
}

export default function ExchangeReceiptTicket({
  receiptNumber,
  invoiceNumber,
  originalReceiptNumber,
  date,
  oldItem,
  newItem,
  netDifference,
  onPrintComplete,
}: ExchangeReceiptTicketProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const oldTotal = oldItem.price * oldItem.quantity;
  const newTotal = newItem.price * newItem.quantity;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Printable Receipt ── */}
      <div
        id="exchange-receipt-ticket"
        dir="rtl"
        className="bg-white text-black"
        style={{
          width: '80mm',
          padding: '6mm 4mm',
          fontFamily: "'Tahoma', 'Arial', 'Courier New', Courier, monospace",
          fontSize: '12px',
          lineHeight: 1.6,
        }}
      >
        {/* ── Header ── */}
        <div className="text-center mb-2">
          <div
            className="text-xl font-extrabold tracking-wide"
            style={{ fontFamily: "'Tahoma', 'Arial', sans-serif" }}
          >
           كوتشى الفاروق
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">EL FAROUK — POS</div>
        </div>

        {/* ── Receipt Type Badge ── */}
        <div className="text-center mb-2">
          <span className="inline-block border-2 border-black px-3 py-0.5 text-sm font-bold tracking-wider">
            فاتورة استبدال
          </span>
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Receipt Info ── */}
        <div className="text-[11px] mb-1 space-y-0.5">
          <div className="flex justify-between">
            <span className="font-bold">رقم فاتورة الاستبدال:</span>
            <span className="font-mono text-[10px]" dir="ltr">
              {invoiceNumber || receiptNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">التاريخ:</span>
            <span className="font-mono text-[10px]" dir="ltr">
              {date}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span className="font-bold">بدل من فاتورة رقم:</span>
            <span className="font-mono text-[10px]" dir="ltr">
              {originalReceiptNumber}
            </span>
          </div>
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Returned Item ── */}
        <div className="mb-2">
          <div className="font-bold text-[11px] mb-1 flex items-center gap-1">
            <span>⟵</span>
            <span>المنتج المرتجع</span>
          </div>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr>
                <td className="pb-0.5 text-[10px]">
                  <span className="font-semibold">{oldItem.name}</span>
                  {oldItem.color ? ` (${oldItem.color})` : ''}
                  {oldItem.size ? ` — مقاس: ${oldItem.size}` : ''}
                  <span className="block text-[9px] text-gray-500 font-bold mt-0.5">
                    (تم الاسترجاع بالكامل)
                  </span>
                </td>
              </tr>
              <tr>
                <td className="flex justify-between text-[10px]">
                  <span>الكمية: ×{oldItem.quantity}</span>
                  <span>السعر: {fmt(oldItem.price)} ج.م</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="text-left text-[10px] font-semibold mt-1" dir="ltr">
            {fmt(oldTotal)} EGP
          </div>
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b border-dashed border-gray-400 my-2" />

        {/* ── New Item ── */}
        <div className="mb-2">
          <div className="font-bold text-[11px] mb-1 flex items-center gap-1">
            <span>⟶</span>
            <span>المنتج الجديد</span>
          </div>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr>
                <td className="pb-0.5 text-[10px]">
                  {newItem.name}
                  {newItem.color ? ` (${newItem.color})` : ''}
                  {newItem.size ? ` — مقاس: ${newItem.size}` : ''}
                </td>
              </tr>
              <tr>
                <td className="flex justify-between text-[10px]">
                  <span>الكمية: ×{newItem.quantity}</span>
                  <span>
                    السعر:{' '}
                    {newItem.originalPrice !== undefined && newItem.originalPrice > newItem.price ? (
                      <>
                        <del className="text-gray-500 ml-1">{fmt(newItem.originalPrice)}</del>{' '}
                      </>
                    ) : null}
                    {fmt(newItem.price)} ج.م
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="text-left text-[10px] font-semibold mt-1" dir="ltr">
            {fmt(newTotal)} EGP
          </div>
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Net Difference ── */}
        <div className="py-1">
          <div className="flex justify-between items-baseline font-bold text-[13px]">
            <span>
              {netDifference > 0
                ? 'مطلوب من العميل:'
                : netDifference < 0
                  ? 'مستحق للعميل (مسترد):'
                  : 'الفرق المستحق:'}
            </span>
            <span className="font-mono text-base" dir="ltr">
              {fmt(Math.abs(netDifference))} ج.م
            </span>
          </div>
          {netDifference === 0 && (
            <div className="text-[9px] text-center text-gray-500 mt-1">
              لا يوجد فرق في السعر
            </div>
          )}
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Barcode ── */}
        <div className="flex justify-center my-2" dir="ltr">
          <Barcode
            value={invoiceNumber || receiptNumber}
            width={1.2}
            height={40}
            fontSize={10}
            margin={0}
            displayValue={true}
            background="#ffffff"
            lineColor="#000000"
          />
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Footer ── */}
        <div className="text-center mt-2 space-y-1">
          <p
            className="text-[13px] font-bold"
            style={{ fontFamily: "'Tahoma', 'Arial', sans-serif" }}
          >
            شكراً لزيارتكم
          </p>
          <p className="flex justify-between items-baseline font text-sm">
           <span> العنوان: بنى سويف الجديدة شارع 6 امام مكتبة هشام وعمر</span>
          </p>
          <p className="text-[13px] text-gray-600">
            <span>tel:01559499983</span>
          </p>
          <p className="text-[13px] text-gray-600">
            لا يتم قبول المرتجعات بدون الإيصال
          </p>
        </div>
      </div>

      {/* ── Print Button (hidden during print) ── */}
      <Button
        id="btn-print-exchange-receipt"
        className="no-print gap-2 px-6 h-10 font-bold"
        onClick={() => {
          window.print();
          if (onPrintComplete) onPrintComplete();
        }}
      >
        <Printer className="h-4 w-4" />
        طباعة
      </Button>
    </div>
  );
}
