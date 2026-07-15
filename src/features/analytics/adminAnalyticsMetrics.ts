export function calculateSignupConversionRate(signupStarted: number, accountsCreated: number) {
  const normalizedStarted = Math.max(0, Number(signupStarted) || 0);
  const normalizedCreated = Math.max(0, Number(accountsCreated) || 0);
  if (normalizedStarted === 0) return null;
  return Math.round((normalizedCreated / normalizedStarted) * 1_000) / 10;
}

export function formatSignupConversionRate(rate: number | null) {
  return rate === null ? "Sin base" : `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: rate % 1 === 0 ? 0 : 1,
  }).format(rate)}%`;
}
