'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Phone, MessageSquare, Shield, Zap } from 'lucide-react';

interface AiConfig {
  enabled: boolean;
  persona: string;
  modelWhatsapp: string;
  modelVoice: string;
  dailyTokenBudget: number;
  languages: string[];
}

const DEFAULT_CONFIG: AiConfig = {
  enabled: false,
  persona: '',
  modelWhatsapp: 'gpt-4.1-mini',
  modelVoice: 'gpt-4.1-mini',
  dailyTokenBudget: 500000,
  languages: ['es'],
};

export function AiAssistantConfigPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [config, setConfig] = React.useState<AiConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/v1/tenants/${tenantId}/clinic/ai-config`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config),
        credentials: 'include',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asistente IA</h1>
          <p className="text-sm text-muted-foreground">
            Configura el recepcionista IA para WhatsApp y llamadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={config.enabled ? 'default' : 'secondary'}>
            {config.enabled ? 'Activo' : 'Inactivo'}
          </Badge>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Estado general
            </CardTitle>
            <CardDescription>Activacion y kill switch del recepcionista IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-enabled">Recepcionista IA activo</Label>
              <Switch
                id="ai-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Si se desactiva, todos los mensajes entrantes se derivan al inbox humano.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Credenciales
            </CardTitle>
            <CardDescription>Estado de las claves API necesarias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CredentialRow label="OpenAI API Key" configured />
            <CredentialRow label="Retell API Key" configured={false} />
            <CredentialRow label="Retell Agent ID" configured={false} />
            <p className="text-xs text-muted-foreground">
              Gestiona las credenciales en Ajustes &gt; Integraciones &gt; Secretos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Canal WhatsApp
            </CardTitle>
            <CardDescription>Modelo y comportamiento para mensajes de texto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo LLM</Label>
              <Select
                value={config.modelWhatsapp}
                onValueChange={(v) => setConfig({ ...config, modelWhatsapp: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Canal Voz (Retell)
            </CardTitle>
            <CardDescription>Modelo y comportamiento para llamadas de voz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo LLM</Label>
              <Select
                value={config.modelVoice}
                onValueChange={(v) => setConfig({ ...config, modelVoice: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Personalidad y reglas
            </CardTitle>
            <CardDescription>
              Instrucciones adicionales que el asistente seguira en todas las conversaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="persona">Instrucciones personalizadas</Label>
              <Textarea
                id="persona"
                rows={6}
                value={config.persona}
                onChange={(e) => setConfig({ ...config, persona: e.target.value })}
                placeholder="Ej: Siempre ofrece la primera visita gratuita. Menciona que tenemos parking gratis..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Presupuesto diario de tokens</Label>
              <Input
                id="budget"
                type="number"
                value={config.dailyTokenBudget}
                onChange={(e) =>
                  setConfig({ ...config, dailyTokenBudget: Number(e.target.value) || 500000 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Cuando se agota el presupuesto diario, los mensajes se derivan al inbox humano.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CredentialRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <Badge variant={configured ? 'default' : 'outline'} className="text-xs">
        {configured ? 'Configurada' : 'Pendiente'}
      </Badge>
    </div>
  );
}
