const getDownloadUrl = async (videoUrl: string): Promise<string | boolean> => {
  const response = await fetch('/download?url=' + videoUrl);
  if (response.status !== 200) {
    return false;
  }

  const body = await response.json();
  return body.videoUrl || '';
};

export default getDownloadUrl;
