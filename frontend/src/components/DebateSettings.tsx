import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Settings, ChevronDown, ChevronUp, Check } from "lucide-react";
import type {
  DebateConfig,
  SelectedModel,
  ModelInfo,
  LLMProvider,
  AvailableModelsResponse,
} from "../types";
import { cn } from "../lib/utils";

// In production (Vercel), use relative /api path. In development, use localhost.
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8000");

interface DebateSettingsProps {
  config: DebateConfig;
  onConfigChange: (config: DebateConfig) => void;
  disabled?: boolean;
}

const providerColors: Record<LLMProvider, string> = {
  openai: "bg-openai",
  gemini: "bg-gemini",
  anthropic: "bg-anthropic",
};

const providerBgColors: Record<LLMProvider, string> = {
  openai: "bg-openai/10 border-openai/30 hover:border-openai/50",
  gemini: "bg-gemini/10 border-gemini/30 hover:border-gemini/50",
  anthropic: "bg-anthropic/10 border-anthropic/30 hover:border-anthropic/50",
};

const providerNames: Record<LLMProvider, string> = {
  openai: "OpenAI",
  gemini: "Google",
  anthropic: "Anthropic",
};

export function DebateSettings({
  config,
  onConfigChange,
  disabled,
}: DebateSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch(`${API_URL}/models`);
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data);
        }
      } catch (error) {
        console.error("Failed to fetch available models:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  const handleRoundChange = (value: number) => {
    onConfigChange({ ...config, maxRounds: value });
  };

  const handleModelToggle = (model: ModelInfo) => {
    const selectedModel: SelectedModel = {
      provider: model.provider,
      model_id: model.id,
    };

    const isSelected = config.models.some(
      (m) => m.provider === model.provider && m.model_id === model.id
    );

    if (isSelected) {
      // Don't allow removing if only 2 models selected
      if (config.models.length <= 2) return;
      onConfigChange({
        ...config,
        models: config.models.filter(
          (m) => !(m.provider === model.provider && m.model_id === model.id)
        ),
      });
    } else {
      // Only allow 2 models for now (debate format)
      // Replace the second model
      if (config.models.length >= 2) {
        onConfigChange({
          ...config,
          models: [config.models[0], selectedModel],
        });
      } else {
        onConfigChange({
          ...config,
          models: [...config.models, selectedModel],
        });
      }
    }
  };

  const isModelSelected = (model: ModelInfo) => {
    return config.models.some(
      (m) => m.provider === model.provider && m.model_id === model.id
    );
  };

  const getSelectedModelNames = () => {
    if (!availableModels) return "";
    return config.models
      .map((selected) => {
        const providerModels = availableModels.models[selected.provider] || [];
        const model = providerModels.find((m) => m.id === selected.model_id);
        return model?.name || selected.model_id;
      })
      .join(" vs ");
  };

  return (
    <Card className="border-border">
      <CardHeader
        className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span>Debate Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-normal">
              {config.maxRounds} rounds | {getSelectedModelNames()}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-5">
          {/* Round Limit Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Number of Rounds</label>
              <span className="text-sm font-semibold text-primary">
                {config.maxRounds}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4">1</span>
              <input
                type="range"
                min="1"
                max="20"
                value={config.maxRounds}
                onChange={(e) => handleRoundChange(parseInt(e.target.value))}
                disabled={disabled}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-muted-foreground w-4">20</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Each round, both AIs respond and then critique each other's
              answers.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Models</label>
              <span className="text-xs text-muted-foreground">
                Choose 2 models to debate
              </span>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Loading available models...
              </div>
            ) : availableModels &&
              availableModels.available_providers.length > 0 ? (
              <div className="space-y-3">
                {availableModels.available_providers.map((provider) => (
                  <div key={provider} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          providerColors[provider as LLMProvider]
                        )}
                      />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {providerNames[provider as LLMProvider]}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {availableModels.models[provider]?.map((model) => {
                        const selected = isModelSelected(model);
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleModelToggle(model)}
                            disabled={disabled}
                            className={cn(
                              "relative p-3 rounded border text-left transition-all",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              selected
                                ? providerBgColors[model.provider]
                                : "bg-card border-border hover:border-muted-foreground/30"
                            )}
                          >
                            {selected && (
                              <div
                                className={cn(
                                  "absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center",
                                  providerColors[model.provider]
                                )}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className="font-medium text-sm">
                              {model.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {model.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No models available. Check API key configuration.
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  onConfigChange({
                    maxRounds: 2,
                    models: [
                      { provider: "openai", model_id: "gpt-4.1" },
                      { provider: "gemini", model_id: "gemini-2.5-flash" },
                    ],
                  })
                }
                className="text-xs"
              >
                Quick (2 rounds)
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  onConfigChange({
                    maxRounds: 5,
                    models: [
                      { provider: "openai", model_id: "gpt-4.1" },
                      { provider: "gemini", model_id: "gemini-2.5-flash" },
                    ],
                  })
                }
                className="text-xs"
              >
                Standard (5 rounds)
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  onConfigChange({
                    maxRounds: 10,
                    models: [
                      { provider: "openai", model_id: "gpt-4.1" },
                      { provider: "gemini", model_id: "gemini-2.5-flash" },
                    ],
                  })
                }
                className="text-xs"
              >
                Deep Dive (10 rounds)
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
