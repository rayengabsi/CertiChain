const QRCode = require('qrcode');
const { PUBLIC_BASE_URL } = require('../config/env');

/** QR encodes the PUBLIC verification URL — any phone camera can open it. */
async function verificationQrDataUrl(certificateId) {
  const url = `${PUBLIC_BASE_URL}/verify/${certificateId}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2 });
  return { url, dataUrl };
}

module.exports = { verificationQrDataUrl };
