import * as React from "react";
import lib from "react-country-phone-input";
import "react-country-phone-input/lib/style.css";

// Handle ESM/CommonJS interop for the phone input package
const PhoneInput = (lib as any).default || lib;

import { cn } from "@/lib/utils";

interface PhoneInputGroupProps {
  countryCode: string;
  phone: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
  error?: boolean;
  className?: string;
}

/**
 * A combined phone input component that captures country code and phone number.
 * Uses react-country-phone-input for the country dropdown and formatting.
 * Designed to feel premium and fit into the existing design system.
 */
export function PhoneInputGroup({ 
  countryCode, 
  phone, 
  onCountryCodeChange, 
  onPhoneChange, 
  error,
  className 
}: PhoneInputGroupProps) {
  // Use a local state for the input to avoid weird library-triggered loops
  const [internalValue, setInternalValue] = React.useState(`${countryCode}${phone}`);
  
  // Sync internal value with props only if they change significantly
  React.useEffect(() => {
    const newValue = `${countryCode}${phone}`;
    if (newValue !== internalValue.replace(/\s+/g, '')) {
      setInternalValue(newValue);
    }
  }, [countryCode, phone]);

  const handleChange = (value: string, data: any) => {
    // 1. Update local state immediately for UI responsiveness
    setInternalValue(value);

    // 2. Extract and normalize values
    const dialCode = data?.dialCode ? `+${data.dialCode}` : '';
    const digitsOnly = value.replace(/\D/g, ''); 
    const dialDigits = data?.dialCode || '';
    
    let rawPhone = digitsOnly;
    if (dialDigits && digitsOnly.startsWith(dialDigits)) {
      rawPhone = digitsOnly.slice(dialDigits.length);
    }
    
    // 3. Only notify parent if values have actually changed
    // Using a ref to prevent loops from prop-triggered effects
    if (dialCode !== countryCode) {
      onCountryCodeChange(dialCode);
    }
    if (rawPhone !== phone) {
      onPhoneChange(rawPhone);
    }
  };

  return (
    <div className={cn("phone-input-container w-full", className)}>
      <PhoneInput
        country={countryCode.replace('+', '').toLowerCase() || 'in'}
        value={internalValue}
        onChange={handleChange}
        inputClass={cn(
          "!w-full !h-12 !text-base !font-medium !bg-white !border-slate-200 !rounded-2xl !pl-14",
          error && "!border-red-500 !ring-red-100",
          "!transition-all focus:!border-blue-500 focus:!ring-4 focus:!ring-blue-50"
        )}
        containerClass="!w-full"
        buttonClass={cn(
          "!bg-transparent !border-0 !rounded-l-2xl !pl-3 hover:!bg-slate-50",
          error && "!border-red-500"
        )}
        dropdownClass="!rounded-xl !shadow-2xl !border-slate-100 !mt-2 "
        searchClass="!bg-slate-50 !border-slate-100 !rounded-lg !mx-2 !mb-2"
        enableSearch
        disableSearchIcon
      />
      <style>{`
        .phone-input-container .react-tel-input .flag-dropdown.open .selected-flag {
          background: #f8fafc;
          border-radius: 1rem 0 0 0;
        }
        .phone-input-container .react-tel-input .country-list .country:hover {
          background-color: #f1f5f9;
        }
        .phone-input-container .react-tel-input .country-list .country.highlight {
          background-color: #eff6ff;
        }
        .phone-input-container .react-tel-input .selected-flag {
          width: 52px;
        }
      `}</style>
    </div>
  );
}

