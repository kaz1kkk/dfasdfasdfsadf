
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StrikethroughInputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const StrikethroughInput: React.FC<StrikethroughInputProps> = ({
  id,
  label,
  type = "text",
  placeholder,
  disabled = false,
  value,
  onChange
}) => {
  return (
    <div className="mb-4">
      <Label htmlFor={id} className="block mb-2 text-sm font-medium text-white/80">
        {label}
      </Label>
      <div className="strikethrough">
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          className="bg-white/10 border-white/20 text-white focus:ring-white/50"
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default StrikethroughInput;
