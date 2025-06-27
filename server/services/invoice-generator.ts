import pdf from 'html-pdf-node';
import { logger } from '../logger';
import { objectStore } from '../object-store';
import path from 'path';

export interface InvoiceData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  orderItems: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    attributeDisplayText?: string;
  }>;
  subtotalAmount: number;
  shippingCost: number;
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

  async generateInvoicePDF(data: InvoiceData): Promise<string> {
    try {
      logger.info('Starting PDF invoice generation', { orderNumber: data.orderNumber });

      // Generate the invoice HTML content
      const htmlContent = this.generateInvoiceHTML(data);

      // Configure PDF options
      const options = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      };

      // Generate PDF using html-pdf-node
      const file = { content: htmlContent };
      const pdfBuffer = await pdf.generatePdf(file, options);

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
          generatedAt: new Date().toISOString()
        }
      });

      logger.info('Invoice PDF generated and stored successfully', { 
        orderNumber: data.orderNumber,
        storagePath,
        size: pdfBuffer.length 
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

  private generateInvoiceHTML(data: InvoiceData): string {
    const invoiceDate = new Date(data.paymentReceivedDate).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
                    <h1>Tee Me You</h1>
                    <div class="company-tagline">Premium E-Commerce Solutions</div>
                    <div class="company-details">
                        11 Ebbehout Street, Sharonlea<br>
                        Randburg, Gauteng, South Africa, 2194<br>
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

        <!-- Totals -->
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
                <tr>
                    <td class="label">TOTAL:</td>
                    <td class="amount">${formatCurrency(data.totalAmount)}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            <h4>Thank You for Your Business!</h4>
            <p>This invoice confirms payment received for your order.</p>
            <p>For support inquiries, contact us at sales@teemeyou.shop</p>
            
            <div class="legal-notice">
                <h5>Important Notice</h5>
                <p>• This company is not registered for VAT</p>
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