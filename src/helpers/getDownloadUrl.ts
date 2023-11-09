const getDownloadUrl = async (videoUrl: string): Promise<string> => {
  const response = await fetch('/download?url=' + videoUrl);
  if (response.status !== 200) {
    return '';
  }

  const body = await response.json();
  return body.videoUrl || '';
};

export default getDownloadUrl;
