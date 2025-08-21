import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateCertificate, type Participant, type EventData, type NgoData, type TemplateOptions } from './certificate';

export interface BulkGenerationProgress {
  completed: number;
  total: number;
  currentParticipant?: string;
  percentage: number;
}

export interface BulkGenerationOptions {
  batchSize?: number;
  onProgress?: (progress: BulkGenerationProgress) => void;
  signal?: AbortSignal;
}

/**
 * Generate certificates for multiple participants and create a downloadable ZIP file
 * 
 * @param participants - Array of participant data
 * @param event - Event information
 * @param ngo - NGO information
 * @param template - Template options
 * @param options - Generation options (batch size, progress callback, abort signal)
 * @returns Promise that resolves when ZIP is downloaded
 */
export async function generateBulkCertificates(
  participants: Participant[],
  event: EventData,
  ngo: NgoData,
  template: TemplateOptions,
  options: BulkGenerationOptions = {}
): Promise<void> {
  const { 
    batchSize = 5, 
    onProgress,
    signal 
  } = options;

  const zip = new JSZip();
  const total = participants.length;
  let completed = 0;

  // Helper function to sanitize filename
  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[^a-z0-9\s-]/gi, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .toLowerCase()
      .substring(0, 50);            // Limit length
  };

  // Process participants in batches to avoid memory issues
  for (let i = 0; i < participants.length; i += batchSize) {
    // Check for abort signal
    if (signal?.aborted) {
      throw new Error('Certificate generation was cancelled');
    }

    const batch = participants.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (participant) => {
      if (signal?.aborted) {
        throw new Error('Certificate generation was cancelled');
      }

      try {
        // Generate PDF certificate
        const pdfDoc = generateCertificate(participant, event, ngo, template);
        
        // Convert to blob
        const pdfBlob = pdfDoc.output('blob');
        
        // Create safe filename
        const sanitizedName = sanitizeFilename(participant.name);
        const filename = `certificate-${sanitizedName}-${participant.id}.pdf`;
        
        // Add to ZIP
        zip.file(filename, pdfBlob);
        
        completed++;
        
        // Report progress
        if (onProgress) {
          onProgress({
            completed,
            total,
            currentParticipant: participant.name,
            percentage: Math.round((completed / total) * 100)
          });
        }
        
        return filename;
      } catch (error) {
        console.error(`Failed to generate certificate for ${participant.name}:`, error);
        
        // Add error file instead
        const errorContent = `Error generating certificate for ${participant.name}: ${error}`;
        const errorFilename = `ERROR-${sanitizeFilename(participant.name)}-${participant.id}.txt`;
        zip.file(errorFilename, errorContent);
        
        completed++;
        
        if (onProgress) {
          onProgress({
            completed,
            total,
            currentParticipant: participant.name,
            percentage: Math.round((completed / total) * 100)
          });
        }
        
        return errorFilename;
      }
    });

    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Small delay to prevent UI blocking
    if (i + batchSize < participants.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress({
      completed: total,
      total,
      percentage: 100
    });
  }

  // Generate ZIP file
  try {
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const zipFilename = `certificates-${sanitizeFilename(event.title)}-${timestamp}.zip`;

    // Download ZIP file
    saveAs(zipBlob, zipFilename);
    
  } catch (error) {
    console.error('Failed to generate ZIP file:', error);
    throw new Error(`Failed to create certificate archive: ${error}`);
  }
}

/**
 * Download a single file with proper filename handling
 * 
 * @param blob - File blob to download
 * @param filename - Desired filename
 */
export function downloadFile(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

/**
 * Create and download a single certificate
 * 
 * @param participant - Participant data
 * @param event - Event data
 * @param ngo - NGO data
 * @param template - Template options
 * @returns Promise that resolves when download starts
 */
export async function downloadSingleCertificate(
  participant: Participant,
  event: EventData,
  ngo: NgoData,
  template: TemplateOptions
): Promise<void> {
  try {
    const pdfDoc = generateCertificate(participant, event, ngo, template);
    const pdfBlob = pdfDoc.output('blob');
    
    const sanitizedName = participant.name
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 30);
      
    const filename = `certificate-${sanitizedName}.pdf`;
    
    downloadFile(pdfBlob, filename);
  } catch (error) {
    console.error('Failed to download certificate:', error);
    throw new Error(`Failed to generate certificate: ${error}`);
  }
}

/**
 * Validate participants array before bulk generation
 * 
 * @param participants - Array of participants to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateParticipants(participants: Participant[]): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(participants)) {
    errors.push('Participants must be an array');
    return errors;
  }
  
  if (participants.length === 0) {
    errors.push('At least one participant is required');
    return errors;
  }
  
  participants.forEach((participant, index) => {
    if (!participant.name?.trim()) {
      errors.push(`Participant ${index + 1}: Name is required`);
    }
    
    if (!participant.id?.trim()) {
      errors.push(`Participant ${index + 1}: ID is required`);
    }
    
    if (participant.email && !/\S+@\S+\.\S+/.test(participant.email)) {
      errors.push(`Participant ${index + 1}: Invalid email format`);
    }
  });
  
  // Check for duplicate IDs
  const ids = participants.map(p => p.id).filter(Boolean);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate participant IDs found: ${duplicateIds.join(', ')}`);
  }
  
  return errors;
}

/**
 * Estimate memory usage and recommend batch size based on participant count
 * 
 * @param participantCount - Number of participants
 * @returns Recommended batch size
 */
export function getRecommendedBatchSize(participantCount: number): number {
  // Estimate ~2MB per certificate PDF
  const estimatedSizePerCert = 2; // MB
  const availableMemory = 500; // Conservative estimate of available browser memory (MB)
  
  const maxBatchSize = Math.floor(availableMemory / estimatedSizePerCert);
  
  if (participantCount <= 10) return Math.min(participantCount, 5);
  if (participantCount <= 50) return Math.min(participantCount, 10);
  if (participantCount <= 200) return Math.min(participantCount, 20);
  
  return Math.min(maxBatchSize, 25); // Never more than 25 at once
}