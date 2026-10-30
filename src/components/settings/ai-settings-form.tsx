"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Check,
  FlaskConical,
  KeyRound,
  Loader2,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  removeAiKeyAction,
  saveAiSettingsAction,
  testAiConnectionAction,
} from "@/actions/ai-settings";
import type { AiProviderName } from "@/lib/ai/config";
import type {
  AiSettingsSource,
  AiSettingsView,
} from "@/lib/ai/settings";

const PRESETS: Record<
  AiProviderName,
  { label: string; baseUrl: string; model: string }
> = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  custom: {
    label: "Custom OpenAI-compatible provider",
    baseUrl: "",
    model: "",
  },
};

const SOURCE_LABELS: Record<AiSettingsSource, string> = {
  database: "Using the key saved in the database",
  environment: "Using the AI_API_KEY environment fallback",
  none: "AI is not configured yet",
};

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink placeholder:text-[#9aa195] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";

type PendingAction = "save" | "test" | "remove" | null;

export function AiSettingsForm({
  initialSettings,
}: {
  initialSettings: AiSettingsView | null;
}) {
  if (!initialSettings) {
    return (
      <p className="m-0 rounded-2xl border border-dashed border-line bg-paper p-4 text-sm text-muted">
        AI settings are unavailable right now. Try again later.
      </p>
    );
  }

  return <AiSettingsFields initialSettings={initialSettings} />;
}

function AiSettingsFields({
  initialSettings,
}: {
  initialSettings: AiSettingsView;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(initialSettings.provider);
  const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl);
  const [model, setModel] = useState(initialSettings.model);
  const [dailyLimit, setDailyLimit] = useState(
    String(initialSettings.dailyLimit)
  );
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(initialSettings.hasKey);
  const [keyHint, setKeyHint] = useState(initialSettings.keyHint);
  const [source, setSource] = useState(initialSettings.source);
  const [encryptionAvailable, setEncryptionAvailable] = useState(
    initialSettings.encryptionAvailable
  );
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pending = pendingAction !== null;

  function applySettings(settings: AiSettingsView) {
    setProvider(settings.provider);
    setBaseUrl(settings.baseUrl);
    setModel(settings.model);
    setDailyLimit(String(settings.dailyLimit));
    setHasKey(settings.hasKey);
    setKeyHint(settings.keyHint);
    setSource(settings.source);
    setEncryptionAvailable(settings.encryptionAvailable);
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function changeProvider(nextProvider: AiProviderName) {
    setProvider(nextProvider);

    if (nextProvider !== "custom") {
      setBaseUrl(PRESETS[nextProvider].baseUrl);
      setModel(PRESETS[nextProvider].model);
    }

    clearMessages();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!encryptionAvailable) {
      setError(
        "Saving is disabled because SETTINGS_ENCRYPTION_KEY is not configured."
      );
      return;
    }

    setPendingAction("save");

    try {
      const formData = new FormData();
      formData.set("provider", provider);
      formData.set("baseUrl", baseUrl);
      formData.set("model", model);
      formData.set("apiKey", apiKey);
      formData.set("dailyLimit", dailyLimit);

      const result = await saveAiSettingsAction(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const enteredKey = apiKey.trim();
      setApiKey("");

      if (result.settings) {
        applySettings(result.settings);
      } else if (enteredKey) {
        setHasKey(true);
        setKeyHint(enteredKey.slice(-4));
        setSource("database");
      }

      setSuccess("AI settings saved.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function testConnection() {
    clearMessages();
    setPendingAction("test");

    try {
      const result = await testAiConnectionAction();

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSuccess("Connection succeeded.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function removeKey() {
    clearMessages();
    setPendingAction("remove");

    try {
      const result = await removeAiKeyAction();

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setApiKey("");
      setConfirmRemove(false);

      if (result.settings) {
        applySettings(result.settings);
      } else {
        setHasKey(false);
        setKeyHint(null);
        setSource(
          initialSettings.source === "environment" ? "environment" : "none"
        );
      }

      setSuccess("Saved AI key removed.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
            <Bot size={14} />
            {SOURCE_LABELS[source]}
          </span>

          {hasKey && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink">
              <KeyRound size={14} />
              {keyHint
                ? `Key ending in ••••${keyHint}`
                : "Saved database key"}
            </span>
          )}
        </div>

        <p className="m-0 text-xs leading-5 text-muted">
          The key is write-only. Only its last four characters are shown after
          saving, and leaving the key field blank keeps the current key.
        </p>
      </div>

      {!encryptionAvailable && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[#eadfbe] bg-[#fbf6e9] p-4 text-sm text-[#6d5a2f]"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="m-0 leading-6">
            <strong className="font-semibold">
              Saving AI settings is disabled.
            </strong>{" "}
            SETTINGS_ENCRYPTION_KEY is not configured. Add a 32-byte base64 key
            to the server environment and restart ReadVault. The environment
            AI_API_KEY fallback can still power story drafts.
          </p>
        </div>
      )}

      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Provider
            <select
              name="provider"
              value={provider}
              onChange={(event) =>
                changeProvider(event.target.value as AiProviderName)
              }
              className={inputClass}
              disabled={pending}
            >
              <option value="deepseek">{PRESETS.deepseek.label}</option>
              <option value="openai">{PRESETS.openai.label}</option>
              <option value="custom">{PRESETS.custom.label}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            Daily draft limit
            <input
              type="number"
              name="dailyLimit"
              min={1}
              max={100}
              step={1}
              required
              value={dailyLimit}
              onChange={(event) => {
                setDailyLimit(event.target.value);
                clearMessages();
              }}
              className={inputClass}
              disabled={pending}
            />
            <span className="text-xs font-normal leading-5 text-muted">
              Drafts per person per day, from 1 to 100.
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Base URL
          <input
            type="url"
            name="baseUrl"
            required
            maxLength={500}
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
              clearMessages();
            }}
            placeholder="https://api.deepseek.com"
            className={inputClass}
            disabled={pending}
          />
          <span className="text-xs font-normal leading-5 text-muted">
            HTTPS only. Custom hosts must be listed in AI_ALLOWED_HOSTS.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          Model
          <input
            type="text"
            name="model"
            required
            maxLength={200}
            value={model}
            onChange={(event) => {
              setModel(event.target.value);
              clearMessages();
            }}
            placeholder="deepseek-chat"
            className={inputClass}
            disabled={pending}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
          API key
          <input
            type="password"
            name="apiKey"
            autoComplete="new-password"
            maxLength={500}
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value);
              clearMessages();
            }}
            placeholder={hasKey ? "Leave blank to keep the saved key" : "Enter the provider API key"}
            className={inputClass}
            disabled={pending}
          />
          <span className="text-xs font-normal leading-5 text-muted">
            Write-only. Saving a new key replaces the saved one; the full key is
            never returned to the browser.
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="m-0 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
          >
            <Check size={16} />
            {success}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || !encryptionAvailable}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#274a38] disabled:opacity-60"
          >
            {pendingAction === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save settings
          </button>

          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-[#cfe3d6] hover:bg-brand-soft hover:text-brand disabled:opacity-60"
          >
            {pendingAction === "test" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical size={16} />
            )}
            Test connection
          </button>

          {hasKey && (
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setConfirmRemove(true);
              }}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e7c8bf] bg-white px-4 py-3 text-sm font-semibold text-[#8a4b2f] transition hover:bg-[#fbeeea] disabled:opacity-60"
            >
              <Trash2 size={16} />
              Remove key
            </button>
          )}
        </div>
      </form>

      {confirmRemove && (
        <div className="rounded-2xl border border-[#e7c8bf] bg-[#fbeeea] p-4">
          <p className="m-0 text-sm leading-6 text-[#6d4a3b]">
            Remove the saved AI key? Story drafts will stop working unless the
            environment AI_API_KEY fallback is configured or another key is
            saved.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void removeKey()}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8a4b2f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#743d26] disabled:opacity-60"
            >
              {pendingAction === "remove" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Yes, remove key
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
