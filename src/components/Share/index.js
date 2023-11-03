import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import './style.css';

const Share = ({ url }) => {
  const [copied, setCopied] = useState(false);

  return copied ? (
    <span className="share-confirmation">Copied!</span>
  ) : (
    <CopyToClipboard text={url} onCopy={() => setCopied(true)}>
      <span className="share-cta">Copy share link</span>
    </CopyToClipboard>
  );
};

export default Share;
