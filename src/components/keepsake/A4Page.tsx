interface A4PageProps {
  children: React.ReactNode;
  className?: string;
}

export default function A4Page({ children, className = '' }: A4PageProps) {
  return (
    <div className={`keepsake-page ${className}`}>
      {children}
    </div>
  );
}
