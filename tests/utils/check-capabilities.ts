#!/usr/bin/env tsx
/**
 * Standalone script to check environment capabilities
 * Run with: npx tsx tests/utils/check-capabilities.ts
 */

import {
  canSpawnServers,
  canBindHttpServer,
  hasWorkerAPI,
  hasImportMetaUrl,
  isCloudIDE,
  hasBrowserAutomation,
  canRunIntegrationTests,
  canRunE2ETests,
  getCapabilitiesSummary,
} from './env-capabilities.js';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Environment Capabilities Detection Report          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const summary = await getCapabilitiesSummary();

  console.log('📊 Capability Summary:');
  console.log('─'.repeat(60));

  const capabilities = [
    { name: 'Spawn Servers (stdio)', key: 'canSpawnServers', icon: '🚀' },
    { name: 'Bind HTTP Server', key: 'canBindHttpServer', icon: '🌐' },
    { name: 'Worker API', key: 'hasWorkerAPI', icon: '👷' },
    { name: 'import.meta.url', key: 'hasImportMetaUrl', icon: '📦' },
    { name: 'Browser Automation', key: 'hasBrowserAutomation', icon: '🤖' },
    { name: 'Cloud IDE Environment', key: 'isCloudIDE', icon: '☁️' },
  ];

  for (const cap of capabilities) {
    const value = summary[cap.key as keyof typeof summary];
    const status = value ? '✅ Yes' : '❌ No';
    console.log(`  ${cap.icon}  ${cap.name.padEnd(25)} ${status}`);
  }

  console.log('\n📋 Test Capability Summary:');
  console.log('─'.repeat(60));

  const testCapabilities = [
    { name: 'Integration Tests', key: 'canRunIntegrationTests', icon: '🔬' },
    { name: 'E2E Tests (basic)', key: 'canRunE2ETests', icon: '🎯' },
  ];

  for (const cap of testCapabilities) {
    const value = summary[cap.key as keyof typeof summary];
    const status = value ? '✅ Yes' : '❌ No';
    console.log(`  ${cap.icon}  ${cap.name.padEnd(25)} ${status}`);
  }

  // Check E2E with browser requirement separately
  const canE2EWithBrowser = await canRunE2ETests(true);
  const e2eBrowserStatus = canE2EWithBrowser ? '✅ Yes' : '❌ No';
  console.log(`  🎯  ${'E2E Tests (with browser)'.padEnd(25)} ${e2eBrowserStatus}`);

  console.log('\n🔍 Environment Analysis:');
  console.log('─'.repeat(60));

  if (summary.isCloudIDE) {
    console.log('  ℹ️  Detected cloud IDE environment');
    console.log('      Some tests may be automatically skipped');
  } else {
    console.log('  ℹ️  Local development environment detected');
    console.log('      All capable tests should run');
  }

  if (!summary.canSpawnServers) {
    console.log('  ⚠️  Cannot spawn servers - E2E tests will be skipped');
  }

  if (!summary.canBindHttpServer) {
    console.log('  ⚠️  Cannot bind HTTP server - Integration tests will be skipped');
  }

  if (!summary.hasWorkerAPI) {
    console.log('  ⚠️  Worker API unavailable - Browser tests will be skipped');
  }

  if (!summary.hasBrowserAutomation) {
    console.log('  ℹ️  Browser automation (Puppeteer/Playwright) not installed');
    console.log('      UI E2E tests will be skipped');
  }

  console.log('\n💡 Recommendations:');
  console.log('─'.repeat(60));

  if (summary.canRunIntegrationTests && summary.canRunE2ETests) {
    console.log('  ✨ This environment can run all tests!');
  } else {
    console.log('  📝 This environment has limited test capabilities.');
    console.log('     Tests requiring unavailable features will be automatically skipped.');
    console.log('     Run tests on your local machine for full test coverage.');
  }

  console.log('\n╚════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
