interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h1 className="text-gray-800 text-[32px] font-bold">VybeCheck</h1>
      <div className="w-10 h-10 border-4 border-gray-200 border-t-vybe-blue rounded-full animate-spin-fast" />
      <p className="text-gray-500 text-base">{message}</p>
    </div>
  );
}
