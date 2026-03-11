export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseCurrency = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove currency symbol and whitespace
  let cleanValue = value.replace(/[R$\s]/g, '');
  
  // If there are multiple dots and one comma, it's pt-BR (1.250,50)
  // If there's only one separator and it's a comma, it's pt-BR (0,60)
  // If there's only one separator and it's a dot, it could be either, but we'll assume decimal if it's near the end
  
  const hasComma = cleanValue.includes(',');
  const hasDot = cleanValue.includes('.');
  
  if (hasComma && hasDot) {
    // 1.250,50 -> 1250.50
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // 0,60 -> 0.60
    cleanValue = cleanValue.replace(',', '.');
  } else if (hasDot) {
    // 0.60 -> 0.60 (assume dot is decimal if no comma exists)
    // However, if it's 1.000, we might have an issue. 
    // But for simple inputs, this is safer.
  }
  
  return parseFloat(cleanValue) || 0;
};

export const maskCurrency = (value: string) => {
  if (!value) return '0,00';
  let v = value.replace(/\D/g, '');
  if (!v) return '0,00';
  v = (Number(v) / 100).toFixed(2).toString();
  v = v.replace('.', ',');
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return v;
};
