import React from 'react';
import {
  Truck,
  BatteryCharging,
  Zap,
  Fuel,
  Target,
  CircleDot,
  Key,
  Wrench,
  AlertTriangle,
  MapPin,
  Clock,
  Shield,
  Activity,
  User,
  Settings,
  Star,
  Smartphone,
  CheckCircle,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Truck,
  BatteryCharging,
  Zap,
  Fuel,
  Target,
  CircleDot,
  Key,
  Wrench,
  AlertTriangle,
  MapPin,
  Clock,
  Shield,
  Activity,
  User,
  Settings,
  Star,
  Smartphone,
  CheckCircle,
};

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number | string;
}

export function IconRenderer({ name, className, size = 24 }: IconRendererProps) {
  let IconComponent = iconMap[name];

  if (!IconComponent) {
    IconComponent = Activity;
  }

  return <IconComponent className={className} size={size} />;
}
