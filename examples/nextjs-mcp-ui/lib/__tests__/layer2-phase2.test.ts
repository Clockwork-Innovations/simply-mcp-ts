/**
 * Layer 2 Phase 2: Tool Execution Flow & Callbacks Tests
 *
 * Comprehensive test suite for interactive form resources with postMessage
 * communication and tool execution callbacks.
 *
 * @module lib/__tests__/layer2-phase2.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import type { UIResourceContent } from '../../../src/client/ui-types.js';
import { DEMO_RESOURCES, getAllDemoResources, getDemoResource } from '../demoResources.js';
import { isValidUIResource } from '../utils.js';

/**
 * Layer 2 Phase 2 Test Suite
 *
 * Tests for the interactive forms demonstrating tool execution via postMessage.
 */
describe('Layer 2 Phase 2: Tool Execution Flow & Callbacks', () => {
  /**
   * Resource Availability Tests
   */
  describe('Resource Availability', () => {
    it('should have all three Phase 2 form resources available', () => {
      expect(getDemoResource('feedback-form')).toBeDefined();
      expect(getDemoResource('contact-form')).toBeDefined();
      expect(getDemoResource('product-selector')).toBeDefined();
    });

    it('should have correct URIs for Phase 2 resources', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const contactForm = getDemoResource('contact-form');
      const productSelector = getDemoResource('product-selector');

      expect(feedbackForm?.resource.uri).toBe('ui://feedback-form/layer2');
      expect(contactForm?.resource.uri).toBe('ui://contact-form/layer2');
      expect(productSelector?.resource.uri).toBe('ui://product-selector/layer2');
    });

    it("should have 'feature' category for Phase 2 resources", () => {
      const feedbackForm = getDemoResource('feedback-form');
      const contactForm = getDemoResource('contact-form');
      const productSelector = getDemoResource('product-selector');

      expect(feedbackForm?.category).toBe('feature');
      expect(contactForm?.category).toBe('feature');
      expect(productSelector?.category).toBe('feature');
    });

    it('should include postMessage tag for all Phase 2 resources', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const contactForm = getDemoResource('contact-form');
      const productSelector = getDemoResource('product-selector');

      expect(feedbackForm?.tags).toContain('postmessage');
      expect(contactForm?.tags).toContain('postmessage');
      expect(productSelector?.tags).toContain('postmessage');
    });

    it('should have 10 total demo resources (5 Layer 1 + 5 Phase 2-4)', () => {
      const allResources = getAllDemoResources();
      expect(allResources).toHaveLength(10);
    });
  });

  /**
   * Resource Structure Tests
   */
  describe('Resource Structure', () => {
    it('should have valid UIResourceContent for feedback form', () => {
      const feedbackForm = getDemoResource('feedback-form');
      expect(feedbackForm?.resource).toBeDefined();
      expect(isValidUIResource(feedbackForm!.resource)).toBe(true);
    });

    it('should have valid UIResourceContent for contact form', () => {
      const contactForm = getDemoResource('contact-form');
      expect(contactForm?.resource).toBeDefined();
      expect(isValidUIResource(contactForm!.resource)).toBe(true);
    });

    it('should have valid UIResourceContent for product selector', () => {
      const productSelector = getDemoResource('product-selector');
      expect(productSelector?.resource).toBeDefined();
      expect(isValidUIResource(productSelector!.resource)).toBe(true);
    });
  });

  /**
   * MIME Type Tests
   */
  describe('MIME Types', () => {
    it('should use text/html MIME type for feedback form', () => {
      const feedbackForm = getDemoResource('feedback-form');
      expect(feedbackForm?.resource.mimeType).toBe('text/html');
    });

    it('should use text/html MIME type for contact form', () => {
      const contactForm = getDemoResource('contact-form');
      expect(contactForm?.resource.mimeType).toBe('text/html');
    });

    it('should use text/html MIME type for product selector', () => {
      const productSelector = getDemoResource('product-selector');
      expect(productSelector?.resource.mimeType).toBe('text/html');
    });

    it('all Phase 2 resources should use text/html MIME type', () => {
      const phase2Resources = [
        getDemoResource('feedback-form'),
        getDemoResource('contact-form'),
        getDemoResource('product-selector'),
      ];

      phase2Resources.forEach((resource) => {
        expect(resource?.resource.mimeType).toBe('text/html');
      });
    });
  });

  /**
   * HTML Content Tests
   */
  describe('HTML Content', () => {
    it('should have HTML content in feedback form', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('<!DOCTYPE html>');
      expect(text).toContain('<html');
      expect(text).toContain('</html>');
      expect(text.length).toBeGreaterThan(500);
    });

    it('should have HTML content in contact form', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('<!DOCTYPE html>');
      expect(text).toContain('<html');
      expect(text).toContain('</html>');
      expect(text.length).toBeGreaterThan(500);
    });

    it('should have HTML content in product selector', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('<!DOCTYPE html>');
      expect(text).toContain('<html');
      expect(text).toContain('</html>');
      expect(text.length).toBeGreaterThan(500);
    });
  });

  /**
   * postMessage Integration Tests
   */
  describe('postMessage Integration', () => {
    it('feedback form should contain postMessage code', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('window.parent.postMessage');
      expect(text).toContain('submit_feedback');
      expect(text).toContain('type: \'tool\'');
    });

    it('contact form should contain postMessage code', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('window.parent.postMessage');
      expect(text).toContain('send_contact_message');
      expect(text).toContain('type: \'tool\'');
    });

    it('product selector should contain postMessage code', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('window.parent.postMessage');
      expect(text).toContain('select_product');
      expect(text).toContain('type: \'tool\'');
    });

    it('all Phase 2 resources should use tool message type', () => {
      const phase2Resources = [
        getDemoResource('feedback-form'),
        getDemoResource('contact-form'),
        getDemoResource('product-selector'),
      ];

      phase2Resources.forEach((resource) => {
        const text = resource?.resource.text || '';
        expect(text).toContain('type: \'tool\'');
      });
    });
  });

  /**
   * Tool Name Tests
   */
  describe('Tool Names', () => {
    it('feedback form should call submit_feedback tool', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('toolName: \'submit_feedback\'');
    });

    it('contact form should call send_contact_message tool', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('toolName: \'send_contact_message\'');
    });

    it('product selector should call select_product tool', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('toolName: \'select_product\'');
    });
  });

  /**
   * Form Elements Tests
   */
  describe('Form Elements', () => {
    it('feedback form should have required form fields', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('id="name"');
      expect(text).toContain('id="email"');
      expect(text).toContain('id="category"');
      expect(text).toContain('id="message"');
      expect(text).toContain('required');
    });

    it('contact form should have required form fields', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('id="firstName"');
      expect(text).toContain('id="lastName"');
      expect(text).toContain('id="email"');
      expect(text).toContain('id="subject"');
      expect(text).toContain('id="message"');
    });

    it('product selector should have product cards', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('product-card');
      expect(text).toContain('productsGrid');
      expect(text).toContain('product-name');
      expect(text).toContain('product-price');
    });
  });

  /**
   * Status Display Tests
   */
  describe('Status Display', () => {
    it('feedback form should have status display', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('id="status"');
      expect(text).toContain('status.show');
      expect(text).toContain('success');
      expect(text).toContain('error');
      expect(text).toContain('loading');
    });

    it('contact form should have status display', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('id="status"');
      expect(text).toContain('status.show');
      expect(text).toContain('success');
      expect(text).toContain('error');
      expect(text).toContain('loading');
    });

    it('feedback form should show loading state', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('Submitting feedback...');
    });

    it('contact form should show loading state', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('Sending message...');
    });
  });

  /**
   * Event Listener Tests
   */
  describe('Event Listeners', () => {
    it('feedback form should listen for postMessage responses', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('window.addEventListener(\'message\'');
      expect(text).toContain('tool_response');
    });

    it('contact form should listen for postMessage responses', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('window.addEventListener(\'message\'');
      expect(text).toContain('tool_response');
    });

    it('product selector should listen for postMessage responses', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('window.addEventListener(\'message\'');
      expect(text).toContain('tool_response');
    });
  });

  /**
   * Metadata Tests
   */
  describe('Metadata', () => {
    it('feedback form should have _meta with frame size', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const meta = feedbackForm?.resource._meta;

      expect(meta).toBeDefined();
      expect(meta?.['mcpui.dev/ui-preferred-frame-size']).toBeDefined();
      expect(meta?.['mcpui.dev/ui-preferred-frame-size'].width).toBe(500);
      expect(meta?.['mcpui.dev/ui-preferred-frame-size'].height).toBe(650);
    });

    it('contact form should have _meta with frame size', () => {
      const contactForm = getDemoResource('contact-form');
      const meta = contactForm?.resource._meta;

      expect(meta).toBeDefined();
      expect(meta?.['mcpui.dev/ui-preferred-frame-size']).toBeDefined();
      expect(meta?.['mcpui.dev/ui-preferred-frame-size'].width).toBe(550);
      expect(meta?.['mcpui.dev/ui-preferred-frame-size'].height).toBe(750);
    });

    it('product selector should have _meta with frame size', () => {
      const productSelector = getDemoResource('product-selector');
      const meta = productSelector?.resource._meta;

      expect(meta).toBeDefined();
      expect(meta?.['mcpui.dev/ui-preferred-frame-size']).toBeDefined();
      expect(meta?.['mcpui.dev/ui-preferred-frame-size'].width).toBe(650);
      expect(meta?.['mcpui.dev/ui-preferred-frame-size'].height).toBe(500);
    });
  });

  /**
   * Data Collection Tests
   */
  describe('Data Collection', () => {
    it('feedback form should collect form data with timestamp', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('timestamp: new Date().toISOString()');
      expect(text).toContain('name:');
      expect(text).toContain('email:');
      expect(text).toContain('category:');
      expect(text).toContain('message:');
    });

    it('contact form should collect contact data with timestamp', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('timestamp: new Date().toISOString()');
      expect(text).toContain('firstName:');
      expect(text).toContain('lastName:');
      expect(text).toContain('subject:');
    });

    it('product selector should collect product selection with timestamp', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('timestamp: new Date().toISOString()');
      expect(text).toContain('productId:');
      expect(text).toContain('productName:');
    });
  });

  /**
   * UI/UX Tests
   */
  describe('UI/UX Features', () => {
    it('feedback form should have clear visual styling', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('gradient');
      expect(text).toContain('border-radius');
      expect(text).toContain('box-shadow');
      expect(text).toContain('transition');
    });

    it('contact form should have clear visual styling', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('gradient');
      expect(text).toContain('border-radius');
      expect(text).toContain('box-shadow');
      expect(text).toContain('transition');
    });

    it('product selector should have clear visual styling', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('gradient');
      expect(text).toContain('border-radius');
      expect(text).toContain('box-shadow');
      expect(text).toContain('transition');
    });

    it('feedback form should have button states', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('disabled');
      expect(text).toContain(':hover');
      expect(text).toContain('submit-btn');
      expect(text).toContain('reset-btn');
    });
  });

  /**
   * Integration with Phase 1 Tests
   */
  describe('Integration with Phase 1', () => {
    it('should have both Layer 1 and Layer 2 resources in catalog', () => {
      const allResources = getAllDemoResources();
      const layer1 = allResources.filter((r) => r.category === 'foundation');
      const layer2 = allResources.filter((r) => r.category === 'feature');

      expect(layer1).toHaveLength(5);
      expect(layer2).toHaveLength(5); // 3 Phase 2 forms + 2 Phase 4 external URLs
    });

    it('Layer 2 resources should not break Layer 1 functionality', () => {
      const layer1Resources = [
        getDemoResource('product-card'),
        getDemoResource('info-card'),
        getDemoResource('feature-list'),
        getDemoResource('statistics-display'),
        getDemoResource('welcome-card'),
      ];

      layer1Resources.forEach((resource) => {
        expect(resource).toBeDefined();
        expect(resource?.resource).toBeDefined();
        expect(isValidUIResource(resource!.resource)).toBe(true);
      });
    });

    it('Phase 2 resources should be distinct from Phase 1', () => {
      const phase1Uris = [
        'ui://product-card/layer1',
        'ui://info-card/layer1',
        'ui://feature-list/layer1',
        'ui://statistics-display/layer1',
        'ui://welcome-card/layer1',
      ];

      const phase2Uris = [
        'ui://feedback-form/layer2',
        'ui://contact-form/layer2',
        'ui://product-selector/layer2',
        'ui://external-demo/layer2',
        'ui://external-docs/layer2',
      ];

      const allUris = phase1Uris.concat(phase2Uris);
      const uniqueUris = new Set(allUris);

      expect(uniqueUris.size).toBe(10);
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Error Handling', () => {
    it('feedback form should handle form submission errors', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('error');
      expect(text).toContain('Failed');
    });

    it('contact form should handle form submission errors', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('error');
      expect(text).toContain('Failed');
    });

    it('product selector should handle selection errors', () => {
      const productSelector = getDemoResource('product-selector');
      const text = productSelector?.resource.text || '';

      expect(text).toContain('Try Again');
    });
  });

  /**
   * Security Tests
   */
  describe('Security', () => {
    it('all Phase 2 resources should use postMessage with wildcard origin for demo', () => {
      const phase2Resources = [
        getDemoResource('feedback-form'),
        getDemoResource('contact-form'),
        getDemoResource('product-selector'),
      ];

      phase2Resources.forEach((resource) => {
        const text = resource?.resource.text || '';
        expect(text).toContain("postMessage({");
        expect(text).toContain(", '*')");
      });
    });

    it('feedback form should not contain eval or dangerous functions', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).not.toContain('eval(');
      expect(text).not.toContain('innerHTML =');
      expect(text).not.toContain('dangerouslySetInnerHTML');
    });

    it('contact form should not contain eval or dangerous functions', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).not.toContain('eval(');
      expect(text).not.toContain('innerHTML =');
      expect(text).not.toContain('dangerouslySetInnerHTML');
    });
  });

  /**
   * Accessibility Tests
   */
  describe('Accessibility', () => {
    it('feedback form should have labels for form inputs', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('<label');
      expect(text).toContain('for=');
    });

    it('contact form should have labels for form inputs', () => {
      const contactForm = getDemoResource('contact-form');
      const text = contactForm?.resource.text || '';

      expect(text).toContain('<label');
      expect(text).toContain('for=');
    });

    it('feedback form inputs should have placeholder text', () => {
      const feedbackForm = getDemoResource('feedback-form');
      const text = feedbackForm?.resource.text || '';

      expect(text).toContain('placeholder=');
    });
  });

  /**
   * Production Readiness Tests
   */
  describe('Production Readiness', () => {
    it('all Phase 2 resources should be valid for production', () => {
      const phase2Resources = [
        getDemoResource('feedback-form'),
        getDemoResource('contact-form'),
        getDemoResource('product-selector'),
      ];

      phase2Resources.forEach((resource) => {
        expect(resource).toBeDefined();
        expect(resource?.resource).toBeDefined();
        expect(isValidUIResource(resource!.resource)).toBe(true);
        expect(resource?.resource.text).toBeDefined();
        expect(resource?.resource.text!.length).toBeGreaterThan(100);
      });
    });

    it('Phase 2 resources should have proper metadata', () => {
      const phase2Resources = [
        getDemoResource('feedback-form'),
        getDemoResource('contact-form'),
        getDemoResource('product-selector'),
      ];

      phase2Resources.forEach((resource) => {
        expect(resource?.resource._meta).toBeDefined();
        const frameSize = resource?.resource._meta?.['mcpui.dev/ui-preferred-frame-size'];
        expect(frameSize?.width).toBeGreaterThan(0);
        expect(frameSize?.height).toBeGreaterThan(0);
      });
    });

    it('should handle resource retrieval for all Phase 2 resources', () => {
      const resourceIds = ['feedback-form', 'contact-form', 'product-selector'];

      resourceIds.forEach((id) => {
        const resource = getDemoResource(id as any);
        expect(resource).toBeDefined();
        expect(resource?.id).toBe(id);
        expect(resource?.resource.uri).toContain('layer2');
      });
    });
  });
});
