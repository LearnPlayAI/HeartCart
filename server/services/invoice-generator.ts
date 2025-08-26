import { jsPDF } from 'jspdf';
import { logger } from '../logger';
import { objectStore } from '../object-store';
import { storage } from '../storage';
import path from 'path';

export interface InvoiceData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: any; // Can be string or object with addressLine1, city, etc.
  shippingCity: string;  
  shippingPostalCode: string;
  selectedLockerName?: string; // PUDO locker name
  selectedLockerAddress?: string; // PUDO locker address
  shippingMethod: string; // Required field for shipping method handling
  orderItems: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    attributeDisplayText?: string;
  }>;
  subtotalAmount: number;
  shippingCost: number;
  vatAmount: number;
  vatRate: number;
  vatRegistered: boolean;
  vatRegistrationNumber: string;
  creditUsed?: number; // Store credit used for this order
  remainingBalance?: number; // Customer's remaining credit balance after order
  totalAmount: number;
  paymentMethod: string;
  paymentReceivedDate: string;
  userId: number;
}

export class InvoiceGenerator {
  private static instance: InvoiceGenerator;

  public static getInstance(): InvoiceGenerator {
    if (!InvoiceGenerator.instance) {
      InvoiceGenerator.instance = new InvoiceGenerator();
    }
    return InvoiceGenerator.instance;
  }

