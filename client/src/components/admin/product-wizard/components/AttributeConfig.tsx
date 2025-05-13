/**
 * AttributeConfigurationComponent
 * 
 * This component handles attribute metadata for product variations.
 * It allows configuring which attributes are mandatory for checkout 
 * and setting metadata like weight and dimensions for size attributes.
 * 
 * IMPORTANT: Product attributes do NOT affect pricing anywhere in the application.
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoIcon, PlusIcon, MinusIcon, XIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type AttributeValue = {
  id: string | number;
  attributeId: number;
  attributeName: string;
  value: string;
  displayValue: string;
  isRequired: boolean;
  sortOrder: number;
  metadata?: {
    weight?: number;
    dimensions?: string;
    [key: string]: any;
  };
};

export type AttributeOption = {
  id: string | number;
  value: string;
  displayValue: string;
};

export type ProductAttribute = {
  id: number;
  name: string;
  type: string;
  isRequired: boolean;
  options: AttributeOption[];
};

interface AttributeConfigProps {
  attributes: ProductAttribute[];
  attributeValues: AttributeValue[];
  onChange: (values: AttributeValue[]) => void;
}

export function AttributeConfig({
  attributes,
  attributeValues,
  onChange
}: AttributeConfigProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<AttributeValue[]>(attributeValues);
  const [sizeAttribute, setSizeAttribute] = useState<ProductAttribute | null>(null);
  
  // Find the size attribute if it exists
  useEffect(() => {
    const sizeAttr = attributes.find(attr => 
      attr.name.toLowerCase().includes('size')
    );
    
    if (sizeAttr) {
      setSizeAttribute(sizeAttr);
    }
  }, [attributes]);
  
  // Update parent component when values change
  useEffect(() => {
    onChange(values);
  }, [values, onChange]);
  
  // No price adjustment changes as attributes should not affect pricing
  
  // Handle required change
  const handleRequiredChange = (attrId: number, isRequired: boolean) => {
    setValues(prevValues => 
      prevValues.map(val => 
        val.attributeId === attrId 
          ? { ...val, isRequired } 
          : val
      )
    );
  };
  
  // Handle weight change for size attributes
  const handleWeightChange = (attrValueId: string | number, weight: number) => {
    setValues(prevValues => 
      prevValues.map(val => {
        if (val.id === attrValueId) {
          const metadata = { ...(val.metadata || {}), weight };
          return { ...val, metadata };
        }
        return val;
      })
    );
  };
  
  // Handle dimensions change for size attributes
  const handleDimensionsChange = (attrValueId: string | number, dimensions: string) => {
    setValues(prevValues => 
      prevValues.map(val => {
        if (val.id === attrValueId) {
          const metadata = { ...(val.metadata || {}), dimensions };
          return { ...val, metadata };
        }
        return val;
      })
    );
  };
  
  // Group attribute values by attribute ID
  const groupedValues = attributes.map(attribute => {
    const attrValues = values.filter(val => val.attributeId === attribute.id);
    return {
      attribute,
      values: attrValues.length > 0 ? attrValues : [],
    };
  });
  
  // No price calculation as attributes should not affect pricing

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Attribute Configuration</span>
            <InfoIcon className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Configure which attributes are required for checkout.
            For size-based attributes, you can also specify weight and dimensions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedValues.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              No attributes added yet. Add attributes in the Attributes section.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedValues.map(({ attribute, values }) => (
                <div key={attribute.id} className="border rounded-md">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <div className="font-medium flex items-center gap-2">
                      {attribute.name}
                      <div className="flex items-center ml-4">
                        <Label htmlFor={`required-${attribute.id}`} className="mr-2 text-sm font-normal">
                          Required:
                        </Label>
                        <Switch 
                          id={`required-${attribute.id}`}
                          checked={values.find(v => v.attributeId === attribute.id)?.isRequired || false}
                          onCheckedChange={(checked) => handleRequiredChange(attribute.id, checked)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Option</TableHead>
                        {attribute.id === sizeAttribute?.id && (
                          <>
                            <TableHead>Weight (kg)</TableHead>
                            <TableHead>Dimensions</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attribute.options.map(option => {
                        // Find the value for this option if it exists
                        const value = values.find(v => v.value === option.value) || {
                          id: `new-${attribute.id}-${option.id}`,
                          attributeId: attribute.id,
                          attributeName: attribute.name,
                          value: option.value,
                          displayValue: option.displayValue,
                          isRequired: attribute.isRequired,
                          sortOrder: 0,
                          metadata: {}
                        };
                        
                        return (
                          <TableRow key={option.id}>
                            <TableCell>{option.displayValue}</TableCell>
                            {attribute.id === sizeAttribute?.id && (
                              <>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={value.metadata?.weight || ''}
                                    onChange={(e) => handleWeightChange(
                                      value.id,
                                      parseFloat(e.target.value) || 0
                                    )}
                                    className="w-24"
                                    placeholder="Weight"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    value={value.metadata?.dimensions || ''}
                                    onChange={(e) => handleDimensionsChange(
                                      value.id,
                                      e.target.value
                                    )}
                                    className="w-32"
                                    placeholder="L x W x H cm"
                                  />
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}