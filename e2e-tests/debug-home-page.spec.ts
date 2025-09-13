import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';

test('debug home page components', async ({ page }) => {
  // Listen for console logs
  const logs: string[] = [];
  page.on('console', msg => {
    const logText = `[${msg.type()}] ${msg.text()}`;
    console.log(logText);
    logs.push(logText);
  });

  // Navigate to the home page
  console.log(`Navigating to ${TEST_URL}`);
  await page.goto(TEST_URL, { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Check if Contact component is in the React component tree
  const reactComponents = await page.evaluate(() => {
    // This will only work if React DevTools are available in the test environment
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const devTools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      const roots = devTools.renderers.get(1)?.version ? 
        [devTools.renderers.get(1)] : 
        Array.from(devTools.renderers.values());
      
      const findComponent = (node: any, name: string): any => {
        if (!node) return null;
        if (node.name === name) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findComponent(child, name);
            if (found) return found;
          }
        }
        return null;
      };

      const results = [];
      for (const root of roots) {
        const fiberRoot = root.version === 18 ? 
          root.findFiberByHostInstance(document.documentElement)?.return :
          root.findFiberByHostInstance?.(document.documentElement)?.return;
        
        if (fiberRoot) {
          const contactComponent = findComponent(fiberRoot, 'Contact');
          if (contactComponent) {
            results.push({
              type: 'Contact component found in React tree',
              props: contactComponent.memoizedProps,
              state: contactComponent.memoizedState
            });
          }
        }
      }
      return results.length > 0 ? results : 'React DevTools not available or component not found';
    }
    return 'React DevTools not available';
  });

  console.log('React component check:', JSON.stringify(reactComponents, null, 2));
  
  // Check for the Contact component's rendered output
  console.log('Checking for Contact component output...');
  const contactElements = await page.evaluate(() => {
    // Look for elements that might be part of the contact form
    const elements = [];
    
    // Check for form elements
    const forms = Array.from(document.querySelectorAll('form'));
    forms.forEach((form, i) => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, button'));
      elements.push({
        type: 'form',
        index: i,
        id: form.id || null,
        className: form.className || null,
        action: form.getAttribute('action') || null,
        method: form.getAttribute('method') || null,
        inputs: inputs.map(input => ({
          tag: input.tagName,
          type: input.getAttribute('type') || 'N/A',
          name: input.getAttribute('name') || 'N/A',
          id: input.id || null,
          className: input.className || null,
          placeholder: input.getAttribute('placeholder') || null
        }))
      });
    });

    // Check for contact-related sections
    const sections = Array.from(document.querySelectorAll('section'));
    sections.forEach((section, i) => {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
      const text = section.textContent?.trim().substring(0, 100) + '...';
      elements.push({
        type: 'section',
        index: i,
        heading: heading?.textContent?.trim() || 'No heading',
        text: text,
        id: section.id || null,
        className: section.className || null
      });
    });

    return elements;
  });

  console.log('Contact-related elements found:', JSON.stringify(contactElements, null, 2));
  
  // Take a screenshot of the full page
  await page.screenshot({ path: 'debug-home-page.png', fullPage: true });
  console.log('Screenshot saved as debug-home-page.png');
  
  // Save all the collected information to a file
  const debugInfo = {
    url: await page.url(),
    title: await page.title(),
    consoleLogs: logs,
    reactComponents,
    contactElements
  };
  
  const fs = require('fs');
  const path = require('path');
  const debugPath = path.join(__dirname, 'debug-output.json');
  fs.writeFileSync(debugPath, JSON.stringify(debugInfo, null, 2));
  console.log(`Debug information saved to: ${debugPath}`);
  
  // Intentionally fail to show all the collected information
  expect(contactElements.length).toBeGreaterThan(0);
});
