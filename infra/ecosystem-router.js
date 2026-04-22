import { registerNode, pushEvent } from '../memory/global-graph/index.js';

const ROUTES = {
  identityToken: 'aporaksha -> daxini.xyz',
  workspaceCall: 'daxini.xyz -> zayvora-toolkit',
  telemetryEvent: 'domains -> hanuman.solutions',
  marketplacePublish: 'logichub.app -> daxini.space'
};

function required(value, field) {
  if (value === null || typeof value === 'undefined' || value === '') {
    throw new Error(`Missing required field: ${field}`);
  }
}

export function createEcosystemRouter(adapters = {}) {
  function routeIdentityToken(payload) {
    required(payload?.token, 'token');
    required(payload?.user_id, 'user_id');

    registerNode('users', { id: payload.user_id, provider: payload.provider || 'aporaksha' });
    pushEvent({ source: 'aporaksha', event: 'identity.token.routed', target: 'daxini.xyz', user_id: payload.user_id });

    return adapters.aporakshaToWorkspace
      ? adapters.aporakshaToWorkspace(payload)
      : { ok: true, route: ROUTES.identityToken, payload };
  }

  function routeWorkspaceCall(payload) {
    required(payload?.task_id, 'task_id');
    registerNode('tasks', { id: payload.task_id, workspace: payload.workspace || 'daxini.xyz' });
    pushEvent({ source: 'daxini.xyz', event: 'workspace.call.routed', target: 'zayvora-toolkit', task_id: payload.task_id });

    return adapters.workspaceToZayvora
      ? adapters.workspaceToZayvora(payload)
      : { ok: true, route: ROUTES.workspaceCall, payload };
  }

  function routeTelemetryEvent(payload) {
    required(payload?.target_domain, 'target_domain');
    required(payload?.threat_type, 'threat_type');

    pushEvent({
      source: payload.source_domain || 'unknown-domain',
      event: 'telemetry.event.routed',
      target: 'hanuman.solutions',
      threat_type: payload.threat_type,
      target_domain: payload.target_domain
    });

    return adapters.telemetryToHanuman
      ? adapters.telemetryToHanuman(payload)
      : { ok: true, route: ROUTES.telemetryEvent, payload };
  }

  function routeMarketplacePublish(payload) {
    required(payload?.app_id, 'app_id');
    required(payload?.artifact_id, 'artifact_id');

    registerNode('apps', { id: payload.app_id, source: 'logichub.app' });
    pushEvent({ source: 'logichub.app', event: 'marketplace.publish.routed', target: 'daxini.space', app_id: payload.app_id });

    return adapters.logichubToMarketplace
      ? adapters.logichubToMarketplace(payload)
      : { ok: true, route: ROUTES.marketplacePublish, payload };
  }

  return {
    routes: { ...ROUTES },
    routeIdentityToken,
    routeWorkspaceCall,
    routeTelemetryEvent,
    routeMarketplacePublish
  };
}

export { ROUTES };
