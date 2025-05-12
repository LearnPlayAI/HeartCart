# Product Wizard Component Structure

This document provides an overview of the product wizard architecture and component structure.

## Architecture

The product wizard implements a multi-step form with a context-based state management pattern:

```
┌─────────────────────────────┐
│   ProductWizardProvider     │
│  (Context + State Manager)  │
└───────────────┬─────────────┘
                │
                ▼
┌─────────────────────────────┐
│     WizardContainer         │
│  (Layout & Navigation)      │
└───────────────┬─────────────┘
                │
                ▼
┌─────────────────────────────┐
│      Individual Steps       │
│  (Form Sections & Logic)    │
└─────────────────────────────┘
```

## State Management Pattern

The wizard uses a React Context combined with useReducer hook for state management:

1. **Context Provider**: Wraps the entire wizard and provides state to all child components
2. **Reducer Pattern**: Implements immutable state updates via actions
3. **Form Data Persistence**: Automatically saves changes as drafts
4. **Navigation Guards**: Prevents navigation to invalid steps 

## Component Structure

### Core Components

- **ProductWizardProvider**: Context provider with state initialization
- **WizardContainer**: Main layout component that handles step navigation
- **WizardStepIndicator**: Visual indicator of progress
- **WizardNavigation**: Next/Previous/Save buttons

### Step Components

- **BasicInfoStep**: Essential product details (name, price, etc.)
- **ProductImagesStep**: Image upload and management
- **AdditionalInfoStep**: Attributes, specifications, and variants
- **ReviewSaveStep**: Final review and product submission

## Data Flow

```
┌─────────────────┐          ┌─────────────┐
│ User Interaction│─────────▶│  Dispatch   │
└─────────────────┘          │   Action    │
                             └──────┬──────┘
                                    │
                                    ▼
┌─────────────────┐          ┌─────────────┐
│  UI Updates     │◀─────────│  Reducer    │
└─────────────────┘          │  Updates    │
                             └──────┬──────┘
                                    │
                                    ▼
┌─────────────────┐          ┌─────────────┐
│  Form Validation │◀────────│   State     │
└─────────────────┘          │   Changes   │
                             └─────────────┘
```

## State Structure

The wizard state includes:

```typescript
interface WizardState {
  currentStep: WizardStep;
  productData: ProductWizardData;
  draftId?: number;
  catalogId?: number;
  supplierId?: number;
  isFormDirty: boolean;
  isLoading: boolean;
}
```

## Action Types

- `SET_STEP`: Change the active wizard step
- `UPDATE_PRODUCT_DATA`: Update a single field
- `UPDATE_MULTIPLE_FIELDS`: Update multiple fields at once
- `SET_DRAFT_ID`: Set the current draft ID
- `SET_LOADING`: Toggle loading state
- `RESET_FORM`: Reset to initial state
- `SET_FORM_DIRTY`: Mark form as modified
- `CLEAR_FORM_DIRTY`: Mark form as saved/unmodified
- `SET_CATALOG_ID`: Set the catalog for the product
- `SET_SUPPLIER_ID`: Set the supplier for the product

## API Integration

The wizard interacts with the following API endpoints:

- `/api/product-drafts`: Draft management (GET, POST, PUT, DELETE)
- `/api/products/wizard`: Product creation and editing
- `/api/attributes`: Product attribute management
- `/api/categories`: Category selection