import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelSelectorProps {
  onValueChange: (value: string) => void;
  defaultValue: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onValueChange, defaultValue }) => {
  return (
    <Select onValueChange={onValueChange} defaultValue={defaultValue}>
      <SelectTrigger className="w-[180px] ml-20 md:ml-0">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="basic">Modelo Basico-1</SelectItem>
        <SelectItem value="global">Modelo Global-2</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;