  /**
   * Convert UTC timestamp to SAST (UTC+2) for South African users
   */
  private convertToSAST(utcTimestamp: string): string {
    const utcDate = new Date(utcTimestamp);
    // Add 2 hours for SAST (UTC+2)
    const sastDate = new Date(utcDate.getTime() + (2 * 60 * 60 * 1000));
    
    return sastDate.toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC' // We've already adjusted the time, so use UTC to prevent double conversion
    });
  }

  async generateInvoicePDF(data: InvoiceData): Promise<string> {
    try {
      logger.info('Starting PDF invoice generation with VAT', { 
        orderNumber: data.orderNumber,
        vatAmount: data.vatAmount,
        vatRate: data.vatRate,
        vatRegistered: data.vatRegistered,
        orderItemsCount: data.orderItems?.length || 0
      });

      // Create new jsPDF instance
      const doc = new jsPDF();
      
      // Set font for better readability
      doc.setFont('helvetica');
      
      // Generate PDF content using jsPDF
      this.generatePDFContent(doc, data);

      // Convert to buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      // Create storage path: /Invoices/{year}/{userId}/{orderNumber}.pdf
      const currentYear = new Date().getFullYear();
      const fileName = `${data.orderNumber}.pdf`;
      const storagePath = `Invoices/${currentYear}/${data.userId}/${fileName}`;

      // Store PDF in object storage
      await objectStore.uploadFile(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          type: 'invoice',
          orderNumber: data.orderNumber,
          userId: data.userId.toString(),
          generatedAt: new Date().toISOString(),
          vatAmount: data.vatAmount.toString(),
          vatRate: data.vatRate.toString()
        }
      });

      logger.info('Invoice PDF generated and stored successfully with VAT', { 
        orderNumber: data.orderNumber,
        storagePath,
        size: pdfBuffer.length,
        vatAmount: data.vatAmount,
        vatRate: data.vatRate
      });

      return storagePath;

    } catch (error) {
      logger.error('Error generating invoice PDF', { 
        error: error instanceof Error ? error.message : String(error),
        orderNumber: data.orderNumber 
      });
      throw new Error(`Failed to generate invoice PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generatePDFContent(doc: any, data: InvoiceData): void {
    let yPosition = 20;
    const pageWidth = 210; // A4 width in mm
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Hot pink color for branding
    const hotPink = [255, 105, 180];

    // Header with hot pink background
    doc.setFillColor(...hotPink);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Company logo/name in white
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TEE ME YOU (Pty.) LTD trading as Heart Cart', margin, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('For the Love of Shopping', margin, 28);

    // Reset text color to black
    doc.setTextColor(0, 0, 0);
    yPosition = 50;

    // Invoice title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', margin, yPosition);
    yPosition += 15;

    // Invoice details in two columns
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Left column - Company details
    doc.text('TEE ME YOU (Pty.) LTD trading as Heart Cart', margin, yPosition);
    doc.text('Registration: 2025/499123/07', margin, yPosition + 5);
    doc.text('Ebbehout Street, Sharonlea', margin, yPosition + 10);
    doc.text('Randburg, Johannesburg', margin, yPosition + 15);
    doc.text('Gauteng', margin, yPosition + 20);
    doc.text('South Africa', margin, yPosition + 25);

    // Right column - Invoice details
    const rightColumn = margin + (contentWidth / 2);
    doc.text(`Invoice Number: ${data.orderNumber}`, rightColumn, yPosition);
    doc.text(`Date: ${this.convertToSAST(data.paymentReceivedDate)}`, rightColumn, yPosition + 5);
    doc.text(`Customer: ${data.customerName}`, rightColumn, yPosition + 10);
    doc.text(`Email: ${data.customerEmail}`, rightColumn, yPosition + 15);
    doc.text(`Phone: ${data.customerPhone}`, rightColumn, yPosition + 20);

    yPosition += 35; // Increased to accommodate the longer company address

    // Shipping Method Details (Dynamic based on selected method)
    doc.setFont('helvetica', 'bold');
    if (data.shippingMethod === 'pudo-locker') {
      doc.text('Collection Point:', margin, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      if (data.selectedLockerName && data.selectedLockerAddress) {
        doc.text(`PUDO Locker: ${data.selectedLockerName}`, margin, yPosition);
        doc.text(data.selectedLockerAddress, margin, yPosition + 5);
        doc.text('SMS notification will be sent with collection code', margin, yPosition + 10);
      } else {
        doc.text('PUDO Locker Collection', margin, yPosition);
        doc.text('SMS notification will be sent with locker details', margin, yPosition + 5);
      }
    } else if (data.shippingMethod === 'pudo-door') {
      doc.text('Delivery Address:', margin, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      if (data.shippingAddress) {
        doc.text(data.shippingAddress.addressLine1, margin, yPosition);
        if (data.shippingAddress.addressLine2) {
          doc.text(data.shippingAddress.addressLine2, margin, yPosition + 5);
          yPosition += 5;
        }
        doc.text(`${data.shippingAddress.city}, ${data.shippingAddress.province} ${data.shippingAddress.postalCode}`, margin, yPosition + 5);
        doc.text('PUDO to your Door delivery', margin, yPosition + 10);
      } else {
        doc.text('PUDO to your Door delivery', margin, yPosition);
        doc.text('Delivery to customer address', margin, yPosition + 5);
      }
    } else {
      // Fallback for any other shipping method
      doc.text('Shipping Method:', margin, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(data.shippingMethod || 'Standard Delivery', margin, yPosition);
    }
    
    yPosition += 20;

    // Order items table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition - 3, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Product', margin + 2, yPosition + 2);
    doc.text('Qty', margin + 90, yPosition + 2);
    doc.text('Unit Price', margin + 110, yPosition + 2);
    doc.text('Total', margin + 140, yPosition + 2);
    
    yPosition += 12;

    // Order items
    doc.setFont('helvetica', 'normal');
    
    // Defensive check for orderItems
    if (!data.orderItems || !Array.isArray(data.orderItems)) {
      logger.error('Order items array is missing or invalid', { 
        orderItems: data.orderItems,
        orderItemsType: typeof data.orderItems,
        isArray: Array.isArray(data.orderItems),
        dataKeys: Object.keys(data)
      });
      throw new Error('Order items array is missing or invalid');
    }
    
    data.orderItems.forEach(item => {
      if (yPosition > 250) { // Add new page if needed
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(item.productName, margin + 2, yPosition);
      if (item.attributeDisplayText) {
        doc.setFontSize(8);
        doc.text(item.attributeDisplayText, margin + 2, yPosition + 4);
        doc.setFontSize(10);
        yPosition += 4;
      }
      
      doc.text(item.quantity.toString(), margin + 90, yPosition);
      doc.text(`R${item.unitPrice.toFixed(2)}`, margin + 110, yPosition);
      doc.text(`R${item.totalPrice.toFixed(2)}`, margin + 140, yPosition);
      
      yPosition += 8;
    });

    yPosition += 10;

    // Totals with VAT breakdown
    const totalsX = margin + 110;
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`R${data.subtotalAmount.toFixed(2)}`, totalsX + 30, yPosition);
    
    yPosition += 7;
    doc.text('Shipping:', totalsX, yPosition);
    doc.text(`R${data.shippingCost.toFixed(2)}`, totalsX + 30, yPosition);
    
    // VAT breakdown - removed as per user request
    if (data.vatRegistered && data.vatAmount > 0) {
      yPosition += 7;
      doc.text(`VAT (${data.vatRate}%):`, totalsX, yPosition);
      doc.text(`R${data.vatAmount.toFixed(2)}`, totalsX + 30, yPosition);
      yPosition += 7;
      
      // VAT registration number
      doc.setFontSize(8);
      doc.text(`VAT No: ${data.vatRegistrationNumber}`, totalsX, yPosition);
      doc.setFontSize(10);
      yPosition += 3;
    }
    
    yPosition += 7;
    
    // Store credit used (if any)
    if (data.creditUsed && data.creditUsed > 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('Store Credit Used:', totalsX, yPosition);
      doc.text(`-R${data.creditUsed.toFixed(2)}`, totalsX + 30, yPosition);
      yPosition += 7;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', totalsX, yPosition);
    // Calculate final total after credit deduction
    const finalTotal = data.totalAmount - (data.creditUsed || 0);
    doc.text(`R${finalTotal.toFixed(2)}`, totalsX + 30, yPosition);

    yPosition += 20;

    // Payment details
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${data.paymentMethod}`, margin, yPosition);
    doc.text(`Payment Received: ${this.convertToSAST(data.paymentReceivedDate)}`, margin, yPosition + 7);

    // Footer
    yPosition = 280;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Thank you for your business!', margin, yPosition);
    doc.text('For support, contact us at sales@heartcart.shop', margin, yPosition + 5);
  }

  private generateInvoiceHTML(data: InvoiceData): string {
    const invoiceDate = this.convertToSAST(data.paymentReceivedDate);

    const formatCurrency = (amount: number) => {
      return `R${amount.toFixed(2)}`;
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${data.orderNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #1f2937;
            background: white;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
        }
        
        .header {
            background: linear-gradient(135deg, #FF69B4 0%, #E91E63 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 40px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
        }
        
        .header-content {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .company-info h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .company-tagline {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .company-details {
            font-size: 14px;
            opacity: 0.9;
            line-height: 1.6;
        }
        
        .invoice-title {
            text-align: right;
        }
        
        .invoice-title h2 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .invoice-number {
            font-size: 18px;
            font-weight: 600;
            opacity: 0.9;
        }
        
        .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        
        .detail-section h3 {
            font-size: 16px;
            font-weight: 600;
            color: #E91E63;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #FF69B4;
        }
        
        .detail-content {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #FF69B4;
        }
        
        .detail-content p {
            margin-bottom: 6px;
        }
        
        .detail-content strong {
            color: #1f2937;
            font-weight: 600;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .items-table thead {
            background: linear-gradient(135deg, #FF69B4 0%, #E91E63 100%);
            color: white;
        }
        
        .items-table th,
        .items-table td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .items-table th {
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table tbody tr:nth-child(even) {
            background: #f8fafc;
        }
        
        .items-table tbody tr:hover {
            background: #f1f5f9;
        }
        
        .items-table .text-right {
            text-align: right;
        }
        
        .items-table .text-center {
            text-align: center;
        }
        
        .product-name {
            font-weight: 600;
            color: #1f2937;
        }
        
        .product-attributes {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        
        .totals-table {
            min-width: 300px;
        }
        
        .totals-table tr {
            border-bottom: 1px solid #e5e7eb;
        }
        
        .totals-table tr:last-child {
            border-bottom: 3px solid #FF69B4;
            background: linear-gradient(135deg, #FF69B4 0%, #E91E63 100%);
            color: white;
        }
        
        .totals-table td {
            padding: 12px 16px;
        }
        
        .totals-table .label {
            font-weight: 600;
        }
        
        .totals-table .amount {
            text-align: right;
            font-weight: 600;
        }
        
        .totals-table tr:last-child .amount {
            font-size: 18px;
            font-weight: 700;
        }
        
        .footer {
            background: #f8fafc;
            padding: 30px;
            border-radius: 8px;
            border-top: 4px solid #FF69B4;
            text-align: center;
        }
        
        .footer h4 {
            color: #E91E63;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 8px;
        }
        
        .legal-notice {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            border-radius: 6px;
            padding: 16px;
            margin-top: 20px;
        }
        
        .legal-notice h5 {
            color: #ea580c;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .legal-notice p {
            color: #9a3412;
            font-size: 12px;
            margin-bottom: 4px;
        }
        
        @media print {
            .invoice-container {
                padding: 0;
            }
            
            .header {
                margin-bottom: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="header-content">
                <div class="company-info">
                    <h1>TEE ME YOU</h1>
                    <div class="company-tagline">For the Love of Shopping</div>
                    <div class="company-details">
                        South Africa<br>
                        Registration: 2025/499123/07
                    </div>
                </div>
                <div class="invoice-title">
                    <h2>INVOICE</h2>
                    <div class="invoice-number">#${data.orderNumber}</div>
                </div>
            </div>
        </div>

        <!-- Invoice Details -->
        <div class="invoice-details">
            <div class="detail-section">
                <h3>Bill To</h3>
                <div class="detail-content">
                    <p><strong>Name:</strong> ${data.customerName}</p>
                    <p><strong>Email:</strong> ${data.customerEmail}</p>
                    <p><strong>Phone:</strong> ${data.customerPhone}</p>
                    <p><strong>Address:</strong> ${data.shippingAddress}</p>
                    <p><strong>City:</strong> ${data.shippingCity}</p>
                    <p><strong>Postal Code:</strong> ${data.shippingPostalCode}</p>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Invoice Details</h3>
                <div class="detail-content">
                    <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
                    <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                    <p><strong>Payment Method:</strong> ${data.paymentMethod.toUpperCase()}</p>
                    <p><strong>Payment Status:</strong> <span style="color: #059669; font-weight: 600;">PAID</span></p>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.orderItems.map(item => `
                    <tr>
                        <td>
                            <div class="product-name">${item.productName}</div>
                            ${item.attributeDisplayText ? `<div class="product-attributes">${item.attributeDisplayText}</div>` : ''}
                        </td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                        <td class="text-right">${formatCurrency(item.totalPrice)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Totals with VAT breakdown -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="amount">${formatCurrency(data.subtotalAmount)}</td>
                </tr>
                <tr>
                    <td class="label">Shipping:</td>
                    <td class="amount">${formatCurrency(data.shippingCost)}</td>
                </tr>
                ${data.vatRegistered && data.vatAmount > 0 ? `
                <tr>
                    <td class="label">VAT (${data.vatRate}%):</td>
                    <td class="amount">${formatCurrency(data.vatAmount)}</td>
                </tr>
                <tr style="font-size: 12px; opacity: 0.8;">
                    <td class="label">VAT No: ${data.vatRegistrationNumber}</td>
                    <td class="amount"></td>
                </tr>` : ''}
                ${data.creditUsed && data.creditUsed > 0 ? `
                <tr>
                    <td class="label">Store Credit Used:</td>
                    <td class="amount">-${formatCurrency(data.creditUsed)}</td>
                </tr>` : ''}
                <tr>
                    <td class="label">TOTAL:</td>
                    <td class="amount">${formatCurrency(data.totalAmount - (data.creditUsed || 0))}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            <h4>Thank You for Your Business!</h4>
            <p>This invoice confirms payment received for your order.</p>
            <p>For support inquiries, contact us at sales@heartcart.shop</p>
            
            <div class="legal-notice">
                <h5>Important Notice</h5>
                ${data.vatRegistered && data.vatAmount > 0 ? `
                <p>• VAT Registered Company - VAT No: ${data.vatRegistrationNumber}</p>
                <p>• VAT at ${data.vatRate}% included in total amount</p>` : ''}
                <p>• Business Registration Number: 2025/499123/07</p>
                <p>• This document serves as proof of purchase and payment</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}

export const invoiceGenerator = InvoiceGenerator.getInstance();