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
        <SelectValue placeholder="Selecione o modelo" />
      </SelectTrigger>
      <SelectContent className="shadow-lg">
        <SelectItem value="d&o" className="cursor-pointer">D&O</SelectItem>
        <SelectItem value="rc-profissional" className="cursor-pointer">RC Profissional</SelectItem>
        <SelectItem value="rc-geral" className="cursor-pointer">RC Geral</SelectItem>
        <SelectItem value="global" className="cursor-pointer">Global</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;