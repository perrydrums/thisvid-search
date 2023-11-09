export const getIp = async (): Promise<string> => {
  const res = await fetch('https://api.ipify.org?format=json');
  const { ip } = await res.json();
  return ip;
};
