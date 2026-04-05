import { describe, expect, it } from 'vitest';

import {
  getClinicChannelEventJobId,
  getClinicFormFollowUpJobId,
  getClinicGapOutreachJobId,
  getClinicReactivationCampaignJobId,
  getClinicReminderJobId,
  getClinicSendMessageJobId,
  getClinicVoiceCallbackJobId,
  QUEUE_NAMES,
} from './index.js';

describe('clinic queue contracts', () => {
  it('exposes stable queue names for clinic automation', () => {
    expect(QUEUE_NAMES.CLINIC_CHANNEL_EVENT).toBe('clinic-channel-event');
    expect(QUEUE_NAMES.CLINIC_SEND_MESSAGE).toBe('clinic-send-message');
    expect(QUEUE_NAMES.CLINIC_REACTIVATION_CAMPAIGN).toBe('clinic-reactivation-campaign');
  });

  it('builds deterministic job ids for delayed and idempotent clinic jobs', () => {
    expect(getClinicChannelEventJobId('evt-1')).toBe('clinic-channel-event-evt-1');
    expect(getClinicSendMessageJobId('msg-1')).toBe('clinic-send-message-msg-1');
    expect(getClinicReminderJobId('rem-1')).toBe('clinic-reminder-rem-1');
    expect(getClinicFormFollowUpJobId('sub-1')).toBe('clinic-form-follow-up-sub-1');
    expect(getClinicGapOutreachJobId('gap-1')).toBe('clinic-gap-outreach-gap-1');
    expect(getClinicReactivationCampaignJobId('camp-1')).toBe(
      'clinic-reactivation-campaign-camp-1'
    );
    expect(getClinicReactivationCampaignJobId('camp-1', 'rec-1')).toBe(
      'clinic-reactivation-campaign-camp-1-rec-1'
    );
    expect(getClinicVoiceCallbackJobId('call-1')).toBe('clinic-voice-callback-call-1');
  });
});
