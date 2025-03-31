export interface Snippet {
  id: string;
  name: string;
  command: string;
  content?: string;
  description?: string;
  tags: string[];
  runOnConnect: boolean;
  hostIds: string[]; // Hosts this snippet is associated with
  createdAt: string;
  updatedAt: string;
  runCount?: number;
  lastRun?: string;
  category?: string;
  isTemplate?: boolean;
  variables?: SnippetVariable[];
}

export interface SnippetVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'boolean' | 'select';
  options?: string[]; // For select type
}
