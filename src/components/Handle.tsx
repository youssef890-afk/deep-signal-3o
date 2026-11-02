interface HandleProps {
  username: string;
  className?: string;
}

export default function Handle({ username, className = '' }: HandleProps) {
  return (
    <bdi dir="ltr" className={`inline-block ${className}`}>
      @{username}
    </bdi>
  );
}
