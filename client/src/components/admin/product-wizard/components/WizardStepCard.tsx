import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface WizardStepCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const WizardStepCard: React.FC<WizardStepCardProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  className = "" 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="bg-white/70 backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
              {description && (
                <p className="text-sm text-slate-600 mt-1">{description}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface WizardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const WizardSection: React.FC<WizardSectionProps> = ({ 
  title, 
  description, 
  children, 
  className = "" 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-l-4 border-gradient-to-b from-blue-500 to-purple-500 pl-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {description && (
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

interface WizardFieldGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const WizardFieldGroup: React.FC<WizardFieldGroupProps> = ({ 
  children, 
  columns = 2, 
  className = "" 
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 sm:gap-6 ${className}`}>
      {children}
    </div>
  );
};