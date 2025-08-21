import type { Meta, StoryObj } from '@storybook/react';
import { NamePlacementCanvas } from '../components/NamePlacementCanvas';

const meta: Meta<typeof NamePlacementCanvas> = {
  title: 'Certificate/NamePlacementCanvas',
  component: NamePlacementCanvas,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive canvas for positioning and resizing a name box on a certificate backdrop. Supports mouse, touch, and keyboard controls with live coordinate reporting in both pixels and millimeters.',
      },
    },
  },
  argTypes: {
    backdropDataUrl: {
      control: 'text',
      description: 'Data URL of the backdrop image',
    },
    onCoordinatesChange: {
      action: 'coordinates-changed',
      description: 'Callback fired when name box position or size changes',
    },
    onConfirm: {
      action: 'confirmed',
      description: 'Callback fired when user confirms placement',
    },
    onReset: {
      action: 'reset',
      description: 'Callback fired when user resets the canvas',
    },
  },
};

export default meta;
type Story = StoryObj<typeof NamePlacementCanvas>;

// Sample backdrop image (certificate template)
const sampleBackdrop = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80';

export const Default: Story = {
  args: {
    backdropDataUrl: sampleBackdrop,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default canvas with a sample certificate backdrop. The name box can be dragged, resized, and positioned using mouse, touch, or keyboard controls.',
      },
    },
  },
};

export const ModernTemplate: Story = {
  args: {
    backdropDataUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop&q=80',
  },
  parameters: {
    docs: {
      description: {
        story: 'Canvas with a modern blue certificate template. Shows how the component adapts to different backdrop styles.',
      },
    },
  },
};

export const VintageTemplate: Story = {
  args: {
    backdropDataUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&q=80&sat=-50&hue=120',
  },
  parameters: {
    docs: {
      description: {
        story: 'Canvas with a vintage green certificate template. Demonstrates coordinate conversion accuracy across different image styles.',
      },
    },
  },
};

export const InteractiveDemo: Story = {
  args: {
    backdropDataUrl: sampleBackdrop,
  },
  parameters: {
    docs: {
      description: {
        story: `
### Interactive Features

**Mouse/Touch Controls:**
- Drag the name box to reposition
- Resize from corners and edges
- Visual feedback with rose-colored handles

**Keyboard Controls:**
- Arrow keys: Move 1px (Shift for 10px)
- +/- keys: Resize the box
- Focus the canvas area to enable keyboard control

**Coordinate Reporting:**
- Live updates in both pixels and millimeters
- Accounts for device pixel ratio and canvas scaling
- Consistent conversion for PDF generation

**Accessibility:**
- ARIA labels and keyboard navigation
- Focus management and screen reader support
- Clear visual indicators and instructions
        `,
      },
    },
  },
  render: (args) => (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Interactive Name Placement Canvas</h2>
        <p className="text-gray-600 mb-6">
          Try dragging the name box, resizing it, or using keyboard controls (focus the canvas first).
          Watch the coordinates update in real-time!
        </p>
        <NamePlacementCanvas {...args} />
      </div>
    </div>
  ),
};