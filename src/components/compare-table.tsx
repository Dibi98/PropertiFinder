
'use client';

import { useSearchParams } from 'next/navigation';
import { properties, type Property } from '@/lib/data';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { BackButton } from './back-button';
import Image from 'next/image';

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
};

const exportToExcel = (properties: Property[]) => {
    if (properties.length === 0) return;

    const headers = ['ID', 'Title', 'Type', 'Location', 'Price (IDR)', 'Bedrooms', 'Bathrooms', 'Building Area (m²)', 'Land Area (m²)', 'Features'];
    const data = properties.map(p => ({
        ID: p.id,
        Title: p.title,
        Type: p.type,
        Location: p.location,
        'Price (IDR)': p.price,
        Bedrooms: p.beds,
        Bathrooms: p.baths,
        'Building Area (m²)': p.buildingArea,
        'Land Area (m²)': p.landArea,
        Features: p.features.join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties');
    
    XLSX.writeFile(workbook, 'property_comparison.xlsx');
};

const exportToPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const input = document.getElementById('comparison-content');
    if (input) {
        html2canvas(input, { scale: 2, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const widthInPdf = pdfWidth - 20; 
            const heightInPdf = widthInPdf / ratio;
            
            let heightLeft = heightInPdf;
            let position = 10; 
            
            pdf.addImage(imgData, 'PNG', 10, position, widthInPdf, heightInPdf);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - heightInPdf;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, widthInPdf, heightInPdf);
                heightLeft -= pdfHeight;
            }
            
            pdf.save('property_comparison.pdf');
        });
    }
};


export function CompareTable() {
    const searchParams = useSearchParams();
    const ids = searchParams.get('ids')?.split(',') || [];
    const selectedProperties = properties.filter(p => ids.includes(p.id));

    const handleExportExcel = () => {
        exportToExcel(selectedProperties);
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <BackButton />
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Perbandingan Properti</h1>
                    <p className="text-muted-foreground">Bandingkan fitur-fitur properti pilihan Anda secara berdampingan.</p>
                </div>
            </div>
            <div className="flex justify-end gap-2 mb-4">
                <Button onClick={handleExportExcel} disabled={selectedProperties.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor ke Excel
                </Button>
                <Button onClick={exportToPdf} disabled={selectedProperties.length === 0} variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Ekspor ke PDF
                </Button>
            </div>
            <div id="comparison-content">
                {selectedProperties.length > 0 ? (
                     <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-semibold text-center align-middle">Keterangan</TableHead>
                                            {selectedProperties.map(p => (
                                                <TableHead key={p.id} className="font-semibold">{p.title}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Gambar</TableCell>
                                            {selectedProperties.map(p => (
                                                <TableCell key={p.id}>
                                                    <Image
                                                        src={p.images[0]}
                                                        alt={p.title}
                                                        width={200}
                                                        height={150}
                                                        className="object-cover rounded-md"
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Harga</TableCell>
                                            {selectedProperties.map(p => <TableCell key={p.id}>{formatPrice(p.price)}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Lokasi</TableCell>
                                            {selectedProperties.map(p => <TableCell key={p.id}>{p.location}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Tipe</TableCell>
                                            {selectedProperties.map(p => <TableCell key={p.id}>{p.type}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Kamar Tidur</TableCell>
                                            {selectedProperties.map(p => <TableCell key={p.id}>{p.beds > 0 ? p.beds : 'N/A'}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Kamar Mandi</TableCell>
                                            {selectedProperties.map(p => <TableCell key={p.id}>{p.baths > 0 ? p.baths : 'N/A'}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Luas Bangunan</TableCell>
                                            {selectedProperties.map(p => <TableCell key={p.id}>{p.buildingArea > 0 ? `${p.buildingArea} m²` : 'N/A'}</TableCell>)}
                                        </TableRow>
                                         <TableRow>
                                            <TableCell className="font-medium">Luas Tanah</TableCell>
                                            {selectedProperties.map(p => <TableCell key={p.id}>{p.landArea > 0 ? `${p.landArea} m²` : 'N/A'}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Fitur Utama</TableCell>
                                            {selectedProperties.map(p => (
                                                <TableCell key={p.id}>
                                                    <ul className="list-disc list-inside">
                                                        {p.features.map((f, i) => <li key={i}>{f}</li>)}
                                                    </ul>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="text-center py-12">
                         <CardHeader>
                            <CardTitle>Tidak Ada Properti Dipilih</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Silakan kembali ke halaman sebelumnya dan pilih beberapa properti untuk dibandingkan.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
