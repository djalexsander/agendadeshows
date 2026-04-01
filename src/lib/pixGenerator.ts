/**
 * Gerador de código Pix BR Code (EMV QR Code Specification)
 * Gera o payload "copia e cola" para pagamentos Pix
 */

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

interface PixPayload {
  chavePix: string;
  nomeRecebedor: string;
  cidadeRecebedor: string;
  valor: number;
  descricao?: string;
}

export function generatePixCode(data: PixPayload): string {
  const { chavePix, nomeRecebedor, cidadeRecebedor, valor, descricao } = data;

  const nome = removeAccents(nomeRecebedor).substring(0, 25);
  const cidade = removeAccents(cidadeRecebedor).substring(0, 15);
  const valorStr = valor.toFixed(2);

  // ID 26 - Merchant Account Information
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", chavePix);
  let merchantAccount = gui + key;
  if (descricao) {
    merchantAccount += tlv("02", descricao.substring(0, 25));
  }

  // ID 62 - Additional Data Field
  const txid = tlv("05", "***");

  // Build payload without CRC
  let payload = "";
  payload += tlv("00", "01"); // Payload Format Indicator
  payload += tlv("26", merchantAccount); // Merchant Account Info
  payload += tlv("52", "0000"); // Merchant Category Code
  payload += tlv("53", "986"); // Transaction Currency (BRL)
  if (valor > 0) {
    payload += tlv("54", valorStr); // Transaction Amount
  }
  payload += tlv("58", "BR"); // Country Code
  payload += tlv("59", nome); // Merchant Name
  payload += tlv("60", cidade); // Merchant City
  payload += tlv("62", txid); // Additional Data

  // Add CRC placeholder and calculate
  payload += "6304";
  const checksum = crc16(payload);
  payload += checksum;

  return payload;
}
