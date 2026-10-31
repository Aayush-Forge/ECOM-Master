export const INDIAN_GST_STATE_CODES: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'new delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'up': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'jharkhand': '20',
  'odisha': '21',
  'orissa': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'mp': '23',
  'gujarat': '24',
  'dadra and nagar haveli and daman and diu': '26',
  'daman and diu': '26',
  'maharashtra': '27',
  'andhra pradesh': '28',
  'karnataka': '29',
  'goa': '30',
  'lakshadweep': '31',
  'kerala': '32',
  'tamil nadu': '33',
  'puducherry': '34',
  'pondicherry': '34',
  'andaman and nicobar islands': '35',
  'telangana': '36',
  'andhra': '28',
  'ladakh': '38',
};

export function getGstStateDetails(rawState?: string): { name: string; code: string; formatted: string } {
  if (!rawState || !rawState.trim()) {
    return { name: 'Karnataka', code: '29', formatted: 'Karnataka (29)' };
  }

  const clean = rawState.trim();
  const lower = clean.toLowerCase();

  const code = INDIAN_GST_STATE_CODES[lower] || '29';
  const name = clean.charAt(0).toUpperCase() + clean.slice(1);
  return {
    name,
    code,
    formatted: `${name} (${code})`,
  };
}
