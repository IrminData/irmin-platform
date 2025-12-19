/**
 * Template placeholder structure
 */
interface TemplatePlaceholder {
  name: string;
  example: string;
}

/**
 * Template type definition
 */
type TemplateType = 'query' | 'script';

/**
 * Template language definition
 */
type TemplateLanguage = 'sql' | 'go';

/**
 * Template structure
 */
export interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  type: TemplateType;
  language: TemplateLanguage;
  tags: string[];
  placeholders: TemplatePlaceholder[];
}
