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
  value: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onValueChange, value }) => {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione o modelo" />
      </SelectTrigger>
      <SelectContent className="shadow-lg">
        <SelectItem value="pro" className="text-gray-900 font-semibold" >Pro-1</SelectItem>
        <SelectItem value="inter" className="text-gray-900 font-semibold" >Pro-2</SelectItem>
        <SelectItem value="basic" className="text-gray-900 font-semibold" >Pro-3</SelectItem>
        {/* <SelectItem value="d&o" className="cursor-pointer">D&O</SelectItem>
        <SelectItem value="rc-profissional" className="cursor-pointer">RC Profissional</SelectItem>
        <SelectItem value="rc-geral" className="cursor-pointer">RC Geral</SelectItem>
        <SelectItem value="habilitacao" className="cursor-pointer">Habilitação</SelectItem>
        <SelectItem value="global" className="cursor-pointer">Global</SelectItem>
        <SelectItem value="dossie" className="cursor-pointer">Dossiê</SelectItem>
        
        <SelectItem value="melhorproduto" className="text-orange-400 font-semibold cursor-pointer" >Melhor Produto</SelectItem> */}
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;