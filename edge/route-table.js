export const ROUTES = {
  '/workspace': 'workspace',
  '/zayvora': 'zayvora',
  '/apps': 'apps',
  '/toolkit': 'toolkit',
  '/engine': 'engine',
  '/research': 'nex',
  '/games': 'simulation'
};

export function resolveRoute(pathname = '/') {
  if (pathname.startsWith('/apps/')) {
    const appName = pathname.split('/').filter(Boolean)[1];
    return appName ? { module: 'apps', base: '/apps', appName } : null;
  }
  const key = Object.keys(ROUTES).find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return key ? { module: ROUTES[key], base: key } : null;
}
