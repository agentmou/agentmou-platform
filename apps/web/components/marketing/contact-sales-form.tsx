'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  ContactSalesLeadSchema,
  contactSalesModuleOptions,
  type ContactSalesLeadInput,
} from '@/lib/marketing/contact-sales';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MinimalButton } from '@/components/ui/minimal-button';

export function ContactSalesForm() {
  const [submitState, setSubmitState] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const form = useForm<ContactSalesLeadInput>({
    resolver: zodResolver(ContactSalesLeadSchema),
    defaultValues: {
      fullName: '',
      clinicName: '',
      workEmail: '',
      phone: '',
      interestedModules: ['core_reception'],
      message: '',
      sourcePath: '/contact-sales',
    },
  });

  const selectedModules = form.watch('interestedModules');

  async function onSubmit(values: ContactSalesLeadInput) {
    setSubmitState({ status: 'idle' });

    const response = await fetch('/api/contact-sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    if (!response.ok) {
      setSubmitState({
        status: 'error',
        message: payload?.message ?? 'No hemos podido enviar tu solicitud ahora mismo.',
      });
      return;
    }

    form.reset({
      fullName: '',
      clinicName: '',
      workEmail: '',
      phone: '',
      interestedModules: ['core_reception'],
      message: '',
      sourcePath: '/contact-sales',
    });
    setSubmitState({
      status: 'success',
      message:
        payload?.message ??
        'Gracias. Hemos recibido tu solicitud y te contactaremos pronto.',
    });
  }

  return (
    <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ana Perez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clinicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinica</FormLabel>
                  <FormControl>
                    <Input placeholder="Clinica Dental Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de trabajo</FormLabel>
                  <FormControl>
                    <Input placeholder="recepcion@clinicadental.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input placeholder="+34 600 000 000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="interestedModules"
            render={() => (
              <FormItem>
                <FormLabel>Modulos de interes</FormLabel>
                <FormDescription>
                  Selecciona lo que quieres ver en la demo comercial.
                </FormDescription>
                <div className="grid gap-3 sm:grid-cols-2">
                  {contactSalesModuleOptions.map((option) => {
                    const checked = selectedModules.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 p-4 transition-colors hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextValue) => {
                            const current = form.getValues('interestedModules');
                            if (nextValue) {
                              form.setValue(
                                'interestedModules',
                                [...new Set([...current, option.value])],
                                {
                                  shouldValidate: true,
                                }
                              );
                              return;
                            }

                            form.setValue(
                              'interestedModules',
                              current.filter((value) => value !== option.value),
                              { shouldValidate: true }
                            );
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{option.label}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Que te gustaria resolver?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Cuentanos si buscas mejorar recepcion, bajar no-shows, recuperar huecos o desplegar varios canales."
                    className="min-h-32"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {submitState.status === 'success' ? (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_45%,white)] bg-[color-mix(in_srgb,var(--accent)_12%,white)] p-4 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{submitState.message}</p>
              </div>
            </div>
          ) : null}

          {submitState.status === 'error' ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {submitState.message}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Enviaremos esta solicitud al canal comercial configurado para demos.
            </p>
            <MinimalButton size="lg" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Enviando...' : 'Solicitar demo'}
              <ArrowRight className="h-4 w-4" />
            </MinimalButton>
          </div>
        </form>
      </Form>
    </div>
  );
}
