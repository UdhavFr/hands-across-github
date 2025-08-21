# Certificate Generator

A React-based certificate generation system with interactive template positioning, bulk processing, and high-quality PDF output.

## Features

- **Interactive Template Positioning**: Drag-and-drop interface for precise name box placement
- **Bulk Certificate Generation**: Process hundreds of certificates with progress tracking
- **High-Quality PDF Output**: Print-ready certificates with proper DPI and coordinate mapping
- **Template Management**: Upload and manage custom certificate templates
- **Real-time Preview**: See exactly how certificates will look before generation
- **Coordinate Conversion**: Accurate pixel-to-millimeter conversion for print precision

## Quick Start

### 1. Installation

```bash
npm install jspdf uuid jszip file-saver react-dropzone react-rnd
npm install --save-dev @types/uuid @types/file-saver
```

### 2. Basic Usage

```typescript
import { generateCertificate } from './src/utils/certificate';
import { generateBulkCertificates } from './src/utils/files';

// Single certificate generation
const participant = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com'
};

const event = {
  id: 'event-456',
  title: 'Beach Cleanup Volunteer Event',
  date: '2024-03-15',
  location: 'Santa Monica Beach, CA'
};

const ngo = {
  name: 'Ocean Guardians NGO'
};

const template = {
  backdropDataUrl: 'data:image/jpeg;base64,...',
  nameBoxPx: { x: 200, y: 150, width: 400, height: 80 },
  canvasPxSize: { widthPx: 800, heightPx: 600 },
  fontFamily: 'helvetica',
  textColor: '#000000',
  textAlign: 'center' as const
};

// Generate single certificate
const pdfDoc = generateCertificate(participant, event, ngo, template);
pdfDoc.save('certificate.pdf');

// Bulk generation with progress tracking
const participants = [/* array of participants */];

await generateBulkCertificates(
  participants,
  event,
  ngo,
  template,
  {
    batchSize: 10,
    onProgress: (progress) => {
      console.log(`${progress.percentage}% complete`);
    }
  }
);
```

### 3. Interactive Template Positioning

```typescript
import { NamePlacementCanvas } from './src/components/NamePlacementCanvas';

function CertificateDesigner() {
  const [nameBox, setNameBox] = useState({ x: 200, y: 150, width: 400, height: 80 });
  const [mmBox, setMmBox] = useState({ xMm: 0, yMm: 0, widthMm: 0, heightMm: 0 });

  const handleCoordinatesChange = (pxBox, mmBox) => {
    setNameBox(pxBox);
    setMmBox(mmBox);
    console.log('Name box coordinates:', { pxBox, mmBox });
  };

  return (
    <NamePlacementCanvas
      backdropDataUrl="https://example.com/certificate-template.jpg"
      onCoordinatesChange={handleCoordinatesChange}
      onConfirm={() => console.log('Position confirmed!')}
      onReset={() => console.log('Reset to default')}
    />
  );
}
```

## Coordinate System & DPI Guidelines

### Coordinate Mapping

The system uses a two-layer coordinate system:

1. **Canvas Coordinates (Pixels)**: For user interaction and display
2. **PDF Coordinates (Millimeters)**: For print-accurate output

```typescript
// Canvas coordinates (user interaction)
const nameBoxPx = { x: 200, y: 150, width: 400, height: 80 };

// Automatically converted to PDF coordinates
const nameBoxMm = { xMm: 74.25, yMm: 52.5, widthMm: 148.5, heightMm: 28 };
```

### DPI Recommendations

For optimal print quality:

- **150 DPI minimum**: Standard print quality
- **300 DPI recommended**: High-quality printing
- **600 DPI**: Professional printing

```typescript
import { calculateDPI } from './src/utils/coords';

// Check image DPI
const dpiInfo = calculateDPI(imageWidthPx, imageHeightPx, 297, 210); // A4 landscape
console.log(`Image DPI: ${dpiInfo.minDpi} (recommended: 150+)`);

if (dpiInfo.minDpi < 150) {
  console.warn('Image resolution may be too low for quality printing');
}
```

### Canvas Size Configuration

The canvas maintains A4 landscape aspect ratio (297:210):

```typescript
const PDF_SIZE = { widthMm: 297, heightMm: 210 }; // A4 landscape
const CANVAS_SIZE = { widthPx: 800, heightPx: 600 }; // 4:3 ratio maintaining A4 proportions
```

## Integration with NGO Dashboard

### Complete Integration Example

Add this to your `NgoDashboard.tsx` to integrate certificate generation:

