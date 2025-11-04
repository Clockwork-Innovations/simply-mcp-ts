/**
 * IUI v4.0 Example: Folder-based UI
 *
 * Point to a folder containing index.html and assets.
 * Perfect for static sites, multi-page apps, or complex UIs.
 */

import { InterfaceServer, IUI } from '../../src/index.js';

const server = new InterfaceServer({
  name: 'folder-ui-server',
  version: '1.0.0',
});

/**
 * Complete Dashboard from Folder
 *
 * Points to a folder with:
 * - index.html (entry point)
 * - styles.css (optional)
 * - script.js (optional)
 * - assets/ (optional)
 */
interface CompleteDashboard extends IUI {
  uri: 'ui://complete-dashboard';
  name: 'Complete Dashboard';
  description: 'Full-featured dashboard from folder';

  // Folder source - framework looks for index.html
  // Trailing slash indicates this is a folder
  source: './ui/dashboard/';

  // The folder structure might look like:
  // ui/dashboard/
  //   index.html
  //   styles.css
  //   script.js
  //   assets/
  //     logo.png
  //     chart-data.json
}

/**
 * Multi-page Application
 *
 * Folder with multiple HTML pages
 */
interface MultiPageApp extends IUI {
  uri: 'ui://app';
  name: 'Multi-page App';
  description: 'Application with multiple views';

  source: './ui/app/';

  // The app folder might contain:
  // ui/app/
  //   index.html (landing page)
  //   dashboard.html
  //   settings.html
  //   shared/
  //     header.html
  //     footer.html
  //   css/
  //     main.css
  //   js/
  //     app.js
}

export default server;
