import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInputGroup } from '@/components/ui/phone-input';
import { Eye, EyeOff } from 'lucide-react';

export type FormField = {
  id: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'select' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select
  validationRegex?: string;
  errorMessage?: string;
};

export type FormConfig = {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
};

interface DynamicFormFieldsProps {
  fields: FormField[];
  form: UseFormReturn<any>;
}

export function DynamicFormFields({ fields, form }: DynamicFormFieldsProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4 w-full">
      {fields.map((field) => {
        const hasError = !!errors[field.id];
        const errorMessage = errors[field.id]?.message as string;

        if (field.type === 'select') {
          return (
            <div key={field.id} className="space-y-1.5 w-full">
              <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {field.label} {field.required && '*'}
              </Label>
              <Select
                value={watch(field.id)}
                onValueChange={(val) => setValue(field.id, val, { shouldValidate: true })}
              >
                <SelectTrigger className={`h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold ${hasError ? 'border-red-500 ring-red-100' : ''}`}>
                  <SelectValue placeholder={field.placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasError && <p className="text-[11px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errorMessage}</p>}
            </div>
          );
        }

        if (field.type === ('textarea' as any)) {
          return (
            <div key={field.id} className="space-y-1.5 w-full">
              <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {field.label} {field.required && '*'}
              </Label>
              <Textarea
                id={field.id}
                placeholder={field.placeholder}
                {...register(field.id)}
                className={`rounded-2xl bg-slate-50 border-slate-200 font-semibold min-h-[90px] ${hasError ? 'border-red-500 ring-red-100' : ''}`}
              />
              {hasError && <p className="text-[11px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errorMessage}</p>}
            </div>
          );
        }

        if (field.type === ('checkbox' as any)) {
          return (
            <div key={field.id} className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 w-full">
              <input
                id={field.id}
                type="checkbox"
                {...register(field.id)}
                className={`w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 ${hasError ? 'border-red-500' : ''}`}
              />
              <Label htmlFor={field.id} className="text-xs font-bold text-slate-700 cursor-pointer">
                {field.label} {field.required && '*'}
              </Label>
              {hasError && <p className="text-[11px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errorMessage}</p>}
            </div>
          );
        }

        if (field.type === 'tel' || field.id === 'phone') {
          return (
            <div key={field.id} className="space-y-1.5 w-full">
              <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {field.label} {field.required && '*'}
              </Label>
              <PhoneInputGroup
                countryCode={watch(field.id + '_countryCode') || watch('countryCode') || '+91'}
                phone={watch(field.id) || ''}
                onCountryCodeChange={(v) => {
                  setValue('countryCode', v, { shouldValidate: true });
                  setValue(field.id + '_countryCode', v, { shouldValidate: true });
                }}
                onPhoneChange={(v) => setValue(field.id, v, { shouldValidate: true })}
                error={hasError}
              />
              {hasError && <p className="text-[11px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errorMessage}</p>}
            </div>
          );
        }

        if (field.id === 'password' || field.id === 'confirmPassword') {
          const isVisible = !!showPasswords[field.id];
          return (
            <div key={field.id} className="space-y-1.5 w-full relative">
              <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {field.label} {field.required && '*'}
              </Label>
              <div className="relative">
                <Input
                  id={field.id}
                  type={isVisible ? 'text' : 'password'}
                  placeholder={field.placeholder}
                  {...register(field.id)}
                  className={`h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold pr-14 ${hasError ? 'border-red-500 ring-red-100' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, [field.id]: !isVisible }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {hasError && <p className="text-[11px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errorMessage}</p>}
            </div>
          );
        }

        return (
          <div key={field.id} className="space-y-1.5 w-full">
            <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {field.label} {field.required && '*'}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              {...register(field.id)}
              className={`h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold ${hasError ? 'border-red-500 ring-red-100' : ''}`}
            />
            {hasError && <p className="text-[11px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errorMessage}</p>}
          </div>
        );
      })}
    </div>
  );
}
