import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export default function GradientButton({ children, onClick, type = 'button', disabled }: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange font-bold text-lg hover:scale-[1.02] hover:shadow-2xl hover:shadow-brand-pink/40 transition-all duration-300 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
