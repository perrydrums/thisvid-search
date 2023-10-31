export const getIp = async () => {
  const res = await fetch('https://api.ipify.org?format=json');
  const { ip } = await res.json();
  return ip;
};
