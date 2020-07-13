import * as React from 'react';

import * as prettyBytes from 'pretty-bytes';

export type AttachmentCellProps = {
  attachment: {
    mime: string;
    url: string;
    name: string;
    size: number;
  };
};

export function AttachmentCell(props: AttachmentCellProps) {
  const { attachment } = props;

  const isImage = React.useMemo(() => /^image\//i.test(attachment.mime), [attachment.mime]);

  return (
    <a
      className="attachment-cell"
      href={attachment.url}
      download={attachment.name}
      target="_blank"
      rel="noreferrer"
      title={attachment.name}
    >
      <div className="attachment-cell-preview">
        { isImage && (
          <img className="attachment-cell-image" src={attachment.url} alt="Preview" />
        ) }
      </div>
      <div className="attachment-cell-overview">
        <strong className="attachment-cell-filename">{attachment.name}</strong>
        <small className="attachment-cell-size">{prettyBytes(attachment.size || 0)}</small>
      </div>
    </a>
  );
}
