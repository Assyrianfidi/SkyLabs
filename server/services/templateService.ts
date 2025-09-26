import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TemplateService {
  private templateCache: Map<string, string> = new Map();
  private templateDir: string;

  constructor() {
    this.templateDir = path.join(__dirname, '../templates');
  }

  /**
   * Load a template from file or cache
   */
  private async loadTemplate(templateName: string): Promise<string> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load from file
    try {
      const templatePath = path.join(this.templateDir, templateName);
      const content = await fs.readFile(templatePath, 'utf-8');
      
      // Cache the template
      this.templateCache.set(templateName, content);
      return content;
    } catch (error) {
      console.error(`Failed to load template: ${templateName}`, error);
      throw new Error(`Template '${templateName}' not found or inaccessible`);
    }
  }

  /**
   * Render a template with the provided data
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering with support for conditionals and loops
    let result = template;
    
    // Replace variables: {{variable}}
    result = result.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => 
        obj && obj[k.trim()] !== undefined ? obj[k.trim()] : '', 
        data
      );
      return value !== undefined ? String(value) : match;
    });

    // Handle if conditions: {{#if condition}}...{{/if}}
    result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      const conditionValue = condition.split('.').reduce((obj: any, k: string) => 
        obj && obj[k.trim()] !== undefined ? obj[k.trim()] : false, 
        data
      );
      return conditionValue ? content : '';
    });

    return result;
  }

  /**
   * Render an email template with the provided data
   */
  public async renderEmail(templateName: string, data: Record<string, any>): Promise<{ html: string; text: string }> {
    try {
      // Add common data
      const templateData = {
        ...data,
        siteName: process.env.SITE_NAME || 'SkyLabs',
        currentYear: new Date().getFullYear(),
        submittedAt: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      };

      // Load and render the HTML template
      const htmlTemplate = await this.loadTemplate(`${templateName}.html`);
      const html = this.renderTemplate(htmlTemplate, templateData);
      
      // Create a simple text version
      const text = this.htmlToText(html);
      
      return { html, text };
    } catch (error) {
      console.error('Error rendering email template:', error);
      throw new Error('Failed to render email template');
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
      .replace(/<[^>]+>/g, '\n') // Replace tags with newlines
      .replace(/\s*\n\s*/g, '\n') // Clean up newlines
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&[a-z]+;/g, '') // Remove other HTML entities
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim();
  }
}

// Export a singleton instance
export const templateService = new TemplateService();
