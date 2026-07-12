import QRCode from "qrcode";

type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

type CreateQrOptions = {
  darkColor?: string;
  errorCorrectionLevel?: QrErrorCorrectionLevel;
  lightColor?: string;
  margin?: number;
  width?: number;
};

function buildQrOptions(options: CreateQrOptions = {}) {
  return {
    color: {
      dark: options.darkColor ?? "#111827",
      light: options.lightColor ?? "#FFFFFF",
    },
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
    margin: options.margin ?? 3,
    width: options.width ?? 1024,
  };
}

export function createQrPngDataUrl(value: string, options?: CreateQrOptions) {
  return QRCode.toDataURL(value, buildQrOptions(options));
}

export function createQrSvgText(value: string, options?: CreateQrOptions) {
  return QRCode.toString(value, { ...buildQrOptions(options), type: "svg" });
}
