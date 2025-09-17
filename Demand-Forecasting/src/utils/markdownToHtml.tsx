// Simple markdown to HTML converter for AI insights
export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 mb-1">$2</li>')
    
    // Wrap lists in ul/ol tags
    .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc space-y-1 mb-3">$1</ul>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded text-sm overflow-x-auto mb-3"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
    
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br>')
    
    // Wrap in paragraph tags
    .replace(/^(.+)$/gm, '<p class="mb-2">$1</p>')
    
    // Clean up empty paragraphs
    .replace(/<p class="mb-2"><\/p>/g, '')
    .replace(/<p class="mb-2"><br><\/p>/g, '')
    
    // Clean up multiple consecutive breaks
    .replace(/(<br>)+/g, '<br>')
    
    // Final cleanup
    .trim();
};

// Component to render markdown as HTML
export const MarkdownRenderer = ({ content }: { content: string }) => {
  const htmlContent = markdownToHtml(content);
  
  return (
    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
};
