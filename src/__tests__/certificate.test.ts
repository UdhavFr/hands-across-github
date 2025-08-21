import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCertificate, fitTextToBox, type Participant, type EventData, type NgoData, type TemplateOptions } from '../utils/certificate';

// Mock jsPDF
const mockJsPDF = {
  addImage: vi.fn(),
  text: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  rect: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(50),
  addFileToVFS: vi.fn(),
  addFont: vi.fn(),
  output: vi.fn().mockReturnValue('mock-pdf-blob')
};

// Mock jsPDF constructor
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockJsPDF)
}));

// Mock UUID
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid-1234-5678-9abc')
}));

describe('Certificate Generation', () => {
  // Test data
  const mockParticipant: Participant = {
    id: 'participant-123',
    name: 'John Doe',
    email: 'john@example.com'
  };

  const mockEvent: EventData = {
    id: 'event-456',
    title: 'Beach Cleanup Volunteer Event',
    date: '2024-03-15',
    location: 'Santa Monica Beach, CA',
    description: 'Community beach cleaning initiative'
  };

  const mockNgo: NgoData = {
    name: 'Ocean Guardians NGO',
    logo_url: 'https://example.com/logo.png'
  };

  const mockTemplate: TemplateOptions = {
    backdropDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    nameBoxPx: { x: 200, y: 150, width: 400, height: 80 },
    canvasPxSize: { widthPx: 800, heightPx: 600 },
    fontFamily: 'helvetica',
    fontSize: 24,
    textColor: '#2D3748',
    textAlign: 'center'
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset mockJsPDF state
    Object.values(mockJsPDF).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockClear();
      }
    });
    
    // Reset default return values
    mockJsPDF.getTextWidth.mockReturnValue(50);
    mockJsPDF.output.mockReturnValue('mock-pdf-blob');
  });

  describe('generateCertificate', () => {
    it('should create jsPDF with correct configuration', () => {
      const { jsPDF } = require('jspdf');
      
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      expect(jsPDF).toHaveBeenCalledWith({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
    });

    it('should add backdrop image with correct coordinates', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      expect(mockJsPDF.addImage).toHaveBeenCalledWith(
        'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        'JPEG',
        0,    // x position
        0,    // y position  
        297,  // PDF width (A4 landscape)
        210,  // PDF height (A4 landscape)
        undefined,
        'FAST'
      );
    });

    it('should set text color from hex value', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      // #2D3748 = rgb(45, 55, 72)
      expect(mockJsPDF.setTextColor).toHaveBeenCalledWith(45, 55, 72);
    });

    it('should draw participant name in name box area', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      // Should call text method with participant name
      const textCalls = mockJsPDF.text.mock.calls;
      const nameCall = textCalls.find(call => call[0] === 'John Doe');
      
      expect(nameCall).toBeTruthy();
      
      // Name should be positioned within the converted mm coordinates
      if (nameCall) {
        const [, xPos, yPos] = nameCall;
        
        // Convert expected name box to mm for verification
        // nameBoxPx: { x: 200, y: 150, width: 400, height: 80 }
        // Canvas: 800x600, PDF: 297x210mm
        // Expected mm coordinates should be within reasonable range
        expect(xPos).toBeGreaterThanOrEqual(70);  // Left edge with padding
        expect(xPos).toBeLessThanOrEqual(220);    // Right edge with padding  
        expect(yPos).toBeGreaterThanOrEqual(50);  // Top edge with padding
        expect(yPos).toBeLessThanOrEqual(90);     // Bottom edge with padding
      }
    });

    it('should add certificate title at top center', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      const textCalls = mockJsPDF.text.mock.calls;
      const titleCall = textCalls.find(call => 
        call[0] === 'CERTIFICATE OF APPRECIATION'
      );
      
      expect(titleCall).toBeTruthy();
      
      // Title should be centered horizontally
      if (titleCall) {
        const [, , yPos] = titleCall;
        expect(yPos).toBe(30); // Expected Y position from implementation
      }
    });

    it('should add event information below name box', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      const textCalls = mockJsPDF.text.mock.calls;
      
      // Should include event title
      const eventTitleCall = textCalls.find(call => 
        call[0].includes('Beach Cleanup Volunteer Event')
      );
      expect(eventTitleCall).toBeTruthy();
      
      // Should include formatted date and location
      const eventDetailsCall = textCalls.find(call => 
        call[0].includes('March 15, 2024') && call[0].includes('Santa Monica Beach, CA')
      );
      expect(eventDetailsCall).toBeTruthy();
    });

    it('should add NGO name in bottom section', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      const textCalls = mockJsPDF.text.mock.calls;
      const ngoCall = textCalls.find(call => call[0] === 'Ocean Guardians NGO');
      
      expect(ngoCall).toBeTruthy();
      
      if (ngoCall) {
        const [, , yPos] = ngoCall;
        expect(yPos).toBe(180); // Expected bottom section Y
      }
    });

    it('should add certificate ID and issue date', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      const textCalls = mockJsPDF.text.mock.calls;
      
      // Should include certificate ID
      const idCall = textCalls.find(call => 
        call[0].startsWith('ID: CERT-')
      );
      expect(idCall).toBeTruthy();
      
      // Should include issue date
      const dateCall = textCalls.find(call => 
        call[0].startsWith('Issued:')
      );
      expect(dateCall).toBeTruthy();
    });

    it('should handle custom font family', () => {
      const customTemplate = {
        ...mockTemplate,
        fontFamily: 'times'
      };
      
      generateCertificate(mockParticipant, mockEvent, mockNgo, customTemplate);
      
      expect(mockJsPDF.setFont).toHaveBeenCalledWith('times', 'normal');
    });

    it('should handle custom TTF font embedding', () => {
      const customTemplate = {
        ...mockTemplate,
        fontFamily: 'data:font/ttf;base64,customfontdata123=='
      };
      
      generateCertificate(mockParticipant, mockEvent, mockNgo, customTemplate);
      
      expect(mockJsPDF.addFileToVFS).toHaveBeenCalledWith(
        'CustomFont.ttf', 
        'customfontdata123=='
      );
      expect(mockJsPDF.addFont).toHaveBeenCalledWith(
        'CustomFont.ttf', 
        'CustomFont', 
        'normal'
      );
      expect(mockJsPDF.setFont).toHaveBeenCalledWith('CustomFont');
    });

    it('should add decorative border', () => {
      generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      expect(mockJsPDF.setDrawColor).toHaveBeenCalledWith(200, 200, 200);
      expect(mockJsPDF.setLineWidth).toHaveBeenCalledWith(0.5);
      expect(mockJsPDF.rect).toHaveBeenCalledWith(10, 10, 277, 190);
    });

    it('should handle missing backdrop image gracefully', () => {
      const templateNoBackdrop = {
        ...mockTemplate,
        backdropDataUrl: 'invalid-data-url'
      };
      
      // Should not throw error
      expect(() => {
        generateCertificate(mockParticipant, mockEvent, mockNgo, templateNoBackdrop);
      }).not.toThrow();
      
      // Should still attempt to add the image
      expect(mockJsPDF.addImage).toHaveBeenCalled();
    });

    it('should return the jsPDF instance', () => {
      const result = generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      
      expect(result).toBe(mockJsPDF);
    });
  });

  describe('fitTextToBox', () => {
    const mockBox = {
      xMm: 50,
      yMm: 50, 
      widthMm: 100,
      heightMm: 30
    };

    beforeEach(() => {
      // Reset text width mock to return different values based on font size
      mockJsPDF.getTextWidth.mockImplementation((text: string) => {
        const fontSize = 12; // Default
        return text.length * fontSize * 0.6; // Rough estimation
      });
    });

    it('should set font and draw text', () => {
      fitTextToBox(mockJsPDF as any, 'Test Text', mockBox, 'helvetica', 'bold');
      
      expect(mockJsPDF.setFont).toHaveBeenCalledWith('helvetica', 'bold');
      expect(mockJsPDF.setFontSize).toHaveBeenCalled();
      expect(mockJsPDF.text).toHaveBeenCalled();
    });

    it('should handle long text by reducing font size', () => {
      const longText = 'This is a very long text that should not fit in the box at normal size';
      
      // Mock getTextWidth to return width based on text length
      mockJsPDF.getTextWidth.mockImplementation((text: string) => {
        return text.length * 2; // Make it too wide initially
      });
      
      const fontSize = fitTextToBox(mockJsPDF as any, longText, mockBox);
      
      // Should reduce font size to fit
      expect(fontSize).toBeLessThanOrEqual(72);
      expect(fontSize).toBeGreaterThanOrEqual(8);
    });

    it('should handle text wrapping', () => {
      const multiWordText = 'Word One Two Three Four Five';
      
      fitTextToBox(mockJsPDF as any, multiWordText, mockBox, 'helvetica', 'normal');
      
      // Should call text method (possibly multiple times for wrapped lines)
      expect(mockJsPDF.text).toHaveBeenCalled();
      
      const textCalls = mockJsPDF.text.mock.calls;
      expect(textCalls.length).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const fontSize = fitTextToBox(mockJsPDF as any, '', mockBox);
      
      expect(fontSize).toBeGreaterThanOrEqual(8);
      expect(mockJsPDF.text).toHaveBeenCalled();
    });

    it('should handle very small box dimensions', () => {
      const smallBox = {
        xMm: 10,
        yMm: 10,
        widthMm: 5,
        heightMm: 3
      };
      
      const fontSize = fitTextToBox(mockJsPDF as any, 'Text', smallBox);
      
      // Should use minimum font size
      expect(fontSize).toBe(8);
    });

    it('should position text within box bounds', () => {
      fitTextToBox(mockJsPDF as any, 'Test', mockBox, 'helvetica', 'center');
      
      const textCalls = mockJsPDF.text.mock.calls;
      const lastCall = textCalls[textCalls.length - 1];
      
      if (lastCall) {
        const [, xPos, yPos] = lastCall;
        
        // X position should be within box bounds (accounting for padding)
        expect(xPos).toBeGreaterThanOrEqual(mockBox.xMm);
        expect(xPos).toBeLessThanOrEqual(mockBox.xMm + mockBox.widthMm);
        
        // Y position should be within box bounds
        expect(yPos).toBeGreaterThanOrEqual(mockBox.yMm);
        expect(yPos).toBeLessThanOrEqual(mockBox.yMm + mockBox.heightMm);
      }
    });

    it('should return the font size used', () => {
      const fontSize = fitTextToBox(mockJsPDF as any, 'Test Text', mockBox);
      
      expect(typeof fontSize).toBe('number');
      expect(fontSize).toBeGreaterThan(0);
      expect(fontSize).toBeLessThanOrEqual(72);
    });
  });

  describe('Error handling', () => {
    it('should handle jsPDF constructor failure gracefully', () => {
      const { jsPDF } = require('jspdf');
      jsPDF.mockImplementationOnce(() => {
        throw new Error('PDF creation failed');
      });
      
      expect(() => {
        generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      }).toThrow('PDF creation failed');
    });

    it('should handle image loading failure gracefully', () => {
      mockJsPDF.addImage.mockImplementationOnce(() => {
        throw new Error('Image loading failed');
      });
      
      // Should not throw - should continue without backdrop
      expect(() => {
        generateCertificate(mockParticipant, mockEvent, mockNgo, mockTemplate);
      }).not.toThrow();
      
      // Should still draw text content
      expect(mockJsPDF.text).toHaveBeenCalled();
    });

    it('should handle invalid color values', () => {
      const invalidColorTemplate = {
        ...mockTemplate,
        textColor: 'invalid-color'
      };
      
      generateCertificate(mockParticipant, mockEvent, mockNgo, invalidColorTemplate);
      
      // Should fall back to black (0, 0, 0)
      expect(mockJsPDF.setTextColor).toHaveBeenCalledWith(0, 0, 0);
    });
  });
});