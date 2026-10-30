export function BookCover({ title, author, color, compact = false }: {
  title: string; author: string; color: string; compact?: boolean;
}) {
  return (
    <div className="cover" style={{ background: `linear-gradient(145deg, ${color}, #1f3029)` , minHeight: compact ? 112 : undefined }}>
      <div className="cover-inner">
        <div className="cover-title" style={{ fontSize: compact ? 15 : undefined }}>{title}</div>
        <div className="cover-author">{author}</div>
      </div>
    </div>
  );
}
