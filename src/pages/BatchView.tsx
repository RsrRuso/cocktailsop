import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import jsPDF from "jspdf";

const BatchView = () => {
  const { productionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [production, setProduction] = useState<any>(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  useEffect(() => {
    const loadAndGeneratePdf = async () => {
      if (!productionId) return;

      try {
        const { data: prod, error } = await supabase
          .from("batch_productions")
          .select("*")
          .eq("id", productionId)
          .single();

        if (error) throw error;
        if (!prod) {
          setLoading(false);
          return;
        }

        setProduction(prod);

        // Generate PDF with dark background
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // Dark background
        doc.setFillColor(18, 18, 18);
        doc.rect(0, 0, 210, 297, 'F');

        // SpecVerse branding header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 35, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text('SpecVerse', 105, 18, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Batch Production Record', 105, 28, { align: 'center' });

        // Content card background
        doc.setFillColor(30, 30, 30);
        doc.roundedRect(15, 45, 180, 140, 4, 4, 'F');

        // Border accent
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.roundedRect(15, 45, 180, 140, 4, 4);

        // Content
        let yPos = 60;
        doc.setFontSize(11);

        // Batch Name
        doc.setTextColor(147, 197, 253);
        doc.setFont('helvetica', 'bold');
        doc.text('BATCH NAME', 25, yPos);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const batchName = prod.batch_name || 'N/A';
        doc.text(batchName.length > 40 ? batchName.substring(0, 40) + '...' : batchName, 25, yPos + 8);
        
        yPos += 25;
        doc.setFontSize(11);

        // Quantity
        doc.setTextColor(147, 197, 253);
        doc.setFont('helvetica', 'bold');
        doc.text('QUANTITY PRODUCED', 25, yPos);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text(`${prod.target_liters?.toFixed(2) || 0} Liters  •  ${prod.target_serves || 0} Serves`, 25, yPos + 7);
        
        yPos += 20;
        doc.setFontSize(11);

        // Producer
        doc.setTextColor(147, 197, 253);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCER', 25, yPos);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        const producer = prod.produced_by_name || prod.produced_by_email || 'N/A';
        doc.text(producer.length > 45 ? producer.substring(0, 45) + '...' : producer, 25, yPos + 7);
        
        yPos += 20;
        doc.setFontSize(11);

        // Production Date
        doc.setTextColor(147, 197, 253);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTION DATE', 25, yPos);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        const prodDate = prod.production_date
          ? format(new Date(prod.production_date), "MMMM dd, yyyy")
          : 'N/A';
        doc.text(prodDate, 25, yPos + 7);
        
        yPos += 20;
        doc.setFontSize(11);

        // Submission Date
        doc.setTextColor(147, 197, 253);
        doc.setFont('helvetica', 'bold');
        doc.text('SUBMITTED', 25, yPos);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        const subDate = prod.created_at
          ? format(new Date(prod.created_at), "MMM dd, yyyy 'at' h:mm a")
          : 'N/A';
        doc.text(subDate, 25, yPos + 7);

        // Footer branding
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 262, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Professional Batch Tracking System', 105, 275, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('SpecVerse • SV', 105, 285, { align: 'center' });

        // Display PDF in full screen
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '9999';
        iframe.src = pdfUrl;
        
        document.body.innerHTML = '';
        document.body.appendChild(iframe);
        
        setPdfGenerated(true);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };

    loadAndGeneratePdf();
  }, [productionId]);

  if (loading && !pdfGenerated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground font-medium">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (!loading && !production && !pdfGenerated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Package className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Batch Not Found</h2>
          <p className="text-muted-foreground">
            This batch production does not exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return null;
};

export default BatchView;
