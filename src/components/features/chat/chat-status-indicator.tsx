interface ChatStatusIndicatorProps {
  status: string;
  statusColor: string;
}

function ChatStatusIndicator({ status }: ChatStatusIndicatorProps) {
  return (
    <div
      data-testid="chat-status-indicator"
      role="status"
      className="max-w-full py-1 text-xs text-muted"
    >
      {status}
    </div>
  );
}

export default ChatStatusIndicator;
