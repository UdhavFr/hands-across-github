

interface TemplatePreviewProps {
  template: {
    backdrop: string; // base64 or URL
    nameBox: { xMm: number; yMm: number; widthMm: number; heightMm: number };
    fontFamily?: string;
    nameStyle?: { fontSize: number; color: string; align?: 'center'|'left'|'right' };
  };
  sampleData: {
    name: string;
    event: string;
    date: string;
    ngo: string;
  };
}

// A4 landscape: 297mm x 210mm, scale to 594x420px for preview
const PDF_MM = { width: 297, height: 210 };
const PREVIEW_PX = { width: 594, height: 420 };

export function TemplatePreview({ template, sampleData }: TemplatePreviewProps) {
  const scale = PREVIEW_PX.width / PDF_MM.width;
  const box = template.nameBox;
  const style = template.nameStyle || { fontSize: 32, color: '#222', align: 'center' };

  return (
    <div
      className="relative border bg-gray-100 rounded shadow overflow-hidden"
      style={{ width: PREVIEW_PX.width, height: PREVIEW_PX.height }}
    >
      {/* Backdrop image */}
      {template.backdrop && (
        <img
          src={template.backdrop}
          alt="Certificate backdrop preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1,
          }}
        />
      )}
      {/* Name box overlay */}
      <div
        style={{
          position: 'absolute',
          left: box.xMm * scale,
          top: box.yMm * scale,
          width: box.widthMm * scale,
          height: box.heightMm * scale,
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            style.align === 'left' ? 'flex-start' : style.align === 'right' ? 'flex-end' : 'center',
          color: style.color,
          fontFamily: template.fontFamily,
          fontSize: style.fontSize ? style.fontSize * scale : 32 * scale,
          background: 'rgba(255,255,255,0.01)',
          zIndex: 2,
          textAlign: style.align || 'center',
        }}
      >
        <span style={{ width: '100%', textAlign: style.align || 'center', display: 'block' }}>{sampleData.name}</span>
      </div>
    </div>
  );
}
