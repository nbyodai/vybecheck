interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="loading">
      <h1>VybeCheck</h1>
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}
