import type { Metadata } from 'next';
import {
  ClinicBeforeAfterSection,
  ClinicCostOfInaction,
  ClinicControlCenterShowcase,
  ClinicCtaBand,
  ClinicHowItWorksGrid,
  ClinicIntegrationStrip,
  ClinicModulesGrid,
  ClinicPainSection,
  ClinicPatientJourney,
  ClinicRevenueRecoverySection,
  ClinicTrustSection,
  ClinicValueGrid,
  MarketingHeroClinic,
} from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Agentmou Clinics | Recepción IA multicanal para clínicas dentales',
  description:
    'Recepción IA multicanal para clínicas dentales. Responde WhatsApp y llamadas, agenda citas, confirma asistencia y ayuda a recuperar huecos y pacientes inactivos.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return (
    <div>
      <MarketingHeroClinic />
      <ClinicPainSection />
      <ClinicCostOfInaction />
      <ClinicValueGrid />
      <ClinicHowItWorksGrid />
      <ClinicPatientJourney />
      <ClinicControlCenterShowcase />
      <ClinicRevenueRecoverySection />
      <ClinicBeforeAfterSection />
      <ClinicModulesGrid />
      <ClinicIntegrationStrip />
      <ClinicTrustSection />
      <ClinicCtaBand />
    </div>
  );
}
