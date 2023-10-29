const getDownloadUrl = async (videoUrl) => {
  const response = await fetch('/download?url=' + videoUrl);
  if (response.status !== 200) {
    return false;
  }

  const body = await response.json();
  return body.videoUrl || false;
}

export default getDownloadUrl;
