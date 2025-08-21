import type { Meta, StoryObj } from '@storybook/react';
import { NamePlacementCanvas } from '../components/NamePlacementCanvas';

const meta: Meta<typeof NamePlacementCanvas> = {
  title: 'Certificate/NamePlacementCanvas',
  component: NamePlacementCanvas,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Interactive canvas for positioning and resizing a name box on a certificate backdrop.

**Features:**
- Drag and drop positioning
- Resize handles on all edges and corners  
- Keyboard navigation (arrow keys, +/- for resize)
- Live coordinate conversion between pixels and millimeters
- Responsive design with proper aspect ratio (A4 landscape: 297:210)
- Accessibility support with ARIA labels and keyboard controls
        `,
      },
    },
  },
  argTypes: {
    backdropDataUrl: {
      control: 'text',
      description: 'Data URL or image URL for the certificate backdrop',
    },
    onCoordinatesChange: {
      action: 'coordinates-changed',
      description: 'Fired when name box position or size changes',
    },
    onConfirm: {
      action: 'placement-confirmed',
      description: 'Fired when user confirms the name box placement',
    },
    onReset: {
      action: 'canvas-reset',
      description: 'Fired when user wants to reset/start over',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NamePlacementCanvas>;

// High-quality certificate template images
const TEMPLATE_CLASSIC_GOLD = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=800&fit=crop&q=90';
const TEMPLATE_MODERN_BLUE = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop&q=90';
const TEMPLATE_VINTAGE_GREEN = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=800&fit=crop&q=90&sat=-30&hue=120';

/**
 * Default canvas with a classic gold certificate template.
 */
export const Default: Story = {
  args: {
    backdropDataUrl: TEMPLATE_CLASSIC_GOLD,
  },
};

/**
 * Modern blue certificate template with clean design.
 */
export const ModernBlueTemplate: Story = {
  args: {
    backdropDataUrl: TEMPLATE_MODERN_BLUE,
  },
};

/**
 * Vintage green template with botanical elements.
 */
export const VintageGreenTemplate: Story = {
  args: {
    backdropDataUrl: TEMPLATE_VINTAGE_GREEN,
  },
};

/**
 * Interactive demo with comprehensive feature showcase.
 */
export const InteractiveDemo: Story = {
  args: {
    backdropDataUrl: TEMPLATE_CLASSIC_GOLD,
  },
  render: (args: typeof Default.args) => (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Certificate Name Placement Canvas
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Interactive canvas for precise positioning of name boxes on certificate templates.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Precise Positioning</h3>
            <p className="text-gray-600 text-sm">
              Pixel-perfect positioning with automatic conversion to millimeter coordinates.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Keyboard Controls</h3>
            <p className="text-gray-600 text-sm">
              Full keyboard navigation. Arrow keys to move, +/- to resize.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-900 mb-2">Touch Friendly</h3>
            <p className="text-gray-600 text-sm">
              Optimized for touch devices with responsive design.
            </p>
          </div>
        </div>

        <NamePlacementCanvas {...args} />
      </div>
    </div>
  ),
};