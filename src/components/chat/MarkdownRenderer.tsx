import React, { useMemo } from 'react';

interface MarkdownRendererProps {
  text: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ text }) => {
  const renderInlineMarkdown = useMemo(() => {
    return (content: string): React.ReactNode => {
      // Negrito (**texto**)
      const result: React.ReactNode[] = [];
      let lastIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        // Adiciona o texto antes do match
        if (match.index > lastIndex) {
          result.push(content.substring(lastIndex, match.index));
        }
        // Adiciona o negrito
        result.push(<strong key={match.index} className="font-bold">{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }

      // Adiciona o texto restante
      if (lastIndex < content.length) {
        result.push(content.substring(lastIndex));
      }

      // Se não houver nenhum match, retorna o texto original
      return result.length > 0 ? result : content;
    };
  }, []);

  const rendered = useMemo(() => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Títulos (## Título)
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-900">
            {renderInlineMarkdown(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }

      // Títulos (# Título)
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900">
            {renderInlineMarkdown(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // Listas (- item ou * item)
      if (line.match(/^[-*]\s/)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].trim().match(/^[-*]\s/)) {
          const itemText = lines[i].trim().slice(2);
          listItems.push(
            <li key={i} className="ml-4 mb-1">
              {renderInlineMarkdown(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`list-${i}`} className="list-disc list-inside my-2 space-y-1">
            {listItems}
          </ul>
        );
        continue;
      }

      // Listas numeradas (1. item)
      if (line.match(/^\d+\.\s/)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
          const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
          listItems.push(
            <li key={i} className="ml-4 mb-1">
              {renderInlineMarkdown(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ol key={`list-${i}`} className="list-decimal list-inside my-2 space-y-1">
            {listItems}
          </ol>
        );
        continue;
      }

      // Linha vazia
      if (line === '') {
        elements.push(<br key={i} />);
        i++;
        continue;
      }

      // Parágrafo normal
      elements.push(
        <p key={i} className="my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
      i++;
    }

    return <div className="markdown-content">{elements}</div>;
  }, [text, renderInlineMarkdown]);

  return <>{rendered}</>;
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
