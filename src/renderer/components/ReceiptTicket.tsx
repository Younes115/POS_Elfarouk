import React from 'react';
import Barcode from 'react-barcode';
import type { CartItem } from '@/store/useCartStore';

export interface ReceiptTicketProps {
  storeName?: string;
  receiptNumber: string;
  invoiceNumber: string | null;
  items: CartItem[];
  subTotal: number;
  discount: number;
  total: number;
  date: string;
  footerMessage?: string;
}

const ReceiptTicket = React.forwardRef<HTMLDivElement, ReceiptTicketProps>(
  (
    {
      storeName = 'كوتشى الفاروق',
      receiptNumber,
      invoiceNumber,
      items,
      subTotal,
      discount,
      total,
      date,
      footerMessage = 'شكراً لزيارتكم',
    },
    ref
  ) => {
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);

    return (
      <div
        ref={ref}
        id="receipt-ticket"
        dir="rtl"
        className="receipt-ticket mx-auto max-w-[80mm] bg-white p-4 text-black text-sm"
        style={{
          fontFamily: "'Courier New', 'Tahoma', Courier, monospace",
          lineHeight: 1.6,
        }}
      >
        {/* ── Store Header ── */}
        <div className="text-center mb-2">
          <h1
            className="text-xl font-extrabold tracking-wide"
            style={{ fontFamily: "'Tahoma', 'Arial', sans-serif" }}
          >
            {storeName}
          </h1>
          <p className="text-[11px] text-gray-500 mt-0.5">EL FAROUK — POS</p>
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Receipt Info ── */}
        <div className="text-[11px] mb-1 space-y-0.5">
          <div className="flex justify-between">
            <span className="font-bold">رقم الإيصال:</span>
            <span className="font-mono text-[10px] ltr" dir="ltr">
              {invoiceNumber || receiptNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">التاريخ:</span>
            <span className="font-mono text-[10px] ltr" dir="ltr">
              {date}
            </span>
          </div>
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Items Table ── */}
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-gray-400">
              <th className="text-right pb-1 font-bold">المنتج</th>
              <th className="text-center pb-1 font-bold w-[30px]">الكمية</th>
              <th className="text-center pb-1 font-bold w-[55px]">السعر</th>
              <th className="text-left pb-1 font-bold w-[60px]">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const lineTotal = item.product.sellingPrice * item.quantity;
              return (
                <tr key={item.product.id} className="border-b border-gray-200">
                  <td className="py-1 text-[10px] leading-tight">
                    {item.product.name}
                    {item.product.size && (
                      <span className="text-gray-500"> ({item.product.size})</span>
                    )}
                    {item.product.color && (
                      <span className="text-gray-500 block text-[9px]">
                        {item.product.color}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-1 font-mono">{item.quantity}</td>
                  <td className="text-center py-1 font-mono text-[10px]">
                    {fmt(item.product.sellingPrice)}
                  </td>
                  <td className="text-left py-1 font-mono text-[10px] font-semibold">
                    {fmt(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-2" />

        {/* ── Totals Section ── */}
        <div className="text-[11px] space-y-1">
          {/* Subtotal */}
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span className="font-mono">{fmt(subTotal)} ج.م</span>
          </div>

          {/* Discount */}
          {discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>الخصم:</span>
              <span className="font-mono">-{fmt(discount)} ج.م</span>
            </div>
          )}

          {/* Dashed before grand total */}
          <div className="border-b border-dashed border-gray-400 my-1" />

          {/* Grand Total */}
          <div className="flex justify-between items-baseline font-bold text-sm">
            <span className="text-[13px]">الإجمالي النهائي:</span>
            <span className="font-mono text-base">{fmt(total)} ج.م</span>
          </div>
        </div>

        {/* ── Dashed Separator ── */}
        <div className="border-b-2 border-dashed border-black my-3" />

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
            {footerMessage}
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
    );
  }
);

ReceiptTicket.displayName = 'ReceiptTicket';

export default ReceiptTicket;
