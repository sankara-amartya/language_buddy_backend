function evaluateWhatsAppConsent(userRecord) {
  if (!userRecord) {
    return {
      allowed: false,
      reason: 'user_not_found'
    };
  }

  if (!userRecord.phoneE164) {
    return {
      allowed: false,
      reason: 'missing_phone'
    };
  }

  if (!userRecord.whatsappOptIn) {
    return {
      allowed: false,
      reason: 'missing_opt_in'
    };
  }

  return {
    allowed: true,
    reason: 'ok'
  };
}

module.exports = {
  evaluateWhatsAppConsent: evaluateWhatsAppConsent
};
