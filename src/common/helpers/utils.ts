export function generatePatientMRN(): string {
  const prefix = "MRN";
  const timestamp = Date.now().toString();

  const randomPart = Math.random().toString(36).substring(2, 10); 

  const sumOfDigits = timestamp.split('').reduce((sum, char) => sum + parseInt(char, 10), 0);
  const checksumChar = String.fromCharCode(65 + (sumOfDigits % 26)); 

  return `${prefix}${timestamp}${randomPart}${checksumChar}`.toUpperCase();
}