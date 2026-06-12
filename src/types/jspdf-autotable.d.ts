declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';

    interface AutoTableOptions {
        startY?: number;
        head?: any[][];
        body?: any[][];
        foot?: any[][];
        html?: string | HTMLTableElement;
        columns?: any[];
        styles?: any;
        headStyles?: any;
        bodyStyles?: any;
        footStyles?: any;
        alternateRowStyles?: any;
        columnStyles?: any;
        margin?: any;
        didDrawPage?: (data: any) => void;
        didDrawCell?: (data: any) => void;
        didParseCell?: (data: any) => void;
        willDrawCell?: (data: any) => void;
        pageBreak?: string;
        rowPageBreak?: string;
        showHead?: string;
        showFoot?: string;
        tableWidth?: number | string;
        theme?: string;
    }

    export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}