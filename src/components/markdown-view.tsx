import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} rel="noreferrer" target="_blank" />,
        }}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
