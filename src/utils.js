export function normalizePhone(rawPhone) {
  const digits = (rawPhone ?? '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('380')) {
    return `+${digits}`;
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return `+38${digits}`;
  }

  if (digits.length === 12) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function parseAmiBlock(block) {
  return block
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce((acc, line) => {
      const sepIndex = line.indexOf(':');
      if (sepIndex === -1) {
        return acc;
      }

      const key = line.slice(0, sepIndex).trim();
      const value = line.slice(sepIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

export function buildIncomingCallPayload({ event, phone, crmResult, callId, operatorExt }) {
  return {
    type: 'incoming_call',
    phone,
    clientName: crmResult.clientName,
    clientId: crmResult.clientId,
    cardUrl: crmResult.cardUrl,
    operatorExt,
    callId,
    timestamp: new Date().toISOString(),
    clientFound: crmResult.clientFound,
    eventType: event.Event
  };
}