```typescript
// Add to imports
import { generateCertificate, generateBulkCertificates } from '../utils/certificate';
import { CertificateGeneratorUI } from '../components/CertificateGeneratorUI';

// Add state for certificate generation
const [showCertificateGenerator, setShowCertificateGenerator] = useState(false);
const [selectedEvent, setSelectedEvent] = useState(null);
const [confirmedVolunteers, setConfirmedVolunteers] = useState([]);

// Add certificate generation functions
const handleGenerateCertificates = useCallback(async (template) => {
  if (!selectedEvent || confirmedVolunteers.length === 0) {
    toast.error('Please select an event with confirmed volunteers');
    return;
  }

  try {
    // Convert volunteer data to certificate format
    const participants = confirmedVolunteers.map(volunteer => ({
      id: volunteer.user_id,
      name: volunteer.users?.full_name || 'Unknown',
      email: volunteer.users?.email || ''
    }));

    const eventData = {
      id: selectedEvent.id,
      title: selectedEvent.title,
      date: selectedEvent.date,
      location: selectedEvent.location,
      description: selectedEvent.description
    };

    const ngoData = {
      name: 'Your NGO Name', // Replace with actual NGO name
      logo_url: undefined
    };

    if (participants.length === 1) {
      // Single certificate
      const pdfDoc = generateCertificate(participants[0], eventData, ngoData, template);
      pdfDoc.save(`certificate-${participants[0].name.replace(/\s+/g, '-')}.pdf`);
      toast.success('Certificate generated successfully!');
    } else {
      // Bulk generation
      await generateBulkCertificates(
        participants,
        eventData,
        ngoData,
        template,
        {
          batchSize: 10,
          onProgress: (progress) => {
            toast.loading(`Generating certificates: ${progress.percentage}%`, {
              id: 'bulk-progress'
            });
          }
        }
      );
      toast.success(`Generated ${participants.length} certificates successfully!`, {
        id: 'bulk-progress'
      });
    }
  } catch (error) {
    console.error('Certificate generation failed:', error);
    toast.error(`Failed to generate certificates: ${error.message}`);
  }
}, [selectedEvent, confirmedVolunteers]);

// Add to your JSX (in the appropriate section)
{showCertificateGenerator && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Generate Certificates</h2>
        <button
          onClick={() => setShowCertificateGenerator(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <CertificateGeneratorUI
        onGenerate={handleGenerateCertificates}
        eventTitle={selectedEvent?.title}
        participantCount={confirmedVolunteers.length}
      />
    </div>
  </div>
)}

// Add generate certificates button to your event cards
<button
  onClick={() => {
    setSelectedEvent(event);
    setConfirmedVolunteers(event.confirmedVolunteers || []);
    setShowCertificateGenerator(true);
  }}
  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
  disabled={!event.confirmedVolunteers?.length}
>
  Generate Certificates ({event.confirmedVolunteers?.length || 0})
</button>
```

## API Reference

### `generateCertificate(participant, event, ngo, template)`

Generates a single certificate PDF.

**Parameters:**
- `participant`: `{ id: string, name: string, email: string }`
- `event`: `{ id: string, title: string, date: string, location: string }`
- `ngo`: `{ name: string, logo_url?: string }`
- `template`: Template options with backdrop and positioning data

**Returns:** `jsPDF` instance ready for save/download

### `generateBulkCertificates(participants, event, ngo, template, options)`

Generates certificates for multiple participants and creates a ZIP download.

**Parameters:**
- `participants`: Array of participant objects
- `event`, `ngo`, `template`: Same as single generation
- `options`: `{ batchSize?: number, onProgress?: function, signal?: AbortSignal }`

**Returns:** `Promise<void>` (automatically triggers ZIP download)

### `fitTextToBox(doc, text, box, fontName, style)`

Fits text within a specified box, automatically scaling font size and handling wrapping.

**Parameters:**
- `doc`: jsPDF instance
- `text`: Text to fit
- `box`: `{ xMm: number, yMm: number, widthMm: number, heightMm: number }`
- `fontName`: Font family name
- `style`: Font style ('normal', 'bold', 'italic')

**Returns:** `number` - Final font size used

## Testing

Run the test suite:

```bash
npm test

# Test specific modules
npm test coords.test.ts
npm test certificate.test.ts
```

### Test Coverage

- **Coordinate conversion**: Pixel ↔ millimeter conversion accuracy
- **Certificate generation**: PDF output validation with mocked jsPDF
- **Bulk processing**: Progress tracking and error handling
- **Edge cases**: Invalid inputs, network failures, memory constraints

## Troubleshooting

### Common Issues

1. **Low DPI Warning**: Ensure template images are at least 150 DPI
2. **Memory Issues**: Reduce batch size for bulk generation
3. **Font Loading**: Verify custom font data is valid base64 TTF
4. **Coordinate Accuracy**: Check device pixel ratio on high-DPI displays

### Performance Tips

- Use recommended batch sizes (see `getRecommendedBatchSize()`)
- Optimize template image file sizes
- Consider PDF compression for large batches
- Monitor memory usage during bulk generation

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section above
- Review test files for usage examples
- Open an issue on GitHub with reproduction steps