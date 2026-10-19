import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export function BarcodeGenerator({
  value,
  width = 1.2,
  height = 25,
  displayValue = true,
  fontSize = 9,
  className = ''
}: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          font: 'monospace',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 1,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Error generating barcode for SKU:', value, err);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  if (!value) return null;

  return (
    <svg 
      ref={svgRef} 
      className={`max-w-full h-auto ${className}`}
    />
  );
}
