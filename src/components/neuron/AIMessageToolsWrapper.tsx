import { AIMessageTools } from './AIMessageTools';

interface AIMessageToolsWrapperProps {
  message: string;
  onMessageUpdate: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AIMessageToolsWrapper = ({ message, onMessageUpdate }: AIMessageToolsWrapperProps) => {
  const handleUpdate = (newMessage: string) => {
    // Create a synthetic event to match the expected onChange signature
    const syntheticEvent = {
      target: { value: newMessage }
    } as React.ChangeEvent<HTMLInputElement>;
    onMessageUpdate(syntheticEvent);
  };

  return (
    <AIMessageTools 
      message={message} 
      onMessageUpdate={handleUpdate}
    />
  );
};
