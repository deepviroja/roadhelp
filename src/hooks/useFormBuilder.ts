import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { FormConfig, FormField } from '@/components/shared/DynamicFormFields';
import * as z from 'zod';

export function useFormBuilder(formId: string) {
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'formBuilderFields'),
      where('formId', '==', formId),
      where('isVisible', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbFields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by sortOrder
      dbFields.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Map to FormField format expected by DynamicFormFields
      const mappedFields: FormField[] = dbFields.map((f: any) => {
        let typeVal: FormField['type'] = 'text';
        if (f.fieldType === 'dropdown') {
          typeVal = 'select';
        } else if (f.fieldType === 'phone') {
          typeVal = 'tel';
        } else if (f.fieldType === 'textarea') {
          typeVal = 'textarea' as any;
        } else if (f.fieldType === 'checkbox') {
          typeVal = 'checkbox' as any;
        } else if (['text', 'email', 'number', 'date'].includes(f.fieldType)) {
          typeVal = f.fieldType;
        }

        return {
          id: f.nameKey || f.id,
          type: typeVal,
          label: f.label,
          placeholder: f.placeholder || '',
          required: !!f.isRequired,
          options: f.options || [],
        };
      });

      setConfig({
        id: formId,
        title: formId,
        description: '',
        fields: mappedFields
      });
      setLoading(false);
    }, (err) => {
      console.error('Failed to load form config from Firestore collection:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [formId]);

  return { config, loading };
}

export function generateZodSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach(field => {
    let validator: z.ZodTypeAny = z.string();

    if (field.type === 'email') {
      validator = z.string().email({ message: 'Invalid email address' });
    } else if (field.type === ('checkbox' as any)) {
      validator = z.any();
    }

    if (field.required && field.type !== ('checkbox' as any)) {
      validator = (validator as z.ZodString).min(1, { message: field.errorMessage || 'This field is required' });
    } else {
      validator = validator.optional() as any;
    }

    if (field.validationRegex && field.type !== ('checkbox' as any)) {
      try {
        const regex = new RegExp(field.validationRegex);
        validator = (validator as z.ZodString).regex(regex, { message: field.errorMessage || 'Invalid format' });
      } catch (e) {
        // Ignore invalid regex
      }
    }

    shape[field.id] = validator;
  });

  return z.object(shape);
}
