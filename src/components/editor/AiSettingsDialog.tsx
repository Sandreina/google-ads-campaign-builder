import { useEffect, useState } from 'react';
import { Sparkles, KeyRound, Trash2, ShieldCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { type AiProvider, type AiSettings, DEFAULT_MODELS } from '@/lib/ai';
import { loadAiSettings, saveAiSettings } from '@/lib/settings';

export function AiSettingsDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [provider, setProvider] = useState<AiProvider>('proxy');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    const existing = loadAiSettings();
    if (existing) {
      setProvider(existing.provider);
      setApiKey(existing.apiKey);
      setModel(existing.model);
      setBaseUrl(existing.baseUrl ?? '');
    }
  }, [open]);

  function changeProvider(next: AiProvider) {
    setProvider(next);
    // Update the model placeholder/default to match the provider.
    if (!model || Object.values(DEFAULT_MODELS).includes(model)) {
      setModel(DEFAULT_MODELS[next]);
    }
  }

  function save() {
    if (provider !== 'proxy' && (!apiKey.trim() || !model.trim())) {
      toast('Enter an API key and model', 'error');
      return;
    }
    if (provider === 'compatible' && !baseUrl.trim()) {
      toast('Enter a base URL for the compatible provider', 'error');
      return;
    }
    const settings: AiSettings = {
      provider,
      apiKey: provider === 'proxy' ? '' : apiKey.trim(),
      model: model.trim(),
      baseUrl: provider === 'compatible' || provider === 'proxy' ? baseUrl.trim() || undefined : undefined,
    };
    saveAiSettings(settings);
    toast('AI provider connected');
    onSaved();
    onClose();
  }

  function disconnect() {
    saveAiSettings(null);
    setApiKey('');
    toast('AI provider disconnected');
    onSaved();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="AI copy generation"
      description="Connect an LLM to write headlines and descriptions from your keywords and context."
      size="md"
      footer={
        <>
          <Button variant="ghost" className="text-destructive" onClick={disconnect}>
            <Trash2 className="h-4 w-4" /> Disconnect
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>
            <Sparkles className="h-4 w-4" /> Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Provider">
          <Select value={provider} onChange={(e) => changeProvider(e.target.value as AiProvider)}>
            <option value="proxy">Server proxy (recommended — key stays on the server)</option>
            <option value="anthropic">Anthropic (Claude) — key in this browser</option>
            <option value="openai">OpenAI — key in this browser</option>
            <option value="compatible">OpenAI-compatible (custom / gateway) — key in this browser</option>
          </Select>
        </Field>

        {provider === 'proxy' && (
          <Field
            label="Proxy endpoint"
            hint="Where the app POSTs generation requests. Leave blank for the built-in /api/llm/chat."
          >
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="/api/llm/chat" />
          </Field>
        )}

        {provider === 'compatible' && (
          <Field label="Base URL" hint="e.g. https://your-gateway.example.com/v1">
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…/v1" />
          </Field>
        )}

        <Field label={provider === 'proxy' ? 'Model (optional)' : 'Model'} hint={provider === 'proxy' ? 'Leave blank to use the server default.' : undefined}>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODELS[provider] || (provider === 'proxy' ? 'server default' : 'model name')}
          />
        </Field>

        {provider !== 'proxy' && (
          <Field
            label="API key"
            hint="Stored only in this browser (localStorage). Never included in any campaign or client export."
          >
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                className="pl-8"
                autoComplete="off"
              />
            </div>
          </Field>
        )}

        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50/70 p-3 text-xs text-green-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {provider === 'proxy' ? (
            <span>
              <strong>Server proxy</strong> keeps the API key on the server — nothing sensitive is stored in the
              browser. Run <code>npm run dev</code> (or <code>npm start</code> in production) with{' '}
              <code>ANTHROPIC_API_KEY</code> (or <code>OPENAI_API_KEY</code>, or <code>LLM_API_KEY</code> +{' '}
              <code>LLM_BASE_URL</code>) set in your environment / <code>.env.local</code>.
            </span>
          ) : (
            <span>
              The request goes directly from your browser to the provider, so the key stays on this device — fine for
              local/internal use. For a shared deployment, use the <strong>Server proxy</strong> option instead so the
              key isn't exposed. Without any provider, the app falls back to the built-in (non-AI) generator.
            </span>
          )}
        </div>
      </div>
    </Dialog>
  );
}
