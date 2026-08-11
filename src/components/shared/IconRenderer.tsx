import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Wrench } from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number | string;
}

export function IconRenderer({ name, className, size = 24 }: IconRendererProps) {
  if (!name) return <Wrench className={className} size={size} />;

  // Normalize name format (e.g. 'truck' -> 'Truck', 'battery-charging' -> 'BatteryCharging')
  const formattedName = name
    .trim()
    .replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase());

  const IconComponent = (LucideIcons as any)[formattedName] || (LucideIcons as any)[name] || Wrench;

  return <IconComponent className={className} size={size} />;
}
