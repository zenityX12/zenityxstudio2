import { jsPDF } from "jspdf";

interface ReceiptData {
  id: string;
  date: Date;
  amountPaid: number;
  creditsReceived: number;
  chargeId: string;
  packageName: string;
  userName?: string;
  userEmail?: string;
}

export function generateReceipt(data: ReceiptData) {
  const doc = new jsPDF();
  
  // Set font
  doc.setFont("helvetica");
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text("ZenityX", 105, 20, { align: "center" });
  
  doc.setFontSize(16);
  doc.text("Payment Receipt", 105, 30, { align: "center" });
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Receipt details
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  
  let y = 50;
  const lineHeight = 10;
  
  // Receipt ID
  doc.setFont("helvetica", "bold");
  doc.text("Receipt ID:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.id, 70, y);
  y += lineHeight;
  
  // Date
  doc.setFont("helvetica", "bold");
  doc.text("Date:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }), 70, y);
  y += lineHeight;
  
  // Transaction ID
  doc.setFont("helvetica", "bold");
  doc.text("Transaction ID:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.chargeId, 70, y);
  doc.setFontSize(12);
  y += lineHeight * 1.5;
  
  // Customer info (if available)
  if (data.userName || data.userEmail) {
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", 20, y);
    doc.setFont("helvetica", "normal");
    if (data.userName) {
      doc.text(data.userName, 70, y);
      y += lineHeight;
    }
    if (data.userEmail) {
      doc.text(data.userEmail, 70, y);
      y += lineHeight;
    }
    y += lineHeight * 0.5;
  }
  
  // Line separator
  doc.setLineWidth(0.3);
  doc.line(20, y, 190, y);
  y += lineHeight;
  
  // Package details
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Package Details", 20, y);
  y += lineHeight;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.packageName, 20, y);
  doc.text(`฿${data.amountPaid}`, 190, y, { align: "right" });
  y += lineHeight * 1.5;
  
  // Line separator
  doc.setLineWidth(0.3);
  doc.line(20, y, 190, y);
  y += lineHeight;
  
  // Total
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount Paid:", 20, y);
  doc.text(`฿${data.amountPaid}`, 190, y, { align: "right" });
  y += lineHeight;
  
  doc.text("Credits Received:", 20, y);
  doc.setTextColor(34, 197, 94); // Green color
  doc.text(`${data.creditsReceived} credits`, 190, y, { align: "right" });
  doc.setTextColor(60, 60, 60);
  y += lineHeight * 2;
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += lineHeight * 1.5;
  
  // Footer
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for your purchase!", 105, y, { align: "center" });
  y += lineHeight * 0.8;
  doc.text("For support, please contact: admin@zenityxai.com", 105, y, { align: "center" });
  y += lineHeight * 0.8;
  doc.text("ZenityX AI Studio - Powered by Manus", 105, y, { align: "center" });
  
  // Save PDF
  const fileName = `ZenityX-Receipt-${data.id}.pdf`;
  doc.save(fileName);
}

