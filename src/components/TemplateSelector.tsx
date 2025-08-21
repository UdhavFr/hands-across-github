import { Upload, FileImage } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
}

interface TemplateSelectorProps {
  onTemplateSelect: (template: Template) => void;
  onUploadClick: () => void;
  selectedTemplateId?: string;
}

const PREDEFINED_TEMPLATES: Template[] = [
  {
    id: 'classic-gold',
    name: 'Classic Gold',
    thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&q=80',
    description: 'Elegant gold border with classic serif typography'
  },
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop&q=80',
    description: 'Clean modern design with blue accents'
  },
  {
    id: 'vintage-green',
    name: 'Vintage Green',
    thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&q=80&sat=-50&hue=120',
    description: 'Vintage-inspired with green botanical elements'
  },
  {
    id: 'minimalist-gray',
    name: 'Minimalist Gray',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop&q=80&sat=-100',
    description: 'Clean minimalist design with subtle gray tones'
  }
];

export function TemplateSelector({
  onTemplateSelect,
  onUploadClick,
  selectedTemplateId
}: TemplateSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Choose Certificate Template
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {PREDEFINED_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateSelect(template)}
            className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
              selectedTemplateId === template.id
                ? 'border-rose-500 ring-2 ring-rose-200'
                : 'border-gray-200 hover:border-rose-300'
            }`}
            aria-label={`Select ${template.name} template`}
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={template.thumbnail}
                alt={`${template.name} certificate template`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            
            <div className="p-3 text-left">
              <h3 className="font-medium text-gray-900 mb-1">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {template.description}
              </p>
            </div>
            
            {selectedTemplateId === template.id && (
              <div className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1">
                <FileImage className="w-4 h-4" />
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="border-t pt-6">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-rose-400 hover:bg-rose-50 transition-colors duration-200 group"
          aria-label="Upload custom backdrop"
        >
          <Upload className="w-6 h-6 text-gray-400 group-hover:text-rose-500 transition-colors" />
          <div className="text-center">
            <p className="font-medium text-gray-700 group-hover:text-rose-600">
              Upload Custom Backdrop
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG up to 10MB • Recommended: 300+ DPI
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}