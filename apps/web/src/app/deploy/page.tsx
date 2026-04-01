'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '@mobazha/core';
import {
  Server,
  Globe,
  Terminal,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Shield,
  Wifi,
  Clock,
  AlertCircle,
  Circle,
  Rocket,
  Lock,
  MessageCircle,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Cpu,
  HardDrive,
  MemoryStick,
  MonitorSmartphone,
  Network,
} from 'lucide-react';
import {
  prepareDeploy,
  checkSubdomain,
  subscribeDeployProgress,
  getDeployProgress,
} from '@mobazha/core/services/api/deploy';
import type { DeployPrepareResponse, DeployProgressEvent } from '@mobazha/core/services/api/deploy';
import { useToast } from '@/components/ui/use-toast';

type DomainType = 'subdomain' | 'custom' | 'ip' | 'overlay';
type OverlayNetwork = 'lokinet' | 'tor';
type Step = 0 | 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 6;
const STAGE_ORDER = [
  'docker_installed',
  'image_pulled',
  'services_started',
  'health_check',
  'completed',
];

export default function DeployWizardPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(0);

  // Step 1: Domain
  const [domainType, setDomainType] = useState<DomainType>('subdomain');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'
  >('idle');
  const [customDomain, setCustomDomain] = useState('');
  const [overlayNetwork, setOverlayNetwork] = useState<OverlayNetwork>('lokinet');
  const [overlayAddress, setOverlayAddress] = useState('');

  // Step 2: Server
  const [serverIP, setServerIP] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Install
  const [deployResult, setDeployResult] = useState<DeployPrepareResponse | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Step 4: Progress
  const [progressEvents, setProgressEvents] = useState<DeployProgressEvent[]>([]);
  const [progressTimeout, setProgressTimeout] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDomain = useCallback(() => {
    switch (domainType) {
      case 'subdomain':
        return `${subdomain}.stores.mobazha.org`;
      case 'custom':
        return customDomain;
      case 'ip':
        return serverIP;
      case 'overlay':
        return overlayAddress || '';
      default:
        return '';
    }
  }, [domainType, subdomain, customDomain, serverIP, overlayAddress]);

  // Subdomain check with debounce
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (domainType !== 'subdomain' || !subdomain) {
      setSubdomainStatus('idle');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(subdomain)) {
      setSubdomainStatus('invalid');
      return;
    }
    setSubdomainStatus('checking');
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkSubdomain(subdomain);
        setSubdomainStatus(res.available ? 'available' : 'unavailable');
      } catch {
        setSubdomainStatus('unavailable');
      }
    }, 500);
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [subdomain, domainType]);

  const handlePrepare = useCallback(async () => {
    setPreparing(true);
    try {
      const res = await prepareDeploy({
        domainType,
        domain: getDomain(),
        serverIP,
        adminPassword,
        connectivity: domainType === 'overlay' ? 'overlay' : 'public',
        ...(domainType === 'overlay' && { overlayType: overlayNetwork }),
      });
      setDeployResult(res);
      setStep(3);
    } catch {
      toast({
        title: t('common.error'),
        description: t('deploy.install.prepareFailed'),
        variant: 'destructive',
      });
    } finally {
      setPreparing(false);
    }
  }, [domainType, getDomain, serverIP, adminPassword, overlayNetwork, toast, t]);

  const handleCopy = useCallback(async () => {
    if (!deployResult) return;
    try {
      await navigator.clipboard.writeText(deployResult.installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [deployResult]);

  // Start progress tracking when entering step 4
  useEffect(() => {
    if (step !== 4 || !deployResult) return;

    const token = deployResult.token;
    setProgressEvents([]);
    setProgressTimeout(false);

    const unsub = subscribeDeployProgress(
      token,
      evt => {
        setProgressEvents(prev => {
          const exists = prev.some(p => p.stage === evt.stage && p.status === evt.status);
          return exists ? prev : [...prev, evt];
        });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setProgressTimeout(true), 5 * 60 * 1000);
      },
      () => {
        // SSE error — fallback to polling
        const poll = setInterval(async () => {
          try {
            const res = await getDeployProgress(token);
            if (res.progress?.length) {
              setProgressEvents(res.progress);
            }
            if (res.status === 'completed') clearInterval(poll);
          } catch {
            // ignore
          }
        }, 3000);
        return () => clearInterval(poll);
      }
    );

    unsubRef.current = unsub;
    timeoutRef.current = setTimeout(() => setProgressTimeout(true), 5 * 60 * 1000);

    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [step, deployResult]);

  const isCompleted = progressEvents.some(e => e.stage === 'completed' && e.status === 'completed');

  useEffect(() => {
    if (isCompleted && step === 4) {
      setTimeout(() => setStep(5), 1500);
    }
  }, [isCompleted, step]);

  const canGoNext = useCallback((): boolean => {
    switch (step) {
      case 0:
        return true;
      case 1:
        if (domainType === 'subdomain') return subdomainStatus === 'available';
        if (domainType === 'custom') return customDomain.length > 3;
        if (domainType === 'ip') return true;
        if (domainType === 'overlay') return true;
        return false;
      case 2:
        return (
          /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(serverIP) &&
          adminPassword.length >= 8 &&
          adminPassword === confirmPassword
        );
      default:
        return false;
    }
  }, [step, domainType, subdomainStatus, customDomain, serverIP, adminPassword, confirmPassword]);

  const handleNext = useCallback(() => {
    if (step === 2) {
      handlePrepare();
      return;
    }
    if (step < 5) setStep((step + 1) as Step);
  }, [step, handlePrepare]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((step - 1) as Step);
  }, [step]);

  const stepLabels = [
    t('deploy.steps.vps'),
    t('deploy.steps.domain'),
    t('deploy.steps.server'),
    t('deploy.steps.install'),
    t('deploy.steps.progress'),
    t('deploy.steps.done'),
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('deploy.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('deploy.subtitle')}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {stepLabels.map((label, i) => (
              <div
                key={i}
                className={`flex flex-col items-center flex-1 ${
                  i <= step ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs hidden sm:block">{label}</span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-muted rounded-full">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
          {step === 0 && <StepVPS t={t} />}
          {step === 1 && (
            <StepDomain
              t={t}
              domainType={domainType}
              setDomainType={setDomainType}
              subdomain={subdomain}
              setSubdomain={setSubdomain}
              subdomainStatus={subdomainStatus}
              customDomain={customDomain}
              setCustomDomain={setCustomDomain}
              overlayNetwork={overlayNetwork}
              setOverlayNetwork={setOverlayNetwork}
              overlayAddress={overlayAddress}
              setOverlayAddress={setOverlayAddress}
            />
          )}
          {step === 2 && (
            <StepServer
              t={t}
              serverIP={serverIP}
              setServerIP={setServerIP}
              adminPassword={adminPassword}
              setAdminPassword={setAdminPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              domainType={domainType}
            />
          )}
          {step === 3 && (
            <StepInstall
              t={t}
              deployResult={deployResult}
              copied={copied}
              onCopy={handleCopy}
              onStartTracking={() => setStep(4)}
            />
          )}
          {step === 4 && <StepProgress t={t} events={progressEvents} isTimeout={progressTimeout} />}
          {step === 5 && <StepDone t={t} domain={getDomain()} />}
        </div>

        {/* Navigation */}
        {step <= 2 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('deploy.nav.back')}
            </button>
            <button
              onClick={handleNext}
              disabled={!canGoNext() || preparing}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {preparing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {step === 2 ? t('deploy.install.command') : t('deploy.nav.next')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Sub-components for each step
   ================================================================ */

interface StepProps {
  t: (key: string) => string;
}

function StepVPS({ t }: StepProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);

  const providers = [
    {
      key: 'vultr',
      name: t('deploy.vps.providers.vultr'),
      url: 'https://www.vultr.com/?ref=mobazha',
      price: '$6',
      recommended: true,
      guideKey: 'vultrGuide' as const,
      stepCount: 8,
    },
    {
      key: 'digitalocean',
      name: t('deploy.vps.providers.digitalocean'),
      url: 'https://www.digitalocean.com/?refcode=mobazha',
      price: '$6',
      recommended: false,
      guideKey: 'digitaloceanGuide' as const,
      stepCount: 8,
    },
    {
      key: 'hetzner',
      name: t('deploy.vps.providers.hetzner'),
      url: 'https://www.hetzner.com/cloud/',
      price: '€4',
      recommended: false,
      guideKey: 'hetznerGuide' as const,
      stepCount: 8,
    },
  ];

  const specItems = [
    { icon: <Cpu className="w-4 h-4" />, text: t('deploy.vps.minSpecsDetail.cpu') },
    { icon: <MemoryStick className="w-4 h-4" />, text: t('deploy.vps.minSpecsDetail.ram') },
    { icon: <HardDrive className="w-4 h-4" />, text: t('deploy.vps.minSpecsDetail.disk') },
    { icon: <MonitorSmartphone className="w-4 h-4" />, text: t('deploy.vps.minSpecsDetail.os') },
    { icon: <Network className="w-4 h-4" />, text: t('deploy.vps.minSpecsDetail.network') },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Server className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{t('deploy.vps.title')}</h2>
      </div>
      <p className="text-muted-foreground mb-2">{t('deploy.vps.subtitle')}</p>

      {/* Collapsible specs panel */}
      <button
        onClick={() => setShowSpecs(!showSpecs)}
        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mb-4 transition-colors"
      >
        {showSpecs ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        {showSpecs ? t('deploy.vps.hideSpecs') : t('deploy.vps.showSpecs')}
      </button>

      {showSpecs && (
        <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
          {specItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
              <span className="text-muted-foreground">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground/70 mb-6">{t('deploy.vps.minSpecs')}</p>

      {/* Provider cards with collapsible guides */}
      <div className="space-y-3">
        {providers.map(p => {
          const isExpanded = expandedProvider === p.key;
          return (
            <div
              key={p.key}
              className="border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.recommended && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {t('deploy.vps.recommended')}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {t('deploy.vps.startingAt')} {p.price}
                      {t('deploy.vps.perMonth')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedProvider(isExpanded ? null : p.key)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    {isExpanded ? t('deploy.vps.hideGuide') : t('deploy.vps.showGuide')}
                  </button>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('deploy.vps.visitSite')}
                  </a>
                </div>
              </div>

              {/* Collapsible step-by-step guide */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <ol className="space-y-2.5">
                    {Array.from({ length: p.stepCount }, (_, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-foreground">
                          {t(`deploy.vps.${p.guideKey}.step${i + 1}`)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted-foreground/70 text-center">
        {t('deploy.vps.providerNote')}
      </p>
    </div>
  );
}

interface StepDomainProps extends StepProps {
  domainType: DomainType;
  setDomainType: (t: DomainType) => void;
  subdomain: string;
  setSubdomain: (v: string) => void;
  subdomainStatus: string;
  customDomain: string;
  setCustomDomain: (v: string) => void;
  overlayNetwork: OverlayNetwork;
  setOverlayNetwork: (v: OverlayNetwork) => void;
  overlayAddress: string;
  setOverlayAddress: (v: string) => void;
}

function StepDomain({
  t,
  domainType,
  setDomainType,
  subdomain,
  setSubdomain,
  subdomainStatus,
  customDomain,
  setCustomDomain,
  overlayNetwork,
  setOverlayNetwork,
  overlayAddress,
  setOverlayAddress,
}: StepDomainProps) {
  const options: { key: DomainType; icon: React.ReactNode; label: string; desc: string }[] = [
    {
      key: 'subdomain',
      icon: <Shield className="w-5 h-5" />,
      label: t('deploy.domain.options.subdomain'),
      desc: t('deploy.domain.options.subdomainDesc'),
    },
    {
      key: 'custom',
      icon: <Globe className="w-5 h-5" />,
      label: t('deploy.domain.options.custom'),
      desc: t('deploy.domain.options.customDesc'),
    },
    {
      key: 'ip',
      icon: <Server className="w-5 h-5" />,
      label: t('deploy.domain.options.ip'),
      desc: t('deploy.domain.options.ipDesc'),
    },
    {
      key: 'overlay',
      icon: <Wifi className="w-5 h-5" />,
      label: t('deploy.domain.options.overlay'),
      desc: t('deploy.domain.options.overlayDesc'),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Globe className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{t('deploy.domain.title')}</h2>
      </div>
      <p className="text-muted-foreground mb-6">{t('deploy.domain.subtitle')}</p>

      <div className="space-y-3 mb-6">
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => setDomainType(opt.key)}
            className={`w-full flex items-start gap-3 p-4 border rounded-lg text-left transition-colors ${
              domainType === opt.key
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <div
              className={`mt-0.5 ${domainType === opt.key ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {opt.icon}
            </div>
            <div>
              <div className="font-medium text-foreground">{opt.label}</div>
              <div className="text-sm text-muted-foreground">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {domainType === 'subdomain' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('deploy.domain.subdomainInput')}
          </label>
          <div className="flex items-center">
            <input
              type="text"
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              maxLength={32}
              className="flex-1 px-3 py-2 border border-border rounded-l-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="yourstore"
            />
            <span className="px-3 py-2 bg-muted border border-l-0 border-border rounded-r-lg text-muted-foreground text-sm">
              {t('deploy.domain.subdomainSuffix')}
            </span>
          </div>
          {subdomainStatus === 'checking' && (
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('deploy.domain.checking')}
            </p>
          )}
          {subdomainStatus === 'available' && (
            <p className="mt-1 text-sm text-primary flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t('deploy.domain.available')}
            </p>
          )}
          {subdomainStatus === 'unavailable' && (
            <p className="mt-1 text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('deploy.domain.unavailable')}
            </p>
          )}
          {subdomainStatus === 'invalid' && (
            <p className="mt-1 text-sm text-destructive">{t('deploy.domain.invalidName')}</p>
          )}
        </div>
      )}

      {domainType === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('deploy.domain.customDomainInput')}
          </label>
          <input
            type="text"
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="shop.example.com"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {t('deploy.domain.customDomainHint')}
          </p>
        </div>
      )}

      {domainType === 'overlay' && (
        <div className="space-y-5">
          {/* Network selection */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              {t('deploy.domain.overlay.networkTitle')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOverlayNetwork('lokinet')}
                className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
                  overlayNetwork === 'lokinet'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <EyeOff
                  className={`w-6 h-6 ${overlayNetwork === 'lokinet' ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className="font-medium text-foreground">
                  {t('deploy.domain.overlay.lokinet')}
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  {t('deploy.domain.overlay.lokinetDesc')}
                </span>
              </button>
              <button
                onClick={() => setOverlayNetwork('tor')}
                className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
                  overlayNetwork === 'tor'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <Lock
                  className={`w-6 h-6 ${overlayNetwork === 'tor' ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className="font-medium text-foreground">
                  {t('deploy.domain.overlay.tor')}
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  {t('deploy.domain.overlay.torDesc')}
                </span>
              </button>
            </div>
          </div>

          {/* Overlay address (optional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('deploy.domain.overlay.addressInput')}
            </label>
            <input
              type="text"
              value={overlayAddress}
              onChange={e => setOverlayAddress(e.target.value.trim())}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
              placeholder={t('deploy.domain.overlay.addressPlaceholder')}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              {t('deploy.domain.overlay.addressHint')}
            </p>
          </div>

          {/* TMA bridge explanation */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-foreground mb-1">
                  {t('deploy.domain.overlay.tma.title')}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('deploy.domain.overlay.tma.desc')}
                </p>
                <ul className="space-y-1.5">
                  <li className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {t('deploy.domain.overlay.tma.feature1')}
                  </li>
                  <li className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {t('deploy.domain.overlay.tma.feature2')}
                  </li>
                  <li className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {t('deploy.domain.overlay.tma.feature3')}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepServerProps extends StepProps {
  serverIP: string;
  setServerIP: (v: string) => void;
  adminPassword: string;
  setAdminPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  domainType: DomainType;
}

function StepServer({
  t,
  serverIP,
  setServerIP,
  adminPassword,
  setAdminPassword,
  confirmPassword,
  setConfirmPassword,
  domainType,
}: StepServerProps) {
  const passwordMismatch = confirmPassword.length > 0 && adminPassword !== confirmPassword;
  const passwordTooShort = adminPassword.length > 0 && adminPassword.length < 8;
  const isOverlay = domainType === 'overlay';

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Terminal className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{t('deploy.server.title')}</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        {isOverlay ? t('deploy.server.subtitleOverlay') : t('deploy.server.subtitle')}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {isOverlay ? t('deploy.server.ipAddressOverlay') : t('deploy.server.ipAddress')}
          </label>
          <input
            type="text"
            value={serverIP}
            onChange={e => setServerIP(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={t('deploy.server.ipPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('deploy.server.adminPassword')}
          </label>
          <input
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {t('deploy.server.adminPasswordHint')}
          </p>
          {passwordTooShort && (
            <p className="mt-1 text-sm text-destructive">{t('deploy.server.passwordTooShort')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('deploy.server.confirmPassword')}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {passwordMismatch && (
            <p className="mt-1 text-sm text-destructive">{t('deploy.server.passwordMismatch')}</p>
          )}
        </div>

        {isOverlay && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{t('deploy.domain.overlay.serverNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StepInstallProps extends StepProps {
  deployResult: DeployPrepareResponse | null;
  copied: boolean;
  onCopy: () => void;
  onStartTracking: () => void;
}

function StepInstall({ t, deployResult, copied, onCopy, onStartTracking }: StepInstallProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Terminal className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{t('deploy.install.title')}</h2>
      </div>
      <p className="text-muted-foreground mb-6">{t('deploy.install.subtitle')}</p>

      {deployResult && (
        <>
          <div className="relative bg-muted rounded-lg p-4 mb-4">
            <code className="block text-sm text-foreground break-all whitespace-pre-wrap font-mono">
              {deployResult.installCommand}
            </code>
            <button
              onClick={onCopy}
              className="absolute top-2 right-2 p-2 rounded-md hover:bg-background/50 transition-colors"
              title={t('deploy.install.copyCommand')}
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {copied && <p className="text-sm text-primary mb-4">{t('deploy.install.copied')}</p>}

          <div className="space-y-2 text-sm text-muted-foreground mb-6">
            <p className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              {t('deploy.install.sshHint')}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t('deploy.install.expiresIn')}
            </p>
          </div>

          <button
            onClick={onStartTracking}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            {t('deploy.install.waitingForInstall')}
          </button>
        </>
      )}
    </div>
  );
}

interface StepProgressProps extends StepProps {
  events: DeployProgressEvent[];
  isTimeout: boolean;
}

function StepProgress({ t, events, isTimeout }: StepProgressProps) {
  const completedStages = new Set(events.filter(e => e.status === 'completed').map(e => e.stage));
  const inProgressStages = new Set(
    events.filter(e => e.status === 'in_progress').map(e => e.stage)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Loader2
          className={`w-6 h-6 text-primary ${completedStages.has('completed') ? '' : 'animate-spin'}`}
        />
        <h2 className="text-xl font-semibold text-foreground">{t('deploy.progress.title')}</h2>
      </div>
      <p className="text-muted-foreground mb-6">{t('deploy.progress.subtitle')}</p>

      <div className="space-y-3">
        {STAGE_ORDER.map(stage => {
          const done = completedStages.has(stage);
          const active = inProgressStages.has(stage);
          return (
            <div
              key={stage}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                done ? 'bg-primary/5' : active ? 'bg-muted' : ''
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              ) : active ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  done ? 'text-foreground' : active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t(`deploy.progress.stages.${stage}`)}
              </span>
            </div>
          );
        })}
      </div>

      {isTimeout && (
        <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {t('deploy.progress.timeout')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{t('deploy.progress.retryHint')}</p>
        </div>
      )}
    </div>
  );
}

function StepDone({ t, domain }: StepProps & { domain: string }) {
  const storeUrl = domain.includes('.') ? `https://${domain}` : `http://${domain}`;
  const adminUrl = `${storeUrl}/admin`;

  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">{t('deploy.done.title')}</h2>
      <p className="text-muted-foreground mb-6">{t('deploy.done.subtitle')}</p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          {t('deploy.done.visitStore')}
        </a>
        <a
          href={adminUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          <Terminal className="w-4 h-4" />
          {t('deploy.done.openAdmin')}
        </a>
      </div>

      <div className="text-left bg-muted/50 rounded-lg p-6">
        <h3 className="font-medium text-foreground mb-3">{t('deploy.done.nextSteps')}</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>{t('deploy.done.nextStep1')}</li>
          <li>{t('deploy.done.nextStep2')}</li>
          <li>{t('deploy.done.nextStep3')}</li>
          <li>{t('deploy.done.nextStep4')}</li>
        </ol>
      </div>
    </div>
  );
}
