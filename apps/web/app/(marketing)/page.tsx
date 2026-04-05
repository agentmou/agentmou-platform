import type { Metadata } from 'next';
import {
  ClinicControlCenterShowcase,
  ClinicCtaBand,
  ClinicFlowPaths,
  ClinicIntegrationStrip,
  ClinicModulesGrid,
  ClinicTrustSection,
  ClinicValueGrid,
  MarketingHeroClinic,
} from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Agentmou Clinics - Recepcion IA multicanal',
  description:
    'Recepcion IA multicanal para clinicas dentales. Responde WhatsApp y llamadas, agenda citas, confirma asistencia y ayuda a recuperar huecos y pacientes inactivos.',
};

export default function HomePage() {
  return (
    <div>
      <MarketingHeroClinic />
      <ClinicValueGrid />
      <ClinicFlowPaths />
      <ClinicControlCenterShowcase />
      <ClinicModulesGrid />
      <ClinicIntegrationStrip />
      <ClinicTrustSection />
      <ClinicCtaBand />
    </div>
  );
}
