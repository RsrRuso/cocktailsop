export type WebRoute = {
  /** Unique id for list rendering */
  id: string;
  /** Human label for the route */
  label: string;
  /** Web path template (may include :params) */
  pathTemplate: string;
  /** Group name in the UI */
  group: string;
};

// This list is derived from the web router (`src/App.tsx`) and tracked in `NATIVE_REWRITE_PLAN.md`.
// During migration each entry becomes either:
// - a true native screen OR
// - a WebView fallback (this list guarantees nothing is missing).
export const WEB_ROUTES: WebRoute[] = [
  // Core
  { id: 'root', label: 'Index', pathTemplate: '/', group: 'Core' },
  { id: 'landing', label: 'Landing', pathTemplate: '/landing', group: 'Core' },
  { id: 'auth', label: 'Auth (web)', pathTemplate: '/auth', group: 'Core' },
  { id: 'password-reset', label: 'Password reset (web)', pathTemplate: '/password-reset', group: 'Core' },

  // Social
  { id: 'home', label: 'Home', pathTemplate: '/home', group: 'Social' },
  { id: 'explore', label: 'Explore', pathTemplate: '/explore', group: 'Social' },
  { id: 'create', label: 'Create', pathTemplate: '/create', group: 'Social' },
  { id: 'reels', label: 'Reels', pathTemplate: '/reels', group: 'Social' },
  { id: 'messages', label: 'Messages', pathTemplate: '/messages', group: 'Social' },
  { id: 'message-thread', label: 'Message thread', pathTemplate: '/messages/:conversationId', group: 'Social' },
  { id: 'profile', label: 'My profile', pathTemplate: '/profile', group: 'Social' },
  { id: 'user-profile', label: 'User profile', pathTemplate: '/user/:userId', group: 'Social' },
  { id: 'profile-edit', label: 'Edit profile', pathTemplate: '/profile/edit', group: 'Social' },
  { id: 'profile-growth', label: 'Profile growth', pathTemplate: '/profile/growth', group: 'Social' },
  { id: 'post-detail', label: 'Post detail', pathTemplate: '/post/:id', group: 'Social' },
  { id: 'edit-post', label: 'Edit post', pathTemplate: '/edit-post/:id', group: 'Social' },
  { id: 'edit-reel', label: 'Edit reel', pathTemplate: '/edit-reel/:id', group: 'Social' },
  { id: 'notifications', label: 'Notifications', pathTemplate: '/notifications', group: 'Social' },
  { id: 'event-detail', label: 'Event detail', pathTemplate: '/event/:id', group: 'Social' },
  { id: 'story-options', label: 'Story options', pathTemplate: '/story-options', group: 'Social' },
  { id: 'story-viewer', label: 'Story viewer', pathTemplate: '/story/:userId', group: 'Social' },
  { id: 'reposted', label: 'Reposted', pathTemplate: '/reposted', group: 'Social' },

  // Create/media/editor
  { id: 'create-post', label: 'Create post', pathTemplate: '/create/post', group: 'Create & Media' },
  { id: 'create-story', label: 'Create story', pathTemplate: '/create/story', group: 'Create & Media' },
  { id: 'create-reel', label: 'Create reel', pathTemplate: '/create/reel', group: 'Create & Media' },
  { id: 'reel-editor', label: 'Reel editor', pathTemplate: '/reel-editor', group: 'Create & Media' },
  { id: 'reel-editor-pro', label: 'Reel editor pro', pathTemplate: '/reel-editor-pro', group: 'Create & Media' },
  { id: 'advanced-editor', label: 'Advanced editor', pathTemplate: '/advanced-editor', group: 'Create & Media' },
  { id: 'studio', label: 'Studio', pathTemplate: '/studio', group: 'Create & Media' },
  { id: 'studio-draft', label: 'Studio draft', pathTemplate: '/studio/:draftId', group: 'Create & Media' },
  { id: 'drafts', label: 'Drafts', pathTemplate: '/drafts', group: 'Create & Media' },
  { id: 'publish', label: 'Publish draft', pathTemplate: '/publish/:draftId', group: 'Create & Media' },
  { id: 'uploads', label: 'Uploads', pathTemplate: '/uploads', group: 'Create & Media' },
  { id: 'approvals', label: 'Approvals', pathTemplate: '/approvals', group: 'Create & Media' },
  { id: 'venue-approvals', label: 'Venue approvals', pathTemplate: '/venue/:venueId/approvals', group: 'Create & Media' },
  { id: 'moderation', label: 'Moderation', pathTemplate: '/moderation', group: 'Create & Media' },
  { id: 'post-analytics', label: 'Post analytics', pathTemplate: '/analytics/post/:postId', group: 'Create & Media' },
  { id: 'reel-analytics', label: 'Reel analytics', pathTemplate: '/analytics/reel/:reelId', group: 'Create & Media' },

  // Ops hubs / tools
  { id: 'tools', label: 'Tools', pathTemplate: '/tools', group: 'Ops & Admin' },
  { id: 'ops-tools', label: 'Ops tools', pathTemplate: '/ops-tools', group: 'Ops & Admin' },
  { id: 'business-hub', label: 'Business hub', pathTemplate: '/business-hub', group: 'Ops & Admin' },
  { id: 'task-manager', label: 'Task manager', pathTemplate: '/task-manager', group: 'Ops & Admin' },
  { id: 'team-management', label: 'Team management', pathTemplate: '/team-management', group: 'Ops & Admin' },
  { id: 'team-dashboard', label: 'Team dashboard', pathTemplate: '/team-dashboard', group: 'Ops & Admin' },
  { id: 'team-invitation', label: 'Team invitation', pathTemplate: '/team-invitation', group: 'Ops & Admin' },
  { id: 'automations', label: 'Automations', pathTemplate: '/automations', group: 'Ops & Admin' },
  { id: 'ai-credits', label: 'AI credits', pathTemplate: '/ai-credits', group: 'Ops & Admin' },
  { id: 'matrix-ai', label: 'Matrix AI', pathTemplate: '/matrix-ai', group: 'Ops & Admin' },

  // Inventory / store management
  { id: 'inventory-manager', label: 'Inventory manager', pathTemplate: '/inventory-manager', group: 'Inventory' },
  { id: 'store-management', label: 'Store management', pathTemplate: '/store-management', group: 'Inventory' },
  { id: 'store-detail', label: 'Store detail', pathTemplate: '/store/:id', group: 'Inventory' },
  { id: 'all-inventory', label: 'All inventory', pathTemplate: '/all-inventory', group: 'Inventory' },
  { id: 'inventory-transactions', label: 'Inventory transactions', pathTemplate: '/inventory-transactions', group: 'Inventory' },
  { id: 'stores-admin', label: 'Stores admin', pathTemplate: '/stores-admin', group: 'Inventory' },
  { id: 'master-items', label: 'Master items', pathTemplate: '/master-items', group: 'Inventory' },
  { id: 'workspace-management', label: 'Workspace management', pathTemplate: '/workspace-management', group: 'Inventory' },
  { id: 'low-stock', label: 'Low stock inventory', pathTemplate: '/low-stock-inventory/:workspaceId', group: 'Inventory' },

  // FIFO / access / QR / transfers
  { id: 'qr-access-code', label: 'QR access code', pathTemplate: '/qr-access-code', group: 'FIFO & Access' },
  { id: 'scan-access', label: 'Scan access', pathTemplate: '/scan-access/:workspaceId', group: 'FIFO & Access' },
  { id: 'access-approval', label: 'Access approval', pathTemplate: '/access-approval', group: 'FIFO & Access' },
  { id: 'fifo-workspace-mgmt', label: 'FIFO workspace management', pathTemplate: '/fifo-workspace-management', group: 'FIFO & Access' },
  { id: 'fifo-qr', label: 'FIFO QR access', pathTemplate: '/fifo-qr-access-code', group: 'FIFO & Access' },
  { id: 'fifo-scan', label: 'FIFO scan access', pathTemplate: '/fifo-scan-access/:qrCodeId', group: 'FIFO & Access' },
  { id: 'fifo-approval', label: 'FIFO access approval', pathTemplate: '/fifo-access-approval', group: 'FIFO & Access' },
  { id: 'fifo-request', label: 'FIFO request access', pathTemplate: '/fifo-request-access', group: 'FIFO & Access' },
  { id: 'fifo-approval-page', label: 'FIFO approval page', pathTemplate: '/fifo-access-approval-page', group: 'FIFO & Access' },
  { id: 'fifo-pin', label: 'FIFO pin access', pathTemplate: '/fifo-pin-access', group: 'FIFO & Access' },
  { id: 'fifo-activity', label: 'FIFO activity log', pathTemplate: '/fifo-activity-log', group: 'FIFO & Access' },
  { id: 'fifo-guide', label: 'FIFO user guide', pathTemplate: '/fifo-user-guide', group: 'FIFO & Access' },
  { id: 'transfer-qr', label: 'Transfer QR generator', pathTemplate: '/transfer-qr', group: 'FIFO & Access' },
  { id: 'scan-transfer', label: 'Scan transfer', pathTemplate: '/scan-transfer/:qrCodeId', group: 'FIFO & Access' },
  { id: 'scan-receive', label: 'Scan receive', pathTemplate: '/scan-receive/:qrCodeId', group: 'FIFO & Access' },

  // Batch / calculators
  { id: 'batch-calculator', label: 'Batch calculator', pathTemplate: '/batch-calculator', group: 'Batch & Calculators' },
  { id: 'batch-pin', label: 'Batch calculator pin', pathTemplate: '/batch-calculator-pin-access', group: 'Batch & Calculators' },
  { id: 'batch-recipes', label: 'Batch recipes', pathTemplate: '/batch-recipes', group: 'Batch & Calculators' },
  { id: 'batch-qr-submit', label: 'Batch QR submit', pathTemplate: '/batch-qr/:qrId', group: 'Batch & Calculators' },
  { id: 'batch-view', label: 'Batch view', pathTemplate: '/batch-view/:productionId', group: 'Batch & Calculators' },
  { id: 'batch-activity', label: 'Batch activity', pathTemplate: '/batch-activity', group: 'Batch & Calculators' },
  { id: 'sub-recipes', label: 'Sub recipes', pathTemplate: '/sub-recipes', group: 'Batch & Calculators' },
  { id: 'master-spirits', label: 'Master spirits', pathTemplate: '/master-spirits', group: 'Batch & Calculators' },
  { id: 'abv', label: 'ABV calculator', pathTemplate: '/abv-calculator', group: 'Batch & Calculators' },
  { id: 'scaling', label: 'Scaling tool', pathTemplate: '/scaling-tool', group: 'Batch & Calculators' },
  { id: 'cost', label: 'Cost calculator', pathTemplate: '/cost-calculator', group: 'Batch & Calculators' },
  { id: 'yield', label: 'Yield calculator', pathTemplate: '/yield-calculator', group: 'Batch & Calculators' },

  // Procurement / PO
  { id: 'purchase-orders', label: 'Purchase orders', pathTemplate: '/purchase-orders', group: 'Procurement' },
  { id: 'po-master', label: 'PO master items', pathTemplate: '/po-master-items', group: 'Procurement' },
  { id: 'po-received', label: 'PO received items', pathTemplate: '/po-received-items', group: 'Procurement' },
  { id: 'procurement-pin', label: 'Procurement pin access', pathTemplate: '/procurement-pin-access', group: 'Procurement' },

  // Staff / POS / KDS / Lab Ops
  { id: 'staff-scheduling', label: 'Staff scheduling', pathTemplate: '/staff-scheduling', group: 'Staff & POS' },
  { id: 'staff-pos', label: 'Staff POS', pathTemplate: '/staff-pos', group: 'Staff & POS' },
  { id: 'staff-pos-print', label: 'Staff POS print', pathTemplate: '/staff-pos/print', group: 'Staff & POS' },
  { id: 'bar-kds', label: 'Bar KDS', pathTemplate: '/bar-kds', group: 'Staff & POS' },
  { id: 'kitchen-kds', label: 'Kitchen KDS', pathTemplate: '/kitchen-kds', group: 'Staff & POS' },
  { id: 'lab-ops', label: 'Lab Ops', pathTemplate: '/lab-ops', group: 'Staff & POS' },
  { id: 'lab-ops-promo', label: 'Lab Ops promo', pathTemplate: '/lab-ops-promo', group: 'Staff & POS' },
  { id: 'lab-ops-staff-pin', label: 'Lab Ops staff pin access', pathTemplate: '/lab-ops-staff-pin-access', group: 'Staff & POS' },
  { id: 'staff-install', label: 'Staff install', pathTemplate: '/staff-install', group: 'Staff & POS' },
  { id: 'staff-qr-access', label: 'Staff QR access', pathTemplate: '/staff-qr-access', group: 'Staff & POS' },

  // Reports
  { id: 'financial-reports', label: 'Financial reports hub', pathTemplate: '/financial-reports', group: 'Reports' },
  { id: 'r-pl', label: 'P&L report', pathTemplate: '/reports/profit-loss', group: 'Reports' },
  { id: 'r-daily-sales', label: 'Daily sales report', pathTemplate: '/reports/daily-sales', group: 'Reports' },
  { id: 'r-cash-flow', label: 'Cash flow report', pathTemplate: '/reports/cash-flow', group: 'Reports' },
  { id: 'r-cogs', label: 'COGS report', pathTemplate: '/reports/cogs', group: 'Reports' },
  { id: 'r-labor', label: 'Labor cost report', pathTemplate: '/reports/labor-cost', group: 'Reports' },
  { id: 'r-budget', label: 'Budget vs actual', pathTemplate: '/reports/budget-actual', group: 'Reports' },
  { id: 'r-stock-move', label: 'Stock movement report', pathTemplate: '/reports/stock-movement', group: 'Reports' },
  { id: 'r-revenue-cat', label: 'Revenue by category', pathTemplate: '/reports/revenue-category', group: 'Reports' },
  { id: 'r-breakeven', label: 'Breakeven report', pathTemplate: '/reports/breakeven', group: 'Reports' },
  { id: 'r-daily-ops', label: 'Daily ops report', pathTemplate: '/reports/daily-ops', group: 'Reports' },
  { id: 'sales-report', label: 'Sales report', pathTemplate: '/sales-report', group: 'Reports' },
  { id: 'inventory-valuation', label: 'Inventory valuation', pathTemplate: '/inventory-valuation-report', group: 'Reports' },
  { id: 'variance', label: 'Variance report', pathTemplate: '/variance-report', group: 'Reports' },
  { id: 'pour-cost', label: 'Pour cost analysis', pathTemplate: '/pour-cost-analysis', group: 'Reports' },
  { id: 'wastage', label: 'Wastage tracker', pathTemplate: '/wastage-tracker', group: 'Reports' },
  { id: 'menu-eng', label: 'Menu engineering', pathTemplate: '/menu-engineering', group: 'Reports' },
  { id: 'menu-eng-pro', label: 'Menu engineering pro', pathTemplate: '/menu-engineering-pro', group: 'Reports' },
  { id: 'stock-audit', label: 'Stock audit', pathTemplate: '/stock-audit', group: 'Reports' },

  // Maps / venues
  { id: 'map-planner', label: 'Map planner', pathTemplate: '/map-planner', group: 'Maps & Venues' },
  { id: 'map-live', label: 'Live map', pathTemplate: '/map', group: 'Maps & Venues' },
  { id: 'bar-intel', label: 'Bar intelligence map', pathTemplate: '/bar-intelligence', group: 'Maps & Venues' },
  { id: 'venue', label: 'Venue detail', pathTemplate: '/venue/:venueId', group: 'Maps & Venues' },
  { id: 'venue-register', label: 'Venue registration', pathTemplate: '/venue-register', group: 'Maps & Venues' },
  { id: 'venue-dashboard', label: 'Venue dashboard', pathTemplate: '/venue-dashboard/:venueId', group: 'Maps & Venues' },

  // Shop
  { id: 'shop', label: 'Shop', pathTemplate: '/shop', group: 'Shop' },
  { id: 'cart', label: 'Cart', pathTemplate: '/cart', group: 'Shop' },
  { id: 'product', label: 'Product detail', pathTemplate: '/product/:id', group: 'Shop' },
  { id: 'payment-options', label: 'Payment options', pathTemplate: '/payment-options', group: 'Shop' },
  { id: 'payment-success', label: 'Payment success', pathTemplate: '/payment-success', group: 'Shop' },
  { id: 'order-confirm', label: 'Order confirmation', pathTemplate: '/order-confirmation', group: 'Shop' },
  { id: 'shop-auth', label: 'Shop auth', pathTemplate: '/shop-auth', group: 'Shop' },
  { id: 'orders', label: 'Orders', pathTemplate: '/orders', group: 'Shop' },
  { id: 'seller-dashboard', label: 'Seller dashboard', pathTemplate: '/seller-dashboard', group: 'Shop' },

  // Misc / content
  { id: 'email', label: 'Email', pathTemplate: '/email', group: 'Misc' },
  { id: 'community', label: 'Community', pathTemplate: '/community', group: 'Misc' },
  { id: 'thunder', label: 'Thunder', pathTemplate: '/thunder', group: 'Misc' },
  { id: 'introduction', label: 'Introduction', pathTemplate: '/introduction', group: 'Misc' },
  { id: 'chat', label: 'Chat', pathTemplate: '/chat', group: 'Misc' },
  { id: 'calendar', label: 'Calendar', pathTemplate: '/calendar', group: 'Misc' },
  { id: 'documents', label: 'Documents', pathTemplate: '/documents', group: 'Misc' },
  { id: 'company', label: 'Company', pathTemplate: '/company', group: 'Misc' },
  { id: 'time-off', label: 'Time off', pathTemplate: '/time-off', group: 'Misc' },
  { id: 'knowledge-base', label: 'Knowledge base', pathTemplate: '/knowledge-base', group: 'Misc' },
  { id: 'analytics', label: 'Analytics', pathTemplate: '/analytics', group: 'Misc' },
  { id: 'install', label: 'Install', pathTemplate: '/install', group: 'Misc' },
  { id: 'gm-command-guide', label: 'GM command guide', pathTemplate: '/gm-command-guide', group: 'Misc' },
  { id: 'gm-command', label: 'GM command dashboard', pathTemplate: '/gm-command', group: 'Misc' },
  { id: 'industry-digest', label: 'Industry digest', pathTemplate: '/industry-digest', group: 'Misc' },
  { id: 'terms', label: 'Terms', pathTemplate: '/terms', group: 'Misc' },
  { id: 'live', label: 'Livestream', pathTemplate: '/live', group: 'Misc' },
  { id: 'live-id', label: 'Livestream detail', pathTemplate: '/live/:id', group: 'Misc' },
  { id: 'exam-center', label: 'Exam center', pathTemplate: '/exam-center', group: 'Misc' },
  { id: 'exam-session', label: 'Exam session', pathTemplate: '/exam/:categoryId', group: 'Misc' },
  { id: 'certificate', label: 'Certificate view', pathTemplate: '/certificate/:certificateId', group: 'Misc' },
  { id: 'campaign-payment', label: 'Campaign payment', pathTemplate: '/campaign-payment', group: 'Misc' },
  { id: 'specverse-promo', label: 'SpecVerse promo', pathTemplate: '/specverse-promo', group: 'Misc' },
  { id: 'presentation', label: 'Presentation', pathTemplate: '/presentation', group: 'Misc' },
];

