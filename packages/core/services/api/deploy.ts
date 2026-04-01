import { hostingGet, hostingPost } from './helpers';
import { HOSTING_API } from '../../config/apiPaths';
import { getHostingUrl } from './config';

export interface DeployPrepareRequest {
  domainType: 'subdomain' | 'custom' | 'ip' | 'overlay';
  domain: string;
  adminPassword: string;
  connectivity: 'public' | 'nat' | 'tunnel' | 'overlay';
  overlayType?: 'lokinet' | 'tor';
}

export interface DeployPrepareResponse {
  token: string;
  installCommand: string;
  expiresAt: string;
}

export interface DeployProgressResponse {
  status: string;
  progress: DeployProgressEvent[];
}

export interface DeployProgressEvent {
  stage: string;
  status: string;
  timestamp: string;
}

export interface SubdomainCheckRequest {
  name: string;
}

export interface SubdomainCheckResponse {
  available: boolean;
  domain: string;
  reason?: string;
}

export interface SubdomainCreateRequest {
  name: string;
  ip: string;
}

export interface SubdomainCreateResponse {
  domain: string;
}

export async function prepareDeploy(req: DeployPrepareRequest): Promise<DeployPrepareResponse> {
  return hostingPost<DeployPrepareResponse>(HOSTING_API.DEPLOY_PREPARE, req);
}

export async function getDeployProgress(token: string): Promise<DeployProgressResponse> {
  return hostingGet<DeployProgressResponse>(HOSTING_API.DEPLOY_PROGRESS(token));
}

export function subscribeDeployProgress(
  token: string,
  onEvent: (event: DeployProgressEvent) => void,
  onError?: (error: Event) => void
): () => void {
  const url = `${getHostingUrl()}${HOSTING_API.DEPLOY_PROGRESS_STREAM(token)}`;
  // eslint-disable-next-line no-undef
  const eventSource = new EventSource(url);

  eventSource.onmessage = e => {
    try {
      const event: DeployProgressEvent = JSON.parse(e.data);
      onEvent(event);
    } catch {
      // ignore parse errors
    }
  };

  eventSource.onerror = e => {
    onError?.(e);
  };

  return () => eventSource.close();
}

export async function checkSubdomain(name: string): Promise<SubdomainCheckResponse> {
  return hostingPost<SubdomainCheckResponse>(HOSTING_API.DEPLOY_SUBDOMAIN_CHECK, {
    name,
  } satisfies SubdomainCheckRequest);
}

export async function createSubdomain(name: string, ip: string): Promise<SubdomainCreateResponse> {
  return hostingPost<SubdomainCreateResponse>(HOSTING_API.DEPLOY_SUBDOMAIN_CREATE, {
    name,
    ip,
  } satisfies SubdomainCreateRequest);
}
